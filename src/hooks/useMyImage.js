import { useEffect, useState } from "react";
import { getMyImage, subscribeMyImage } from "../api/myImages";

// 내 프로필 사진(kind: "profile") / 배경(kind: "background"). 다른 화면에서 바꾸면 같이 바뀐다. 없으면 빈 값
const useMyImage = (kind) => {
  const [image, setImage] = useState(() => getMyImage(kind));
  useEffect(
    () =>
      subscribeMyImage((changed) => {
        if (changed === kind) setImage(getMyImage(kind));
      }),
    [kind]
  );
  return image;
};

export default useMyImage;
