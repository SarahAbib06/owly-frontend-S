import { FaUser, FaLock, FaEnvelope } from "react-icons/fa";
import FormCard from "../components/FormCard.jsx";
import InputField from "../components/InputField.jsx";
import Checkbox from "../components/Chekbox.jsx";
import Button from "../components/Button.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useTranslation } from "react-i18next";

const Register = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-myGray3 flex justify-center items-center px-4">

      {/* 🎯 Le bouton langue est maintenant dans FormCard */}
      <FormCard 
        title={t("register.createAccount")} 
        subtitle={t("register.subtitle")}
        topRight={<LanguageToggle />}
      >
        <form className="w-full max-w-sm space-y-3 sm:space-y-4">
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
            <a href="/login" className="text-myBlack font-semibold">
              {t("register.login")}
            </a>
          </p>
        </form>
      </FormCard>

    </div>
  );
};

export default Register;

