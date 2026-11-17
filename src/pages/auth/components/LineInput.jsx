import "./LineInput.css";
export const LineInput = ({ placeholder, type = "text", value, onChange, onKeyDown, maxLength }) => (
  <input
    className="line-input"
    type={type}
    placeholder={placeholder}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    maxLength={maxLength}
  />
);