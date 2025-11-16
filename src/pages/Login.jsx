// src/pages/Login.jsx
import { FaEnvelope, FaLock } from "react-icons/fa";
import FormCard from "../components/FormCard.jsx";
import InputField from "../components/InputField.jsx";
import Checkbox from "../components/Chekbox.jsx";
import Button from "../components/Button.jsx";
import DarkModeToggle from "../components/DarkModeToggle.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx"; // nouveau
import { useTranslation } from "react-i18next";
import { FaKey } from "react-icons/fa";// je l ai ajouter apres kenza

const Login = () => {
  const { t } = useTranslation(); // pour traduire les textes

  return (
    <div className="flex justify-center items-center min-h-screen bg-myGray3 px-4 relative py-6">
      
      {/* 🔹 Switch Dark Mode et Langue en haut à droite */}
      {/*
      <div className="absolute top-4 right-4 flex gap-2">
        <DarkModeToggle />
        <LanguageToggle />
      </div> */}
      
      <FormCard title={t("login.welcome")} subtitle={t("login.subtitle")}  topRight={<LanguageToggle />}>
        <form className="w-full mx-auto">
          <InputField 
            type="email" 
            placeholder={t("login.emailPlaceholder")} 
            icon={<FaEnvelope />} 
          />
          <InputField 
            type="password" 
            placeholder={t("login.passwordPlaceholder")} 
            icon={<FaLock />} 
          />
                 

               {/* Mot de passe oublié juste en dessous du bouton */}
<div className="w-full flex justify-end mt-2">
  <a
    href="/forgot-password"
    className="text-xs text-myBlack font-semibold cursor-pointer mt-2  mb-8 hover:text-myYellow transition-colors duration-300"
  >
    Mot de passe oublié ?
  </a>
</div>


          

          <Button type="submit" label={t("login.connect")}   />

                     




        
          <p className="text-sm w-full sm:text-left text-center md:text-center mt-3 text-myBlack ">
            {t("login.noAccount")}{" "}
            <a href="/register" className="text-myBlack font-semibold">
              {t("login.register")}
            </a>
          </p>

         <div className="mt-4  h-23"></div>

        </form>
      </FormCard>
    </div>
  );
};

export default Login;
