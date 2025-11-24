import { FaArrowLeft, FaUserSlash } from "react-icons/fa";
import { useTranslation } from "react-i18next";

export default function UtilisateursBloques({ setSelectedMenu }) {
  const { t } = useTranslation();

  const users = [
     { id: 1, name: "Yacine zerfa", img: "/images/user1.jpg" },
    { id: 2, name: "Yacine zerfa", img: "/images/user1.jpg" },
    { id: 3, name: "Yacine zerfa", img: "/images/user1.jpg" },
    { id: 4, name: "Yacine zerfa", img: "/images/user1.jpg" },
   
    // Si tu veux tester la page vide, laisse le tableau vide
  ];

  return (
    <div
      className="
        w-full bg-myGray4 dark:bg-mydarkGray3
        rounded-xl shadow-md 
        border border-myGray4 dark:border-gray-700
        p-6 h-[400px] overflow-auto
        flex flex-col
      "
    >
      {/* TITRE + RETOUR */}
      <div className="flex items-center gap-3 mb-6">
        <FaArrowLeft
          onClick={() => setSelectedMenu("privacy")}
          className="w-5 h-5 cursor-pointer text-myBlack dark:text-white"
        />
        <h1 className="text-xl font-semibold text-myBlack dark:text-white">
          {t("privacy.BlockedUsersTitle")}
        </h1>
      </div>

      {/* CONTENU */}
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 text-center gap-4">
          {/* Icône avec background plus grand et coins arrondis */}
          <div className="bg-myYellow w-20 h-20 flex items-center justify-center rounded-lg">
            <FaUserSlash className="text-black w-10 h-10" />
          </div>

          {/* Texte */}
          <span className="text-gray-500 text-sm font-semibold">
            {t("privacy.NoBlockedUsers")}
          </span>
          <span className="text-gray-400 text-xs mt-1 line-clamp-2">
            {t("privacy.BlockedUsersDescription")}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700 pb-3"
            >
              {/* Profil */}
              <div className="flex items-center gap-3">
                <img
                  src={u.img}
                  className="w-10 h-10 rounded-full object-cover"
                  alt="user"
                />
                <span className="text-sm text-myBlack dark:text-gray-300 font-medium">
                  {u.name}
                </span>
              </div>

              {/* Débloquer */}
              <button className="text-red-500 text-sm hover:underline">
                {t("privacy.Unblock")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
