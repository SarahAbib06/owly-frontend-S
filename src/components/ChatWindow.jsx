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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMessages } from "../hooks/useMessages";
import { useTyping } from "../hooks/useTyping";
import { useReactions } from "../hooks/useReactions";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useAuth } from "../hooks/useAuth";
import socketService from "../services/socketService";
import VideoCallScreen from "./VideoCallScreen";
import IncomingCallModal from './IncomingCallModal';
import ThemeSelector from "./ThemeSelector";
import AudioMessage from "./AudioMessage";
import ChatOptionsMenu from "./ChatOptionMenu";
import InfoContactModal from "./InfoContactModal";
import { motion } from "framer-motion";
import { FiSearch } from "react-icons/fi";
import { Archive } from "lucide-react";
import { useChat } from "../context/ChatContext"; // ← AJOUTE CET IMPORT

import { useBlockStatus } from "../hooks/useBlockStatut";
import ConfirmBlockModal from "./ConfirmBlockModal";
import ForwardModal from "./ForwardModal";
import { useConversations } from "../hooks/useConversations";




    


const SeenIconGray = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 48 48">
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

  return msgDate.toLocaleDateString("fr-FR", {
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

export default function ChatWindow({ selectedChat, onBack }) {

  const { t } = useTranslation();
  // const { user } = useAuth();
  const isFromArchived = selectedChat?.isFromArchived === true;
  const { conversations, archivedConversations } = useChat(); // ← AJOUT
  const isArchived = isFromArchived || archivedConversations.some(c => c._id === selectedChat?._id);
  console.log("isArchived ?", isArchived, selectedChat?._id);
  const { archiveConversation, unarchiveConversation } = useChat();
 const { user, socketConnected } = useAuth();
const [selectedTargetConversation, setSelectedTargetConversation] = useState(null);
const [showForwardModal, setShowForwardModal] = useState(false);
const [messageToForward, setMessageToForward] = useState(null);
const [deletedMessages, setDeletedMessages] = useState([]); // ajouter pour supprimer le message


const { conversations: myConversations, loading: convLoading } = useConversations();

  const chatKey = `theme_${selectedChat?._id ?? "default"}`;
//  Récupérer le userId de l'autre utilisateur
  const otherUserId = selectedChat?.isGroup 
    ? null 
    : selectedChat?.participants?.find(
        participant => {
          const participantId = participant._id || participant.id;
          const currentUserId = user?._id || user?.id || user?.userId;
          return String(participantId) !== String(currentUserId);
        }
      )?._id;

  const otherUserName = selectedChat?.isGroup
    ? null
    : selectedChat?.participants?.find(
        participant => {
          const participantId = participant._id || participant.id;
          const currentUserId = user?._id || user?.id || user?.userId;
          return String(participantId) !== String(currentUserId);
        }
      )?.username;

  //  Hook pour vérifier le blocage

const { isBlocked, blockedBy, unblock, refresh } = useBlockStatus(otherUserId);

const isIncomingMessageRequest = 
  selectedChat?.isMessageRequest === true && 
  selectedChat?.messageRequestFor?.toString() === user?._id?.toString();

// 🔥 NOUVEAU : Bannière Demande de message (comme Messenger)





   const [contactStatus, setContactStatus] = useState({
  isOnline: false,
  lastSeen: null,
});

const getUserStatusText = () => {
  // 🟢 Online
  if (contactStatus.isOnline) {
    return "En ligne";
  }

  // ⚪ Offline avec lastSeen
  if (contactStatus.lastSeen) {
    const last = new Date(contactStatus.lastSeen);
    const now = new Date();
    const diffMs = now - last;

    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return "En ligne il y a quelques secondes";
    if (diffMin < 60) return `En ligne il y a ${diffMin} min`;
    if (diffHour < 24) return `En ligne il y a ${diffHour} h`;

    return "En ligne il y a longtemps";
  }

  return "En ligne il y a un moment";
};
useEffect(() => {
  if (!contactStatus.lastSeen || contactStatus.isOnline) return;

  const interval = setInterval(() => {
    // force le recalcul du texte
    setContactStatus((prev) => ({ ...prev }));
  }, 60000); // toutes les 1 min

  return () => clearInterval(interval);
}, [contactStatus.lastSeen, contactStatus.isOnline]);





console.log("selectedChat:", selectedChat, "user:", user);
const contactId = React.useMemo(() => {
  if (!selectedChat || selectedChat.isGroup || !user) return null;
  const other = selectedChat.participants.find(
    (p) => String(p._id) !== String(user._id)
  );
  return other?._id || null;
}, [selectedChat, user]);

  console.log("contactId:", contactId);
 // --- useEffect pour récupérer le statut initial ---
useEffect(() => {
  if (!contactId) return;
  console.log("🧪 TEST contactId =", contactId);

  //fetch(`/api/users/${contactId}/status`)
  fetch(`http://localhost:5000/api/users/${contactId}/status`)
    .then(res => res.json())
    .then(data => {
  console.log("🧪 REPONSE API STATUS =", data);

      setContactStatus({
        isOnline: data.isOnline,
        lastSeen: data.lastSeen,
      });
    })
    .catch(err => console.error("Erreur statut:", err));
}, [contactId]);


// Après les autres useEffect (vers la fin du composant, avant les returns), ajoute :
// ajouter pour supprimer 
// Sauvegarder les messages supprimés
useEffect(() => {
  if (selectedChat?._id && deletedMessages.length > 0) {
    localStorage.setItem(
      `deleted_${selectedChat._id}`,
      JSON.stringify(deletedMessages)
    );
  }
}, [deletedMessages, selectedChat?._id]);


// ajouter pour supprimer 
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

// Fin de l'ajout 

// --- useEffect pour écouter les changements en temps réel via socket ---
useEffect(() => {
  if (!socketService.socket || !contactId) return;
  // 🔹 Rendre le socket accessible dans la console
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
  console.log("🔴 user offline reçu:", userId, lastSeen, "contactId:", contactId);
  if (!contactId) return;

  if (String(userId) === String(contactId)) {
    setContactStatus({
      isOnline: false,
      lastSeen: lastSeen ? new Date(lastSeen).toISOString() : new Date().toISOString(),
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




  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeStyle, setThemeStyle] = useState({});
  // 🔹 Écoute les thèmes envoyés par l'autre participant
useEffect(() => {
  if (!socketService.socket || !selectedChat) return;

  const handleThemeChange = ({ conversationId, theme }) => {
    if (conversationId === selectedChat._id) {
      console.log("Thème reçu via socket:", theme);
      applyTheme(theme, false); // applique le thème reçu mais ne sauvegarde pas localStorage
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
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null); 
  const [filePreview, setFilePreview] = useState(null); 
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [openSearch, setOpenSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedSection, setShowPinnedSection] = useState(false);
  
  // États pour les appels
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // États pour les interactions
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

    // 🔥 AJOUT : Détection si c'est une demande de message
    // const otherUserId = selectedChat?.participants?.[0]?._id?.replace('direct_', '') || selectedChat?.participants?.[0]?._id || null;
    // || selectedChat?.participants?.[0]?._id; // ← fallback important pour nouvelles conversations
     // fallback si c'est une nouvelle conversation
  // dernier recours si la clé contient l'ID
      console.log("selectedChat:", selectedChat);
  console.log("otherUserId:", otherUserId);

  const isMessageRequest = selectedChat?.isMessageRequest === true ||
    selectedChat?.messageRequestForMe === true;

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  //pour le modal debloquer 
  const [isConfirmUnblockModalOpen, setIsConfirmUnblockModalOpen] = useState(false);

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
  const { isRecording, recordingTime, startRecording, stopAndSend, cancelRecording } =
    useAudioRecorder(selectedChat?._id);

  // Gérer les appels entrants
  useEffect(() => {
    // Vérifiez d'abord si socketService existe et est connecté
    if (!socketService || !socketService.socket || !socketConnected) {
      console.error('SocketService non initialisé ou non connecté');
      return;
    }

    console.log('🔌 Configuration des écouteurs d\'appel...');

    // Utilisez les méthodes standard Socket.io
    socketService.socket.on('call:incoming', (call) => {
      console.log('📞 Appel entrant:', call);
      setIncomingCall(call);
    });

    socketService.socket.on('call:accepted', (data) => {
      console.log('✅ Appel accepté:', data);
      // Pour l'appelant, mettre à jour les données d'appel avec l'ID réel
      if (activeCall) {
        setActiveCall(prev => ({
          ...prev,
          callId: data.callId,
          status: 'active'
        }));
      } else {
        // Pour le destinataire, créer activeCall avec les données reçues
        setActiveCall({
          callId: data.callId,
          callerId: data.callerId,
          receiverId: data.receiverId,
          conversationId: data.conversationId,
          callType: data.callType,
          status: 'active'
        });
      }
      // Ouvrir VideoCallScreen immédiatement après acceptation
      setIsVideoCallOpen(true);
    });

    socketService.socket.on('call:rejected', () => {
      console.log('❌ Appel rejeté');
      setIncomingCall(null);
      setActiveCall(null);
      setIsVideoCallOpen(false);
      alert('Appel rejeté');
    });

    
    socketService.socket.on('call:ended', () => {
      console.log('📞 Appel terminé');
      setActiveCall(null);
      setIsVideoCallOpen(false);
    });


  

    socketService.socket.on('call:user_offline', () => {
      console.log('Utilisateur hors ligne');
      setActiveCall(null);
      setIsVideoCallOpen(false);
      alert('Utilisateur hors ligne');
    });

   

    return () => {
      // Nettoyage
      if (socketService.socket) {
        socketService.socket.off('call:incoming');
        socketService.socket.off('call:accepted');
        socketService.socket.off('call:rejected');
     
        socketService.socket.off('call:ended');
        socketService.socket.off('call:user_offline');
        
      }
    };
  }, [socketConnected]);

  // 🔥 Charger les messages épinglés
  useEffect(() => {
    const pinned = messages.filter((msg) => msg.isPinned);
    setPinnedMessages(pinned);
    setShowPinnedSection(pinned.length > 0);
  }, [messages]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Force la mise à jour quand on change de conversation (surtout depuis les archivées)
// Force la détection correcte du statut archivé quand la conversation change
useEffect(() => {
  // Ce useEffect vide dépend de selectedChat et archivedConversations
  // Il force React à recalculer isArchived à chaque changement
}, [selectedChat, archivedConversations]);

  // Gérer la saisie avec typing indicator
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (e.target.value.length > 0) {
      sendTyping();
    }
  };

  // Envoyer un message
  const handleSendMessage = async () => {
  try {
    // 📎 envoyer fichier
    if (selectedFile) {
      if (selectedFile.type.startsWith("image/")) {
        await sendImage(selectedFile);
      } else if (selectedFile.type.startsWith("video/")) {
        await sendVideo(selectedFile);
      } else {
        await sendFile(selectedFile);
      }

      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    // ✍️ envoyer texte
    if (!inputText.trim()) return;
    await sendMessage(inputText);
    setInputText("");
  } catch (error) {
    console.error("Erreur envoi:", error);
  }
};

    
  // Gérer l'upload de fichiers
  const handleFileSelect = (e) => { 
  const file = e.target.files[0]; 
  if (!file) return; 
 
  setSelectedFile(file); 
 
  if (file.type.startsWith("image/") || 
file.type.startsWith("video/")) { 
    setFilePreview(URL.createObjectURL(file)); 
  } else { 
    setFilePreview(null); 
  } 
};

  // Enregistrement audio
  const handleMicClick = async () => {
    if (isRecording) {
      try {
        await stopAndSend();
      } catch (error) {
        console.error("Erreur envoi vocal:", error);
        alert("Erreur lors de l'envoi du message vocal");
      }
    } else {
      await startRecording();
    }
  };

  // Gestion du thème
  const applyTheme = async (theme, save = true) => {
     console.log("Thème sélectionné :", theme); // <-- AJOUTE ÇA
    let style = {};
    setThemeEmojis([]);

    const emojisFromTheme = theme?.emojis ?? (theme?.emoji ? [theme.emoji] : null);

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
      if (save) localStorage.setItem(chatKey, JSON.stringify({ ...theme, value: base64 }));
      return;
    }

    if ((theme.type === "image" || theme.type === "upload") && typeof theme.value === "string") {
      style = {
        backgroundImage: `url(${theme.value})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
      setThemeStyle(style);
      setSendBtnColor("");
      setBubbleBg("");
      if (save) localStorage.setItem(chatKey, JSON.stringify(theme));
      return;
    }

    if (theme.type === "color" || theme.type === "gradient" || theme.type === "seasonal") {
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

      if (save) localStorage.setItem(chatKey, JSON.stringify(theme));
    }
  };

  const removeTheme = () => {
    setThemeStyle({});
    setBubbleBg("");
    setSendBtnColor("");
    setThemeEmojis([]);
    setFloatingEmojis([]);
    localStorage.removeItem(chatKey);
  };

  // Gérer l'appel entrant
  const handleAcceptCall = () => {
    if (!socketService.socket || !incomingCall) {
      console.error('Socket non disponible ou appel inexistant');
      return;
    }

    console.log('✅ Acceptation de l\'appel:', incomingCall);
    socketService.socket.emit('call:accept', {
      callId: incomingCall.callId,
      callerId: incomingCall.callerId
    });

    setActiveCall(incomingCall);
    setIncomingCall(null);
    // VideoCallScreen will be opened by the 'call:accepted' listener
  };

  const handleRejectCall = async () => {
    if (!socketService.socket || !incomingCall) {
      console.error('Socket non disponible ou appel inexistant');
      return;
    }

    console.log('❌ Rejet de l\'appel:', incomingCall);
    socketService.socket.emit('call:reject', {
      callId: incomingCall.callId,
      callerId: incomingCall.callerId
    });

    setIncomingCall(null);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      ? "bg-myYellow2 dark:bg-mydarkYellow text-myBlack rounded-t-xl rounded-bl-xl rounded-br-none px-3 py-2 text-sm"
      : "bg-myGray4 dark:bg-[#2E2F2F] text-myBlack dark:text-white rounded-t-xl rounded-br-xl rounded-bl-none px-3 py-2 text-sm";

  // Nom de la conversation
  const conversationName = selectedChat?.isGroup
  ? selectedChat.groupName
  : otherUserName || "Utilisateur";


const conversationAvatar = selectedChat?.isGroup
  ? "/group-avatar.png"
  : selectedChat?.participants?.find(
      participant => String(participant._id) === String(otherUserId)
    )?.profilePicture || "/default-avatar.png";


  // Modifier pour supprimer message 
  // avant 
  // const MessageBubble = ({ msg }) => {
  // Apres
  // 🔥 Composant Message CORRIGÉ
 const MessageBubble = ({ msg, deletedMessages, setDeletedMessages }) => {
    const longPressTimer = useRef(null);

    const startLongPress = () => {
      longPressTimer.current = setTimeout(() => {
        setShowMessageMenu(msg._id);
      }, 500);
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
      msg.senderId || msg.sender || msg.Id_sender || msg.Id_User || msg.userId;

    const messageSenderId =
      typeof rawSender === "object" && rawSender !== null ? rawSender._id : rawSender;

    const fromMe =
      currentUserId && messageSenderId && String(currentUserId) === String(messageSenderId);

   

    const { reactions, addReaction, removeReaction } = useReactions(msg._id);

    const textColor = fromMe
      ? bubbleBg
        ? isDarkColor(bubbleBg)
          ? "#fff"
          : "#000"
        : "#000"
      : themeStyle.backgroundImage
      ? "#fff"
      : themeStyle.background
      ? isDarkColor(themeStyle.background)
        ? "#fff"
        : "#000"
      : "#000";

    const isMatch =
      searchTerm && msg.content?.toLowerCase().includes(searchTerm.toLowerCase());

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
    
    // Modifier pour supprimer 
   const handleDeleteMessage = (msgId) => {
  if (window.confirm("Supprimer ce message pour moi ?")) {
    // Ajouter à la liste des messages supprimés
    setDeletedMessages(prev => [...prev, msgId]);
    setShowMessageMenu(null);
  }
};

    

















    return (
      <div className={`flex ${fromMe ? "justify-end" : "justify-start"} group`}>
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
                background: fromMe ? bubbleBg || undefined : undefined,
                color: textColor,
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

              {msg.typeMessage === "text" && msg.content}

              {msg.typeMessage === "image" && (
                <img
                  src={msg.content} 
                  alt="image"
                  className="max-w-full rounded mt-1"
                  style={{ maxHeight: "300px" }}
                />
              )}

              {msg.typeMessage === "video" && (
                <video
                  src={msg.content} 
                  controls
                  className="max-w-full rounded mt-1"
                  style={{ maxHeight: "300px" }}
                />
              )}

              {msg.typeMessage === "audio" && (
                <AudioMessage src={msg.content || msg.fileUrl} />
              )}
              {msg.typeMessage === "file" && (
                <a
                  href={msg.content}
                  download
                  className="flex items-center gap-2 underline"
                >
                  📎 {msg.fileName || "Fichier"}
                </a>
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
                  <Smile size={16} /> Réagir
                </button>
                <button
                  onClick={handlePinMessage}
                  className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                >
                  <Pin size={16} />{" "}
                  {msg.isPinned ? "Désépingler" : "Épingler"}
                </button>
                <button
                  onClick={() => {
                    setMessageToForward(msg);                    // On garde le message à transférer
                    setSelectedTargetConversation(null);          // Réinitialise la sélection
                    setShowForwardModal(true);                    // Ouvre la modale
                    setShowMessageMenu(null);                     // Ferme le menu
                  }}
                  className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                >
                  <CornerUpRight size={16} /> Transférer
                </button>
                {fromMe && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-500"
                  >
                    <Trash2 size={16} /> Supprimer
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
  className={`text-[8px] mt-1 flex items-center gap-1 ${
    fromMe ? "justify-end" : "justify-start"
  } text-gray-700 dark:text-gray-300`}
>
  <span>{messageTime}</span>
  {fromMe && msg.seen && <SeenIconGray />}
</div>


         
        </div>
      </div>
    );
    
  };

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
  {isTyping && typingUsers.length > 0 ? (
    <span className="text-green-500 font-medium">
      {t("chat.typing") || "En train d'écrire"}...
    </span>
  ) : selectedChat?.isGroup ? (
    `${selectedChat?.participants?.length || 0} membres`
  ) : (
    <span className="flex items-center gap-1">
      {contactStatus.isOnline && (
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
      )}
      <span className="text-gray-500 text-xs">{getUserStatusText()}</span>
    </span>
  )}
</div>

          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone
            size={16}
            className="text-gray-600 dark:text-gray-300 cursor-pointer"
          />
          <Video
    size={16}
    className="text-gray-600 dark:text-gray-300 cursor-pointer"
    onClick={() => {
      // Vérification de base
      if (!selectedChat || !selectedChat.participants || !user) {
        console.error('Données manquantes pour initier un appel');
        return;
      }

      const currentUserId = user._id || user.id || user.userId;
      console.log('Mon ID:', currentUserId);
      console.log('Participants du chat:', selectedChat.participants);

      // Pour un chat individuel
      if (!selectedChat.isGroup) {
        // Trouver l'autre participant
        const otherParticipant = selectedChat.participants.find(participant => {
          const participantId = participant._id || participant.id;
          return String(participantId) !== String(currentUserId);
        });

        console.log('Autre participant trouvé:', otherParticipant);

        if (otherParticipant && otherParticipant._id) {
          const receiverId = otherParticipant._id;

          // Vérifier qu'on ne s'appelle pas soi-même
          if (String(receiverId) === String(currentUserId)) {
            console.error('ERREUR: ReceiverId est le même que callerId!');
            alert('Impossible de s\'appeler soi-même');
            return;
          }

          console.log('📞 Initiation d\'un appel vidéo vers:', receiverId);

          if (socketService.socket) {
            socketService.socket.emit('call:initiate', {
              conversationId: selectedChat._id,
              receiverId: receiverId,
              callType: 'video'
            });

            // Ouvrir la fenêtre d'appel immédiatement pour l'appelant
            setActiveCall({
              callerId: currentUserId,
              receiverId: receiverId,
              conversationId: selectedChat._id,
              callType: 'video',
              callId: 'temp_' + Date.now(),
              receiverName: otherParticipant.username,
              receiverAvatar: otherParticipant.profilePicture
            });
            setIsVideoCallOpen(true);
          } else {
            console.error('Socket non connecté');
          }
        } else {
          console.error('Impossible de trouver l\'autre participant');
          alert('Impossible de trouver le contact');
        }
      } else {
        // Pour un chat de groupe
        alert('Les appels de groupe ne sont pas encore disponibles');
      }
    }}
  />
          
          {/* BOUTON ARCHIVER */}
      

          <button onClick={() => setIsOptionsOpen(true)}>
            <MoreVertical
              size={16}
              className="text-gray-600 dark:text-gray-300 cursor-pointer"
            />
          </button>
        </div>
      </header>

      {/* 🔥 DEMANDE DE MESSAGE - Bannière propre et réutilisable */}
      {isIncomingMessageRequest && (
        <MessageRequestBanner
          conversationName={conversationName}
          conversationAvatar={conversationAvatar}
          onAccept={async () => {
            const token = localStorage.getItem("token");
            try {
              const res = await fetch("http://localhost:5000/api/relations/accept-request", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ conversationId: selectedChat._id }),
              });

              if (res.ok) {
                window.location.reload(); // ou une meilleure méthode plus tard
              } else {
                const err = await res.json();
                alert(err.error || "Erreur lors de l'acceptation");
              }
            } catch (err) {
              alert("Erreur réseau");
            }
          }}
          onDelete={async () => {
            if (!confirm("Supprimer cette demande de message ?")) return;

            const token = localStorage.getItem("token");
            try {
              const res = await fetch("http://localhost:5000/api/relations/delete-request", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ conversationId: selectedChat._id }),
              });

              if (res.ok) {
                onBack(); // Retour à la liste
              } else {
                alert("Erreur lors de la suppression");
              }
            } catch (err) {
              alert("Erreur réseau");
            }
          }}
        />
      )}

      {/* SECTION MESSAGES ÉPINGLÉS */}

      {/* SECTION MESSAGES ÉPINGLÉS */}
            {/* SECTION MESSAGES ÉPINGLÉS - VERSION SCROLLABLE HORIZONTALE */}
            {/* SECTION MESSAGES ÉPINGLÉS - UNE SEULE LIGNE SCROLLABLE */}
            {/* SECTION MESSAGES ÉPINGLÉS - LISTE VERTICALE SCROLLABLE */}
            {/* SECTION MESSAGES ÉPINGLÉS - VERSION COMPACTE VERTICALE */}
            {/* SECTION MESSAGES ÉPINGLÉS - VERSION ULTRA-COMPACTE */}
      {showPinnedSection && pinnedMessages.length > 0 && (
        <div className="border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/40 z-20">
          {/* Header ultra-minimaliste */}
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <Pin size={14} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                {pinnedMessages.length} épinglé{pinnedMessages.length > 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setShowPinnedSection(false)}
              className="text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-800/50 rounded p-0.5 transition"
            >
              <X size={14} />
            </button>
          </div>

          {/* Liste ultra-compacte avec scrollbar */}
          <div className="max-h-28 overflow-y-auto px-3 pb-2 scrollbar-thin scrollbar-thumb-yellow-500 scrollbar-track-yellow-100 dark:scrollbar-thumb-yellow-300 dark:scrollbar-track-yellow-900/50">
            <div className="space-y-1.5">
              {pinnedMessages.map((msg) => (
                <button
                  key={msg._id}
                  onClick={() => {
                    const element = document.getElementById(`message-${msg._id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "center" });
                      element.classList.add("ring-3", "ring-yellow-400");
                      setTimeout(() => element.classList.remove("ring-3", "ring-yellow-400"), 1500);
                    }
                  }}
                  className="w-full text-left bg-white dark:bg-gray-800 rounded shadow-sm hover:shadow transition p-2 text-xs border border-yellow-200 dark:border-yellow-700 block"
                >
                  <div className="line-clamp-1 text-gray-800 dark:text-gray-200 font-medium">
                    {msg.typeMessage === "text" && msg.content}
                    {msg.typeMessage === "image" && "📷 Photo"}
                    {msg.typeMessage === "video" && "🎥 Vidéo"}
                    {msg.typeMessage === "audio" && "🎤 Vocal"}
                    {msg.typeMessage === "file" && `📎 ${msg.fileName || "Fichier"}`}
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
        {messages
  .filter(msg => !deletedMessages.includes(msg._id))
  .map((msg, i) => {
    const showDate =
      i === 0 ||
      messages[i - 1].createdAt?.split("T")[0] !==
        msg.createdAt?.split("T")[0];

    return (
      <div key={msg._id}>
        {showDate && (
          <div className="text-center text-[10px] text-gray-700 dark:text-gray-300 my-2">
            {formatDateLabel(msg.createdAt, t)}
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

  {/*fin de modification*/}
        <div ref={messagesEndRef} />
      </main>


      

      {/* INPUT */}




      

<footer className="px-2 py-2 backdrop-blur-sm bg-white/20 dark:bg-black/20 z-20">
  {/* ✅ SI BLOQUÉ : Afficher le message de blocage */}
  {isBlocked && blockedBy === 'me' ? (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
      <div className="text-center space-y-3">
        <p className="text-sm text-red-800 dark:text-red-200 font-medium">
          {t("chat.youBlocked") || "Vous avez bloqué"} {otherUserName || "cet utilisateur"}
        </p>
        <p className="text-xs text-red-600 dark:text-red-300">
          {t("chat.blockMessage") || "Vous ne pouvez pas contacter cette personne ou l'appeler dans cette discussion. Vous ne recevez pas ses messages ou appels."}
        </p>
         <button
        onClick={() => setIsConfirmUnblockModalOpen(true)}
        className="px-4 py-2 bg-myYellow hover:bg-yellow-400 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {t("chat.unblock") || "Débloquer"}
      </button>
      </div>
    </div>
  ) : isBlocked && blockedBy === 'them' ? (
    // ✅ SI BLOQUÉ PAR L'AUTRE : Afficher un message simple
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
        {t("chat.blockedByOther") || "Vous ne pouvez pas envoyer de message à cette personne"}
      </p>    
     </div>
  ) : (
     
    <>
      {isRecording && (
        <div className="mb-2 flex items-center justify-center gap-2 text-red-500">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {Math.floor(recordingTime / 60)}:
            {(recordingTime % 60).toString().padStart(2, "0")}
          </span>
          <button onClick={cancelRecording} className="ml-4 text-xs underline">
            Annuler
            </button>
          </div>
        )}
        {selectedFile && (
  <div className="mb-2 p-2 border rounded bg-white dark:bg-neutral-800">
    {selectedFile.type.startsWith("image/") && (
      <img src={filePreview} className="max-h-40 rounded" />
    )}

    {selectedFile.type.startsWith("video/") && (
      <video src={filePreview} controls className="max-h-40 rounded" />
    )}

    {!selectedFile.type.startsWith("image/") &&
     !selectedFile.type.startsWith("video/") && (
      <p className="text-sm">📎 {selectedFile.name}</p>
    )}

    <button
      onClick={() => {
        setSelectedFile(null);
        setFilePreview(null);
      }}
      className="text-xs text-red-500 underline mt-1"
    >
      Annuler
    </button>
  </div>
)}


        <div className="flex items-center gap-2  w-full">
          <div className="flex-1 flex items-center gap-1 px-2 py-2 rounded-xl  bg-myGray4 dark:bg-[#2E2F2F] backdrop-blur-md">
            <Smile
              size={18}
              className="text-gray-700 dark:text-gray-300 cursor-pointer"
            />
            <Paperclip
              size={18}
              className="text-gray-700 dark:text-gray-300 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,application/*"
            />
            <input
              type="text"
              className=" flex items-center flex-1 bg-transparent outline-none text-sm text-myBlack dark:text-white"
              placeholder={t("chat.inputPlaceholder") || "Tapez un message..."}
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={(e) =>
                e.key === "Enter" && !isRecording && handleSendMessage()
              }
              disabled={isRecording}
            />
          </div>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold text-myBlack"
            style={{ background: sendBtnColor || "#FFD700" }}
            onClick={
     selectedFile
    ? handleSendMessage
    : inputText.trim() === ""
    ? handleMicClick
    : handleSendMessage
}

          >
            {selectedFile || inputText.trim() !== "" ? (
  <Send size={18} />
) : (
  <Mic
    size={18}
    className={`text-gray-700 dark:text-gray-300 ${
      isRecording ? "animate-pulse text-red-500" : ""
    }`}
  />
)}

          </button>
       </div>
      
    </>
  )}
</footer>


      {/* Composants pour les appels */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {isVideoCallOpen && activeCall && activeCall.callId && !activeCall.callId.startsWith('temp_') && (
  <VideoCallScreen
    callData={activeCall}  // Passez activeCall comme callData
    onClose={() => setIsVideoCallOpen(false)}
  />
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
        //  AJOUTER le userId de l'autre utilisateur
        userId: selectedChat?.isGroup 
          ? null // Pas de blocage pour les groupes
          : selectedChat?.participants?.find(
              participant => {
                const participantId = participant._id || participant.id;
                const currentUserId = user?._id || user?.id || user?.userId;
                return String(participantId) !== String(currentUserId);
              }
            )?._id,
        openInfo: () => setIsInfoOpen(true),
        openTheme: () => {
          setShowThemeSelector(true);
          setIsOptionsOpen(false);
        },
      }}
      onClose={() => setIsOptionsOpen(false)}
      onOpenSearch={() => setOpenSearch(true)}
      // ✅ Ajouter le callback pour refresh
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

            {/* 🔥 BANDEAU DEMANDE DE MESSAGE 🔥 */}
      {/* {isMessageRequest && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-4 text-center">
          <p className="font-bold text-lg">Demande de message</p>
          <p className="text-sm mt-1 opacity-90">
            {conversationName} veut discuter avec vous
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/relations/accept-from-chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contactId: otherUserId }),
                  });
                  alert("Demande acceptée ! Vous pouvez maintenant répondre.");
                  window.location.reload();
                } catch (err) {
                  alert("Erreur lors de l'acceptation");
                }
              }}
              className="bg-white text-indigo-600 px-8 py-2.5 rounded-full font-semibold hover:scale-105 transition"
            >
              Accepter
            </button>
            <button
              onClick={() => {
                if (confirm("Supprimer cette demande de message ?")) {
                  onBack();
                }
              }}
              className="border border-white px-8 py-2.5 rounded-full font-semibold hover:bg-white/20 transition"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
} */}


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
          avatar: conversationAvatar
        }}
      />
      {console.log("Conversations disponibles pour transfert :", conversations)}
      {console.log("Mes conversations chargées :", myConversations)}
      {console.log("Conversations passées au modal :", myConversations)}
{console.log("Conversation actuelle ID :", selectedChat?._id)}

      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setMessageToForward(null);
        }}
        message={messageToForward}
        conversations={myConversations}  // ← TES CONVERSATIONS CHARGÉES DIRECTEMENT
        currentConversationId={selectedChat?._id}
        onForward={(targetConversationId) => {
          forwardMessage(messageToForward?._id, targetConversationId);
        }}
      />
    </div>
  );
}
