// src/pages/OtpPage.jsx
import { useState } from "react";
import FormCard from "../components/FormCard.jsx";
import Button from "../components/Button.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useTranslation } from "react-i18next";

const OtpPage = () => {
  const { t } = useTranslation();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const handleChange = (index, value) => {
    if (/^[0-9]?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    console.log("OTP soumis:", otpCode);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-myGray3 px-3 sm:px-6 relative">

      {/* FormCard AVEC le bouton langue */}
      <FormCard >
        
        {/* --- TITRE ET DESCRIPTION --- */}
        <div className="flex flex-col justify-center w-full h-auto md:h-[182px] mt-6 sm:mt-6 md:mt-16 text-center px-2 sm:px-0">
          <h1 className="text-lg sm:text-xl font-bold">
            {t("otp.title")}
          </h1>

          <p className="text-gray-600 mt-2 text-xs sm:text-sm leading-snug">
            {t("otp.description")}
          </p>

          <span className="text-lg sm:text-xl font-bold mt-3 sm:mt-4">
            {t("otp.code")}
          </span>
        </div>

        {/* --- INPUTS OTP --- */}
        <form className="w-full flex flex-col items-center justify-center mt-4 sm:mt-6" onSubmit={handleSubmit}>
          <div className="flex justify-between mb-4 sm:mb-6 w-full max-w-[220px] sm:max-w-xs -mt-1">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                placeholder="0"
                maxLength={1}
                className="text-center w-9 h-9 sm:w-12 sm:h-11 text-base sm:text-lg font-bold rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-myYellow"
              />
            ))}
          </div>

          {/* --- BOUTON --- */}
          <Button
            type="submit"
            label={t("otp.verify")}
            className="w-full max-w-xs mb-2 sm:mb-4 mt-4"
          />
        </form>

      </FormCard>
    </div>
  );
};

export default OtpPage;
