import { useEffect, useRef } from "react";
import { TIME_PARTS } from "./goalTime";

// 목표 독서시간: 시 / 분을 숫자로 입력한다. 두 자리를 다 치면 다음 칸으로 넘어간다.
// 키 이벤트 대신 실제로 들어온 글자(onChange)만 보고 처리해서 한글 자판·모바일 자판에서도 같게 동작한다.
const GoalTimeInput = ({ value, onChange, className }) => {
  const refs = useRef([]);
  const startValue = useRef([]); // 칸에 들어올 때의 값. 첫 입력은 이 값을 지우고 새로 시작한다
  const parts = TIME_PARTS.map((_, i) => value.split(":")[i] ?? "");
  // 다음 칸으로 넘어가면 다시 그려지기 전에 이 칸의 blur 가 먼저 온다. 그래서 가장 최근 값은 ref 에 따로 둔다
  const latest = useRef(parts);
  useEffect(() => {
    latest.current = TIME_PARTS.map((_, i) => value.split(":")[i] ?? "");
  }, [value]);

  const setPart = (index, next) => {
    const copy = [...latest.current];
    copy[index] = next;
    latest.current = copy;
    onChange(copy.join(":"));
  };

  const type = (index, e) => {
    const raw = e.target.value;
    let digits = raw.replace(/\D/g, "");
    const start = startValue.current[index];
    if (start != null) {
      // 칸에 들어와 처음 친 글자: 전체 선택이 안 돼서 기존 값 사이(예: 2|2)에 끼었으면 새로 친 글자만 남긴다
      const added = raw.length - start.length;
      if (added > 0) {
        const caret = e.target.selectionStart ?? raw.length;
        digits = raw.slice(caret - added, caret).replace(/\D/g, "");
      }
      startValue.current[index] = null;
    }
    digits = digits.slice(-2);
    if (Number(digits) > TIME_PARTS[index].max) digits = String(TIME_PARTS[index].max);
    setPart(index, digits);
    if (digits.length === 2 && e.nativeEvent.inputType?.startsWith("insert")) refs.current[index + 1]?.focus();
  };

  return (
    <span className={className}>
      {TIME_PARTS.map((part, i) => (
        <span key={part.label} className="time-part">
          {i > 0 && ":"}
          <input
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            aria-label={part.label}
            placeholder="00"
            value={parts[i]}
            onFocus={(e) => {
              startValue.current[i] = latest.current[i];
              e.target.select(); // 전체 선택: 바로 새로 칠 수 있다
            }}
            onMouseUp={(e) => {
              // 클릭으로 들어오면 마우스를 뗄 때 전체 선택이 풀리고 커서가 숫자 사이에 놓인다. 처음 한 번은 막는다
              if (startValue.current[i] != null) e.preventDefault();
            }}
            onChange={(e) => type(i, e)}
            onBlur={() => {
              startValue.current[i] = null;
              if (latest.current[i]) setPart(i, latest.current[i].padStart(2, "0"));
            }}
          />
        </span>
      ))}
    </span>
  );
};

export default GoalTimeInput;
