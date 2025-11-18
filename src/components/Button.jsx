// src/components/Button.jsx
const Button = ({ type = "button", label, onClick, className = "" }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-myBlack text-myWhite w-full  md:w-[320px] py-2 rounded-lg font-semibold hover:bg-myGray2 transition ${className}`}
    > 
      {label}
    </button>
  );
};

export default Button;
