import { useState } from "react";
import AuthLayout2 from "./AuthLayout2";
import { DateSelect } from "./Select";

const TripleSelectStep = ({ title, fields, buttonLabel, onSubmit, validate, invalidMessage }) => {
  const [values, setValues] = useState(
    () => Object.fromEntries(fields.map((f) => [f.label, null]))
  );

  const handleChange = (label, value) => {
    setValues((prev) => ({ ...prev, [label]: value }));
  };

  const handleClick = () => {
    if (validate && !validate(values)) {
      alert(invalidMessage);
      return;
    }
    onSubmit(values);
  };

  return (
    <AuthLayout2
      footer={
        <button className="next-btn" onClick={handleClick}>{buttonLabel}</button>
      }
    >
      <h1>{title}</h1>
      <div className="date-selector">
        {fields.map((f) => (
          <DateSelect
            key={f.label}
            label={f.label}
            options={f.options}
            value={values[f.label]}
            onChange={(v) => handleChange(f.label, v)}
          />
        ))}
      </div>
    </AuthLayout2>
  );
};

export default TripleSelectStep;