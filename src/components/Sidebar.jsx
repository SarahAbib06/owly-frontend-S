// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { FaFeatherAlt, FaRobot, FaMoon, FaSun, FaBars } from "react-icons/fa";
import { MdMessage, MdGroups, MdSettings } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "fr" : "en");
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setIsDark(!isDark);

    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <>
      {/* --- VERTICAL SIDEBAR pour grand écran --- */}
      <div className={`hidden sm:flex w-22 h-screen flex-col justify-between items-center py-6 shadow-md border-r-2    border-gray-400  
      z-[9999]
        ${isDark ? "bg-[#2E2F2F]" : "bg-[#f0f0f0]"} transition-colors duration-300`}>
        
        {/* TOP ICONS */}
        <div className="flex flex-col items-center gap-5">
          {/* OWLY LOGO */}
          <NavLink to="/welcome">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 group">
                <div className={`p-3 rounded-md transition ${isDark 
                  ? isActive ? "bg-[#F9EE34]" : "hover:bg-gray-700" 
                  : isActive ? "bg-black" : "hover:bg-gray-300"}`}>
                  <FaFeatherAlt className={`w-6 h-6 transition ${isDark 
                    ? isActive ? "text-black" : "text-white" 
                    : isActive ? "text-white" : "text-myBlack"}`} />
                </div>
              </div>
            )}
          </NavLink>

          {/* MESSAGES */}
          <NavLink to="/MessagesPage">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 group">
                <div className={`p-3 rounded-md transition ${isDark 
                  ? isActive ? "bg-[#F9EE34]" : "hover:bg-gray-700" 
                  : isActive ? "bg-black" : "hover:bg-gray-300"}`}>
                  <MdMessage className={`w-6 h-6 transition ${isDark 
                    ? isActive ? "text-black" : "text-white" 
                    : isActive ? "text-white" : "text-myBlack"}`} />
                </div>
                <span className={`text-xs font-medium -mt-3 transform transition-transform duration-150 ${isDark ? "text-white" : "text-myBlack"} ${isActive ? "translate-y-4" : "translate-y-0 group-hover:translate-y-4"}`}>
                  {t("sidebar.Message")}
                </span>
              </div>
            )}
          </NavLink>

          {/* GROUPES */}
          <NavLink to="/groupes">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 group">
                <div className={`p-3 rounded-md transition ${isDark 
                  ? isActive ? "bg-[#F9EE34]" : "hover:bg-gray-700" 
                  : isActive ? "bg-black" : "hover:bg-gray-300"}`}>
                  <MdGroups className={`w-6 h-6 transition ${isDark 
                    ? isActive ? "text-black" : "text-white" 
                    : isActive ? "text-white" : "text-myBlack"}`} />
                </div>
                <span className={`text-xs font-medium -mt-3 transform transition-transform duration-150 ${isDark ? "text-white" : "text-myBlack"} ${isActive ? "translate-y-4" : "translate-y-0 group-hover:translate-y-4"}`}>
                  {t("sidebar.Groupe")}
                </span>
              </div>
            )}
          </NavLink>

          {/* --- Séparateur --- */}
          <div className="w-10 border-t-2 border-gray-400 mt-0 mb-2"></div>

          {/* OWLY AI */}
          <NavLink to="/assistant">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 group -mt-6">
                <div className={`p-3 rounded-md transition ${isDark 
                  ? isActive ? "bg-[#F9EE34]" : "hover:bg-gray-700" 
                  : isActive ? "bg-black" : "hover:bg-gray-300"}`}>
                  <FaRobot className={`w-6 h-6 transition ${isDark 
                    ? isActive ? "text-black" : "text-white" 
                    : isActive ? "text-white" : "text-myBlack"}`} />
                </div>
                <span className={`text-xs font-medium -mt-3 transform transition-transform duration-150 ${isDark ? "text-white" : "text-myBlack"} ${isActive ? "translate-y-4" : "translate-y-0 group-hover:translate-y-4"}`}>
                  {t("sidebar.Owly AI")}
                </span>
              </div>
            )}
          </NavLink>

          {/* LANGUE */}
          <button onClick={toggleLanguage} className="mt-2 p-2 rounded-md border border-gray-400 text-xs font-medium hover:bg-gray-300 transition">
            {i18n.language === "en" ? "FR" : "EN"}
          </button>

          {/* DARK/LIGHT */}
          <button
            onClick={toggleTheme}
            className={`relative w-16 h-8 flex items-center px-1 rounded-full transition-all duration-500 shadow-md
              ${isDark ? "bg-[#F9EE34]" : "bg-gray-300"} mt-2`}
          >
            <FaSun className={`text-white absolute left-2 transition-opacity duration-300 ${isDark ? "opacity-50" : "opacity-100"}`} />
            <FaMoon className={`text-white absolute right-2 transition-opacity duration-300 ${isDark ? "opacity-100" : "opacity-50"}`} />
            <span className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-500 ${isDark ? "translate-x-8" : "translate-x-0"}`}></span>
          </button>
        </div>

        {/* BOTTOM */}
        <div className="flex flex-col items-center gap-5 mb-2">
          {/* PARAMÈTRES */}
          <NavLink to="/settings">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 group">
                <div className={`p-3 rounded-md transition ${isDark 
                  ? isActive ? "bg-[#F9EE34]" : "hover:bg-gray-700" 
                  : isActive ? "bg-black" : "hover:bg-gray-300"}`}>
                  <MdSettings className={`w-6 h-6 transition ${isDark 
                    ? isActive ? "text-black" : "text-white" 
                    : isActive ? "text-white" : "text-myBlack"}`} />
                </div>
                <span className={`text-xs font-medium -mt-3 transform transition-transform duration-150 ${isDark ? "text-white" : "text-myBlack"} ${isActive ? "translate-y-4" : "translate-y-0 group-hover:translate-y-4"}`}>
                  {t("sidebar.Paramètres")}
                </span>
              </div>
            )}
          </NavLink>

          {/* PROFIL */}
          <NavLink to="/profile">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 group">
                <div className={`rounded-full transition ${isDark && isActive ? "bg-[#F9EE34] p-0.5" : ""}`}>
                  <img 
                    src="/assets/profile.jpg" 
                    alt="profile" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-myBlack transition" 
                  />
                </div>
                <span className={`text-xs font-medium mt-1 ${isDark ? "text-white" : "text-myBlack"}`}>
                  {t("sidebar.Profile")}
                </span>
              </div>
            )}
          </NavLink>
        </div>
      </div>

      {/* --- HORIZONTAL SIDEBAR pour petit et moyen écran --- */}
<div className={`sm:hidden fixed bottom-0 left-0 right-0 h-15 w-full flex justify-around items-center shadow-md border-t-2 z-[9999]
  ${isDark ? "border-gray-400 bg-[#2E2F2F]" : "border-gray-200 bg-[#f0f0f0]"} transition-colors duration-300`}>

  {/* MESSAGES */}
  <NavLink to="/MessagesPage">
    {({ isActive }) => (
      <div className="flex flex-col items-center gap-1">
        <div className={`p-2 rounded-md transition ${isActive ? (isDark ? "bg-[#F9EE34]" : "bg-black") : ""} flex justify-center items-center w-14 h-6`}>
          <MdMessage className={`w-6 h-6 ${isActive ? (isDark ? "text-black" : "text-white") : (isDark ? "text-white" : "text-myBlack")}`} />
        </div>
        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-myBlack"}`}>
          {t("sidebar.Message")}
        </span>
      </div>
    )}
  </NavLink>

  {/* GROUPES */}
  <NavLink to="/groupes">
    {({ isActive }) => (
      <div className="flex flex-col items-center gap-1">
        <div className={`p-2 rounded-md transition ${isActive ? (isDark ? "bg-[#F9EE34]" : "bg-black") : ""} flex justify-center items-center w-14 h-6`}>
          <MdGroups className={`w-6 h-6 ${isActive ? (isDark ? "text-black" : "text-white") : (isDark ? "text-white" : "text-myBlack")}`} />
        </div>
        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-myBlack"}`}>
          {t("sidebar.Groupe")}
        </span>
      </div>
    )}
  </NavLink>

  {/* OWLY AI */}
  <NavLink to="/assistant">
    {({ isActive }) => (
      <div className="flex flex-col items-center gap-1">
        <div className={`p-2 rounded-md transition ${isActive ? (isDark ? "bg-[#F9EE34]" : "bg-black") : ""} flex justify-center items-center w-14 h-6`}>
          <FaRobot className={`w-6 h-6 ${isActive ? (isDark ? "text-black" : "text-white") : (isDark ? "text-white" : "text-myBlack")}`} />
        </div>
        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-myBlack"}`}>
          {t("sidebar.Owly AI")}
        </span>
      </div>
    )}
  </NavLink>

  {/* MENU BURGER */}
  <div className="flex flex-col items-center gap-1 relative">
    <button
      onClick={() => setMenuOpen(!menuOpen)}
      className={`p-2 rounded-md transition flex justify-center items-center w-14 h-6 ${menuOpen ? (isDark ? "bg-[#F9EE34]" : "bg-black") : ""}`}
    >
      <FaBars className={`w-6 h-6 ${menuOpen ? (isDark ? "text-black" : "text-white") : (isDark ? "text-white" : "text-myBlack")}`} />
    </button>
    <span className={`text-xs font-medium ${isDark ? "text-white" : "text-myBlack"}`}>
      Menu
    </span>

    {/* MENU POPUP */}
    {menuOpen && (
      <div className={`fixed inset-0 flex justify-center items-center z-50`}>
        <div className={`w-60 p-6 rounded-md flex flex-col gap-4 shadow-lg
          ${isDark ? "bg-[#2E2F2F]" : "bg-[#EAEAEA]"}`}>

          {/* BOUTON FERMER */}
          <button
            onClick={() => setMenuOpen(false)}
            className="self-end mb-2 text-xl font-bold text-myBlack dark:text-white hover:opacity-70 transition"
          >
            &times;
          </button>

          {/* PROFIL */}
          <div className="flex items-center gap-3">
            <img src="/assets/profile.jpg" alt="profile" className="w-12 h-12 rounded-full object-cover border-2 border-myBlack" />
            <span className={`text-sm font-medium ${isDark ? "text-white" : "text-myBlack"}`}>
              Rayane ARAB
            </span>
          </div>

          {/* PARAMÈTRES */}
<NavLink 
  to="/settings"
  className="flex items-center gap-3"
  onClick={() => setMenuOpen(false)} // pour fermer le popup après clic
>
  <MdSettings className={`w-6 h-6 ${isDark ? "text-white" : "text-myBlack"}`} />
  <span className={`text-sm font-medium ${isDark ? "text-white" : "text-myBlack"}`}>
    {t("sidebar.Paramètres")}
  </span>
</NavLink>

          {/* LANGUE */}
          <button
            onClick={toggleLanguage}
            className="p-2 rounded-md border border-gray-400 text-xs font-medium hover:bg-gray-300 transition"
          >
            {i18n.language === "en" ? "FR" : "EN"}
          </button>

          {/* DARK/LIGHT MODE */}
          <button
            onClick={toggleTheme}
            className={`relative w-16 h-8 flex items-center px-1 rounded-full transition-all duration-500 shadow-md
              ${isDark ? "bg-[#F9EE34]" : "bg-gray-300"}`}
          >
            <FaSun className={`text-white absolute left-2 transition-opacity duration-300 ${isDark ? "opacity-50" : "opacity-100"}`} />
            <FaMoon className={`text-white absolute right-2 transition-opacity duration-300 ${isDark ? "opacity-100" : "opacity-50"}`} />
            <span className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-500 ${isDark ? "translate-x-8" : "translate-x-0"}`}></span>
          </button>

        </div>
      </div>
    )}
  </div>

</div>


    </>
  );
}
