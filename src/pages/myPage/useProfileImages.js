import { useCallback, useEffect, useRef, useState } from "react";
import { setMyImage, shrinkImage } from "../../api/myImages";
import useMyImage from "../../hooks/useMyImage";
import { resetImage, uploadImage } from "./myPageApi";

const TOAST_MS = 2000;

// 프로필/배경 이미지와 바꾸기. 고르면 바로 화면에 보여주고 서버에 올린다.
// 이미지는 공용 저장소(api/myImages)에 넣어서 주간 경쟁·공동서재의 내 사진도 같이 바뀐다.
// 서버가 실패해도 고른 이미지는 브라우저에 남겨 두고 알림만 띄운다.
const useProfileImages = () => {
  const profile = useMyImage("profile");
  const background = useMyImage("background");
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = useCallback((message) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), TOAST_MS);
  }, []);

  // 서버가 준 이미지 주소를 저장한다. 빈 값(서버 없음·임시값)은 브라우저에 있던 사진을 지우지 않는다
  const setImages = useCallback((images) => {
    Object.entries(images).forEach(([kind, url]) => url && setMyImage(kind, url));
  }, []);

  const changeImage = async (kind, file) => {
    try {
      setMyImage(kind, await shrinkImage(kind, file));
    } catch {
      showToast("이미지를 열 수 없어요.");
      return;
    }
    const url = await uploadImage(kind, file);
    if (url) setMyImage(kind, url);
    showToast(url ? "이미지를 바꿨어요." : "이미지를 서버에 저장하지 못했어요.");
  };

  // 사진 삭제: 기본 이미지(프로필: 회색 사람, 배경: 밤하늘)로 돌아간다
  const resetToDefault = async (kind) => {
    setMyImage(kind, "");
    const ok = await resetImage(kind);
    showToast(ok ? "사진을 삭제했어요." : "사진 삭제를 서버에 저장하지 못했어요.");
  };

  return { images: { profile, background }, setImages, changeImage, resetToDefault, toast, showToast };
};

export default useProfileImages;
