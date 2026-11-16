import { memRead, memWrite } from "./session";

// 내 프로필 사진 / 배경 이미지를 여러 화면이 같이 쓰는 곳. (마이페이지, 주간 경쟁, 공동서재)
// 마이페이지에서 바꾸면 subscribeMyImage 로 알려서 다른 화면도 바로 바뀐다.
// 서버가 준 이미지 주소(GET /users/my_page, PUT·DELETE /users/image)를 메모리에만 둔다. 브라우저 저장소에는 남기지 않는다.
// (사진을 고른 직후 서버 응답 전까지는 줄인 사진을 잠깐 보여준다)

const listeners = new Set();
const keyOf = (kind) => `myImage:${kind}`; // kind: "profile" | "background"

export const getMyImage = (kind) => memRead(keyOf(kind), "");

// url 이 빈 값이면 기본 이미지로 돌아간다
export const setMyImage = (kind, url) => {
  memWrite(keyOf(kind), url || "");
  listeners.forEach((listener) => listener(kind));
};

export const subscribeMyImage = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// 서버 응답 전에 바로 보여줄 수 있게 사진을 줄인다. 프로필은 투명 배경을 살리려고 PNG, 배경은 용량을 줄이려고 JPEG.
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
