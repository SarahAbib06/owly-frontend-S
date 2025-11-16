// src/components/InputField.jsx
const InputField = ({ type, placeholder, icon }) => (
  <div className="flex items-center bg-myGray rounded-lg mb-4 px-4 py-2 w-full ">
    {icon && <span className="text-myGray2 mr-2">{icon}</span>}
    <input
      type={type}
      placeholder={placeholder}
      className="bg-transparent  focus:outline-none w-full text-myGray2"
    />
  </div>
);

export default InputField;
