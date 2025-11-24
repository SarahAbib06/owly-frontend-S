import React, { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import { MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";



export default function ModifierMotDePasse({ setSelectedMenu}) {
    const { t } = useTranslation();

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
   <div className="bg-myGray4 dark:bg-mydarkGray3 rounded-xl p-8 w-full shadow-sm font-poppins">


      {/* TITRE */}
      <div className="flex items-center gap-2 mb-6">

               <div className="flex items-center gap-2 mb-2">
                       <FaArrowLeft
                         className="w-4 h-4 text-myBlack dark:text-white cursor-pointer"
                         onClick={() => setSelectedMenu("privacy")}
                       />
        <h2 className="text-2xl font-semibold text-myBlack dark:text-white ml-3">{t("modifierMotDePasse.titre")}</h2>
        </div>
      </div>

      <p className="text-sm mb-6 text-[#575757]">{t("modifierMotDePasse.sousTitre")}</p>

      <div className="flex flex-col gap-5 max-w-lg">

        {/* INPUT 1 — Ancien mot de passe */}
        <div className="p-[2px] rounded-xl bg-gradient-to-r from-myYellow to-myGray">
          <div className="relative flex items-center bg-white dark:bg-mydarkWhite rounded-xl px-4">
            
        <MdLock className="text-gray-400" size={24} />



            <input
              type={showOld ? "text" : "password"}
              placeholder={t("modifierMotDePasse.motDePasseActuel")}
              className="w-full p-3 bg-transparent outline-none"
            />

            <button type="button" onClick={() => setShowOld(!showOld)}>
              {showOld ? (
                <MdVisibilityOff size={22} className="text-gray-400"/>
              ) : (
                <MdVisibility size={22} className="text-gray-400"/>
              )}
            </button>
          </div>
        </div>

        {/* INPUT 2 — Nouveau mot de passe */}
        <div className="p-[2px] rounded-xl bg-gradient-to-r from-myYellow to-myGray">
          <div className="relative flex items-center bg-white dark:bg-mydarkWhite rounded-xl px-4">
            
            <MdLock className="text-gray-400" size={24} />



            <input
              type={showNew ? "text" : "password"}
              placeholder={t("modifierMotDePasse.nouveauMotDePasse")}
              className="w-full p-3 bg-transparent outline-none"
            />

            <button type="button" onClick={() => setShowNew(!showNew)}>
              {showNew ? (
                <MdVisibilityOff size={22}className="text-gray-400" />
              ) : (
                <MdVisibility size={22}className="text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* INPUT 3 — Confirmer */}
        <div className="p-[2px] rounded-xl bg-gradient-to-r from-myYellow to-myGray">
          <div className="relative flex items-center bg-white dark:bg-mydarkWhite rounded-xl px-4">
            
            <MdLock className="text-gray-400" size={24} />



            <input
              type={showConfirm ? "text" : "password"}
              placeholder={t("modifierMotDePasse.confirmerMotDePasse")}
              className="w-full p-3 bg-transparent outline-none"
            />

            <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? (
                <MdVisibilityOff size={22} className="text-gray-400"/>
              ) : (
                <MdVisibility size={22} className="text-gray-400"/>
              )}
            </button>
          </div>
        </div>

        {/* BOUTON */}
        <button className="bg-[#008C23] hover:bg-myGray2 text-white h-[54px] w-[147px] rounded-xl font-semibold">
          {t("modifierMotDePasse.enregistrer")}
        </button>

      </div>
    </div>
  );
}
