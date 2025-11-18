// src/components/Checkbox.jsx
const Checkbox = ({ label }) => (
  <label className="flex items-center text-sm text-myBlack mb-4">
    <input type="checkbox" className="mr-2 accent-myYellow" />
    {label}
  </label>
);

export default Checkbox;
