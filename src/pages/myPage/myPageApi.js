// 마이페이지 / 회원정보 수정에서 쓰는 데이터. 필드 이름은 백엔드(test 브랜치) 응답 그대로다.
//   GET /users/my_page    → ID, name, title, all_reading_time(분), sequence_day, all_reading_page, league_in5, profile_image, background_image
//   GET /users/edit_page  → ID, name, birthdate, goal_time("HH:mm"), email, profile_image, background_image
//   PUT /users/edit_info  (name, birthdate, goal_time, current_password, new_password) → message
//   PUT /users/title      (titleID) → message           : 이름 앞에 붙일 업적 고르기
//   PUT /users/image      form-data (type, image) → image_url : 프로필·배경 변경 (5MB 이하)
//   DELETE /users/image?type= → image_url(기본 이미지)  : 프로필·배경 삭제
//   GET /users/achievements → [{ achievement_id, title, description, achieved, equipped }]

import { apiFetch, authHeaders, isLoggedIn, requestServer } from "../../api/client";
import { getSavedUser } from "../bookSearch/bookStore";
import { passwordRuleError } from "../../api/auth";

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// 목표 시간 "H:mm" → "HH:mm"
const toHHMM = (raw) => (raw ? String(raw).split(":").slice(0, 2).map((v) => v.padStart(2, "0")).join(":") : "00:00");

// 서버 응답을 받는다. 없거나 실패하면 null (부르는 쪽이 "불러오지 못했어요"를 보여준다)
const load = async (url) => {
  const { ok, data } = await requestServer("GET", url);
  return ok && data && typeof data === "object" ? data : null;
};

// 업적 한 줄: { id, title, description, achieved, used }
// /users/achievements 는 achievement_id·equipped, 마이페이지 응답 안의 업적은 id·used 로 온다
const toAchievement = (raw) => ({
  id: raw.achievement_id ?? raw.id,
  title: raw.title ?? "",
  description: raw.description ?? "",
  achieved: Boolean(raw.achieved),
  used: Boolean(raw.equipped ?? raw.used),
});

// 달성한 업적(사용 중인 것 맨 앞) → 아직 달성하지 못한 업적 순서
const sortAchievements = (list) => {
  const achieved = list.filter((a) => a.achieved).sort((a, b) => Number(b.used) - Number(a.used));
  return { achieved, locked: list.filter((a) => !a.achieved) };
};

// 로그인하지 않았으면 서버에 묻지 않고 needLogin: true 인 빈 값을 돌려준다
export const fetchMyPage = async () => {
  const needLogin = !isLoggedIn();
  const [loaded, achData] = needLogin
    ? [{}, {}]
    : await Promise.all([load("/users/my_page"), requestServer("GET", "/users/achievements").then(({ ok, data: d }) => (ok ? d : null))]);
  const failed = loaded == null; // 서버가 없거나 실패: 통계를 0 대신 "-" 로 보여준다
  const data = loaded ?? {};
  const achievements = (Array.isArray(achData) ? achData : data.achievements ?? []).map(toAchievement);
  const user = getSavedUser(); // 서버가 없을 때 로그인할 때 저장해 둔 아이디라도 보여준다
  return {
    needLogin,
    failed,
    id: data.ID ?? user.ID ?? "",
    name: data.name ?? user.name ?? "",
    title: data.title ?? achievements.find((a) => a.used)?.title ?? "",
    profileImage: data.profile_image ?? "",
    backgroundImage: data.background_image ?? "",
    stats: failed || needLogin ? null : {
      minutes: toNumber(data.all_reading_time), // 이미 분
      streakDays: toNumber(data.sequence_day),
      pages: toNumber(data.all_reading_page),
      top5Count: toNumber(data.league_in5),
    },
    ...sortAchievements(achievements),
  };
};

export const fetchEditPage = async () => {
  const needLogin = !isLoggedIn();
  const data = needLogin ? {} : (await load("/users/edit_page")) ?? {};
  return {
    needLogin,
    id: data.ID ?? getSavedUser().ID ?? "",
    name: data.name ?? "",
    birthdate: data.birthdate ?? "",
    goalTime: toHHMM(data.goal_time),
    email: data.email ?? "",
    profileImage: data.profile_image ?? "",
    backgroundImage: data.background_image ?? "",
  };
};

// 회원정보 저장. 비밀번호는 바꿀 때만 보낸다. 성공하면 true
// 백엔드: 비밀번호를 바꿀 때는 current_password 가 맞아야 한다 (없거나 틀리면 거절)
export const saveEditInfo = async ({ name, birthdate, goalTime, email, password, currentPassword }) => {
  const body = { name, birthdate, goal_time: goalTime, email };
  if (password) {
    if (passwordRuleError(password)) return false; // 8~50자가 아니면 백엔드로 보내지 않는다
    body.current_password = currentPassword;
    body.new_password = password;
  }
  return (await requestServer("PUT", "/users/edit_info", body)).ok;
};

// 이름 앞에 붙일 업적을 고른다. 성공하면 true
export const applyTitle = async (titleID) => (await requestServer("PUT", "/users/title", { titleID })).ok;

// 프로필(kind: "profile") / 배경(kind: "background") 이미지 변경. 성공하면 서버의 이미지 주소, 실패하면 null
export const uploadImage = async (kind, file) => {
  const form = new FormData();
  form.append("image", file);
  form.append("type", kind);
  try {
    const res = await apiFetch("/users/image", {
      method: "PUT",
      timeout: 30000, // 사진 올리기는 오래 걸릴 수 있다
      headers: authHeaders(), // Content-Type 은 브라우저가 파일 형식에 맞게 넣는다
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.image_url ?? null;
  } catch {
    return null;
  }
};

// 기본 이미지로 되돌리기: DELETE /users/image?type= → 기본 이미지 주소(image_url)
// 성공하면 { ok: true, url }, 실패하면 { ok: false }
export const resetImage = async (kind) => {
  const { ok, data } = await requestServer("DELETE", `/users/image?type=${kind}`);
  return { ok, url: ok ? data?.image_url ?? "" : "" };
};

export const formatHours = (minutes) => `${Math.floor(minutes / 60)}시간`;
