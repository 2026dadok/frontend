import { getMe } from "../pages/bookSearch/bookStore";

// 내 프로필 사진 / 배경 이미지를 여러 화면이 같이 쓰는 저장소. (마이페이지, 주간 경쟁, 공동서재)
// 마이페이지에서 바꾸면 subscribeMyImage 로 알려서 다른 화면도 바로 바뀐다.
// 서버 주소가 있으면 그 주소를, 서버가 아직 없으면 고른 사진을 줄여서 브라우저(localStorage)에 넣어 둔다.
// TODO: 백엔드 연결 후에는 서버가 준 이미지 주소만 저장한다 (로그인 응답이나 GET /users/my_page)

const listeners = new Set();
const keyOf = (kind) => `myImage:${getMe().key}:${kind}`; // kind: "profile" | "background"

export const getMyImage = (kind) => {
  try {
    return localStorage.getItem(keyOf(kind)) ?? "";
  } catch {
    return "";
  }
};

// url 이 빈 값이면 기본 이미지로 돌아간다
export const setMyImage = (kind, url) => {
  try {
    if (url) localStorage.setItem(keyOf(kind), url);
    else localStorage.removeItem(keyOf(kind));
  } catch {
    // 저장 공간이 모자라면 이번 화면에서만 보인다
  }
  listeners.forEach((listener) => listener(kind));
};

export const subscribeMyImage = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// 브라우저에 넣을 수 있게 사진을 줄인다. 프로필은 투명 배경을 살리려고 PNG, 배경은 용량을 줄이려고 JPEG.
const MAX_SIZE = { profile: 256, background: 1600 };

export const shrinkImage = async (kind, file) => {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_SIZE[kind] / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return kind === "profile" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
};
