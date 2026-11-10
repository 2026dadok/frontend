import { useEffect, useRef } from "react";
import { TIME_PARTS } from "./goalTime";

const GoalTimeInput = ({ value, onChange, className }) => {
  const refs = useRef([]);
  const startValue = useRef([]);
  const parts = TIME_PARTS.map((_, i) => value.split(":")[i] ?? "");
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
              e.target.select();
            }}
            onMouseUp={(e) => {
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
