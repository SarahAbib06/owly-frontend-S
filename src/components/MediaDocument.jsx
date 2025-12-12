import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import logo from "../assets/images/owlylogo.png";
import { useTranslation } from "react-i18next";
export default function MediaDocuments({ onBack }) {
  const [activeTab, setActiveTab] = useState("media");
   const { t } = useTranslation();

  // Fake data (pour tester)
  // supprime le contenue des liste pour voir le logo de aucun media
  const fakeMedias = [
   
  ];

  const fakeDocuments = [
    { name: "Document 1.pdf", size: "1.2 MB" },
    { name: "Document 2.docx", size: "900 KB" },
  ];

  return (
    <div className="w-full bg-myGray4 p-4">
      {/* Bouton retour */}
      <div className="flex items-center gap-2 mb-4">
        <FaArrowLeft
          className="w-4 h-4 text-myBlack dark:text-myWhite cursor-pointer"
          onClick={onBack}
        />
        <h1 className="text-2xl text-myBlack dark:text-myWhite ml-3">
          {t("Media.title")}
        </h1>
      </div>

      {/* Onglets */}
      <div className="flex justify-center border-b mb-4">
        <button
          onClick={() => setActiveTab("media")}
          className={`w-1/2 text-center px-6 pb-2 ${
            activeTab === "media"
              ? "border-b-2 border-myYellow font-medium"
              : "text-gray-500"
          }`}
        >
          {t("Media.medias")}
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`w-1/2 text-center px-6 pb-2 ${
            activeTab === "docs"
              ? "border-b-2 border-myYellow font-medium"
              : "text-gray-500"
          }`}
        >
          {t("Media.documents")}
        </button>
      </div>

      {/* 🟡 CONTENU DES ONGLES */}
      {activeTab === "media" ? (
        fakeMedias.length === 0 ? (
          /* 🟡 EMPTY STATE POUR MEDIAS */
          <div className="flex flex-col items-center mt-25 justify-center py-10">
            <div className="w-15 h-15 rounded-2xl bg-myYellow flex items-center justify-center shadow mb-6">
              <img
                src={logo}
                alt="Logo"
                className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[300px] md:h-[300px] object-contain"
              />
            </div>

            <p className="text-lg font-bold text-myBlack dark:text-myWhite">
               {t("Media.nomedia")}
            </p>
          </div>
        ) : (
          /* 🟢 AFFICHAGE NORMAL DES MEDIAS (style ORIGINE) */
          <div className="grid grid-cols-3 gap-4">
            {fakeMedias.map((src, index) => (
              <img
                key={index}
                src={src}
                className="rounded-lg object-cover w-full h-32"
              />
            ))}
          </div>
        )
      ) : fakeDocuments.length === 0 ? (
        /* 🟡 EMPTY STATE POUR DOCUMENTS */
        <div className="flex flex-col items-center mt-25  justify-center py-10">
          <div className="w-15 h-15 rounded-2xl  bg-myYellow flex items-center justify-center shadow mb-6">
            <img
              src={logo}
              alt="Logo"
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[300px] md:h-[300px] object-contain"
            />
          </div>

          <p className="text-lg font-bold text-myBlack dark:text-myWhite">
             {t("Media.nodocuments")}
          </p>
        </div>
      ) : (
        /* 🟢 AFFICHAGE NORMAL DES DOCUMENTS (ton style original) */
        <div className="space-y-3">
          {fakeDocuments.map((doc, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-myBlack dark:border-gray-700"
            >
              <p className="font-medium dark:text-myWhite">{doc.name}</p>
              <p className="text-sm text-gray-500 dark:text-myWhite">
                {doc.size}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
