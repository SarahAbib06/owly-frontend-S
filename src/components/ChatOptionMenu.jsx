import { useTranslation } from "react-i18next";
import { Info, Star, Archive, Lock, Ban, Trash2 } from "lucide-react";
import { relationService } from "../services/relationService";
import { useState, useEffect } from "react";
import { useBlockStatus } from "../hooks/useBlockStatut";
import ConfirmBlockModal from "./ConfirmBlockModal";
import { useChat } from "../context/ChatContext";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { conversationService } from "../services/conversationService";

export default function ChatOptionsMenu({
  selectedChat = {}, // ← garde par défaut vide
  onClose,
  onOpenSearch,
  onBlockStatusChange,
}) {
  const { t } = useTranslation();
  const { archiveConversation, unarchiveConversation } = useChat();

  const [isBlocking, setIsBlocking] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState("block");
  const [modalUserInfo, setModalUserInfo] = useState({ name: "Utilisateur", avatar: "/default-avatar.png" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const userId = selectedChat?.userId || selectedChat?.participants?.find(p => p?._id !== localStorage.getItem('userId'))?._id;

  const { isBlocked, unblock, refresh } = useBlockStatus(userId);

  const [localIsBlocked, setLocalIsBlocked] = useState(isBlocked);

  useEffect(() => {
    setLocalIsBlocked(isBlocked);
  }, [isBlocked]);

  const handleBlockClick = () => {
    setActionType(localIsBlocked ? "unblock" : "block");
    setModalUserInfo({
      name: selectedChat?.name || selectedChat?.groupName || "Utilisateur",
      avatar: selectedChat?.avatar || "/default-avatar.png",
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
        if (userId) await relationService.blockUser(userId);
        setLocalIsBlocked(true);
        refresh();
      }
      onBlockStatusChange?.();
    } catch (error) {
      console.error("Erreur blocage/déblocage:", error);
    } finally {
      setIsBlocking(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
  setIsDeleteModalOpen(false);

  if (!selectedChat?._id) {
    alert("Impossible : conversation non identifiée");
    return;
  }

  try {
    await conversationService.deleteConversationForMe(selectedChat._id);
    
    onClose();

    // Rafraîchissement de la liste (une des deux méthodes suivantes suffit)
    if (typeof window.refreshConversations === 'function') {
      window.refreshConversations();
    }
    // ou : window.location.reload();   // ← garde seulement si tu n'as pas encore le refresh via contexte/socket

    // → Plus d'alert ici, c'est plus fluide
    // L'utilisateur voit juste que la conversation disparaît de sa liste

  } catch (err) {
    console.error("Suppression échouée", err);
    const msg = err.response?.data?.error || err.message || "Erreur serveur";
    alert(`Échec suppression : ${msg}`);
  }
};

  const handleArchiveToggle = async () => {
    const isArchived = selectedChat?.isArchived;
    const message = isArchived ? "Désarchiver ?" : "Archiver ?";
    if (!window.confirm(message)) return;

    try {
      if (isArchived) {
        await unarchiveConversation(selectedChat._id);
      } else {
        await archiveConversation(selectedChat._id);
      }
      onClose();
    } catch (err) {
      alert("Erreur archivage");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />

      <div className="absolute right-4 top-14 w-60 bg-myGray4 dark:bg-neutral-800 shadow-xl rounded-xl p-2 z-40">

        <div
          className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => {
            onClose();
            selectedChat?.openInfo?.(); // ← safe call
          }}
        >
          <Info size={15} />
          <span>Infos sur {selectedChat?.name || "la conversation"}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <Star size={15} />
          <span>Ajouter aux favoris</span>
        </div>

        <div
          className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={handleArchiveToggle}
        >
          <Archive size={15} />
          <span>{selectedChat?.isArchived ? "Désarchiver" : "Archiver"}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
          <Lock size={15} />
          <span>Verrouiller la conversation</span>
        </div>

        <hr className="border-gray-400 dark:border-gray-700 my-1" />

        {!selectedChat?.isGroup && (
          <div
            className={`flex items-center gap-2 text-xs cursor-pointer py-2 px-2 rounded-md ${
              localIsBlocked ? "text-blue-600 hover:bg-blue-100" : "text-red-600 hover:bg-red-100"
            }`}
            onClick={handleBlockClick}
          >
            <Ban size={15} />
            <span>{localIsBlocked ? "Débloquer" : "Bloquer"}</span>
          </div>
        )}

        <div
          className="flex items-center gap-2 text-xs text-red-600 cursor-pointer py-2 px-2 rounded-md hover:bg-red-100"
          onClick={handleDeleteClick}
        >
          <Trash2 size={15} />
          <span>Supprimer la conversation</span>
        </div>

        <button
          onClick={() => { onOpenSearch(); onClose(); }}
          className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-200 cursor-pointer py-2 px-2 rounded-md hover:bg-gray-100 w-full"
        >
          🔍 Recherche
        </button>

      </div>

      {/* Modals */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        chatName={selectedChat?.name || selectedChat?.groupName || "cette conversation"}
        chatAvatar={selectedChat?.avatar || "/default-avatar.png"}
      />

      <ConfirmBlockModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmBlock}
        actionType={actionType}
        userInfo={modalUserInfo}
      />
    </>
  );
}