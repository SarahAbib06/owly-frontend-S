import { FaMoon, FaAngleDown } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export default function ParametresGeneral({ setSelectedMenu }) {

  const { t, i18n } = useTranslation();

  return (
    <div
      className="
        w-full
        bg-myGray4 dark:bg-mydarkGray3
        rounded-xl 
        shadow-md 
        border border-myGray4 dark:border-gray-700
        p-6
        h-[400px]  // ← ici tu règles la hauteur
        overflow-auto
      "
    >
        
       
      {/* TITRE */}
      <div>
             <div className="flex items-center gap-3 mb-6">
          <FaArrowLeft
            onClick={() => setSelectedMenu(null)}
            className="w-5 h-5 text-myBlack dark:text-white cursor-pointer lg:hidden"
          />
        <h1 className="text-2xl font-semibold text-myBlack dark:text-white">
          {t("parametresGeneral.Title")}
        </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {t("parametresGeneral.Description")}
        </p>
      </div>

      {/* --- LANGUE --- */}
      <div className="flex flex-col gap-2 mt-6">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t("parametresGeneral.Language")}
        </span>

        <div className="flex items-center justify-between w-60 bg-white dark:bg-[#2E2F2F] border border-gray-300 dark:border-gray-600 p-3 rounded-md">
          <span className="text-sm text-myBlack dark:text-white">
            {i18n.language === "en" ? "English" : "Français"}
          </span>
          <FaAngleDown className="text-gray-600 dark:text-gray-300" />
        </div>
      </div>

      {/* --- THÈME --- */}
      <div className="flex flex-col gap-2 mt-4">
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t("parametresGeneral.Theme")}
        </span>

        <div className="flex items-center justify-between w-60 bg-white dark:bg-[#2E2F2F] border border-gray-300 dark:border-gray-600 p-3 rounded-md">
          <span className="text-sm flex items-center gap-2 text-myBlack dark:text-white">
            <FaMoon /> {t("parametresGeneral.LightMode")}
          </span>
          <FaAngleDown className="text-gray-600 dark:text-gray-300" />
        </div>
      </div>
    </div>
  );
}
