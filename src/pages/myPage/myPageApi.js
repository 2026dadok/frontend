// 마이페이지 / 회원정보 수정에서 쓰는 데이터. 주소는 API 명세서(ver02)를 따른다.
//   GET /users/my_page    → all_reading_time, sequence_day, all_reading_page, league_in5
//   GET /users/edit_page  → name, birthdate, goal_time, email, passward
//   PUT /users/edit_info  (profileimage, name, birthdate, goal_time, email, passward) → message
//   PUT /users/title      (titleID) → message           : 업적을 칭호로 사용
//   PUT /users/image      (image) → imageurl            : 프로필·배경 변경
// TODO: 명세서의 마이페이지 응답에 아이디·이름·칭호·프로필/배경 이미지·업적 목록이 없다. 백엔드와 필드 이름을 정하면 normalize 를 맞춘다.
// TODO: 총 독서 시간 단위(분/초)는 백엔드와 확인. 지금은 분으로 본다. (주간 경쟁과 같은 단위)

import { getMe, requestServer } from "../bookSearch/bookStore";

const pick = (obj, ...names) => names.map((n) => obj?.[n]).find((v) => v != null && v !== "");
const toNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// TODO: 백엔드 연결 후 삭제. 백엔드가 없거나 실패했을 때 화면 확인용으로 보여주는 임시값 (응답과 같은 형태)
const MOCK_MY_PAGE = {
  ID: "goodboy_101",
  name: "지원",
  title: "베스트셀러",
  profile_image: "",
  background_image: "",
  all_reading_time: 152 * 60,
  sequence_day: 27,
  all_reading_page: 4322,
  league_in5: 0,
  achievements: [
    { id: 1, title: "베스트셀러", description: "베스트셀러로 지정된 책을 완독한다.", xp: 10, achieved: true, used: true },
    { id: 2, title: "스테디셀러", description: "스테디셀러로 지정된 책을 완독한다.", xp: 10, achieved: true },
    { id: 3, title: "목차 탈출 성공", description: "처음으로 책을 읽기 시작한다.", xp: 5, achieved: true },
    { id: 4, title: "속독가", description: "처음 읽기 시작한 책을 한 번에 완독한다.", xp: 5 },
    { id: 5, title: "정독가", description: "한 책을 완독할 때까지 책을 덮을 때마다 감상문을 쓴다.", xp: 10 },
    { id: 6, title: "독서왕", description: "주간 경쟁 순위 10위권에 진입한다.", xp: 150 },
    { id: 7, title: "다독왕", description: "주간 경쟁 순위 10위권으로 마무리한다.", xp: 100 },
    { id: 8, title: "박제된 천재", description: "(조건 준비 중)", xp: 100 },
  ],
};

// TODO: 백엔드 연결 후 삭제 (회원정보 수정 화면 임시값)
const MOCK_EDIT_PAGE = {
  ID: "goodboy_101",
  name: "지원",
  birthdate: "2010-01-27",
  goal_time: "00:30",
  email: "goodboy_101@gmail.com",
  provider: "google",
};

// 서버 응답을 받고, 없거나 실패하면 임시값을 쓴다
const load = async (url, mock) => {
  const { ok, data } = await requestServer("GET", url);
  if (!ok || !data || typeof data !== "object") return mock;
  return data.data ?? data;
};

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

export const fetchMyPage = async () => {
  const data = await load("/users/my_page", MOCK_MY_PAGE);
  const achievements = (Array.isArray(data.achievements) ? data.achievements : []).map(toAchievement);
  const me = getMe();
  return {
    id: pick(data, "ID", "user_id", "id") ?? me.key,
    name: pick(data, "name", "user_name") ?? me.displayName,
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
  const data = await load("/users/edit_page", MOCK_EDIT_PAGE);
  return {
    id: pick(data, "ID", "user_id", "id") ?? getMe().key,
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

// 업적을 칭호로 사용. 성공하면 true
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
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
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

export const formatHours =(minutes) => `${Math.floor(minutes / 60)}시간`;
