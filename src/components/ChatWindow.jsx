// frontend/src/components/ChatWindow.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  Send,
  Loader2,
  X,
  CornerUpRight,
  Pin,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ChartBar,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMessages } from "../hooks/useMessages";
import { useTyping } from "../hooks/useTyping";
import { useReactions } from "../hooks/useReactions";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useAuth } from "../hooks/useAuth";
import { useCall } from "../context/CallContext";
import socketService from "../services/socketService";
 
import VideoCallScreen from "./VideoCallScreen";
import ThemeSelector from "./ThemeSelector";
import AudioMessage from "./AudioMessage";
import ChatOptionsMenu from "./ChatOptionMenu";
import InfoContactModal from "./InfoContactModal";
import { motion } from "framer-motion";
import { FiSearch } from "react-icons/fi";

import { Archive } from "lucide-react";
import { useChat } from "../context/ChatContext";

import ChatInput from "./ChatInput.jsx";
import { useBlockStatus } from "../hooks/useBlockStatut";
import ConfirmBlockModal from "./ConfirmBlockModal";
import ForwardModal from "./ForwardModal";
import { useConversations } from "../hooks/useConversations";
import MessageRequestBanner from "./MessageRequestBanner";
import PadModal from "./PadModal";
import Modal from "./Modal";
import api from '../services/api';

// 🔥 AJOUT DES IMPORTS POUR LES SONDAGEShh
import PollModal from "./PollModal";
import PollMessage from "./PollMessage";
import { usePolls } from "../hooks/usePolls";

function adjustColor(col, amt) {
  let usePound = false;
  if (col[0] === "#") {
    col = col.slice(1);
    usePound = true;
  }

  let num = parseInt(col, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return (
    (usePound ? "#" : "") +
    ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")
  );
}

const SeenIconGray = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="15"
    height="15"
    viewBox="0 0 48 48"
  >
    <path
      d="M14 27L7 20l1.6-1.6 5.4 5.4 9.5-9.5 1.6 1.6-12 12z"
      fill="none"
      stroke="#9e9e9e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25 27l-4-4 1.6-1.6 4 4 10-10 1.6 1.6-12 12z"
      fill="none"
      stroke="#9e9e9e"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Format date
const formatDateLabel = (dateString, t) => {
  if (!dateString) return "";
  const msgDate = new Date(dateString);
  const today = new Date();
  const diff = today.setHours(0, 0, 0, 0) - msgDate.setHours(0, 0, 0, 0);

  if (diff === 0) return t("chat.today") || "Aujourd'hui";
  if (diff === 86400000) return t("chat.yesterday") || "Hier";
  // ⚡ utiliser la locale depuis i18next
  const locale = t("chat.locale") || "fr-FR";

  return msgDate.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatAudioDuration = (seconds) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const isDarkColor = (color) => {
  if (!color) return false;
  let r, g, b;
  if (color.startsWith("#") && color.length === 7) {
    r = parseInt(color.substr(1, 2), 16);
    g = parseInt(color.substr(3, 2), 16);
    b = parseInt(color.substr(5, 2), 16);
  } else return false;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

// Fichier → Base64
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉"];

// 🔤 COMPOSANT TYPING INDICATOR
const TypingIndicator = ({ avatar, username }) => (
  <div className="flex justify-start items-start gap-2 mb-3">
    {/* Avatar */}
    <div className="w-8 h-8 flex-shrink-0">
      <img
        src={avatar || "/default-avatar.png"}
        alt={username || "Utilisateur"}
        className="w-8 h-8 rounded-full object-cover"
      />
    </div>

    {/* Bulle de message avec animation */}
    <div className="flex flex-col max-w-[70%]">
      {username && !selectedChat?.isGroup && (
        <p className="text-[10px] ml-1 mb-1 text-gray-700 dark:text-gray-300">
          {username}
        </p>
      )}

      <div className="bg-myGray4 dark:bg-[#2E2F2F] rounded-t-lg rounded-br-lg rounded-bl-none px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Animation des trois points */}
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
        </div>
      </div>

      {/* Timestamp (optionnel) */}
      <div className="text-[10px] mt-1 text-gray-500 dark:text-gray-400">
        {new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  </div>
);

// 🔥 COMPOSANT POUR AFFICHER UN MESSAGE D'APPEL
const CallMessage = ({ callType, callResult, duration, fromMe }) => {
  // Icônes selon le type
  const CallIcon = callType === "audio" ? Phone : Video;

  // Couleur selon le statut
  const getStatusColor = () => {
    switch (callResult) {
      case "missed":
        return "text-red-500";
      case "rejected":
        return "text-orange-500";
      case "ended":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  // Texte selon le statut
  const getStatusText = () => {
    switch (callResult) {
      case "missed":
        return "Appel manqué";
      case "rejected":
        return "Appel refusé";
      case "ended":
        return "Appel terminé";
      default:
        return "Appel";
    }
  };

  // Format durée (mm:ss)
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const durationText = formatDuration(duration);

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Icône d'appel */}
      <CallIcon size={18} className={getStatusColor()} />

      {/* Informations d'appel */}
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          Appel {callType === "audio" ? "audio" : "vidéo"}
        </span>

        <div className="flex items-center gap-2 text-[10px] text-gray-600 dark:text-gray-400">
          <span>{getStatusText()}</span>
          {durationText && (
            <>
              <span>•</span>
              <span>{durationText}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ChatWindow({
  selectedChat,
  onBack,
  onConversationDeleted,
}) {
  console.log("🔍 DEBUG selectedChat:", {
    _id: selectedChat?._id,
    name: selectedChat?.name,
    groupName: selectedChat?.groupName,
    isGroup: selectedChat?.isGroup,
    type: selectedChat?.type,
    participants: selectedChat?.participants?.length,
    "Clés disponibles": Object.keys(selectedChat || {}),
  });

  const { t } = useTranslation();
  const { incomingCall, getActiveCall, clearActiveCall } = useCall();
  const isFromArchived = selectedChat?.isFromArchived === true;
  const { conversations, archivedConversations } = useChat();
  const isArchived =
    isFromArchived ||
    archivedConversations.some((c) => c._id === selectedChat?._id);
  console.log("isArchived ?", isArchived, selectedChat?._id);
  const { archiveConversation, unarchiveConversation } = useChat();

  const { user, socketConnected } = useAuth();
  const [selectedTargetConversation, setSelectedTargetConversation] =
    useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deletedForEveryone, setDeletedForEveryone] = useState([]);

  // États pour la lightbox média
  const [mediaLightboxOpen, setMediaLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [mediaList, setMediaList] = useState([]);

  // Groupe
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [myRoleInGroup, setMyRoleInGroup] = useState("membre");
  const [showPad, setShowPad] = useState(false);

  // 🔥 AJOUT DES ÉTATS POUR LES SONDAGES
  const [showPollModal, setShowPollModal] = useState(false);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  const { conversations: myConversations, loading: convLoading } =
    useConversations();

  const chatKey = `theme_${selectedChat?._id ?? "default"}`;

  const [startOutgoingCallType, setStartOutgoingCallType] = useState(null);

  const otherUserId = selectedChat?.isGroup
    ? null
    : selectedChat?.participants?.find((participant) => {
        const participantId = participant._id || participant.id;
        const currentUserId = user?._id || user?.id || user?.userId;
        return String(participantId) !== String(currentUserId);
      })?._id;

  const otherParticipant = selectedChat?.isGroup
    ? null
    : selectedChat?.participants?.find((participant) => {
        const participantId = participant._id || participant.id;
        const currentUserId = user?._id || user?.id || user?.userId;
        return String(participantId) !== String(currentUserId);
      });

  // Hook pour vérifier le blocage
  const { isBlocked, blockedBy, unblock, refresh } =
    useBlockStatus(otherUserId);

  console.log("🔍 DEBUG MESSAGE REQUEST:", {
    isMessageRequest: selectedChat?.isMessageRequest,
    messageRequestFor: selectedChat?.messageRequestFor,
    messageRequestFrom: selectedChat?.messageRequestFrom,
    currentUserId: user?.id,
    isForMe:
      selectedChat?.messageRequestFor?.toString() === user?.id?.toString(),
  });

  // ✅ CORRECTION ICI : Vérifier que JE SUIS le destinataire (messageRequestFor)
  const isIncomingMessageRequest =
    selectedChat?.isMessageRequest === true &&
    selectedChat?.messageRequestFor?.toString() === user?.id?.toString();

  console.log("🚨 isIncomingMessageRequest =", isIncomingMessageRequest);

  const [contactStatus, setContactStatus] = useState({
    isOnline: false,
    lastSeen: null,
  });

  const getUserStatusText = () => {
    // 🟢 Online
    if (contactStatus.isOnline) {
      return t("status.online");
    }
    // 🔒 Si pas de lastSeen ET offline → Statut masqué
    if (!contactStatus.lastSeen) {
      return "";
    }
    // ⚪ Offline avec lastSeen
    if (contactStatus.lastSeen) {
      const last = new Date(contactStatus.lastSeen);
      const now = new Date();
      const diffMs = now - last;

      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);

      if (diffMin < 1) return t("status.onlineSeconds");
      if (diffMin < 60) return t("status.onlineMinutes", { count: diffMin });
      if (diffHour < 24) return t("status.onlineHours", { count: diffHour });

      return t("status.onlineLong");
    }

    return t("status.onlineMoment");
  };

  useEffect(() => {
    if (!contactStatus.lastSeen || contactStatus.isOnline) return;

    const interval = setInterval(() => {
      setContactStatus((prev) => ({ ...prev }));
    }, 60000);

    return () => clearInterval(interval);
  }, [contactStatus.lastSeen, contactStatus.isOnline]);

  // 🔥 CORRECTION : Charger membres du groupe
  useEffect(() => {
    if (selectedChat?.isGroup && selectedChat._id) {
      const fetchGroupMembers = async () => {
        try {
const res = await api.get(`/groups/${selectedChat._id}/members`);
const data = res.data;

          if (data.success) {
            setGroupMembers(data.members || []);

            const userId = localStorage.getItem("userId");
            const myMember = data.members.find(
              (m) => String(m.id) === String(userId),
            );
            setMyRoleInGroup(myMember?.role || "membre");
          }
        } catch (err) {
          console.error("❌ Erreur chargement membres:", err);
        }
      };

      fetchGroupMembers();
    }
  }, [selectedChat?._id]);

  const contactId = React.useMemo(() => {
    if (!selectedChat || selectedChat.isGroup || !user) return null;
    const other = selectedChat.participants.find(
      (p) => String(p._id) !== String(user._id),
    );
    return other?._id || null;
  }, [selectedChat, user]);

  console.log("contactId:", contactId);
  useEffect(() => {
    if (!contactId) return;
    console.log("🧪 TEST contactId =", contactId);

api.get(`/users/${contactId}/status`)
  .then(res => {
    const data = res.data;
        console.log("🧪 REPONSE API STATUS =", data);
        setContactStatus({
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        });
      })
      .catch((err) => console.error("Erreur statut:", err));
  }, [contactId]);

  // 🔥 AJOUT DU HOOK POUR LES SONDAGES
  const {
    polls,
    loading: pollsLoading,
    createPoll,
    votePoll,
    closePoll,
    deletePoll,
    getPollById,
  } = usePolls(selectedChat?._id);

  // 🔥 FONCTION POUR CRÉER UN SONDAGE
  const handleCreatePoll = async (pollData) => {
    try {
      setIsCreatingPoll(true);
      const result = await createPoll({
        ...pollData,
        conversationId: selectedChat._id,
      });

      if (result.success) {
        setShowPollModal(false);
        console.log("✅ Sondage créé avec succès:", result);
      }
    } catch (error) {
      console.error("❌ Erreur création sondage:", error);
      alert("Erreur lors de la création du sondage: " + error.message);
    } finally {
      setIsCreatingPoll(false);
    }
  };

  // 🔥 FONCTION POUR VOTER À UN SONDAGE
  const handleVotePoll = async (pollId, optionIndexes) => {
    try {
      await votePoll(pollId, optionIndexes);
    } catch (error) {
      console.error("❌ Erreur lors du vote:", error);
      alert("Erreur lors du vote: " + error.message);
    }
  };

  // Sauvegarder les messages supprimés
  useEffect(() => {
    if (selectedChat?._id && deletedMessages.length > 0) {
      localStorage.setItem(
        `deleted_${selectedChat._id}`,
        JSON.stringify(deletedMessages),
      );
    }
  }, [deletedMessages, selectedChat?._id]);

  const otherUserName = React.useMemo(() => {
    if (selectedChat?.isGroup) return null;

    const otherParticipant = selectedChat?.participants?.find((participant) => {
      const participantId =
        participant._id || participant.id || participant.userId;
      const currentUserId = user?._id || user?.id || user?.userId;
      return (
        participantId &&
        currentUserId &&
        String(participantId) !== String(currentUserId)
      );
    });

    if (otherParticipant?.username) {
      return otherParticipant.username;
    }

    if (selectedChat?.name) {
      return selectedChat.name;
    }

    if (selectedChat?.targetUser?.username) {
      return selectedChat.targetUser.username;
    }

    return null;
  }, [selectedChat, user]);

  // Sauvegarder les messages supprimés
  useEffect(() => {
    if (selectedChat?._id && deletedMessages.length > 0) {
      localStorage.setItem(
        `deleted_${selectedChat._id}`,
        JSON.stringify(deletedMessages),
      );
    }
  }, [deletedMessages, selectedChat?._id]);

  // Charger les messages supprimés au démarrage
  useEffect(() => {
    if (selectedChat?._id) {
      const saved = localStorage.getItem(`deleted_${selectedChat._id}`);
      if (saved) {
        try {
          setDeletedMessages(JSON.parse(saved));
        } catch (e) {
          console.error("Erreur chargement messages supprimés:", e);
        }
      }
    }
  }, [selectedChat?._id]);

  // Écouter les changements en temps réel via socket
  useEffect(() => {
    if (!socketService.socket || !contactId) return;

    window.socket = socketService.socket;
    console.log("🌐 Socket accessible via window.socket");

    const handleOnline = ({ userId }) => {
      if (!contactId) return;
      if (String(userId) === String(contactId)) {
        setContactStatus({
          isOnline: true,
          lastSeen: null,
        });
      }
    };

    const handleOffline = ({ userId, lastSeen }) => {
      console.log(
        "🔴 user offline reçu:",
        userId,
        lastSeen,
        "contactId:",
        contactId,
      );
      if (!contactId) return;

      if (String(userId) === String(contactId)) {
        setContactStatus({
          isOnline: false,
          lastSeen: lastSeen
            ? new Date(lastSeen).toISOString()
            : new Date().toISOString(),
        });
      }
    };

    socketService.socket.on("user:online", handleOnline);
    socketService.socket.on("user:offline", handleOffline);

    return () => {
      socketService.socket.off("user:online", handleOnline);
      socketService.socket.off("user:offline", handleOffline);
    };
  }, [contactId]);

  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeStyle, setThemeStyle] = useState({});

  useEffect(() => {
    if (!socketService.socket || !selectedChat) return;

    const handleThemeChange = ({ conversationId, theme }) => {
      if (conversationId === selectedChat._id) {
        console.log("Thème reçu via socket:", theme);
        applyTheme(theme, false);
      }
    };

    socketService.socket.on("themeChanged", handleThemeChange);

    return () => {
      socketService.socket.off("themeChanged", handleThemeChange);
    };
  }, [selectedChat]);

  const [bubbleBg, setBubbleBg] = useState("");
  const [sendBtnColor, setSendBtnColor] = useState("");
  const [themeEmojis, setThemeEmojis] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [openSearch, setOpenSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedSection, setShowPinnedSection] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  // ────────────────────────────────────────────────
  // Gestion suppression message
  const handleDeleteForMe = (messageId) => {
    setDeletedMessages((prev) => {
      if (prev.includes(messageId)) return prev;
      return [...prev, messageId];
    });
    setShowMessageMenu(null);
    setShowDeleteModal(false);
  };

  const handleDeleteForEveryone = async (messageId) => {
    try {
      setDeletedForEveryone((prev) => [...new Set([...prev, messageId])]);

const res = await api.post(`/messages/${messageId}/delete`);
const data = res.data;

if (!data.success) {
  setDeletedForEveryone((prev) => prev.filter((id) => id !== messageId));
  throw new Error(data.error || "Erreur lors de la suppression");
}

      console.log("Message supprimé pour tous :", data);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Échec suppression pour tous :", err);
    }
  };

  useEffect(() => {
    if (!socketService.socket || !selectedChat?._id) return;

    const handleMessageDeleted = (data) => {
      const { messageId, conversationId: convId } = data;

      if (convId !== selectedChat._id) return;

      setDeletedForEveryone((prev) => [...new Set([...prev, messageId])]);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    socketService.socket.on("message:deleted", handleMessageDeleted);
    return () => {
      socketService.socket.off("message:deleted", handleMessageDeleted);
    };
  }, [selectedChat?._id]);

  // 🔥 NAVIGATION CLAVIER POUR LIGHTBOX MÉDIA
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!mediaLightboxOpen) return;

      if (e.key === "Escape") closeMediaLightbox();
      if (e.key === "ArrowLeft") goToPreviousMedia();
      if (e.key === "ArrowRight") goToNextMedia();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mediaLightboxOpen, mediaList.length]);

  // Sauvegarde permanente des suppressions "pour tout le monde"
  useEffect(() => {
    if (selectedChat?._id && deletedForEveryone.length > 0) {
      localStorage.setItem(
        `deletedEveryone_${selectedChat._id}`,
        JSON.stringify(deletedForEveryone),
      );
    }
  }, [deletedForEveryone, selectedChat?._id]);

  // Charge les suppressions "pour tout le monde" au démarrage
  useEffect(() => {
    if (selectedChat?._id) {
      const saved = localStorage.getItem(`deletedEveryone_${selectedChat._id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setDeletedForEveryone(parsed);
          }
        } catch (e) {
          console.error("Erreur chargement deletedEveryone :", e);
        }
      }
    }
  }, [selectedChat?._id]);

  console.log("selectedChat:", selectedChat);
  console.log("otherUserId:", otherUserId);

  const isMessageRequest =
    selectedChat?.isMessageRequest === true ||
    selectedChat?.messageRequestForMe === true;

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const [isConfirmUnblockModalOpen, setIsConfirmUnblockModalOpen] =
    useState(false);

  // Hooks pour la messagerie
  const {
    messages,
    loading,
    sendMessage,
    sendImage,
    sendVideo,
    sendFile,
    loadMore,
    hasMore,
    pinMessage,
    unpinMessage,
    deleteMessage,
    forwardMessage,
  } = useMessages(selectedChat?._id);

  const { typingUsers, sendTyping, isTyping } = useTyping(selectedChat?._id);

  // Hook pour l'enregistrement audio
  const {
    isRecording,
    recordingTime,
    startRecording,
    stopAndSend,
    cancelRecording,
  } = useAudioRecorder(selectedChat?._id);

  // Charger les messages épinglés
  useEffect(() => {
    if (!selectedChat) return;

    const handleSaveCallMessage = async (data) => {
      console.log("💾 [ChatWindow] Enregistrement message d'appel:", data);

      try {
        socketService.emit("call-message", {
          ...data,
          chatId: selectedChat._id,
        });
      } catch (error) {
        console.error("❌ Erreur save call message:", error);
      }
    };

    socketService.socket?.on("save-call-message", handleSaveCallMessage);

    return () => {
      socketService.socket?.off("save-call-message", handleSaveCallMessage);
    };
  }, [selectedChat]);

  useEffect(() => {
    const pinned = messages.filter((msg) => msg.isPinned);
    setPinnedMessages(pinned);
    setShowPinnedSection(pinned.length > 0);
  }, [messages]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    // Ce useEffect vide dépend de selectedChat et archivedConversations
  }, [selectedChat, archivedConversations]);

  // ✅ MARQUER LES MESSAGES COMME VUS - VERSION INSTANTANÉE
  useEffect(() => {
    if (!selectedChat?._id || !user?.id || !messages.length) return;

    const markMessagesAsSeen = async () => {
      try {
        const unreadMessages = messages.filter((msg) => {
          const isFromOther =
            String(msg.senderId || msg.Id_sender) !== String(user.id);
          const notSeenByMe = !msg.readBy?.some(
            (r) => String(r.userId) === String(user.id),
          );
          return isFromOther && notSeenByMe;
        });

        if (unreadMessages.length === 0) {
          console.log("✅ Aucun message à marquer comme vu");
          return;
        }

        console.log(`👁️ ${unreadMessages.length} messages à marquer comme vus`);

const response = await api.post(`/messages/${selectedChat._id}/mark-all-seen`);
const data = response.data;

        if (data.success) {
          console.log(`✅ ${data.messagesMarked} messages marqués comme vus`);
        }
      } catch (error) {
        console.error("❌ Erreur marquer messages vus:", error);
      }
    };

    const initialTimeout = setTimeout(markMessagesAsSeen, 500);

    const messageCheckInterval = setInterval(() => {
      markMessagesAsSeen();
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(messageCheckInterval);
    };
  }, [selectedChat?._id, user?.id, messages]);

  // Envoyer un message
  const handleSendMessage = async (text, file) => {
    try {
      if (file) {
        if (file.type.startsWith("image/")) {
          await sendImage(file);
        } else if (file.type.startsWith("video/")) {
          await sendVideo(file);
        } else {
          await sendFile(file);
        }
        setSelectedFile(null);
        setFilePreview(null);
        return;
      }

      if (!text || !text.trim()) return;

      sendTyping();

      await sendMessage(text);
    } catch (error) {
      console.error("Erreur envoi:", error);
    }
  };

  // 🔥 OUVRIR LA LIGHTBOX POUR MÉDIA
  const openMediaLightbox = (mediaUrl, mediaType) => {
    const allMedia = messages
      .filter(
        (msg) => msg.typeMessage === "image" || msg.typeMessage === "video",
      )
      .map((msg) => ({
        url: msg.content,
        type: msg.typeMessage,
      }));

    const index = allMedia.findIndex((m) => m.url === mediaUrl);

    setMediaList(allMedia);
    setCurrentMediaIndex(index !== -1 ? index : 0);
    setMediaLightboxOpen(true);
  };

  // 🔥 FERMER LA LIGHTBOX
  const closeMediaLightbox = () => {
    setMediaLightboxOpen(false);
  };

  // 🔥 MÉDIA PRÉCÉDENT
  const goToPreviousMedia = () => {
    setCurrentMediaIndex((prev) =>
      prev === 0 ? mediaList.length - 1 : prev - 1,
    );
  };

  // 🔥 MÉDIA SUIVANT
  const goToNextMedia = () => {
    setCurrentMediaIndex((prev) =>
      prev === mediaList.length - 1 ? 0 : prev + 1,
    );
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  // Enregistrement audio
  const handleMicClick = async () => {
    if (isRecording) {
      try {
        console.log("🛑 Arrêt de l'enregistrement...");

        const result = await stopAndSend();

        if (result?.tempId) {
          console.log("✅ Audio envoyé avec tempId:", result.tempId);
        }
      } catch (error) {
        console.error("❌ Erreur envoi vocal:", error);
        alert("Erreur lors de l'envoi du message vocal");
      }
    } else {
      console.log("▶️ Démarrage de l'enregistrement...");
      await startRecording();
    }
  };

  //theme discution
  const applyTheme = React.useCallback(
    async (theme, save = true) => {
      console.log("Thème sélectionné :", theme);
      let style = {};
      setThemeEmojis([]);

      const emojisFromTheme =
        theme?.emojis ?? (theme?.emoji ? [theme.emoji] : null);

      // Gestion upload fichier
      if (theme.type === "upload" && theme.value instanceof File) {
        const base64 = await fileToBase64(theme.value);
        style = {
          backgroundImage: `url(${base64})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        };
        setThemeStyle(style);
        setSendBtnColor("");
        setBubbleBg("");

        if (save) {
          localStorage.setItem(
            chatKey,
            JSON.stringify({ ...theme, value: base64 }),
          );
          await saveThemeToBackend({ ...theme, value: base64 });
        }
        return;
      }

      // Gestion image (URL ou base64)
      if (
        (theme.type === "image" || theme.type === "upload") &&
        typeof theme.value === "string"
      ) {
        style = {
          backgroundImage: `url(${theme.value})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        };
        setThemeStyle(style);
        setSendBtnColor("");
        setBubbleBg("");

        if (save) {
          localStorage.setItem(chatKey, JSON.stringify(theme));
          await saveThemeToBackend(theme);
        }
        return;
      }

      // Gestion couleurs, gradients, saisonniers
      if (
        theme.type === "color" ||
        theme.type === "gradient" ||
        theme.type === "seasonal"
      ) {
        style = { background: theme.value };
        setThemeStyle(style);
        setBubbleBg(theme.value || "");
        setSendBtnColor(theme.value || "");

        if (
          theme.type === "seasonal" &&
          emojisFromTheme &&
          Array.isArray(emojisFromTheme) &&
          emojisFromTheme.length > 0
        ) {
          setThemeEmojis(emojisFromTheme);
          const count = 35;
          const arr = Array.from({ length: count }).map((_, i) => ({
            id: `${Date.now()}_${i}`,
            left: Math.random() * 100,
            top: Math.random() * 60,
            size: 12 + Math.random() * 20,
            speed: 0.25 + Math.random() * 0.6,
            rotate: (Math.random() - 0.5) * 30,
            direction: Math.random() > 0.5 ? 1 : -1,
          }));
          setFloatingEmojis(arr);
        } else {
          setThemeEmojis([]);
          setFloatingEmojis([]);
        }

        if (save) {
          localStorage.setItem(chatKey, JSON.stringify(theme));
          await saveThemeToBackend(theme);
        }
      }
    },
    [selectedChat?._id, chatKey],
  );

  // 2️⃣ NOUVELLE FONCTION : Sauvegarder dans le backend
  const saveThemeToBackend = async (theme) => {
    try {
const response = await api.post('/themes', {
  conversationId: selectedChat._id,
  type: theme.type,
  value: theme.value,
  emojis: theme.emojis || (theme.emoji ? [theme.emoji] : []),
  name: theme.name || null,
});

const data = response.data;
      console.log("✅ Thème sauvegardé avec succès:", data);
    } catch (error) {
      console.error("💥 Erreur réseau sauvegarde thème:", error);
    }
  };

  // 3️⃣ NOUVELLE FONCTION : Charger depuis le backend
  const loadThemeFromBackend = React.useCallback(async () => {
try {
  const response = await api.get(`/themes/${selectedChat._id}`);
  const data = response.data;
      console.log("✅ Thème chargé depuis backend:", data);

      if (data.success && data.data) {
        const theme = {
          type: data.data.type,
          value: data.data.value,
          emojis: data.data.emojis,
          name: data.data.name,
        };

        applyTheme(theme, false);

        localStorage.setItem(chatKey, JSON.stringify(theme));
      }
    } catch (error) {
      console.error("💥 Erreur chargement thème:", error);

      const savedTheme = localStorage.getItem(chatKey);
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme);
        applyTheme(parsed, false);
      }
    }
  }, [selectedChat?._id, chatKey, applyTheme]);

  // 4️⃣ MODIFIER removeTheme pour supprimer aussi du backend
  const removeTheme = async () => {
    setThemeStyle({});
    setBubbleBg("");
    setSendBtnColor("");
    setThemeEmojis([]);
    setFloatingEmojis([]);
    localStorage.removeItem(chatKey);

    try {
await api.delete(`/themes/${selectedChat._id}`);
console.log("✅ Thème supprimé du backend");
    } catch (error) {
      console.error("💥 Erreur réseau suppression thème:", error);
    }
  };

  useEffect(() => {
    if (selectedChat?._id) {
      loadThemeFromBackend();
    }
  }, [selectedChat?._id, loadThemeFromBackend]);

  useEffect(() => {
    if (!socketService.socket || !selectedChat) return;

    const handleThemeChanged = ({ conversationId, theme }) => {
      if (conversationId === selectedChat._id) {
        console.log("🎨 Thème reçu via socket:", theme);

        applyTheme(theme, false);

        localStorage.setItem(chatKey, JSON.stringify(theme));
      }
    };

    const handleThemeRemoved = ({ conversationId }) => {
      if (conversationId === selectedChat._id) {
        console.log("🗑️ Thème supprimé via socket");

        setThemeStyle({});
        setBubbleBg("");
        setSendBtnColor("");
        setThemeEmojis([]);
        setFloatingEmojis([]);
        localStorage.removeItem(chatKey);
      }
    };

    socketService.socket.on("themeChanged", handleThemeChanged);
    socketService.socket.on("themeRemoved", handleThemeRemoved);

    return () => {
      socketService.socket.off("themeChanged", handleThemeChanged);
      socketService.socket.off("themeRemoved", handleThemeRemoved);
    };
  }, [selectedChat, chatKey, applyTheme]);

  // Charger le thème sauvegardé
  useEffect(() => {
    const resetTheme = () => {
      setThemeStyle({});
      setBubbleBg("");
      setSendBtnColor("");
      setThemeEmojis([]);
      setFloatingEmojis([]);
    };

    resetTheme();

    if (selectedChat?._id) {
      loadThemeFromBackend();
    }
  }, [selectedChat?._id, loadThemeFromBackend]);

  // Charger le thème sauvegardé
  useEffect(() => {
    const savedTheme = localStorage.getItem(chatKey);
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        applyTheme(parsed, false);
      } catch (e) {
        console.error("Erreur chargement thème:", e);
      }
    }
  }, [selectedChat]);

  // Animation des emojis flottants
  useEffect(() => {
    if (!themeEmojis || themeEmojis.length === 0) return;

    const id = setInterval(() => {
      setFloatingEmojis((prev) => {
        if (!prev || prev.length === 0) return prev;
        return prev.map((e) => {
          let newTop = e.top + e.speed * 0.25;
          if (newTop > 110) newTop = -10;
          let newLeft = e.left + 0.2 * e.direction;
          if (newLeft < 0) {
            newLeft = 0;
            e.direction = 1;
          } else if (newLeft > 100) {
            newLeft = 100;
            e.direction = -1;
          }
          const newRotate = e.rotate + (Math.random() - 0.5) * 2;
          return { ...e, top: newTop, left: newLeft, rotate: newRotate };
        });
      });
    }, 60);

    return () => clearInterval(id);
  }, [themeEmojis]);

  const bubbleClasses = (fromMe) =>
    fromMe
      ? "bg-myYellow2 dark:bg-mydarkYellow text-myBlack rounded-t-lg rounded-bl-lg rounded-br-none px-4 py-4 text-xs"
      : "bg-myGray4 dark:bg-[#2E2F2F] text-myBlack dark:!text-white rounded-t-lg rounded-br-lg rounded-bl-none px-4 py-4 text-xs";

  // 🔥 CORRECTION : Nom de la conversation
  const conversationName = React.useMemo(() => {
    if (selectedChat?.type === "group") {
      return selectedChat?.name || "Groupe";
    }
    return otherUserName || selectedChat?.name || "Utilisateur";
  }, [selectedChat, otherUserName]);

  // 🔥 CORRECTION : Avatar de la conversation
  const conversationAvatar = React.useMemo(() => {
    if (selectedChat?.type === "group") {
      return (
        selectedChat?.groupPic || selectedChat?.avatar || "/group-avatar.png"
      );
    }

    if (selectedChat?.targetUser?.profilePicture) {
      return selectedChat.targetUser.profilePicture;
    }

    const fromParticipants = selectedChat?.participants?.find((p) => {
      const pid = p._id || p.id;
      const uid = otherUserId;
      return pid && uid && String(pid) === String(uid);
    })?.profilePicture;

    if (fromParticipants) {
      console.log("✅ Photo trouvée dans participants:", fromParticipants);
      return fromParticipants;
    }

    console.log("❌ Aucune photo trouvée, utilisation par défaut");
    return "/default-avatar.png";
  }, [selectedChat, otherUserId]);

  // Avatar de l'autre utilisateur pour l'indicateur
  const otherUserAvatar = selectedChat?.isGroup
    ? "/group-avatar.png"
    : selectedChat?.participants?.find((participant) => {
        const participantId = participant._id || participant.id;
        const currentUserId = user?._id || user?.id || user?.userId;
        return String(participantId) !== String(currentUserId);
      })?.profilePicture || "/default-avatar.png";

  // Composant MessageBubble
  const MessageBubble = React.memo(
    ({ msg, deletedMessages, setDeletedMessages }) => {
      const longPressTimer = useRef(null);

      const startLongPress = () => {
        longPressTimer.current = setTimeout(() => {
          setShowMessageMenu(msg._id);
        }, 500); // ← Retire le ); en trop ici
      };

      const cancelLongPress = () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      };

      // Détermination robuste de l'expéditeur
      const currentUserId = user?._id || user?.id || user?.userId;

      const rawSender =
        msg.senderId ||
        msg.sender ||
        msg.Id_sender ||
        msg.Id_User ||
        msg.userId;

      const messageSenderId =
        typeof rawSender === "object" && rawSender !== null
          ? rawSender._id
          : rawSender;

      const fromMe =
        currentUserId &&
        messageSenderId &&
        String(currentUserId) === String(messageSenderId);

      const { reactions, addReaction, removeReaction } = useReactions(msg._id);

      const textColor = fromMe
        ? bubbleBg
          ? isDarkColor(bubbleBg)
            ? "#fff"
            : "#000"
          : "#000"
        : themeStyle.backgroundImage
          ? "#000"
          : themeStyle.background
            ? isDarkColor(themeStyle.background)
              ? "#fff"
              : "#000"
            : "#000";

      const isMatch =
        searchTerm &&
        msg.content?.toLowerCase().includes(searchTerm.toLowerCase());

      const messageTime = new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const handleAddReaction = async (emoji) => {
        try {
          await addReaction(emoji);
          setShowReactionPicker(null);
        } catch (error) {
          console.error("Erreur ajout réaction:", error);
        }
      };

      const handlePinMessage = async () => {
        try {
          if (msg.isPinned) {
            await unpinMessage(msg._id);
          } else {
            await pinMessage(msg._id);
          }
          setShowMessageMenu(null);
        } catch (error) {
          console.error("Erreur épinglage:", error);
        }
      };

      const handleDeleteMessage = (msgId) => {
        if (window.confirm("Supprimer ce message pour moi ?")) {
          setDeletedMessages((prev) => [...prev, msgId]);
          setShowMessageMenu(null);
        }
      };

      return (
        <div
          className={`flex ${fromMe ? "justify-end" : "justify-start"} group`}
        >
          <div className="flex flex-col max-w-[85%] relative">
            {!fromMe && selectedChat?.isGroup && (
              <p className="text-[10px] ml-1 mb-1 text-gray-700 dark:text-gray-300">
                {msg.senderUsername || msg.senderId?.username || "Utilisateur"}
              </p>
            )}

            <div className="relative">
              <div
                id={`message-${msg._id}`}
                className={`${bubbleClasses(fromMe)} ${
                  isMatch ? "ring-2 ring-blue-400" : ""
                } cursor-pointer`}
                style={{
                  background:
                    fromMe && !themeStyle.backgroundImage
                      ? bubbleBg || themeStyle.background || "#FFECA1"
                      : undefined,

                  color: textColor,

                  border:
                    fromMe && !themeStyle.backgroundImage
                      ? bubbleBg || themeStyle.background
                        ? `1px solid ${adjustColor(bubbleBg || themeStyle.background || "#FAFAFA", -40)}`
                        : undefined
                      : undefined,

                  boxShadow: "none",
                }}
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                onClick={() => {
                  if (showMessageMenu === msg._id) setShowMessageMenu(null);
                }}
              >
                {msg.isPinned && (
                  <Pin
                    size={12}
                    className="absolute -top-1 -right-1 text-myYellow"
                  />
                )}

                {/* 🔥 AFFICHAGE DU SONDAGE */}
                {msg.typeMessage === "poll" &&
                  (() => {
                    // Récupérer le sondage par son ID
                    let pollId =
                      msg.pollRef || msg.poll?._id || msg.content?.poll?._id;

                    // Si pollId est un objet, extraire l'ID
                    if (pollId && typeof pollId === "object") {
                      pollId = pollId._id;
                    }

                    const poll = pollId ? getPollById(pollId) : null;

                    if (!poll) {
                      // Fallback : utiliser les données du message
                      const pollData = msg.poll ||
                        msg.content?.poll || {
                          _id: msg._id,
                          question: msg.content || "Sondage",
                          options: [],
                          isClosed: false,
                          createdBy: msg.senderId || msg.Id_sender,
                        };

                      return (
                        <PollMessage
                          poll={pollData}
                          onVote={(optionIndexes) =>
                            handleVotePoll(pollData._id, optionIndexes)
                          }
                          currentUserId={user?._id || user?.id}
                          onClose={() => closePoll(pollData._id)}
                          onDelete={() => deletePoll(pollData._id)}
                          isCreator={
                            String(pollData.createdBy) ===
                            String(user?._id || user?.id)
                          }
                        />
                      );
                    }

                    return (
                      <PollMessage
                        poll={poll}
                        onVote={(optionIndexes) =>
                          handleVotePoll(poll._id, optionIndexes)
                        }
                        currentUserId={user?._id || user?.id}
                        onClose={() => closePoll(poll._id)}
                        onDelete={() => deletePoll(poll._id)}
                        isCreator={
                          String(poll.createdBy?._id || poll.createdBy) ===
                          String(user?._id || user?.id)
                        }
                      />
                    );
                  })()}

                {msg.typeMessage === "text" && msg.content}

                {msg.typeMessage === "image" && (
                  <img
                    src={msg.content}
                    alt="image"
                    className="max-w-full rounded mt-1 cursor-pointer"
                    style={{ maxHeight: "300px" }}
                    onClick={() => openMediaLightbox(msg.content, "image")}
                  />
                )}

                {msg.typeMessage === "video" && (
                  <video
                    src={msg.content}
                    controls
                    className="max-w-full rounded mt-1 cursor-pointer"
                    style={{ maxHeight: "300px" }}
                    onClick={() => openMediaLightbox(msg.content, "video")}
                  />
                )}

                {msg.typeMessage === "audio" && (
                  <AudioMessage
                    key={msg._id}
                    src={msg.content || msg.fileUrl}
                  />
                )}
                {msg.typeMessage === "file" && (
                  <a
                    href={msg.content}
                    download={msg.fileName || t("file.default_name")}
                    className="flex items-center gap-1 p-1
             rounded-lg bg-gray-100 dark:bg-neutral-800
             border border-gray-300 dark:border-neutral-700
             shadow-sm hover:bg-gray-200 dark:hover:bg-neutral-700
             transition w-fit max-w-[230px]"
                  >
                    <div className="text-lg">📄</div>

                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">
                        {msg.fileName || t("file.default_name")}
                      </span>

                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {t("file.download")}
                      </span>
                    </div>
                  </a>
                )}

                {msg.typeMessage === "call" && (
                  <CallMessage
                    callType={msg.callType}
                    callResult={msg.callResult}
                    duration={msg.duration}
                    fromMe={fromMe}
                  />
                )}
              </div>

              {showMessageMenu === msg._id && (
                <div
                  className={`message-menu absolute ${
                    fromMe ? "right-0" : "left-0"
                  } top-full mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl z-50 py-1 min-w-[150px]`}
                >
                  <button
                    onClick={() => {
                      console.log("🟡 click Réagir pour", msg._id);
                      setShowReactionPicker(msg._id);
                      setShowMessageMenu(null);
                    }}
                    className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                  >
                    <Smile size={16} /> {t("react")}
                  </button>
                  <button
                    onClick={handlePinMessage}
                    className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                  >
                    <Pin size={16} /> {msg.isPinned ? t("unpin") : t("pin")}
                  </button>
                  <button
                    onClick={() => {
                      setMessageToForward(msg);
                      setSelectedTargetConversation(null);
                      setShowForwardModal(true);
                      setShowMessageMenu(null);
                    }}
                    className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                  >
                    <CornerUpRight size={16} /> {t("forward")}
                  </button>
                  {fromMe && (
                    <button
                      onClick={() => {
                        setMessageToDelete(msg._id);
                        setShowDeleteModal(true);
                        setShowMessageMenu(null);
                      }}
                      className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600"
                    >
                      <Trash2 size={16} />
                      {t("delete")}
                    </button>
                  )}
                </div>
              )}

              {showReactionPicker === msg._id && (
                <div
                  className={`reaction-picker absolute ${
                    fromMe ? "right-0" : "left-0"
                  } top-full mt-1 bg-white dark:bg-neutral-800 rounded-full shadow-xl z-50 px-2 py-1 flex gap-1`}
                >
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {reactions && reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {reactions.map((reaction) => (
                  <div
                    key={reaction._id}
                    className="bg-white dark:bg-neutral-700 rounded-full px-2 py-0.5 text-xs flex items-center gap-1 shadow-sm"
                  >
                    <span>{reaction.emoji}</span>
                    {reaction.id_user && (
                      <span className="text-gray-600 dark:text-gray-300">
                        {reaction.id_user.username}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div
              className={`text-[10px] mt-1 flex items-center gap-1.5 ${
                fromMe ? "justify-end" : "justify-start"
              } text-gray-500 dark:text-gray-400`}
            >
              <span>{messageTime}</span>

              {fromMe && (
                <span className="flex items-center gap-1">
                  {msg._id.startsWith("pending_") ||
                  msg.status === "sending" ? (
                    <span className="flex items-center gap-1 text-gray-400">
                      ✓
                    </span>
                  ) : msg.status === "seen" ||
                    (msg.readBy && msg.readBy.length > 0) ? (
                    <span className="text-blue-500">✓✓✓</span>
                  ) : (
                    <span className="text-gray-400">✓✓</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    },
    (prevProps, nextProps) => {
      const msgUnchanged =
        prevProps.msg._id === nextProps.msg._id &&
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.msg.status === nextProps.msg.status &&
        prevProps.msg.typeMessage === nextProps.msg.typeMessage &&
        prevProps.msg.isPinned === nextProps.msg.isPinned &&
        prevProps.msg.createdAt === nextProps.msg.createdAt;

      if (prevProps.msg.typeMessage === "audio") {
        return msgUnchanged;
      }

      return (
        msgUnchanged &&
        prevProps.deletedMessages.includes(prevProps.msg._id) ===
          nextProps.deletedMessages.includes(nextProps.msg._id)
      );
    },
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-myWhite dark:bg-neutral-900">
        <Loader2 size={48} className="animate-spin text-myYellow" />
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col w-full h-full bg-myWhite dark:bg-neutral-900 text-myBlack dark:text-white transition-colors duration-300 min-w-[150px]"
      style={themeStyle}
    >
      {/* Floating emojis */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
      >
        {floatingEmojis.map((e) => {
          const randomEmoji =
            Array.isArray(themeEmojis) && themeEmojis.length > 0
              ? themeEmojis[Math.floor(Math.random() * themeEmojis.length)]
              : null;
          if (!randomEmoji) return null;
          return (
            <span
              key={e.id}
              style={{
                position: "absolute",
                left: `${e.left}%`,
                top: `${e.top}%`,
                fontSize: `${e.size}px`,
                opacity: 0.2 + Math.random() * 0.25,
                transform: `rotate(${e.rotate}deg)`,
                pointerEvents: "none",
                transition:
                  "top 0.06s linear, left 0.06s linear, transform 0.06s linear",
                WebkitTextStroke: "0px transparent",
                userSelect: "none",
              }}
            >
              {randomEmoji}
            </span>
          );
        })}
      </div>
      {/* HEADER */}
      <header className="flex items-center justify-between px-2 py-2 border-b border-gray-300 dark:border-gray-700 backdrop-blur-sm bg-white/20 dark:bg-black/20 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onBack} className="md:hidden mr-2 text-xl">
            ←
          </button>
          <img
            src={conversationAvatar}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="truncate">
            <div className="text-sm font-semibold truncate">
              {conversationName}
            </div>
            <div className="text-xs truncate text-gray-700 dark:text-gray-300 flex items-center gap-1">
              {selectedChat?.isGroup ? (
                `${selectedChat?.participants?.length || 0} membres`
              ) : (
                <span className="flex items-center gap-1">
                  {contactStatus.isOnline && (
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  )}
                  <span className="text-gray-500 text-xs">
                    {getUserStatusText()}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Cacher appels et pad si bloqué */}
          {!isBlocked && (
            <>
              <Phone
                size={16}
                className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-green-500 dark:hover:text-green-400 transition-colors"
                onClick={() => {
                  console.log("📞 [ChatWindow] Lancement appel AUDIO");
                  setStartOutgoingCallType(null);
                  setTimeout(() => {
                    setStartOutgoingCallType("audio");
                  }, 0);
                }}
              />

              <Video
                size={16}
                className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                onClick={() => {
                  console.log("🎬 [ChatWindow] Lancement appel VIDÉO");
                  setStartOutgoingCallType(null);
                  setTimeout(() => {
                    setStartOutgoingCallType("video");
                  }, 0);
                }}
              />
              {/* 🔥 BOUTON POUR CRÉER UN SONDAGE (VISIBLE UNIQUEMENT POUR LES GROUPES) */}
              {(selectedChat?.isGroup || selectedChat?.type === "group") && (
                <button
                  onClick={() => setShowPollModal(true)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Créer un sondage"
                >
                  <ChartBar
                    size={16}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </button>
              )}

              <button
                onClick={() => setShowPad(true)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Ouvrir le pad collaboratif"
              >
                <FileText
                  size={16}
                  className="text-gray-600 dark:text-gray-300"
                />
              </button>
            </>
          )}

          <button onClick={() => setIsOptionsOpen(true)}>
            <MoreVertical
              size={16}
              className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100"
            />
          </button>
        </div>
      </header>
      {/* DEMANDE DE MESSAGE */}
      {isIncomingMessageRequest && (
        <MessageRequestBanner
          conversationName={conversationName}
          conversationAvatar={conversationAvatar}
          onAccept={async () => {
            const token = localStorage.getItem("token");
            try {
              console.log(
                "🟢 Acceptation demande pour conversation:",
                selectedChat._id,
              );

const res = await api.post('/relations/accept-request', { 
  conversationId: selectedChat._id 
});

              const data = await res.json();
              console.log("✅ Réponse accept:", data);

              if (res.ok) {
                window.location.reload();
              } else {
                console.error("❌ Erreur accept:", data);
                alert(data.error || t("accept_error"));
              }
            } catch (err) {
              console.error("❌ Erreur réseau accept:", err);
              alert(t("network_error"));
            }
          }}
          onDelete={async () => {
            if (!confirm("Supprimer cette demande de message ?")) return;

            const token = localStorage.getItem("token");
            try {
              console.log(
                "🔴 Suppression demande pour conversation:",
                selectedChat._id,
              );

const res = await api.post('/relations/delete-request', { 
  conversationId: selectedChat._id 
});

              const data = await res.json();
              console.log("✅ Réponse delete:", data);

              if (res.ok) {
                onBack();
              } else {
                console.error("❌ Erreur delete:", data);
                alert(data.error || "Erreur lors de la suppression");
              }
            } catch (err) {
              console.error("❌ Erreur réseau delete:", err);
              alert(t("network_error"));
            }
          }}
        />
      )}
      {/* PINNED MESSAGES SECTION */}
      {showPinnedSection && pinnedMessages.length > 0 && (
        <div className="border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/40 z-20">
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <Pin size={14} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                {pinnedMessages.length} {t("messages.pinned")}
                {pinnedMessages.length > 1 ? t("messages.plural") : ""}
              </span>
            </div>
            <button
              onClick={() => setShowPinnedSection(false)}
              className="text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 rounded p-0.5 transition"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-28 overflow-y-auto px-3 pb-2 scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-yellow-100 dark:scrollbar-thumb-yellow-300 dark:scrollbar-track-yellow-900/50">
            <div className="space-y-1.5">
              {pinnedMessages.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => {
                    const element = document.getElementById(
                      `message-${msg._id}`,
                    );
                    if (element) {
                      element.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                      element.classList.add("ring-3", "ring-yellow-400");
                      setTimeout(
                        () =>
                          element.classList.remove("ring-3", "ring-yellow-400"),
                        1500,
                      );
                    }
                  }}
                  className="w-full text-left bg-white dark:bg-gray-800 rounded shadow-sm hover:shadow transition p-2 text-xs border border-yellow-200 dark:border-yellow-700 block"
                >
                  <div className="line-clamp-1 text-gray-800 dark:text-gray-200 font-medium">
                    {msg.typeMessage === "text" && msg.content}
                    {msg.typeMessage === "image" && "📷 Photo"}
                    {msg.typeMessage === "video" && "🎥 Vidéo"}
                    {msg.typeMessage === "audio" && "🎤 Vocal"}
                    {msg.typeMessage === "file" &&
                      `📎 ${msg.fileName || "Fichier"}`}
                    {msg.typeMessage === "poll" && "📊 Sondage"}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {new Date(msg.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* THEME SELECTOR */}
      {showThemeSelector && (
        <ThemeSelector
          onSelectTheme={applyTheme}
          onRemoveTheme={removeTheme}
          onClose={() => setShowThemeSelector(false)}
        />
      )}
      {/* MESSAGES */}
      <main
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-3 relative z-10"
        onClick={(e) => {
          if (
            e.target.closest(".message-menu") ||
            e.target.closest(".reaction-picker")
          ) {
            return;
          }
          setShowMessageMenu(null);
          setShowReactionPicker(null);
        }}
      >
        {/*Modifier pour supprimer  */}
        {messages.map((msg, i) => {
          const showDate =
            i === 0 ||
            messages[i - 1]?.createdAt?.split("T")[0] !==
              msg.createdAt?.split("T")[0];

          const isDeletedByMe = deletedMessages.includes(msg._id);
          const isDeletedForEveryone = deletedForEveryone.includes(msg._id);

          const currentUserId = user?._id || user?.id || user?.userId;
          const rawSender =
            msg.senderId ||
            msg.sender ||
            msg.Id_sender ||
            msg.Id_User ||
            msg.userId;
          const messageSenderId =
            typeof rawSender === "object" && rawSender?._id
              ? rawSender._id
              : rawSender;
          const wasFromMe =
            currentUserId &&
            messageSenderId &&
            String(currentUserId) === String(messageSenderId);

          if (isDeletedByMe || isDeletedForEveryone) {
            return (
              <div key={msg._id}>
                {showDate && (
                  <div className="text-center text-[10px] text-gray-700 dark:text-gray-400 my-2">
                    <span className="bg-myYellow2 px-5 py-2 dark:bg-myYellow rounded-lg">
                      {formatDateLabel(msg.createdAt, t)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${wasFromMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
              max-w-[85%] px-4 py-3 rounded-lg text-sm italic text-gray-500 dark:text-gray-400
              ${
                wasFromMe
                  ? "bg-myYellow2 dark:bg-mydarkYellow/30 rounded-t-lg rounded-bl-lg rounded-br-none"
                  : "bg-myGray4 dark:bg-[#2E2F2F] rounded-t-lg rounded-br-lg rounded-bl-none"
              }
            `}
                  >
                    {t("messageDeletedForYou")}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={msg._id}>
              {showDate && (
                <div className="text-center text-[10px] text-gray-700 dark:text-gray-400 my-2">
                  <span className="bg-myYellow2 px-5 py-2 dark:bg-myYellow rounded-lg">
                    {formatDateLabel(msg.createdAt, t)}
                  </span>
                </div>
              )}
              <MessageBubble
                msg={msg}
                index={i}
                deletedMessages={deletedMessages}
                setDeletedMessages={setDeletedMessages}
              />
            </div>
          );
        })}

        {/* 🔥 INDICATEUR "EN TRAIN D'ÉCRIRE" */}
        {isTyping && typingUsers.length > 0 && (
          <TypingIndicator
            avatar={otherUserAvatar}
            username={selectedChat?.isGroup ? typingUsers[0]?.username : null}
          />
        )}

        <div ref={messagesEndRef} />
      </main>
      {/* INPUT */}
      <footer className="px-2 py-2 backdrop-blur-sm bg-white/20 dark:bg-black/20 z-20">
        {isBlocked && blockedBy === "me" ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                {t("chat.youBlocked") || "Vous avez bloqué"}{" "}
                {otherUserName || "cet utilisateur"}
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                {t("chat.blockMessage") ||
                  "Vous ne pouvez pas contacter cette personne."}
              </p>
              <button
                onClick={() => setIsConfirmUnblockModalOpen(true)}
                className="px-4 py-2 bg-myYellow hover:bg-yellow-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t("chat.unblock") || "Débloquer"}
              </button>
            </div>
          </div>
        ) : isBlocked && blockedBy === "them" ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              {t("chat.blockedByOther") ||
                "Vous ne pouvez pas envoyer de message à cette personne"}
            </p>
          </div>
        ) : (
          <ChatInput
            onSendMessage={handleSendMessage}
            isRecording={isRecording}
            recordingTime={recordingTime}
            onMicClick={handleMicClick}
            onCancelRecording={cancelRecording}
            selectedFile={selectedFile}
            filePreview={filePreview}
            onFileSelect={(file) => {
              setSelectedFile(file);
              if (
                file.type.startsWith("image/") ||
                file.type.startsWith("video/")
              ) {
                setFilePreview(URL.createObjectURL(file));
              } else {
                setFilePreview(null);
              }
            }}
            onClearFile={() => {
              setSelectedFile(null);
              setFilePreview(null);
            }}
            t={t}
          />
        )}
      </footer>
      {/* Search Modal */}
      {/* ✅ VIDEO CALL SCREEN - UNE SEULE FOIS */}
      {startOutgoingCallType && selectedChat && (
        <VideoCallScreen
          selectedChat={selectedChat}
          callType={startOutgoingCallType}
          onClose={() => {
            console.log(`📞 [ChatWindow] Fermeture appel sortant`);
            setStartOutgoingCallType(null);
            clearActiveCall();
          }}
        />
      )}
      {/* MODAL PAD */}{" "}
      {showPad && selectedChat?._id && (
        <PadModal
          conversationId={selectedChat._id}
          isOpen={showPad}
          onClose={() => setShowPad(false)}
        />
      )}
      {/* 🔥 MODAL DE CRÉATION DE SONDAGE */}
      {showPollModal && (
        <PollModal
          isOpen={showPollModal}
          onClose={() => setShowPollModal(false)}
          onCreate={handleCreatePoll}
          loading={isCreatingPoll}
        />
      )}
      {openSearch && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenSearch(false)}
          ></div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-6 w-[300px] bg-white dark:bg-gray-700 rounded-lg shadow-lg p-3 z-50"
          >
            <input
              type="text"
              placeholder={t("chat.searchPlaceholder") || "Rechercher..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 text-xs text-myBlack dark:text-white bg-transparent"
            />
          </motion.div>
        </>
      )}
      {/* Confirm Unblock Modal */}
      <ConfirmBlockModal
        isOpen={isConfirmUnblockModalOpen}
        onClose={() => setIsConfirmUnblockModalOpen(false)}
        onConfirm={async () => {
          setIsConfirmUnblockModalOpen(false);
          await unblock();
        }}
        actionType="unblock"
        userInfo={{
          name: otherUserName,
          avatar: conversationAvatar,
        }}
      />
      {/* Forward Modal */}
      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setMessageToForward(null);
        }}
        message={messageToForward}
        conversations={myConversations}
        currentConversationId={selectedChat?._id}
        onForward={(targetConversationId) => {
          forwardMessage(messageToForward?._id, targetConversationId);
        }}
      />
      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        >
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t("deleteMessageTitle")}
              </h3>
            </div>

            {/* Corps */}
            <div className="px-6 py-6 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("deleteMessageQuestion")}
              </p>

              <div className="space-y-3">
                {/* Supprimer pour moi */}
                <button
                  onClick={() => {
                    handleDeleteForMe(messageToDelete);
                    setShowDeleteModal(false);
                  }}
                  className="w-full px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition"
                >
                  <div className="font-medium">{t("deleteForMe")}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("deleteForMeInfo")}
                  </div>
                </button>

                {/* Supprimer pour tout le monde */}
                <button
                  onClick={async () => {
                    await handleDeleteForEveryone(messageToDelete);
                    setShowDeleteModal(false);
                  }}
                  className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  <div className="font-medium">{t("deleteForEveryone")}</div>
                  <div className="text-xs text-red-500/80 dark:text-red-400/80">
                    {t("deleteWarningAll")}
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {isOptionsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30"
            onClick={() => setIsOptionsOpen(false)}
          ></div>
          <ChatOptionsMenu
            selectedChat={{
              ...selectedChat,
              userId: selectedChat?.isGroup
                ? null
                : selectedChat?.participants?.find((participant) => {
                    const participantId = participant._id || participant.id;
                    const currentUserId = user?._id || user?.id || user?.userId;
                    return String(participantId) !== String(currentUserId);
                  })?._id,
              openInfo: () => setIsInfoOpen(true),
              openTheme: () => {
                setShowThemeSelector(true);
                setIsOptionsOpen(false);
              },
            }}
            onClose={() => setIsOptionsOpen(false)}
            onOpenSearch={() => setOpenSearch(true)}
            onBlockStatusChange={() => refresh()}
          />
        </>
      )}
      {isInfoOpen && (
        <InfoContactModal
          chat={{
            ...selectedChat,
            openTheme: () => setShowThemeSelector(true),
            onArchive: async () => {
              try {
                if (isArchived) {
                  await unarchiveConversation(selectedChat._id);
                } else {
                  await archiveConversation(selectedChat._id);
                }
              } catch (err) {
                alert("Erreur lors de l'opération");
              }
            },
            isArchived: isArchived,
          }}
          onClose={() => setIsInfoOpen(false)}
          onBlockStatusChange={() => refresh()}
        />
      )}
      {/* 🔥 LIGHTBOX MODAL POUR MÉDIAS */}
      {mediaLightboxOpen && mediaList.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          {/* Bouton Fermer */}
          <button
            onClick={closeMediaLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Bouton Précédent */}
          {mediaList.length > 1 && (
            <button
              onClick={goToPreviousMedia}
              className="absolute left-4 text-white hover:text-gray-300 transition-colors z-50"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}

          {/* Image ou Vidéo */}
          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            {mediaList[currentMediaIndex]?.type === "image" ? (
              <img
                src={mediaList[currentMediaIndex]?.url}
                alt="Image en grand"
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={mediaList[currentMediaIndex]?.url}
                controls
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>

          {/* Bouton Suivant */}
          {mediaList.length > 1 && (
            <button
              onClick={goToNextMedia}
              className="absolute right-4 text-white hover:text-gray-300 transition-colors z-50"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}

          {/* Compteur de médias */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-4 py-2 rounded-lg">
            {currentMediaIndex + 1} / {mediaList.length}
          </div>
        </div>
      )}
      {/* Info Contact Modal */}
      {isInfoOpen && (
        <InfoContactModal
          chat={{
            ...selectedChat,
            openTheme: () => setShowThemeSelector(true),
            onArchive: async () => {
              try {
                if (isArchived) {
                  await unarchiveConversation(selectedChat._id);

                  if (typeof onConversationDeleted === "function") {
                    onConversationDeleted();
                  }
                } else {
                  await archiveConversation(selectedChat._id);
                }
              } catch (err) {
                alert("Erreur lors de l'opération");
              }
            },
            isArchived: isArchived,
          }}
          onClose={() => setIsInfoOpen(false)}
          onBlockStatusChange={() => refresh()}
          onConversationDeleted={onConversationDeleted}
        />
      )}
      {showGroupInfo && (
        <GroupManagerModal
          groupId={selectedChat._id}
          myRole={myRoleInGroup}
          members={groupMembers}
          onClose={() => setShowGroupInfo(false)}
          onMembersUpdated={() => {
         api.get(`/groups/${selectedChat._id}/members`)
  .then(res => {
    const data = res.data;
    if (data.success) {
      setGroupMembers(data.members || []);
    }
  });
          }}
        />
      )}
    </div>
  );
}
