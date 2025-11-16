// src/pages/ForgotPassword.jsx
import FormCard from "../components/FormCard.jsx";
import InputField from "../components/InputField.jsx";
import Button from "../components/Button.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useTranslation } from "react-i18next";
import { FaLock } from "react-icons/fa";

const ForgotPassword = () => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center items-center min-h-screen bg-myGray3 px-4 relative py-6">

      {/* ⭐ FormCard EXACT comme Login (on ne touche pas FormCard) */}
      <FormCard 
        title={t("forgotPassword.title")} 
        subtitle="" 
        topRight={<LanguageToggle />}  
        
      >
{/* Texte d’aide qui occupe plus d’espace */}
<p className="text-myGray2 text-sm leading-5 mb-4">
  Choisissez un mot de passe sécurisé, d’au moins 8 caractères, incluant lettres, chiffres et symboles, afin de protéger efficacement votre compte.
</p>
        
        {/* ⭐ Wrapper interne pour forcer la hauteur */}
        <div className="w-full max-w-sm mx-auto min-h-[279px] flex flex-col justify-center">

          {/* Nouveau mot de passe */}
          <p className="text-myBlack text-sm font-semibold  mb-3 ">
            {t("forgotPassword.newPassword")}
                </p>
          <InputField 
            type="password"
            placeholder={t("forgotPassword.newPassword")}
            icon={<FaLock />}
          />

          {/* Confirmation */}
          <p className="text-myBlack text-sm font-semibold mb-1 mt-3">
            {t("forgotPassword.confirmPassword")}
          </p>

          <InputField 
            type="password"
            placeholder={t("forgotPassword.confirmPassword")}
            icon={<FaLock />}
          />

          {/* Bouton */}
          <Button 
            type="submit" 
            label={t("forgotPassword.send")}
            className="mt-6"
          />

        </div>

      </FormCard>
    </div>
  );
};

export default ForgotPassword;


