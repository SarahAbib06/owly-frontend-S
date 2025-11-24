import { useState, useEffect } from "react";
import ParametresMenu from "../components/ParametresMenu";
import ParametresGeneral from "../components/ParametresGenral";
import ParametresConfidentialite from "../components/ParametresConfidentialite";
import DerniereConnexion from "../components/DerniereConnexion";
import Statut from "../components/Statut";
import Profile from "../components/Profile";
import UtilisateursBloques from "../components/UtilisateursBloques";
import ModifierMotDePasse from "../components/ModefierMotDePasse";

export default function SettingsPage() {
  
  const isDesktopInit = window.innerWidth >= 1024;
  const [isDesktop, setIsDesktop] = useState(isDesktopInit);

  // MENU PRINCIPAL
  const [selectedMenu, setSelectedMenu] = useState(
    isDesktopInit ? "general" : null
  );

  // SOUS-MENU
  const [selectedSubMenu, setSelectedSubMenu] = useState(null);

  const [dernierConnexionChoice, setDernierConnexionChoice] = useState("Personne");
  const [statutChoice, setStatutChoice] = useState("Personne");

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen p-6 gap-6 bg-myGray dark:bg-mydarkWhite flex-col lg:flex-row">

      {/* MENU GAUCHE */}
      {isDesktop && (
        <div className="w-auto">
          <ParametresMenu selected={selectedMenu} setSelected={setSelectedMenu} />
        </div>
      )}

      <div className="flex-1">

        {/* MENU MOBILE */}
        {!isDesktop && selectedMenu === null && (
          <ParametresMenu selected={selectedMenu} setSelected={setSelectedMenu} />
        )}

        {/* === MENU PRINCIPAL === */}
        {selectedMenu === "general" && (
          <ParametresGeneral setSelectedMenu={setSelectedMenu} />
        )}

        {selectedMenu === "profil" && (
          <Profile setSelectedMenu={setSelectedMenu} />
        )}

        {selectedMenu === "privacy" && selectedSubMenu === null && (
          <ParametresConfidentialite
            setSelectedMenu={setSelectedMenu}
            setSelectedSubMenu={setSelectedSubMenu}
            dernierConnexionChoice={dernierConnexionChoice}
            statutChoice={statutChoice}
          />
        )}

        {/* === SOUS-MENU === */}
        {selectedSubMenu === "lastLogin" && (
          <DerniereConnexion
            setSelectedSubMenu={setSelectedSubMenu}
            selection={dernierConnexionChoice}
            setSelection={setDernierConnexionChoice}
          />
        )}

        {selectedSubMenu === "statut" && (
          <Statut
            setSelectedSubMenu={setSelectedSubMenu}
            selection={statutChoice}
            setSelection={setStatutChoice}
          />
        )}

        {selectedSubMenu === "blockedUsers" && (
          <UtilisateursBloques setSelectedSubMenu={setSelectedSubMenu} />
        )}

        {selectedSubMenu === "ModefierMotDePasse" && (
          <ModifierMotDePasse setSelectedSubMenu={setSelectedSubMenu} />
        )}
      </div>
    </div>
  );
}
