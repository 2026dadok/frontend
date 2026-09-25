import { useState, useRef, useEffect } from "react";

export const DateSelect = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="date-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="date-select"
        onClick={() => setOpen((prev) => !prev)}
      >
        {value ?? label}
      </button>

      {open && (
        <ul className="date-dropdown">
          {options.map((o) => (
            <li
              key={o}
              className="date-dropdown-item"
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};