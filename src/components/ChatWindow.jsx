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
import { useCall } from "../context/CallContext";
import socketService from "../services/socketService";
import VideoCallScreen from "./VideoCallScreen";
import AudioCallScreen from "./AudioCallScreen";
import ThemeSelector from "./ThemeSelector";
import AudioMessage from "./AudioMessage";
import ChatOptionsMenu from "./ChatOptionMenu";
import InfoContactModal from "./InfoContactModal";
import { motion } from "framer-motion";
import { FiSearch } from "react-icons/fi";

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
  const { user } = useAuth();
  const { incomingCall, getPendingCall, clearPendingCall } = useCall();
  
  const chatKey = `theme_${selectedChat?._id ?? "default"}`;

  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isAudioCallOpen, setIsAudioCallOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeStyle, setThemeStyle] = useState({});
  const [bubbleBg, setBubbleBg] = useState("");
  const [sendBtnColor, setSendBtnColor] = useState("");
  const [themeEmojis, setThemeEmojis] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [openSearch, setOpenSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedSection, setShowPinnedSection] = useState(false);

  // États pour les interactions
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

  // État pour gérer les appels entrants
  const [incomingCallDataForAudio, setIncomingCallDataForAudio] = useState(null);

  // Démarrer un appel audio sortant directement depuis le bouton header
  const startAudioCallFromHeader = async () => {
    console.log('🔊 === DÉMARRAGE APPEL AUDIO DIRECT ===');

    if (!selectedChat?.participants || selectedChat.participants.length < 2) {
      alert('Conversation invalide');
      return;
    }

    const currentUserId = user._id || user.id;

    const otherParticipant = selectedChat.participants.find(
      participant => (participant._id || participant.id) !== currentUserId
    );

    if (!otherParticipant) {
      alert('Aucun autre participant trouvé dans la conversation');
      return;
    }

    console.log('🎯 Appel audio direct à:', {
      currentUser: currentUserId,
      otherUser: otherParticipant._id || otherParticipant.id,
      otherUsername: otherParticipant.username
    });

    const channelName = `audio_call_${selectedChat._id}_${Date.now()}`;

    try {
      // Vérifier la connexion socket
      if (!socketService.socket?.connected) {
        const token = localStorage.getItem('token');
        if (token) {
          socketService.connect(token);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log('✅ Socket prêt, émission événement audio...');

      const callData = {
        chatId: selectedChat._id,
        channelName: channelName,
        callerId: currentUserId,
        callerName: user.username || 'Utilisateur',
        recipientId: otherParticipant._id || otherParticipant.id,
        recipientName: otherParticipant.username || 'Utilisateur',
        timestamp: Date.now(),
        type: 'audio',
        callerSocketId: socketService.socket.id
      };

      socketService.socket.emit('initiate-audio-call', callData);
      console.log('📤 Événement audio envoyé:', callData);

      // Ouvrir AudioCallScreen en mode appel sortant
      setIsAudioCallOpen(true);

      // Timeout pour réponse
      setTimeout(() => {
        if (!isAudioCallOpen) {
          console.log('⏰ Timeout: Appel audio non répondu');
          alert('L\'appel audio n\'a pas été répondu');
        }
      }, 30000);

    } catch (error) {
      console.error('💥 Erreur démarrage appel audio direct:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  // Démarrer un appel vidéo sortant directement depuis le bouton header
  const startVideoCallFromHeader = async () => {
    console.log('🎬 === DÉMARRAGE APPEL VIDÉO DIRECT ===');

    if (!selectedChat?.participants || selectedChat.participants.length < 2) {
      alert('Conversation invalide');
      return;
    }

    const currentUserId = user._id || user.id;

    const otherParticipant = selectedChat.participants.find(
      participant => (participant._id || participant.id) !== currentUserId
    );

    if (!otherParticipant) {
      alert('Aucun autre participant trouvé dans la conversation');
      return;
    }

    console.log('🎯 Appel vidéo direct à:', {
      currentUser: currentUserId,
      otherUser: otherParticipant._id || otherParticipant.id,
      otherUsername: otherParticipant.username
    });

    const channelName = `video_call_${selectedChat._id}_${Date.now()}`;

    try {
      // Vérifier la connexion socket
      if (!socketService.socket?.connected) {
        const token = localStorage.getItem('token');
        if (token) {
          socketService.connect(token);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      console.log('✅ Socket prêt, émission événement vidéo...');

      const callData = {
        chatId: selectedChat._id,
        channelName: channelName,
        callerId: currentUserId,
        callerName: user.username || 'Utilisateur',
        recipientId: otherParticipant._id || otherParticipant.id,
        recipientName: otherParticipant.username || 'Utilisateur',
        timestamp: Date.now(),
        type: 'video',
        callerSocketId: socketService.socket.id
      };

      socketService.socket.emit('initiate-video-call', callData);
      console.log('📤 Événement vidéo envoyé:', callData);

      // Ouvrir VideoCallScreen en mode appel sortant
      setIsVideoCallOpen(true);

      // Timeout pour réponse
      setTimeout(() => {
        if (!isVideoCallOpen) {
          console.log('⏰ Timeout: Appel vidéo non répondu');
          alert('L\'appel vidéo n\'a pas été répondu');
        }
      }, 30000);

    } catch (error) {
      console.error('💥 Erreur démarrage appel vidéo direct:', error);
      alert(`Erreur: ${error.message}`);
    }
  };

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

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

  // 🔥 ÉCOUTER DIRECTEMENT LES APPELS AUDIO ENTRANTS DANS CE CHAT
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket || !selectedChat?._id) {
      console.warn('⚠️ Socket non disponible ou chat non sélectionné');
      return;
    }

    console.log('🎧 [ChatWindow] Écoute des appels audio pour chat:', selectedChat._id);

    const handleIncomingAudioCall = (data) => {
      console.log('📞 [ChatWindow] Appel audio entrant reçu:', data);
      
      // Vérifier que c'est bien pour ce chat
      if (data.chatId === selectedChat._id) {
        console.log('✅ Appel audio correspond au chat actuel');
        
        // Si l'utilisateur est déjà dans un appel, ignorer
        if (isAudioCallOpen || isVideoCallOpen) {
          console.log('⚠️ Déjà en appel, notification ignorée');
          return;
        }
        
        // Sauvegarder les données de l'appel
        setIncomingCallDataForAudio(data);

        // Jouer une sonnerie
        playRingtone();
      }
    };

    socket.on('incoming-audio-call', handleIncomingAudioCall);

    // Écouter l'acceptation d'appel
    socket.on('audio-call-accepted', (data) => {
      console.log('✅ [ChatWindow] Appel audio accepté:', data);
      // La gestion principale est dans AudioCallScreen
    });

    // Écouter le rejet d'appel
    socket.on('audio-call-rejected', (data) => {
      console.log('❌ [ChatWindow] Appel audio refusé:', data);
      setIncomingCallDataForAudio(null);
      stopRingtone();
    });

    return () => {
      if (socket) {
        socket.off('incoming-audio-call', handleIncomingAudioCall);
        socket.off('audio-call-accepted');
        socket.off('audio-call-rejected');
      }
      stopRingtone();
    };
  }, [selectedChat, isAudioCallOpen, isVideoCallOpen]);

  // 🔥 DÉTECTION AUTOMATIQUE DES APPELS ENTRANTS (VIDÉO + AUDIO)
  useEffect(() => {
    console.log('🔍 [ChatWindow] Vérification appels entrants pour le chat:', selectedChat?._id);
    
    if (incomingCall && incomingCall.chatId === selectedChat?._id) {
      console.log('📞 [ChatWindow] Appel entrant détecté:', incomingCall);
      
      // Détecter le type d'appel
      const isAudioCall = incomingCall.type === 'audio' || 
                         incomingCall.channelName?.includes('audio_call');
      
      if (isAudioCall) {
        console.log('🎧 [ChatWindow] Appel AUDIO entrant détecté');
        setTimeout(() => {
          setIsAudioCallOpen(true);
        }, 300);
      } else {
        console.log('🎬 [ChatWindow] Appel VIDÉO entrant détecté');
        setTimeout(() => {
          setIsVideoCallOpen(true);
        }, 300);
      }
    }
    
    // Vérifier les appels en attente
    const checkPendingCall = () => {
      const pendingCall = getPendingCall();
      if (pendingCall && pendingCall.chatId === selectedChat?._id) {
        console.log('📞 [ChatWindow] Appel en attente détecté:', pendingCall);
        
        const isAudioCall = pendingCall.type === 'audio' || 
                           pendingCall.channelName?.includes('audio_call');
        
        if (isAudioCall) {
          setIsAudioCallOpen(true);
        } else {
          setIsVideoCallOpen(true);
        }
        clearPendingCall();
      }
    };
    
    checkPendingCall();
    
    // Fallback localStorage
    try {
      const savedCall = localStorage.getItem('pendingVideoCall');
      if (savedCall) {
        const callData = JSON.parse(savedCall);
        if (callData && callData.chatId === selectedChat?._id) {
          console.log('📞 [ChatWindow] Appel en attente (localStorage):', callData);
          
          const isAudioCall = callData.type === 'audio' || 
                             callData.channelName?.includes('audio_call');
          
          if (isAudioCall) {
            setIsAudioCallOpen(true);
          } else {
            setIsVideoCallOpen(true);
          }
          localStorage.removeItem('pendingVideoCall');
        }
      }
    } catch (error) {
      console.error('Erreur parsing localStorage:', error);
    }
    
    // Fallback window
    if (window.pendingVideoCall && window.pendingVideoCall.chatId === selectedChat?._id) {
      console.log('📞 [ChatWindow] Appel en attente (window):', window.pendingVideoCall);
      
      const isAudioCall = window.pendingVideoCall.type === 'audio' || 
                         window.pendingVideoCall.channelName?.includes('audio_call');
      
      if (isAudioCall) {
        setIsAudioCallOpen(true);
      } else {
        setIsVideoCallOpen(true);
      }
      window.pendingVideoCall = null;
    }
    
  }, [incomingCall, selectedChat, getPendingCall, clearPendingCall]);

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

  // Gérer la saisie avec typing indicator
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (e.target.value.length > 0) {
      sendTyping();
    }
  };

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      await sendMessage(inputText);
      setInputText("");
    } catch (error) {
      console.error("Erreur envoi message:", error);
      alert("Erreur lors de l'envoi du message");
    }
  };

  // Gérer l'upload de fichiers
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const fileType = file.type;

      if (fileType.startsWith("image/")) {
        await sendImage(file);
      } else if (fileType.startsWith("video/")) {
        await sendVideo(file);
      } else {
        await sendFile(file);
      }
    } catch (error) {
      console.error("Erreur upload fichier:", error);
      alert("Erreur lors de l'envoi du fichier");
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

  // Sonnerie pour appel entrant
  const playRingtone = () => {
    try {
      // Simple sonnerie (peut être améliorée)
      console.log('🔔 Sonnerie jouée pour appel entrant');
    } catch (error) {
      console.log('Sonnerie non supportée');
    }
  };

  const stopRingtone = () => {
    console.log('🔕 Sonnerie arrêtée');
  };

  // Accepter un appel audio entrant
  const handleAcceptAudioCall = () => {
    if (!incomingCallDataForAudio) return;

    console.log('✅ Acceptation appel audio depuis ChatWindow');

    // Ouvrir AudioCallScreen avec les données de l'appel
    setIsAudioCallOpen(true);
    stopRingtone();

    // Émettre l'acceptation via socket
    const socket = socketService.socket;
    if (socket && incomingCallDataForAudio) {
      socket.emit('accept-audio-call', {
        channelName: incomingCallDataForAudio.channelName,
        callerId: incomingCallDataForAudio.callerId,
        callerSocketId: incomingCallDataForAudio.callerSocketId,
        recipientId: user._id || user.id,
        recipientName: user.username || 'Utilisateur',
        chatId: incomingCallDataForAudio.chatId
      });
    }
  };

  // Refuser un appel audio entrant
  const handleRejectAudioCall = () => {
    if (!incomingCallDataForAudio) return;

    console.log('❌ Refus appel audio depuis ChatWindow');

    setIncomingCallDataForAudio(null);
    stopRingtone();

    // Émettre le rejet via socket
    const socket = socketService.socket;
    if (socket && incomingCallDataForAudio) {
      socket.emit('reject-audio-call', {
        channelName: incomingCallDataForAudio.channelName,
        callerId: incomingCallDataForAudio.callerId,
        callerSocketId: incomingCallDataForAudio.callerSocketId,
        recipientId: user._id || user.id,
        reason: 'declined'
      });
    }
  };

  const bubbleClasses = (fromMe) =>
    fromMe
      ? "bg-myYellow2 dark:bg-mydarkYellow text-myBlack rounded-t-xl rounded-bl-xl rounded-br-none px-3 py-2 text-sm"
      : "bg-myGray4 dark:bg-[#2E2F2F] text-myBlack dark:text-white rounded-t-xl rounded-br-xl rounded-bl-none px-3 py-2 text-sm";

  // Nom de la conversation
  const conversationName = selectedChat?.isGroup
    ? selectedChat.groupName
    : selectedChat?.participants?.[0]?.username || "Utilisateur";

  const conversationAvatar = selectedChat?.isGroup
    ? "/group-avatar.png"
    : selectedChat?.participants?.[0]?.profilePicture || "/default-avatar.png";

  // 🔥 Composant Message
  const MessageBubble = ({ msg }) => {
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

    const handleDeleteMessage = async () => {
      if (window.confirm("Supprimer ce message ?")) {
        try {
          await deleteMessage(msg._id);
          setShowMessageMenu(null);
        } catch (error) {
          console.error("Erreur suppression:", error);
        }
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
                  src={msg.fileUrl}
                  alt="image"
                  className="max-w-full rounded mt-1"
                  style={{ maxHeight: "300px" }}
                />
              )}

              {msg.typeMessage === "video" && (
                <video
                  src={msg.fileUrl}
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
                  href={msg.fileUrl}
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
                    alert("Sélectionnez une conversation de destination");
                    setShowMessageMenu(null);
                  }}
                  className="w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-900 dark:text-white"
                >
                  <CornerUpRight size={16} /> Transférer
                </button>
                {fromMe && (
                  <button
                    onClick={handleDeleteMessage}
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
            <div className="text-xs truncate text-gray-700 dark:text-gray-300">
              {isTyping && typingUsers.length > 0 ? (
                <span className="text-green-500 font-medium">
                  {t("chat.typing") || "En train d'écrire"}...
                </span>
              ) : selectedChat?.isGroup ? (
                `${selectedChat?.participants?.length || 0} membres`
              ) : (
                t("chat.online") || "En ligne"
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* BOUTON APPEL AUDIO */}
          <Phone
            size={16}
            className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-green-500 dark:hover:text-green-400 transition-colors"
            onClick={startAudioCallFromHeader}
          />
          {/* BOUTON APPEL VIDÉO */}
          <Video
            size={16}
            className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
            onClick={startVideoCallFromHeader}
          />
          <button onClick={() => setIsOptionsOpen(true)}>
            <MoreVertical
              size={16}
              className="text-gray-600 dark:text-gray-300 cursor-pointer"
            />
          </button>
        </div>
      </header>

      {/* SECTION MESSAGES ÉPINGLÉS */}
      {showPinnedSection && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-3 py-2 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin size={14} className="text-yellow-600 dark:text-yellow-400" />
              <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                {pinnedMessages.length} message
                {pinnedMessages.length > 1 ? "s" : ""} épinglé
                {pinnedMessages.length > 1 ? "s" : ""}
              </span>
            </div>
            <button
              onClick={() => setShowPinnedSection(false)}
              className="text-yellow-600 dark:text-yellow-400"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-700 dark:text-gray-300 truncate">
            {pinnedMessages[0]?.content || "Message épinglé"}
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
        {messages.map((msg, i) => {
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
              <MessageBubble msg={msg} index={i} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* INPUT */}
      <footer className="px-2 py-2 backdrop-blur-sm bg-white/20 dark:bg-black/20 z-20">
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-2 rounded-xl flex-1 bg-myGray4 dark:bg-[#2E2F2F] backdrop-blur-md">
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
              className="flex-1 bg-transparent outline-none text-sm text-myBlack dark:text-white"
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
              inputText.trim() === "" ? handleMicClick : handleSendMessage
            }
          >
            {inputText.trim() === "" ? (
              <Mic
                size={18}
                className={`text-gray-700 dark:text-gray-300 ${
                  isRecording ? "animate-pulse text-red-500" : ""
                }`}
              />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </footer>

      {/* MODAL D'APPEL AUDIO ENTRANT DANS LE CHAT */}
       {incomingCallDataForAudio && !isAudioCallOpen && !isVideoCallOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-8 max-w-md w-full text-white shadow-2xl">
            <div className="text-center">
              <div className="mb-6">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                  <Phone size={48} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Appel audio entrant</h3>
                <p className="text-lg opacity-90">{incomingCallDataForAudio.callerName}</p>
                <p className="text-sm opacity-75 mt-1">Vous appelle</p>
              </div>

              <div className="flex justify-center gap-8 mb-6">
                <button
                  onClick={handleAcceptAudioCall}
                  className="flex flex-col items-center group"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-green-600 transition-colors shadow-lg">
                    <Phone size={24} />
                  </div>
                  <span className="text-sm font-medium">Accepter</span>
                </button>

                <button
                  onClick={handleRejectAudioCall}
                  className="flex flex-col items-center group"
                >
                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-red-600 transition-colors shadow-lg">
                    <X size={24} />
                  </div>
                  <span className="text-sm font-medium">Refuser</span>
                </button>
              </div>

              {/* Animation sonnerie */}
              <div className="flex justify-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APPEL AUDIO */}
     
{isAudioCallOpen && selectedChat && (
  <AudioCallScreen
    selectedChat={selectedChat}
    incomingCallData={incomingCallDataForAudio} // Toujours passer les données
    onClose={() => {
      console.log('📞 [ChatWindow] Fermeture AudioCallScreen');
      setIsAudioCallOpen(false);
      setIncomingCallDataForAudio(null);
      // Nettoyer les appels en attente
      clearPendingCall();
      localStorage.removeItem('pendingVideoCall');
      if (window.pendingVideoCall) {
        window.pendingVideoCall = null;
      }
    }}
  />
)}

      {/* MODAL APPEL VIDÉO */}
      {isVideoCallOpen && selectedChat && (
        <VideoCallScreen
          selectedChat={selectedChat}
          onClose={() => {
            console.log('📞 [ChatWindow] Fermeture VideoCallScreen');
            setIsVideoCallOpen(false);
            // Nettoyer les appels en attente
            clearPendingCall();
            localStorage.removeItem('pendingVideoCall');
            if (window.pendingVideoCall) {
              window.pendingVideoCall = null;
            }
          }}
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
              openInfo: () => setIsInfoOpen(true),
              openTheme: () => {
                setShowThemeSelector(true);
                setIsOptionsOpen(false);
              },
            }}
            onClose={() => setIsOptionsOpen(false)}
            onOpenSearch={() => setOpenSearch(true)}
          />
        </>
      )}

      {isInfoOpen && (
        <InfoContactModal
          chat={{
            ...selectedChat,
            openTheme: () => setShowThemeSelector(true),
          }}
          onClose={() => setIsInfoOpen(false)}
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
    </div>
  );
}