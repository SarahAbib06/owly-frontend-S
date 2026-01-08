import { useTranslation } from "react-i18next";
import { Info, Star, Archive, Lock, Ban, Trash2 } from "lucide-react";
import { relationService } from "../services/relationService";
import { useState,useEffect } from "react";
import { useBlockStatus } from "../hooks/useBlockStatut";
import ConfirmBlockModal from "./ConfirmBlockModal";
import ConfirmArchiveModal from "./ConfirmArchiveModal";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../hooks/useAuth";

export default function ChatOptionsMenu({ selectedChat, onClose, onOpenSearch, onBlockStatusChange }) {
  const { t } = useTranslation();
  const { archiveConversation, unarchiveConversation} = useChat();
  const [isBlocking, setIsBlocking] = useState(false);
const { isBlocked, unblock, refresh } = useBlockStatus(selectedChat?.userId);
const [localIsBlocked, setLocalIsBlocked] = useState(isBlocked);
const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
const [actionType, setActionType] = useState("block"); // block | unblock
const [modalUserInfo, setModalUserInfo] = useState({ name: "", avatar: "" });
// archivage
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const { user } = useAuth();


useEffect(() => {
  setLocalIsBlocked(isBlocked);
}, [isBlocked]);

const handleBlockClick = () => {
  setActionType(localIsBlocked ? "unblock" : "block");

  setModalUserInfo({
    name: selectedChat.name,
    avatar: selectedChat.avatar
  });

  setIsConfirmModalOpen(true);
};
const handleConfirmBlock = async () => {
  setIsConfirmModalOpen(false);
  setIsBlocking(true);

  try {
    if (localIsBlocked) {
      await unblock();
      setLocalIsBlocked(false);
    } else {
      await relationService.blockUser(selectedChat.userId);
      setLocalIsBlocked(true);
      refresh();
    }

    if (onBlockStatusChange) onBlockStatusChange();

  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    setIsBlocking(false);
  }
};


  // Nouvelle fonction pour gérer l'archivage
  const handleArchiveClick = () => {
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    setIsArchiveModalOpen(false);
    
    try {
      if (selectedChat.isArchived) {
        await unarchiveConversation(selectedChat._id);
      } else {
        await archiveConversation(selectedChat._id);
      }
      
      onClose();
      window.location.reload();
      
    } catch (err) {
      console.error("Erreur lors de l'opération:", err);
      alert("Erreur lors de l'opération");
    }
  };

  // ✅ Fonction pour extraire le bon nom
  const getConversationName = () => {
    if (selectedChat.isGroup) {
      return selectedChat.groupName || "Groupe";
    }
    
    // Pour une conversation individuelle, trouver l'autre participant
    const otherParticipant = selectedChat.participants?.find(
      participant => {
        const participantId = participant._id || participant.id;
        const currentUserId = user?._id || user?.id || user?.userId;
        return String(participantId) !== String(currentUserId);
      }
    );
    
    return otherParticipant?.username || selectedChat.name || "Utilisateur";
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 z-30"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="absolute right-4 top-14 w-60 bg-myGray4 dark:bg-neutral-800 shadow-xl rounded-xl p-2 z-40">

        <div
          className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
          onClick={() => {
            onClose();        
            selectedChat.openInfo(); 
          }}
        >
          <Info size={15} />
          <span>{t("chatOptions.infoOn")} {selectedChat.name}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
          <Star size={15} />
          <span>{t("chatOptions.addToFavorites")}</span>
        </div>
           <div
          className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
          onClick={handleArchiveClick}
        >
          <Archive size={15} />
          <span>
            {selectedChat.isArchived 
              ? t("chatOptions.unarchiveConversation") || "Désarchiver la conversation"
              : t("chatOptions.archiveConversation") || "Archiver la conversation"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
          <Lock size={15} />
          <span>{t("chatOptions.lockConversation")}</span>
        </div>


        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150">
          <Lock size={15} />
          <span>{t("chatOptions.lockConversation")}</span>
        </div>
        
        <hr className="border-gray-400 dark:border-gray-700 my-1" />
   
        {/* BOUTON BLOQUER */}
        {!selectedChat.isGroup && (
          <div 
  className={`flex items-center gap-2 text-xs cursor-pointer py-2 px-2 rounded-md ${
    localIsBlocked
      ? "text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-700"
      : "text-red-600 hover:bg-red-100 dark:hover:bg-red-700"
  }`}
  onClick={handleBlockClick}
>
  <Ban size={15} />
  <span>
    {isBlocking
      ? (localIsBlocked ? t("chatOptions.unblocking") || "Déblocage..." : t("chatOptions.blocking") || "Blocage...")
      : (localIsBlocked ? t("chatOptions.unblock") || "Débloquer" : t("chatOptions.block") || "Bloquer")
    }
  </span>
</div>

          
          
        )}

        <div className="flex items-center gap-2 text-xs text-red-600 cursor-pointer py-2 px-2 rounded-md hover:bg-red-100 dark:hover:bg-red-700 transition-colors duration-150">
          <Trash2 size={15} />
          <span>{t("chatOptions.deleteConversation")}</span>
        </div>

        <button
          onClick={() => { onOpenSearch(); onClose(); }}
          className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 w-full"
        >
          🔍 {t("chat.searchButton")}
        </button>
<ConfirmBlockModal
  isOpen={isConfirmModalOpen}
  onClose={() => setIsConfirmModalOpen(false)}
  onConfirm={handleConfirmBlock}
  actionType={actionType}
  userInfo={modalUserInfo}
/>
<ConfirmArchiveModal
  isOpen={isArchiveModalOpen}
  onClose={() => setIsArchiveModalOpen(false)}
  onConfirm={handleConfirmArchive}
  isArchived={selectedChat.isArchived}
  chatName={getConversationName()} // ← Utiliser cette fonction au lieu de selectedChat.name
/>

      </div>
    </>
  );
}