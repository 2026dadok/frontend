// 마이페이지 / 회원정보 수정에서 쓰는 데이터. 주소는 API 명세서(ver02)를 따른다.
//   GET /users/my_page    → all_reading_time, sequence_day, all_reading_page, league_in5
//   GET /users/edit_page  → name, birthdate, goal_time, email, passward
//   PUT /users/edit_info  (profileimage, name, birthdate, goal_time, email, passward) → message
//   PUT /users/title      (titleID) → message           : 이름 앞에 붙일 업적 고르기
//   PUT /users/image      (image) → imageurl            : 프로필·배경 변경
// TODO: 명세서의 마이페이지 응답에 아이디·이름·사용 중인 업적·프로필/배경 이미지·업적 목록이 없다. 백엔드와 필드 이름을 정하면 normalize 를 맞춘다.
// TODO: 총 독서 시간 단위(분/초)는 백엔드와 확인. 지금은 분으로 본다. (주간 경쟁과 같은 단위)

import { authHeaders, isLoggedIn, pick, requestServer } from "../../api/client";
import { getSavedUser } from "../bookSearch/bookStore";

const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

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
  const data = needLogin ? {} : await load("/users/my_page");
  const achievements = (Array.isArray(data.achievements) ? data.achievements : []).map(toAchievement);
  const user = savedUser();
  return {
    needLogin,
    id: pick(data, "ID", "user_id", "id") ?? pick(user, "ID", "id") ?? "",
    name: pick(data, "name", "user_name") ?? pick(user, "name") ?? "",
    title: pick(data, "title", "title_name") ?? achievements.find((a) => a.used)?.title ?? "",
    profileImage: pick(data, "profile_image", "profileimage") ?? "",
    backgroundImage: pick(data, "background_image", "backgroundimage") ?? "",
    stats: {
      minutes: toNumber(data.all_reading_time),
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
    goalTime: (pick(data, "goal_time") ?? "00:00").split(":").slice(0, 2).join(":"), // 시:분만 쓴다
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

// 기본 이미지로 되돌리기. 성공하면 true
// TODO: 명세서에 기본 이미지로 되돌리는 방법이 없다. 백엔드와 확인 (지금은 image 를 null 로 보낸다)
export const resetImage = async (kind) =>
  (await requestServer("PUT", "/users/image", { image: null, type: kind })).ok;

export const formatHours = (minutes) => `${Math.floor(minutes / 60)}시간`;
