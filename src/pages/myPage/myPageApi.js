// 마이페이지 / 회원정보 수정에서 쓰는 데이터. 주소는 API 명세서(ver02)를 따른다.
//   GET /users/my_page    → all_reading_time, sequence_day, all_reading_page, league_in5
//   GET /users/edit_page  → name, birthdate, goal_time, email, passward
//   PUT /users/edit_info  (profileimage, name, birthdate, goal_time, email, passward) → message
//   PUT /users/title      (titleID) → message           : 이름 앞에 붙일 업적 고르기
//   PUT /users/image      (image) → image_url           : 프로필·배경 변경 (form-data, 5MB 이하)
//   DELETE /users/image   → image_url(기본 이미지)        : 프로필·배경 삭제
//   GET /users/achievements → 업적 37개 전체 + 달성·사용 여부
// TODO: 명세서의 마이페이지 응답에 아이디·이름·사용 중인 업적·프로필/배경 이미지·업적 목록이 없다. 백엔드와 필드 이름을 정하면 normalize 를 맞춘다.
// 명세서 비고: all_reading_time 은 초 단위 → 화면에서는 분으로 바꿔 쓴다.

import { authHeaders, isLoggedIn, pick, requestServer } from "../../api/client";
import { getSavedUser } from "../bookSearch/bookStore";

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// 목표 시간: 초 숫자(1800) 또는 "HH:MM(:SS)" 문자열 → "HH:MM"
const toHHMM = (raw) => {
  if (raw == null || raw === "") return "00:00";
  if (/^\d+$/.test(String(raw))) {
    const sec = Number(raw);
    return `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;
  }
  return String(raw).split(":").slice(0, 2).map((v) => v.padStart(2, "0")).join(":");
};

// 서버 응답을 받고, 없거나 실패하면 빈 값({})을 쓴다 (이름·업적·통계가 모두 빈 화면이 된다)
const load = async (url) => {
  const { ok, data } = await requestServer("GET", url);
  if (!ok || !data || typeof data !== "object") return {};
  return data.data ?? data;
};

// 서버가 아이디·이름을 안 줄 때 쓰는 값: 로그인할 때 저장해 둔 내 정보. 없으면 빈 칸
const savedUser = () => getSavedUser();

// 업적 한 줄: { id, title, description, xp, achieved, used }
const toAchievement = (raw) => ({
  id: pick(raw, "id", "titleID", "title_id", "achievement_id"),
  title: pick(raw, "title", "name", "title_name") ?? "",
  description: pick(raw, "description", "content", "condition") ?? "",
  xp: toNumber(pick(raw, "xp", "reward_xp")),
  achieved: Boolean(pick(raw, "achieved", "done", "completed")),
  used: Boolean(pick(raw, "used", "in_use", "selected")),
});

// 달성한 업적(사용 중인 것 맨 앞) → 아직 달성하지 못한 업적 순서
const sortAchievements = (list) => {
  const achieved = list.filter((a) => a.achieved).sort((a, b) => Number(b.used) - Number(a.used));
  return { achieved, locked: list.filter((a) => !a.achieved) };
};

// 로그인하지 않았으면 서버에 묻지 않고 needLogin: true 인 빈 값을 돌려준다
export const fetchMyPage = async () => {
  const needLogin = !isLoggedIn();
  const [data, achData] = needLogin
    ? [{}, {}]
    : await Promise.all([load("/users/my_page"), requestServer("GET", "/users/achievements").then(({ ok, data: d }) => (ok ? d : null))]);
  // 업적 목록: 배열로 오거나 { achievements: [...] } / { data: [...] } 로 올 수 있다
  const achList = [achData, achData?.data, achData?.achievements, achData?.data?.achievements, data.achievements].find(Array.isArray) ?? [];
  const achievements = achList.map(toAchievement);
  const user = savedUser();
  return {
    needLogin,
    id: pick(data, "ID", "user_id", "id") ?? pick(user, "ID", "id") ?? "",
    name: pick(data, "name", "user_name") ?? pick(user, "name") ?? "",
    title: pick(data, "title", "title_name") ?? achievements.find((a) => a.used)?.title ?? "",
    profileImage: pick(data, "profile_image", "profileimage") ?? "",
    backgroundImage: pick(data, "background_image", "backgroundimage") ?? "",
    stats: {
      minutes: Math.floor(toNumber(data.all_reading_time) / 60), // 초 → 분
      streakDays: toNumber(data.sequence_day),
      pages: toNumber(data.all_reading_page),
      top5Count: toNumber(data.league_in5),
    },
    ...sortAchievements(achievements),
  };
};

export const fetchEditPage = async () => {
  const needLogin = !isLoggedIn();
  const data = needLogin ? {} : await load("/users/edit_page");
  return {
    needLogin,
    id: pick(data, "ID", "user_id", "id") ?? pick(savedUser(), "ID", "id") ?? "",
    name: pick(data, "name", "user_name") ?? "",
    birthdate: pick(data, "birthdate", "birthday") ?? "",
    goalTime: toHHMM(pick(data, "goal_time", "goal_readtime")), // 시:분만 쓴다
    email: pick(data, "email") ?? "",
    google: pick(data, "provider") === "google", // TODO: Google 연동 여부를 알려주는 필드 확인
    profileImage: pick(data, "profile_image", "profileimage") ?? "",
    backgroundImage: pick(data, "background_image", "backgroundimage") ?? "",
  };
};

// 회원정보 저장. 비밀번호는 바꿀 때만 보낸다. 성공하면 true
export const saveEditInfo = async ({ name, birthdate, goalTime, email, password }) => {
  const body = { name, birthdate, goal_time: goalTime, email };
  if (password) body.passward = password; // 명세서 철자 그대로
  return (await requestServer("PUT", "/users/edit_info", body)).ok;
};

// 이름 앞에 붙일 업적을 고른다. 성공하면 true
export const applyTitle = async (titleID) => (await requestServer("PUT", "/users/title", { titleID })).ok;

// 프로필(kind: "profile") / 배경(kind: "background") 이미지 변경. 성공하면 서버의 이미지 주소, 실패하면 null
// TODO: 명세서에는 image 하나만 있어서 프로필/배경 구분 방법을 백엔드와 확인 (지금은 type 으로 보낸다)
export const uploadImage = async (kind, file) => {
  const form = new FormData();
  form.append("image", file);
  form.append("type", kind);
  try {
    const res = await fetch("/users/image", {
      method: "PUT",
      headers: authHeaders(), // Content-Type 은 브라우저가 파일 형식에 맞게 넣는다
      body: form,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return pick(data?.data ?? data, "imageurl", "image_url") ?? null;
  } catch {
    return null;
  }
};

// 기본 이미지로 되돌리기. 명세서: DELETE /users/image → 기본 이미지 주소(image_url)
// 성공하면 { ok: true, url }, 실패하면 { ok: false }
// TODO: 프로필/배경 구분 방법은 명세서에 없다. 지금은 주소 뒤(?type=)와 본문 둘 다 보낸다
export const resetImage = async (kind) => {
  const { ok, data } = await requestServer("DELETE", `/users/image?type=${kind}`, { type: kind });
  return { ok, url: ok ? pick(data?.data ?? data, "image_url", "imageurl") ?? "" : "" };
};

export const formatHours = (minutes) => `${Math.floor(minutes / 60)}시간`;
