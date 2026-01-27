// frontend/src/hooks/useMessages.js
import { useState, useEffect, useCallback, useRef } from "react";
import { messageService } from "../services/messageService";
import socketService from "../services/socketService";

export const useMessages = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const isLoadingRef = useRef(false);

  // ✅ Normaliser un message pour être sûr d'avoir createdAt et status
  const normalizeMessage = (message) => {
    const baseDate = message.createdAt || message.timestamp || new Date();
    const d = new Date(baseDate);
    const safeDate = isNaN(d.getTime()) ? new Date() : d;

    return {
      ...message,
      createdAt: safeDate.toISOString(),
      status: message.status || "sent", // Par défaut "sent" pour les anciens messages
      tempId: message.tempId || null, // 🔥 Garder le tempId pour retrouver le message
    };
  };

  // Charger les messages (API)
  const loadMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!conversationId || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setLoading(true);

        console.log(`📜 Chargement messages - Page ${pageNum}`);

        const response = await messageService.getMessages(
          conversationId,
          pageNum
        );

        let newMessages = (response.messages || []).map(normalizeMessage);

        // Tri local ascendant
        newMessages = newMessages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        if (append) {
          setMessages((prev) => {
            const merged = [...newMessages, ...prev];
            return merged.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });
        } else {
          setMessages(newMessages);
        }

        setHasMore(response.hasMore || false);
        setError(null);
        console.log(`✅ ${newMessages.length} messages chargés`);
      } catch (err) {
        console.error("❌ Erreur chargement messages:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    },
    [conversationId]
  );

  // Envoyer un message texte
  const sendMessage = useCallback(
    async (input) => {
      if (!conversationId) return;

      let content = "";
      let Id_receiver = null;

      // Cas 1 : on reçoit une string (ancienne façon)
      if (typeof input === "string") {
        content = input.trim();
        if (!content) return;
      }
      // Cas 2 : on reçoit un objet (nouvelle façon avec Id_receiver)
      else if (typeof input === "object" && input !== null) {
        content = input.content?.trim();
        Id_receiver = input.Id_receiver;
        if (!content) return;
      } else {
        return;
      }

      try {
        // 🔥 CRÉER UN MESSAGE TEMPORAIRE AVEC STATUS "SENDING"
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
        
        const tempMessage = {
          _id: tempId,
          content,
          typeMessage: "text",
          conversationId,
          senderId: userId,
          createdAt: new Date().toISOString(),
          status: "sending", // ← STATUT INITIAL (1 flèche)
          isPinned: false,
        };

        // 🔥 AJOUTER IMMÉDIATEMENT LE MESSAGE À L'UI
        setMessages((prev) => {
          const merged = [...prev, tempMessage];
          return merged.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });

        console.log("📨 Envoi message:", { content, Id_receiver, conversationId, tempId });

        // Envoyer via socket avec l'ID temporaire
        socketService.sendMessage({
          conversationId,
          content,
          typeMessage: "text",
          Id_receiver,
          tempId, // ← PERMET DE RELIER LE MESSAGE TEMPORAIRE AU VRAI
        });
      } catch (err) {
        console.error("❌ Erreur envoi message:", err);
        throw err;
      }
    },
    [conversationId]
  );

  // Envoyer une image
  const sendImage = useCallback(
    async (file) => {
      if (!conversationId || !file) return;

      try {
        console.log("🖼️ Envoi image:", file.name);

        // 🔥 CRÉER UN MESSAGE TEMPORAIRE POUR L'IMAGE
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
        
        const reader = new FileReader();
        reader.onload = () => {
          const tempMessage = {
            _id: tempId,
            content: reader.result,
            typeMessage: "image",
            conversationId,
            senderId: userId,
            createdAt: new Date().toISOString(),
            status: "sending",
            isPinned: false,
          };

          setMessages((prev) => {
            const merged = [...prev, tempMessage];
            return merged.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });

          socketService.sendImageMessage({
            conversationId,
            file: reader.result,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            tempId,
          });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("❌ Erreur envoi image:", err);
        throw err;
      }
    },
    [conversationId]
  );

  // Envoyer une vidéo
  const sendVideo = useCallback(
    async (file) => {
      if (!conversationId || !file) return;

      try {
        console.log("🎥 Envoi vidéo:", file.name);

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");

        const arrayBuffer = await file.arrayBuffer();

        const tempMessage = {
          _id: tempId,
          content: URL.createObjectURL(file),
          typeMessage: "video",
          conversationId,
          senderId: userId,
          createdAt: new Date().toISOString(),
          status: "sending",
          isPinned: false,
        };

        setMessages((prev) => {
          const merged = [...prev, tempMessage];
          return merged.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
        });

        socketService.sendVideoMessage({
          conversationId,
          file: arrayBuffer,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          tempId,
        });
      } catch (err) {
        console.error("❌ Erreur envoi vidéo:", err);
        throw err;
      }
    },
    [conversationId]
  );

  // Envoyer un fichier
  const sendFile = useCallback(
    async (file) => {
      if (!conversationId || !file) return;

      try {
        console.log("📎 Envoi fichier:", file.name);

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");

        const reader = new FileReader();
        reader.onload = () => {
          const tempMessage = {
            _id: tempId,
            content: reader.result,
            typeMessage: "file",
            fileName: file.name,
            conversationId,
            senderId: userId,
            createdAt: new Date().toISOString(),
            status: "sending",
            isPinned: false,
          };

          setMessages((prev) => {
            const merged = [...prev, tempMessage];
            return merged.sort(
              (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
            );
          });

          socketService.sendFileMessage({
            conversationId,
            file: reader.result,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            originalName: file.name,
            tempId,
          });
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("❌ Erreur envoi fichier:", err);
        throw err;
      }
    },
    [conversationId]
  );

  // Charger plus (pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore && !isLoadingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage, true);
    }
  }, [loading, hasMore, page, loadMessages]);

  // Epingler / désépingler un message (le serveur décide)
  const pinMessage = useCallback(async (messageId) => {
    try {
      await messageService.pinMessage(messageId);
      console.log("📌 Requête épinglage envoyée:", messageId);
      // L'UI sera mise à jour via 'message:pinned' / 'message:unpinned'
    } catch (err) {
      console.error("❌ Erreur épinglage:", err);
      throw err;
    }
  }, []);

  // Désépingler un message
  const unpinMessage = useCallback(async (messageId) => {
    try {
      await messageService.unpinMessage(messageId);
      console.log("📌 Requête désépinglage envoyée:", messageId);
      // L'UI sera mise à jour via socket 'message:unpinned'
    } catch (err) {
      console.error("❌ Erreur désépinglage:", err);
      throw err;
    }
  }, []);

  // Supprimer un message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await messageService.deleteMessage(messageId);
      console.log("🗑️ Message supprimé (requête):", messageId);

      // Optimistic update
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error("❌ Erreur suppression message:", err);
      throw err;
    }
  }, []);

  // Transférer un message
  const forwardMessage = useCallback(async (messageId, targetConversationId) => {
    try {
      socketService.forwardMessage(messageId, targetConversationId);
      console.log("📨 Message transféré");
    } catch (err) {
      console.error("❌ Erreur transfert:", err);
      throw err;
    }
  }, []);

  // Rejoindre / quitter la conversation
  useEffect(() => {
    if (conversationId) {
      socketService.joinConversation(conversationId);
      console.log("📱 Rejoint conversation:", conversationId);

      return () => {
        socketService.leaveConversation(conversationId);
        console.log("📱 Quitté conversation:", conversationId);
      };
    }
  }, [conversationId]);

  // Listeners Socket.io
  useEffect(() => {
    if (!conversationId) return;

    // 📨 Nouveau message reçu d'un autre utilisateur
   const handleNewMessage = (message) => {
  const normalized = normalizeMessage(message);
  const myUserId =
    localStorage.getItem("userId") ||
    localStorage.getItem("user_id");

  setMessages(prev => {
    // 🚫 IGNORER les messages que J’AI envoyés
    if (normalized.senderId === myUserId) {
      return prev;
    }

    // 🚫 éviter les doublons
    if (
      prev.some(m =>
        m._id === normalized._id ||
        m._id === normalized.tempId
      )
    ) {
      return prev;
    }

    return [...prev, normalized].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  });
};



    // ✅ Message envoyé confirmé par le serveur
  // ✅ Message envoyé confirmé par le serveur - VERSION CORRIGÉE
const handleMessageSent = (response) => {
  console.log("✅ Message envoyé confirmé:", response);

  if (!response?.success || !response?.data) return;

  const serverMessage = response.data;
  const tempId = response.tempId; // ← IMPORTANT : tempId vient de response, pas de data

  console.log("🔍 Recherche message temporaire:", {
    tempId,
    serverMessageId: serverMessage._id,
    typeMessage: serverMessage.typeMessage
  });

  setMessages(prev => {
    // 🔍 Chercher le message temporaire par tempId
    const tempIndex = prev.findIndex(m => m._id === tempId);

    console.log("📊 Index trouvé:", tempIndex, "| Total messages:", prev.length);

    // ❌ Si aucun message temporaire trouvé
    if (tempIndex === -1) {
      console.log("⚠️ Aucun message temporaire trouvé, ajout du message");
      
      // Vérifier qu'on n'a pas déjà le message réel
      if (prev.some(m => m._id === serverMessage._id)) {
        console.log("⏭️ Message réel déjà présent, skip");
        return prev;
      }
      
      // Ajouter le nouveau message
      const normalized = normalizeMessage(serverMessage);
      return [...prev, { ...normalized, status: "sent" }].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    }

    // ✅ Remplacer le message temporaire par le message réel
    console.log("✅ Remplacement du message temporaire:", tempId, "→", serverMessage._id);
    
    const updated = [...prev];
    const normalized = normalizeMessage(serverMessage);
    
    updated[tempIndex] = {
      ...normalized,
      status: "sent", // ← 2 FLÈCHES GRISES
    };

    return updated.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  });
};

    // ❌ Erreur lors de l'envoi
    const handleMessageError = (err) => {
      console.error("❌ Erreur message:", err);
      
      // Marquer les messages temporaires comme "failed"
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id.startsWith("temp_") && msg.status === "sending") {
            return { ...msg, status: "failed" };
          }
          return msg;
        })
      );
      
      setError(err.error || "Erreur envoi message");
    };

    // 📌 Message épinglé
    const handleMessagePinned = (data) => {
      console.log("📌 Message épinglé:", data);

      if (data.messageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, isPinned: true } : msg
          )
        );
      }
    };

    // 📌 Message désépinglé
    const handleMessageUnpinned = (data) => {
      console.log("📌 Message désépinglé:", data);

      if (data.messageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId ? { ...msg, isPinned: false } : msg
          )
        );
      }
    };

    // 🎧 ENREGISTREMENT DES LISTENERS
    socketService.onNewMessage(handleNewMessage);
    socketService.onMessageSent(handleMessageSent);
    socketService.onMessageError(handleMessageError);
    socketService.onMessagePinned(handleMessagePinned);
    socketService.onMessageUnpinned(handleMessageUnpinned);

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("message_sent", handleMessageSent);
      socketService.off("message_error", handleMessageError);
      socketService.off("message:pinned", handleMessagePinned);
      socketService.off("message:unpinned", handleMessageUnpinned);
    };
  }, [conversationId]);

  // Chargement initial
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      setPage(1);
      loadMessages(1);
    }
  }, [conversationId, loadMessages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    sendImage,
    sendVideo,
    sendFile,
    loadMore,
    pinMessage,
    unpinMessage,
    deleteMessage,
    forwardMessage,
    refresh: () => loadMessages(1),
  };
};
