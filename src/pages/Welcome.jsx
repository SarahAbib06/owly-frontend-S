import React from "react";
import logo from "../assets/images/owlylogo.png"; // ajuste le chemin du logo selon ton projet

const Welcome = () => {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-center px-4"
      style={{
        backgroundColor: "#f9ee34",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* Logo */}
      <img
        src={logo}
        alt="Owly logo"
        className="w-60 h-86  -mt-20 mb-0 object-contain "
      />

      {/* Slogan */}
      <h1 className="text-2xl md:text-3xl font-semibold -mt-20 text-black mb-8">
        “Owly, where messages fly fast.”
      </h1>

      {/* Bouton Connexion */}
                      <a
  href="/"
  className="
    text-white px-8 py-3 rounded-md mb-4
    bg-myBlack
    hover:bg-myGray2
    transition-all
    sm:w-40 md:w-60
  "
>
  Connexion
</a>

      {/* Lien Créez un compte */}
      <a
        href="/create-account"
        className="text-black text-sm cursor-pointer hover:underline"
      >
        Créez un compte
      </a>
    </div>
  );
};

export default Welcome;