import { useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import logo from "../assets/images/owlylogo.png";

export default function MediaDocuments({ onBack }) {
  const [activeTab, setActiveTab] = useState("media");

  // Fake data (pour tester)
  // supprime le contenue des liste pour voir le logo de aucun media
  const fakeMedias = [
    "/images/photo1.jpg",
    "/images/photo2.jpg",
    "/images/photo3.jpg",
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
          Médias, documents
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
          Médias
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`w-1/2 text-center px-6 pb-2 ${
            activeTab === "docs"
              ? "border-b-2 border-myYellow font-medium"
              : "text-gray-500"
          }`}
        >
          Documents
        </button>
      </div>

      {/* 🟡 CONTENU DES ONGLES */}
      {activeTab === "media" ? (
        fakeMedias.length === 0 ? (
          /* 🟡 EMPTY STATE POUR MEDIAS */
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-15 h-15 rounded-2xl bg-myYellow flex items-center justify-center shadow mb-6">
              <img
                src={logo}
                alt="Logo"
                className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[300px] md:h-[300px] object-contain"
              />
            </div>

            <p className="text-lg font-bold text-myBlack dark:text-myWhite">
              Aucun médias
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
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-15 h-15 rounded-2xl bg-myYellow flex items-center justify-center shadow mb-6">
            <img
              src={logo}
              alt="Logo"
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] md:w-[300px] md:h-[300px] object-contain"
            />
          </div>

          <p className="text-lg font-bold text-myBlack dark:text-myWhite">
            Aucun document
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
