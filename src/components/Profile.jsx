import { useState } from "react";
import { Camera } from "lucide-react";
import yacine from "../assets/images/yacine.jpg";
import { FaUser } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { useTranslation } from "react-i18next";

export default function Profile({ setSelectedMenu }) {
  const [editMode, setEditMode] = useState(false);
  const { t } = useTranslation();
  const [name, setName] = useState("Mehdi ATT");
const [email, setEmail] = useState("mehdiattouche89@gmail.com");


  return (
    <div className="bg-myGray4 dark:bg-neutral-900 p-6 rounded-2xl shadow-md lg:h-125 h-auto">
                   
      <div className="flex items-center gap-3 mb-6">
  <FaArrowLeft
    onClick={() => setSelectedMenu(null)}
    className="w-5 h-5 text-myBlack dark:text-white cursor-pointer lg:hidden"
  />

  <h2 className="text-2xl font-semibold">
    {t("profile.profile")}
  </h2>
</div>

      {/* ▬▬▬ CARD 1 : identité ▬▬▬ */}
      <div className="
        bg-myGray4 dark:bg-neutral-800 
        rounded-xl border-[1.2px] border-myBlack 
        p-7 mb-6 
        flex items-center justify-between 
        flex-col sm:flex-col md:flex-row 
        gap-4
        w-full
      ">

        {/* Left side */}
        <div className="flex items-center gap-4 flex-col md:flex-row text-center md:text-left">
          <img
            src={yacine}
            className="w-16 h-16 rounded-full object-cover border"
          />
          <div>
            <p className="text-md">Mehdi ATT</p>
            <p className="text-gray-500 text-sm pt-1.5">mehdiattouche89@gmail.com</p>
          </div>
        </div>

        {/* Right side button */}
        {editMode && (
          <button className="bg-[#008C23] hover:bg-green-700 dark:bg-myYellow text-white text-xs font-semibold px-5 py-2 rounded-lg flex items-center gap-2">
            <Camera size={18} /> {t("profile.changePhoto")}
          </button>
        )}
      </div>

      {/* ▬▬▬ CARD 2 : infos personnelles ▬▬▬ */}
      <div className="
        bg-myGray4 dark:bg-neutral-800 
        rounded-xl border-[1.2px] border-myBlack 
        p-4 w-full
      ">

        <div className="flex items-center justify-between mb-6 flex-col md:flex-row gap-4">

          <div>
            <h3 className="font-semibold text-lg mb-2">
              {t("profile.personalInfo")}
            </h3>
            <p className="text-sm text-gray-500">
              {t("profile.personalInfoDesc")}
            </p>
          </div>

          {/* Top-right buttons */}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="bg-black text-white text-xs font-semibold px-6 py-2.5 rounded-lg w-full md:w-auto h-9"
            >
              {t("profile.edit")}
            </button>
          ) : (
            <div className="flex gap-3 flex-col md:flex-row w-full md:w-auto">
              <button
                onClick={() => setEditMode(false)}
                className="border border-myBlack text-xs font-semibold dark:bg-neutral-700 px-6 py-2.5 rounded-lg h-9 w-full md:w-auto"
              >
                {t("profile.cancel")}
              </button>

              <button
                onClick={() => setEditMode(false)}
                className="bg-[#008C23] hover:bg-green-700 dark:bg-myYellow text-white text-xs font-semibold px-6 py-2.5 rounded-lg h-9 w-full md:w-auto"
              >
                {t("profile.save")}
              </button>
            </div>
          )}
        </div>

        {/* ▬ FORM ▬ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="flex flex-col">
            <label className="text-sm mb-2">{t("profile.username")}</label>

            <div className="p-[2px] rounded-lg bg-gradient-to-r from-[#F9EE34] via-gray-300 to-transparent">
              <div className="flex items-center bg-white dark:bg-neutral-800 rounded-lg px-3">
                <FaUser className="text-gray-500 text-sm mr-2" />
                <input
  className="w-full py-2 text-xs bg-transparent focus:outline-none"
  value={name}
  onChange={(e) => setName(e.target.value)}
  disabled={!editMode}
/>

              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm mb-2">{t("profile.email")}</label>

            <div className="p-[2px] rounded-lg bg-gradient-to-r from-[#F9EE34] via-gray-300 to-transparent">
              <div className="flex items-center bg-white dark:bg-neutral-800 rounded-lg px-3">
                <MdEmail className="text-gray-500 text-sm mr-2" />
                                    <input
  className="w-full py-2 text-xs bg-transparent focus:outline-none"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  disabled={!editMode}
/>
              </div>
            </div>
          </div>
        </div>

        {editMode && (
          <div className="mt-6">
            <button className="bg-[#EF0000] hover:bg-red-700 text-white text-xs font-semibold px-5 py-2 rounded-lg">
              {t("profile.deleteAccount")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
