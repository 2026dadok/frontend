import AuthLayout2 from "./AuthLayout2";
import { DateSelect } from "./Select";

const TripleSelectStep = ({ title, fields, buttonLabel, onSubmit }) => {
  return (
    <AuthLayout2
      footer={
        <button className="next-btn" onClick={onSubmit}>{buttonLabel}</button>
      }
    >
      <h1>{title}</h1>
      <div className="date-selector">
        {fields.map((f) => (
          <DateSelect key={f.label} label={f.label} options={f.options} />
        ))}
      </div>
    </AuthLayout2>
  );
};

export default TripleSelectStep;