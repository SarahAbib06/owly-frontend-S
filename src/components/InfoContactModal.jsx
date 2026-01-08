import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Star, Archive, Lock, Ban, Trash2 } from "lucide-react";
import { FaChevronRight } from "react-icons/fa";
import MediaDocument from "./MediaDocument";
import { relationService } from "../services/relationService";
import { useAuth } from "../hooks/useAuth"; 
import { useBlockStatus } from "../hooks/useBlockStatut";
import ConfirmBlockModal from "./ConfirmBlockModal";
import { addFavorite, removeFavorite, getFavorites } from "../services/favoritesService";

export default function InfoContactModal({ chat, onClose, onBlockStatusChange }) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("info");
  const { user } = useAuth();
  
  const otherUser = chat?.isGroup ? null : chat?.participants?.find(
    participant => {
      const participantId = participant._id || participant.id;
      const currentUserId = user?._id || user?.id || user?.userId;
      return String(participantId) !== String(currentUserId);
    }
  );
  
  const otherUserId = otherUser?._id;
  const displayAvatar = chat?.isGroup 
    ? chat.avatar 
    : (otherUser?.avatar || otherUser?.profilePicture || chat.avatar || "/default-avatar.png");
  
  const displayName = chat?.isGroup 
    ? chat.name 
    : (otherUser?.name || chat.name);
  
  const { isBlocked, unblock, refresh } = useBlockStatus(otherUserId);
  
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [localIsBlocked, setLocalIsBlocked] = useState(isBlocked);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState("block");
  const [modalUserInfo, setModalUserInfo] = useState({ name: "", avatar: "" });
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  // Fonction pour récupérer l'ID utilisateur
  const getUserId = (user) => user?._id || user?.id || user?.userId;

  // Synchroniser le statut de blocage
  useEffect(() => {
    setLocalIsBlocked(isBlocked);
  }, [isBlocked]);

  // Vérifier si la conversation est en favoris
  useEffect(() => {
    const checkIfFavorite = async () => {
      const userId = getUserId(user);
      if (!userId || !chat?._id) {
        console.log('❌ IDs manquants pour favoris : userId=', userId, 'chatId=', chat?._id);
        return;
      }

      try {
        const response = await getFavorites(userId);
        console.log('📡 Réponse getFavorites:', response.data);
        const favorites = response.data;
        const isFav = favorites.some(fav => String(fav._id) === String(chat._id));
        setIsFavorite(isFav);
      } catch (error) {
        console.error("Erreur lors du chargement des favoris :", error);
      }
    };

    checkIfFavorite();
  }, [chat?._id, user]);

  // Toggle favoris
  const toggleFavorite = async () => {
    const userId = getUserId(user);
    console.log('⭐ Clic sur toggleFavorite | isFavorite=', isFavorite, 'userId=', userId, 'chatId=', chat?._id);
    
    if (!userId || !chat?._id || loadingFavorite) return;

    setLoadingFavorite(true);

    try {
      if (isFavorite) {
        await removeFavorite(userId, chat._id);
        console.log('✅ Favori supprimé');
      } else {
        await addFavorite(userId, chat._id);
        console.log('✅ Favori ajouté');
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Erreur favoris :", error);
      alert("Erreur lors de la mise à jour des favoris");
    } finally {
      setLoadingFavorite(false);
    }
  };

  // Ouvrir le modal de confirmation de blocage
  const handleBlockClick = () => {
    setActionType(localIsBlocked ? "unblock" : "block");
    setModalUserInfo({
      name: displayName,
      avatar: displayAvatar
    });
    setIsConfirmModalOpen(true);
  };

  // Confirmer le blocage/déblocage
  const handleConfirmBlock = async () => {
    setIsConfirmModalOpen(false);
    setIsBlocking(true);

    try {
      if (localIsBlocked) {
        await unblock();
        setLocalIsBlocked(false);
      } else {
        await relationService.blockUser(otherUserId);
        setLocalIsBlocked(true);
        refresh();
      }

      if (onBlockStatusChange) {
        onBlockStatusChange();
      }
    } catch (error) {
      console.error("Erreur blocage :", error);
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}></div>

      {/* Zoom image */}
      {isImageOpen && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={() => setIsImageOpen(false)}
        >
          <div className="w-[380px] h-[380px] rounded-full overflow-hidden shadow-2xl"
               style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
            <img 
              src={displayAvatar}
              className="w-full h-full object-cover"
              alt="Avatar"
            />
          </div>
        </div>
      )}

      {/* Panel principal */}
      <div className="absolute inset-0 bg-myGray4 dark:bg-neutral-800 shadow-xl z-50 p-6 overflow-y-auto">
        {activeSection !== "media" && (
          <button className="text-2xl mb-4" onClick={onClose}>✕</button>
        )}

        {activeSection === "media" && (
          <MediaDocument
            onBack={() => setActiveSection("info")}
            conversationId={chat?._id}
          />
        )}

        {activeSection === "info" && (
          <div>
            {/* Avatar + Nom */}
            <div className="flex flex-col items-center">
              <img
                src={displayAvatar}
                className="w-24 h-24 rounded-full object-cover mb-2 cursor-pointer hover:scale-105 transition"
                onClick={() => setIsImageOpen(true)}
                alt="Avatar"
              />
              <h2 className="text-lg font-semibold">{displayName}</h2>
              <p className="text-sm text-gray-500">email@emailemai.com</p>
            </div>

            {/* Menu */}
            <div className="text-sm space-y-1 mt-4">
              <div
                className="cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setActiveSection("media")}
              >
                <div className="flex items-center justify-between">
                  {t("infoContactModal.mediaDocuments")}
                  <FaChevronRight className="text-gray-400" />
                </div>
              </div>
              <hr className="border-gray-300" />

              <div
                className="cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  chat.openTheme();
                  onClose();
                }}
              >
                <div className="flex items-center justify-between">
                  {t("infoContactModal.themes")}
                  <FaChevronRight className="text-gray-400" />
                </div>
              </div>

              <hr className="border-gray-300" />

              {/* Bouton Favoris */}
              {!chat.isGroup && (
                <div
                  className={`cursor-pointer flex items-center gap-2 py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isFavorite ? "text-yellow-500" : ""
                  }`}
                  onClick={toggleFavorite}
                >
                  <Star size={15} fill={isFavorite ? "currentColor" : "none"} />
                  <span>
                    {loadingFavorite
                      ? "Chargement..."
                      : isFavorite
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"}
                  </span>
                </div>
              )}

              {/* Archiver */}
              <div
                className="cursor-pointer flex items-center gap-2 py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={async () => {
                  const message = chat.isArchived
                    ? "Désarchiver cette conversation ?"
                    : "Archiver cette conversation ?";

                  if (window.confirm(message)) {
                    try {
                      await chat.onArchive();
                      onClose();
                    } catch (err) {
                      alert("Erreur lors de l'archivage");
                    }
                  }
                }}
              >
                <Archive size={15} />
                <span>
                  {chat.isArchived ? "Désarchiver" : "Archiver"} la conversation
                </span>
              </div>

              {/* Verrouiller */}
              <div className="cursor-pointer flex items-center gap-2 py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                <Lock size={15} />
                <span>{t("infoContactModal.lockConversation")}</span>
              </div>

              {/* Bloquer */}
              {!chat.isGroup && (
                <div
                  className={`cursor-pointer flex items-center gap-2 py-2 px-2 rounded-md ${
                    localIsBlocked 
                      ? "text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-700"
                      : "text-red-600 hover:bg-red-100 dark:hover:bg-red-700"
                  }`}
                  onClick={handleBlockClick}
                >
                  <Ban size={15} />
                  <span>
                    {isBlocking
                      ? (localIsBlocked ? "Déblocage..." : "Blocage...")
                      : (localIsBlocked ? "Débloquer" : "Bloquer")
                    }
                  </span>
                </div>
              )}

              {/* Supprimer */}
              <div className="cursor-pointer flex items-center gap-2 py-2 px-2 rounded-md text-red-600 hover:bg-red-100 dark:hover:bg-red-700">
                <Trash2 size={15} />
                <span>{t("infoContactModal.deleteConversation")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmation blocage */}
        <ConfirmBlockModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirmBlock}
          actionType={actionType}
          userInfo={modalUserInfo}
        />
      </div>
    </>
  );
}