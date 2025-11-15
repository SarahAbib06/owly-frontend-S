import { FaUser, FaLock, FaEnvelope } from "react-icons/fa";
import FormCard from "../components/FormCard.jsx";
import InputField from "../components/InputField.jsx";
import Checkbox from "../components/Chekbox.jsx";
import Button from "../components/Button.jsx";
import DarkModeToggle from "../components/DarkModeToggle.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useTranslation } from "react-i18next";

const Register = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-myGray3 relative px-4">

      

      {/* 🔹 SECTION CENTRÉE */}
      <div className="flex justify-center items-center min-h-screen">
        <FormCard 
          title={t("register.createAccount")} 
          subtitle={t("register.subtitle")}
        >
          <form className="w-full mx-auto">
            <InputField 
              type="text" 
              placeholder={t("register.username")} 
              icon={<FaUser />} 
            />
            <InputField 
              type="email" 
              placeholder={t("register.email")} 
              icon={<FaEnvelope />} 
            />
            <InputField 
              type="password" 
              placeholder={t("register.password")} 
              icon={<FaLock />} 
            />
            <InputField 
              type="password" 
              placeholder={t("register.confirmPassword")} 
              icon={<FaLock />} 
            />

            <Checkbox label={t("register.acceptTerms")} />

            <Button type="submit" label={t("register.signUp")} />

            <p className="text-sm text-center mt-3 text-myBlack">
              {t("register.alreadyHaveAccount")}{" "}
              <a href="/login" className="text-myBlack hover:text-myGray2 font-semibold">
                {t("register.login")}
              </a>
            </p>
            
          </form>
        </FormCard>
      </div>

    </div>
  );
};

export default Register;
