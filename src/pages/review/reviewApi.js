// 감상문 화면에서 쓰는 데이터.
// 나의 서재 책: GET /bookstore/feeling_page, 공동서재 책(jointId 가 있는 책): GET /shared-readings/{id}/reflections
import { getCommentaries, syncCommentaries } from "../bookSearch/bookStore";

// 감상문 목록: [{ day, content, date }]  (day = 몇 일차, date = ISO 날짜). who: "me" | "partner"
export const fetchCommentaries = (book, who) => getCommentaries(book, who);
// 서버에서 받아 사본을 바꾼다. 친구 감상문은 공동서재 책만 있다.
export const loadCommentaries = (book, who) => syncCommentaries(book, who);
