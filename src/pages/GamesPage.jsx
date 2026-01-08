import React from "react";
import { useNavigate } from "react-router-dom";
import { GiGamepad } from "react-icons/gi";
import { useTranslation } from "react-i18next";
import { IoArrowBackOutline } from "react-icons/io5";
export default function GamesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const games = [
    { name: t("gamesPage.owly_quiz"), route: "/owly-quiz" },
    { name: t("gamesPage.rock_paper_scissors"), route: "/rock-paper-scissors" },
    { name: t("gamesPage.memory_game"), route: "/memory-game" },
    { name: t("gamesPage.tictac"), route: "/tic-tac-toe2" },
  ];

  return (
    <div className="min-h-[calc(100vh-2rem)] p-6 flex flex-col items-center justify-start bg-myYellow text-black dark:text-white">
<div className="w-full max-w-4xl mx-auto px-4 mb-8">
  {/* Header */}
  <div className="flex items-center justify-start">

    {/* Bouton icône retour */}
    <button
      onClick={() => navigate("/MessagesPage")}
      className="
        p-2 
        bg-black text-yellow-400 
        rounded-full 
        shadow-md 
        hover:bg-gray-800 hover:text-yellow-300 
        transition
        flex items-center justify-center
      "
    >
      <IoArrowBackOutline className="text-2xl sm:text-3xl" />
    </button>

    {/* Titre centré */}
    <h1 className="flex-1 text-center text-3xl font-bold flex items-center justify-center gap-3">
      <GiGamepad className="text-yellow-600" /> {t("gamesPage.choose_game")}
    </h1>

  </div>
</div>


      {/* GRILLE DES JEUX */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl">

        {games.map((game, idx) => (
          <div
            key={idx}
            onClick={() => navigate(game.route)}
            className="cursor-pointer p-6 rounded-xl bg-white dark:bg-gray-800 shadow-lg flex flex-col items-center justify-center hover:scale-105 transform transition duration-300 hover:shadow-2xl"
          >
            <span className="text-xl font-semibold mb-2 dark:text-white">{game.name}</span>
            <GiGamepad className="w-12 h-12 text-yellow-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
