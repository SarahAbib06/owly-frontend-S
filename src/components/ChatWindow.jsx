// frontend/src/components/ChatWindow.jsx
// 🔥 VERSION CORRIGÉE : Header de groupe + Info expéditeur dans les groupes

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
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMessages } from "../hooks/useMessages";
import { useTyping } from "../hooks/useTyping";
import { useReactions } from "../hooks/useReactions";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import { useAuth } from "../hooks/useAuth";
import socketService from "../services/socketService";
import ThemeSelector from "./ThemeSelector";
import AudioMessage from "./AudioMessage";
import ChatOptionsMenu from "./ChatOptionMenu";
import InfoContactModal from "./InfoContactModal";
import GroupManagerModal from "./GroupManagerModal";
import { motion } from "framer-motion";
import { FiSearch } from "react-icons/fi";

import { Archive } from "lucide-react";
import { useChat } from "../context/ChatContext";
import EmojiPicker from 'emoji-picker-react';

import { useBlockStatus } from "../hooks/useBlockStatut";
import ConfirmBlockModal from "./ConfirmBlockModal";
import ForwardModal from "./ForwardModal";
import { useConversations } from "../hooks/useConversations";
import MessageRequestBanner from "./MessageRequestBanner";
import Modal from "./Modal";

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

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "🎉"];

// Composant Typing Indicator
const TypingIndicator = ({ avatar, username }) => (
  <div className="flex justify-start items-start gap-2 mb-3">
    <div className="w-8 h-8 flex-shrink-0">
      <img
        src={avatar || "/default-avatar.png"}
        alt={username || "Utilisateur"}
        className="w-8 h-8 rounded-full object-cover"
      />
    </div>
   
    <div className="flex flex-col max-w-[70%]">
      {username && (
        <p className="text-[10px] ml-1 mb-1 text-gray-700 dark:text-gray-300">
          {username}
        </p>
      )}
     
      <div className="bg-myGray4 dark:bg-[#2E2F2F] rounded-t-lg rounded-br-lg rounded-bl-none px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
        </div>
      </div>
     
      <div className="text-[10px] mt-1 text-gray-500 dark:text-gray-400">
        {new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  </div>
);

export default function ChatWindow({ selectedChat, onBack, onConversationDeleted }) {

  console.log("🔍 DEBUG selectedChat:", {
  _id: selectedChat?._id,
  name: selectedChat?.name,
  groupName: selectedChat?.groupName,
  isGroup: selectedChat?.isGroup,
  type: selectedChat?.type,
  participants: selectedChat?.participants?.length,
  "Clés disponibles": Object.keys(selectedChat || {})
});
  const { t } = useTranslation();
  const isFromArchived = selectedChat?.isFromArchived === true;
  const { conversations, archivedConversations } = useChat();
  const isArchived = isFromArchived || archivedConversations.some(c => c._id === selectedChat?._id);
  const { archiveConversation, unarchiveConversation } = useChat();

  const { user, socketConnected } = useAuth();
  const [selectedTargetConversation, setSelectedTargetConversation] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [deletedMessages, setDeletedMessages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deletedForEveryone, setDeletedForEveryone] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { conversations: myConversations, loading: convLoading } = useConversations();

  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [myRoleInGroup, setMyRoleInGroup] = useState('membre');

  const chatKey = `theme_${selectedChat?._id ?? "default"}`;
 
  const otherUserId = selectedChat?.isGroup
    ? null
    : selectedChat?.participants?.find(
        participant => {
          const participantId = participant._id || participant.id;
          const currentUserId = user?._id || user?.id || user?.userId;
          return String(participantId) !== String(currentUserId);
        }
      )?._id;

  const otherParticipant = selectedChat?.isGroup
    ? null
    : selectedChat?.participants?.find(
        participant => {
          const participantId = participant._id || participant.id;
          const currentUserId = user?._id || user?.id || user?.userId;
          return String(participantId) !== String(currentUserId);
        }
      );

  const { isBlocked, blockedBy, unblock, refresh } = useBlockStatus(otherUserId);

  const isIncomingMessageRequest =
    selectedChat?.isMessageRequest === true &&
    selectedChat?.messageRequestFor?.toString() === user?.id?.toString();

  const [contactStatus, setContactStatus] = useState({
    isOnline: false,
    lastSeen: null,
  });

  const getUserStatusText = () => {
    if (contactStatus.isOnline) {
      return "En ligne";
    }
    if (!contactStatus.lastSeen) {
      return "";
    }
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
      setContactStatus((prev) => ({ ...prev }));
    }, 60000);

    return () => clearInterval(interval);
  }, [contactStatus.lastSeen, contactStatus.isOnline]);

  // 🔥 CORRECTION : Charger membres du groupe
  useEffect(() => {
    if (selectedChat?.isGroup && selectedChat._id) {
      const fetchGroupMembers = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:5000/api/groups/${selectedChat._id}/members`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (data.success) {
            setGroupMembers(data.members || []);
            
            const userId = localStorage.getItem('userId');
            const myMember = data.members.find(m => String(m.id) === String(userId));
            setMyRoleInGroup(myMember?.role || 'membre');
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
      (p) => String(p._id) !== String(user._id)
    );
    return other?._id || null;
  }, [selectedChat, user]);

  useEffect(() => {
    if (!contactId) return;

    fetch(`http://localhost:5000/api/users/${contactId}/status`)
      .then(res => res.json())
      .then(data => {
        setContactStatus({
          isOnline: data.isOnline,
          lastSeen: data.lastSeen,
        });
      })
      .catch(err => console.error("Erreur statut:", err));
  }, [contactId]);

  useEffect(() => {
  if (!socketService.socket || !selectedChat?._id) return;

  // Écouter les nouveaux messages (incluant les messages système)
  const handleNewMessage = (data) => {
    console.log("📨 Nouveau message reçu:", data);
    
    // Le message sera automatiquement ajouté via votre hook useMessages
    // Pas besoin de logique supplémentaire
  };

  socketService.socket.on("new_message", handleNewMessage);

  return () => {
    socketService.socket.off("new_message", handleNewMessage);
  };
}, [selectedChat?._id]);

  useEffect(() => {
    if (selectedChat?._id && deletedMessages.length > 0) {
      localStorage.setItem(
        `deleted_${selectedChat._id}`,
        JSON.stringify(deletedMessages)
      );
    }
  }, [deletedMessages, selectedChat?._id]);

  const otherUserName = React.useMemo(() => {
    if (selectedChat?.isGroup) return null;
   
    const otherParticipant = selectedChat?.participants?.find(
      participant => {
        const participantId = participant._id || participant.id || participant.userId;
        const currentUserId = user?._id || user?.id || user?.userId;
        return participantId && currentUserId && String(participantId) !== String(currentUserId);
      }
    );
   
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.EmojiPickerReact')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (selectedChat?._id && deletedMessages.length > 0) {
      localStorage.setItem(
        `deleted_${selectedChat._id}`,
        JSON.stringify(deletedMessages)
      );
    }
  }, [deletedMessages, selectedChat?._id]);

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

  useEffect(() => {
    if (!socketService.socket || !contactId) return;
   
    window.socket = socketService.socket;
   
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

  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [themeStyle, setThemeStyle] = useState({});
 
  useEffect(() => {
    if (!socketService.socket || !selectedChat) return;

    const handleThemeChange = ({ conversationId, theme }) => {
      if (conversationId === selectedChat._id) {
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
 
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);

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

      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/messages/${messageId}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setDeletedForEveryone((prev) => prev.filter((id) => id !== messageId));
        throw new Error(data.error || "Erreur lors de la suppression");
      }

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

  useEffect(() => {
    if (selectedChat?._id && deletedForEveryone.length > 0) {
      localStorage.setItem(
        `deletedEveryone_${selectedChat._id}`,
        JSON.stringify(deletedForEveryone)
      );
    }
  }, [deletedForEveryone, selectedChat?._id]);

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

  const isMessageRequest = selectedChat?.isMessageRequest === true ||
    selectedChat?.messageRequestForMe === true;

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
 
  const [isConfirmUnblockModalOpen, setIsConfirmUnblockModalOpen] = useState(false);

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

  const { isRecording, recordingTime, startRecording, stopAndSend, cancelRecording } =
    useAudioRecorder(selectedChat?._id);

  useEffect(() => {
    const pinned = messages.filter((msg) => msg.isPinned);
    setPinnedMessages(pinned);
    setShowPinnedSection(pinned.length > 0);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
  }, [selectedChat, archivedConversations]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (e.target.value.length > 0) {
      sendTyping();
    }
  };

  const handleSendMessage = async () => {
    try {
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

      if (!inputText.trim()) return;
      await sendMessage(inputText);
      setInputText("");
    } catch (error) {
      console.error("Erreur envoi:", error);
    }
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

  const onEmojiClick = (emojiObject) => {
    setInputText((prevInput) => prevInput + emojiObject.emoji);
  };

  const applyTheme = React.useCallback(async (theme, save = true) => {
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
     
      if (save) {
        localStorage.setItem(chatKey, JSON.stringify({ ...theme, value: base64 }));
        await saveThemeToBackend({ ...theme, value: base64 });
      }
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
     
      if (save) {
        localStorage.setItem(chatKey, JSON.stringify(theme));
        await saveThemeToBackend(theme);
      }
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

      if (save) {
        localStorage.setItem(chatKey, JSON.stringify(theme));
        await saveThemeToBackend(theme);
      }
    }
  }, [selectedChat?._id, chatKey]);

  const saveThemeToBackend = async (theme) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/themes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: selectedChat._id,
          type: theme.type,
          value: theme.value,
          emojis: theme.emojis || (theme.emoji ? [theme.emoji] : []),
          name: theme.name || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ Erreur sauvegarde thème:", error);
        return;
      }

      const data = await response.json();
    } catch (error) {
      console.error("💥 Erreur réseau sauvegarde thème:", error);
    }
  };

  const loadThemeFromBackend = React.useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/themes/${selectedChat._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const savedTheme = localStorage.getItem(chatKey);
        if (savedTheme) {
          const parsed = JSON.parse(savedTheme);
          applyTheme(parsed, false);
        }
        return;
      }

      const data = await response.json();

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

  const removeTheme = async () => {
    setThemeStyle({});
    setBubbleBg("");
    setSendBtnColor("");
    setThemeEmojis([]);
    setFloatingEmojis([]);
    localStorage.removeItem(chatKey);
   
    try {
      const token = localStorage.getItem("token");
     
      const response = await fetch(
        `http://localhost:5000/api/themes/${selectedChat._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        console.log("✅ Thème supprimé du backend");
      } else {
        console.error("❌ Erreur suppression thème backend");
      }
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
        applyTheme(theme, false);
        localStorage.setItem(chatKey, JSON.stringify(theme));
      }
    };

    const handleThemeRemoved = ({ conversationId }) => {
      if (conversationId === selectedChat._id) {
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

  const handleAcceptCall = () => {
    if (!socketService.socket || !incomingCall) {
      console.error('Socket non disponible ou appel inexistant');
      return;
    }

    const callToAccept = { ...incomingCall };
    setIncomingCall(null);
   
    socketService.socket.emit('call:accept', {
      callId: callToAccept.callId,
      callerId: callToAccept.callerId
    });

    setActiveCall({
      ...callToAccept,
      status: 'accepted'
    });
  };

  const handleRejectCall = async () => {
    if (!socketService.socket || !incomingCall) {
      console.error('Socket non disponible ou appel inexistant');
      return;
    }

    socketService.socket.emit('call:reject', {
      callId: incomingCall.callId,
      callerId: incomingCall.callerId
    });

    setIncomingCall(null);
  };

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
    if (selectedChat?.type === 'group') {  // ← ✅ type existe !
      return selectedChat?.name || "Groupe";
    }
    return otherUserName || selectedChat?.name || "Utilisateur";
  }, [selectedChat, otherUserName]);

  // 🔥 CORRECTION : Avatar de la conversation
  const conversationAvatar = React.useMemo(() => {
    if (selectedChat?.type === 'group') {  // ← ✅ type existe !
    return selectedChat?.groupPic || selectedChat?.avatar || "/group-avatar.png"; // ← groupPic EN PREMIER
    }

    if (selectedChat?.targetUser?.profilePicture) {
      return selectedChat.targetUser.profilePicture;
    }

    const fromParticipants = selectedChat?.participants?.find(
      (p) => {
        const pid = p._id || p.id;
        const uid = otherUserId;
        return pid && uid && String(pid) === String(uid);
      }
    )?.profilePicture;

    if (fromParticipants) {
      return fromParticipants;
    }

    return "/default-avatar.png";
  }, [selectedChat, otherUserId]);

  const otherUserAvatar = selectedChat?.isGroup
    ? "/group-avatar.png"
    : selectedChat?.participants?.find(
        participant => {
          const participantId = participant._id || participant.id;
          const currentUserId = user?._id || user?.id || user?.userId;
          return String(participantId) !== String(currentUserId);
        }
      )?.profilePicture || "/default-avatar.png";

const SystemMessage = ({ message }) => {
  // Déterminer l'icône et la couleur selon le type de message
  const getMessageStyle = (content) => {
    if (content.includes("ajouté")) return { icon: "➕", color: "blue" };
    if (content.includes("quitté")) return { icon: "👋", color: "yellow" };
    if (content.includes("retiré")) return { icon: "➖", color: "red" };
    if (content.includes("promu")) return { icon: "👑", color: "purple" };
    if (content.includes("créé")) return { icon: "✨", color: "green" };
    if (content.includes("modifié")) return { icon: "✏️", color: "indigo" };
    return { icon: "ℹ️", color: "blue" };
  };

  const { icon, color } = getMessageStyle(message.content);

  const colorClasses = {
    blue: "from-blue-50 via-indigo-50 to-blue-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-700/50 text-blue-700 dark:text-blue-300",
    green: "from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 border-green-200 dark:border-green-700/50 text-green-700 dark:text-green-300",
    yellow: "from-yellow-50 via-amber-50 to-yellow-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-700/50 text-yellow-700 dark:text-yellow-300",
    red: "from-red-50 via-rose-50 to-red-50 dark:from-red-900/20 dark:via-rose-900/20 dark:to-red-900/20 border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300",
    purple: "from-purple-50 via-violet-50 to-purple-50 dark:from-purple-900/20 dark:via-violet-900/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-700/50 text-purple-700 dark:text-purple-300",
    indigo: "from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300",
  };

  return (
    <div className="flex justify-center my-4">
      <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-full px-5 py-2.5 text-xs max-w-[85%] text-center shadow-md border backdrop-blur-sm`}>
        <span className="font-medium flex items-center gap-2 justify-center">
          <span className="text-lg">{icon}</span>
          {message.content}
        </span>
        <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-1">
          {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
};

  // 🔥 COMPOSANT MESSAGE CORRIGÉ
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
   
    const handleDeleteMessage = (msgId) => {
      if (window.confirm("Supprimer ce message pour moi ?")) {
        setDeletedMessages(prev => [...prev, msgId]);
        setShowMessageMenu(null);
      }
    };

    return (
      <div className={`flex ${fromMe ? "justify-end" : "justify-start"} group`}>
        {/* 🔥 AVATAR À GAUCHE (seulement pour les messages REÇUS dans un GROUPE) */}
        {!fromMe && selectedChat?.type === 'group' && ( 
          <div className="flex-shrink-0 mr-2">
            <img
              src={msg.senderProfilePicture || "/default-avatar.png"}
              alt={msg.senderUsername || "User"}
              className="w-8 h-8 rounded-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col max-w-[85%] relative">
          {/* 🔥 NOM + 3 PREMIÈRES LETTRES (seulement pour groupes) */}
         {!fromMe && selectedChat?.type === 'group' && ( 
            <div className="flex items-center gap-1 ml-1 mb-1">
              <span className="text-[10px] text-gray-700 dark:text-gray-300">
                {msg.senderUsername || msg.senderId?.username || "Utilisateur"}
              </span>
            </div>
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

            {/* Menu contextuel */}
            {showMessageMenu === msg._id && (
              <div
                className={`message-menu absolute ${
                  fromMe ? "right-0" : "left-0"
                } top-full mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl z-50 py-1 min-w-[150px]`}
              >
                <button
                  onClick={() => {
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
                  <Pin size={16} /> {msg.isPinned ? "Désépingler" : "Épingler"}
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
                  <CornerUpRight size={16} /> Transférer
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
                    <Trash2 size={16} /> Supprimer
                  </button>
                )}
              </div>
            )}

            {/* Picker de réactions */}
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

          {/* Réactions */}
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

          {/* Heure + statut */}
          <div
            className={`text-[10px] mt-1 flex items-center gap-1.5 ${
              fromMe ? "justify-end" : "justify-start"
            } text-gray-500 dark:text-gray-400`}
          >
            <span>{messageTime}</span>
            {fromMe && (
              <span className="flex items-center gap-1">
                {msg.status === "sending" ? (
                  <span className="text-gray-400">✓</span>
                ) : (
                  <span className="text-gray-500">✓✓</span>
                )}
              </span>
            )}
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

      {/* 🔥 HEADER CORRIGÉ */}
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
                  <span className="text-gray-500 text-xs">{getUserStatusText()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Phone
            size={16}
            className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100"
            onClick={() => alert("Fonctionnalité d'appel vocal bientôt disponible!")}
          />
          <Video
            size={16}
            className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100"
            onClick={() => alert("Fonctionnalité d'appel vidéo bientôt disponible!")}
          />
         
          <button onClick={() => setIsOptionsOpen(true)}>
            <MoreVertical
              size={16}
              className="text-gray-600 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-100"
            />
          </button>
        </div>
      </header>

      {selectedChat?.isGroup && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-blue-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <span className="font-semibold text-sm">{groupMembers?.length || 0} membres</span>
            </div>
            <button 
              onClick={() => setShowGroupInfo(true)}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium px-3 py-1 bg-white/50 hover:bg-white rounded-full transition-all"
            >
              Gérer
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {groupMembers?.slice(0, 5).map((m, i) => (
              <div key={m.id} className="flex flex-col items-center gap-1 min-w-[40px] flex-shrink-0">
                <img 
                  src={m.profilePicture || 'default-avatar.png'} 
                  className="w-8 h-8 rounded-full ring-2 ring-white/50 shadow-md"
                  alt={m.username}
                />
                {m.role === 'admin' && (
                  <span className="text-xs text-yellow-600 font-bold">👑</span>
                )}
                <span className="text-xs truncate text-gray-600 dark:text-gray-400 max-w-[40px]">{m.username}</span>
              </div>
            ))}
            {groupMembers?.length > 5 && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
                +{groupMembers.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

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

              const data = await res.json();

              if (res.ok) {
                window.location.reload();
              } else {
                alert(data.error || "Erreur lors de l'acceptation");
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

              const data = await res.json();

              if (res.ok) {
                onBack();
              } else {
                alert(data.error || "Erreur lors de la suppression");
              }
            } catch (err) {
              alert("Erreur réseau");
            }
          }}
        />
      )}

      {showPinnedSection && pinnedMessages.length > 0 && (
        <div className="border-b border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/40 z-20">
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
            messages[i - 1]?.createdAt?.split("T")[0] !== msg.createdAt?.split("T")[0];

          const isDeletedByMe = deletedMessages.includes(msg._id);
          const isDeletedForEveryone = deletedForEveryone.includes(msg._id);

          const currentUserId = user?._id || user?.id || user?.userId;
          const rawSender = msg.senderId || msg.sender || msg.Id_sender || msg.Id_User || msg.userId;
          const messageSenderId = typeof rawSender === "object" && rawSender?._id ? rawSender._id : rawSender;
          const wasFromMe = currentUserId && messageSenderId && String(currentUserId) === String(messageSenderId);

              // 🆕 GESTION DES MESSAGES SYSTÈME
    if (msg.typeMessage === "system") {
      return (
        <div key={msg._id}>
          {showDate && (
            <div className="text-center text-[10px] text-gray-700 dark:text-gray-400 my-2">
              <span className="bg-myYellow2 px-5 py-2 dark:bg-myYellow rounded-lg">
                {formatDateLabel(msg.createdAt, t)}
              </span>
            </div>
          )}
          <SystemMessage message={msg} />
        </div>
      );
    }

          if (isDeletedByMe || isDeletedForEveryone) {
            return (
              <div key={msg._id}>
                {showDate && (
                  <div className="text-center text-[10px] text-myBlack my-2">
                    <span className="bg-myYellow2 px-5 py-2 dark:bg-myYellow rounded-lg">
                      {formatDateLabel(msg.createdAt, t)}
                    </span>
                  </div>
                )}
                
                <div className={`flex ${wasFromMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`
                      max-w-[85%] px-4 py-3 rounded-lg text-sm italic text-gray-500 dark:text-gray-400
                      ${wasFromMe
                        ? "bg-myYellow2 dark:bg-mydarkYellow/30 rounded-t-lg rounded-bl-lg rounded-br-none"
                        : "bg-myGray4 dark:bg-[#2E2F2F] rounded-t-lg rounded-br-lg rounded-bl-none"}
                    `}
                  >
                    Vous avez supprimé un message
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
                  <img src={filePreview} className="max-h-40 rounded" alt="preview" />
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

            <div className="relative">
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    height={400}
                    width={320}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 flex items-center gap-2 px-4 py-4 rounded-xl bg-myGray4 dark:bg-[#2E2F2F] backdrop-blur-md">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    type="button"
                  >
                    <Smile
                      size={18}
                      className={`cursor-pointer transition-colors ${
                        showEmojiPicker
                          ? 'text-myYellow'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    />
                  </button>

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
                    className="flex items-center flex-1 bg-transparent outline-none text-xs text-myBlack dark:text-white"
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
                  className="w-12 h-12 flex items-center justify-center rounded-xl text-sm font-bold text-myBlack bg-myYellow2 dark:bg-mydarkYellow"
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
                      className={`text-gray-700 dark:myBlack ${
                        isRecording ? "animate-pulse text-red-500" : ""
                      }`}
                    />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </footer>

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

      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Supprimer le message
              </h3>
            </div>

            <div className="px-6 py-6 space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Que voulez-vous faire ?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    handleDeleteForMe(messageToDelete);
                    setShowDeleteModal(false);
                  }}
                  className="w-full px-4 py-3 text-left text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition"
                >
                  <div className="font-medium">Supprimer pour moi</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Vous ne verrez plus ce message, mais les autres le verront toujours.
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await handleDeleteForEveryone(messageToDelete);
                    setShowDeleteModal(false);
                  }}
                  className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  <div className="font-medium">Supprimer pour tout le monde</div>
                  <div className="text-xs text-red-500/80 dark:text-red-400/80">
                    Ce message sera supprimé pour vous et les autres participants.
                  </div>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg transition"
              >
                Annuler
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
            onBlockStatusChange={() => refresh()}
            onConversationDeleted={onConversationDeleted}
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
                  
                  if (typeof onConversationDeleted === 'function') {
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
            const token = localStorage.getItem('token');
            fetch(`http://localhost:5000/api/groups/${selectedChat._id}/members`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
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
