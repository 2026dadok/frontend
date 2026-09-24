import { useState, useRef, useEffect } from "react";

export const DateSelect = ({ label, options }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
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
        {selected ?? label}
      </button>

      {open && (
        <ul className="date-dropdown">
          {options.map((o) => (
            <li
              key={o}
              className="date-dropdown-item"
              onClick={() => {
                setSelected(o);
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