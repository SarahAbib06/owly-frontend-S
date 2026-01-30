import { useState, useEffect } from "react";
import {FaArrowLeft, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import logo from "../assets/images/owlylogo.png";

import { useTranslation } from "react-i18next";
import { messageService } from "../services/messageService";

export default function MediaDocument({ onBack, conversationId }) {
  const [activeTab, setActiveTab] = useState("media");
  const [media, setMedia] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 🔥 CHARGER LES MÉDIAS ET FICHIERS
  useEffect(() => {
    if (conversationId) {
      loadMediaAndFiles();
    }
  }, [conversationId]);

  const loadMediaAndFiles = async () => {
    try {
      setLoading(true);
      const response = await messageService.getConversationMedia(conversationId);
      
      console.log('📁 Médias et fichiers:', response);
      
      setMedia(response.media?.items || []);
      setFiles(response.files?.items || []);
    } catch (err) {
      console.error('❌ Erreur chargement médias:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 FORMATER LA TAILLE DES FICHIERS
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  // 🔥 OUVRIR LA LIGHTBOX
const openLightbox = (index) => {
  setCurrentImageIndex(index);
  setLightboxOpen(true);
};

// 🔥 FERMER LA LIGHTBOX
const closeLightbox = () => {
  setLightboxOpen(false);
};

// 🔥 IMAGE PRÉCÉDENTE
const goToPrevious = () => {
  setCurrentImageIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
};

// 🔥 IMAGE SUIVANTE
const goToNext = () => {
  setCurrentImageIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
};
// 🔥 NAVIGATION AU CLAVIER
useEffect(() => {
  const handleKeyDown = (e) => {
    if (!lightboxOpen) return;
    
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [lightboxOpen]);

  return (
    <div className="w-full bg-myGray4 dark:bg-neutral-800 p-4">
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
        media.length === 0 ? (
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
          /* AFFICHAGE MÉDIAS */
          <div className="grid grid-cols-3 gap-4">
            {media.map((item, index) => (
              <div key={index} className="relative">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt="Media"
                    className="rounded-lg object-cover w-full h-32 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openLightbox(index)}
                  />
                ) : (
                  <video
                    src={item.url}
                    className="rounded-lg object-cover w-full h-32 cursor-pointer"
                    onClick={() => openLightbox(index)}
                  />
                )}
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded">
                  {item.type === 'video' && item.duration && `${Math.floor(item.duration)}s`}
                </div>
              </div>
            ))}
          </div>
        )
      ) : files.length === 0 ? (
        /* EMPTY STATE DOCUMENTS */
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-15 h-15 rounded-2xl bg-myYellow flex items-center justify-center shadow mb-6">

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
        /* AFFICHAGE DOCUMENTS */
        <div className="space-y-3">
          {files.map((doc, index) => (
            <a
              key={index}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg border border-myBlack dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">📄</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium dark:text-myWhite truncate">
                    {doc.fileName || 'Document'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(doc.size)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
      {/* 🔥 LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          {/* Bouton Fermer */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
          >
            <FaTimes className="w-8 h-8" />
          </button>

          {/* Bouton Précédent */}
          {media.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-50"
            >
              <FaChevronLeft className="w-10 h-10" />
            </button>
          )}

          {/* Image ou Vidéo */}
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {media[currentImageIndex]?.type === 'image' ? (
              <img
                src={media[currentImageIndex]?.url}
                alt="Image en grand"
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={media[currentImageIndex]?.url}
                controls
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>

          {/* Bouton Suivant */}
          {media.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-50"
            >
              <FaChevronRight className="w-10 h-10" />
            </button>
          )}

          {/* Compteur */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-lg">
            {currentImageIndex + 1} / {media.length}
          </div>
        </div>
      )}
    </div>
  );
}