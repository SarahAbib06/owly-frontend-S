import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import socketService from "../services/socketService";
import { useNavigate } from "react-router-dom";

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [showIncomingCallModal, setShowIncomingCallModal] = useState(false);
  const [acceptedCall, setAcceptedCall] = useState(null);

  const ringtoneRef = useRef(null);
  const navigate = useNavigate();

  /* 🔔 Sonnerie */
  const playRingtone = () => {
    if (!ringtoneRef.current) {
      ringtoneRef.current = new Audio("/sounds/ringtone.mp3");
      ringtoneRef.current.loop = true;
    }
    ringtoneRef.current.play().catch((err) => {
      console.warn("⚠️ Impossible de jouer la sonnerie:", err);
    });
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  /* 📞 Appel entrant - VERSION CORRIGÉE */
  const handleIncomingCall = useCallback((data) => {
    console.log("📞 [CallContext] handleIncomingCall appelé avec:", data);
    
    // 🔥 CORRECTION 1: Vérifier que les données sont valides
    if (!data || !data.callId || !data.channelName) {
      console.error("❌ Données d'appel invalides:", data);
      return;
    }

    // 🔥 CORRECTION 2: Forcer la mise à jour des états de manière synchrone
    console.log("→ Mise à jour incomingCall");
    setIncomingCall(data);
    
    console.log("→ Affichage du modal");
    setShowIncomingCallModal(true);
    
    console.log("→ Lecture sonnerie");
    playRingtone();
    
    // 🔥 CORRECTION 3: Log pour debug
    setTimeout(() => {
      console.log("📊 États après handleIncomingCall:", {
        incomingCall: data,
        showModal: true
      });
    }, 100);
  }, []);

  /* ✅ Accepter */
  const acceptCall = useCallback(() => {
    console.log("✅ [CallContext] acceptCall appelé");
    
    if (!incomingCall) {
      console.error("❌ Pas d'appel entrant à accepter");
      return;
    }

    stopRingtone();
    setShowIncomingCallModal(false);

    socketService.socket?.emit("accept-call", {
      channelName: incomingCall.channelName,
      callerSocketId: incomingCall.callerSocketId,
      callType: incomingCall.callType,
      chatId: incomingCall.chatId,
      callId: incomingCall.callId,
      callerId: incomingCall.callerId, // 🔥 AJOUTÉ
    });

    console.log("✅ Événement 'accept-call' émis");

    setAcceptedCall({
      ...incomingCall,
      channelName: incomingCall.channelName,
      callType: incomingCall.callType,
      chatId: incomingCall.chatId,
    });

    // 🔥 CORRECTION 4: Ne PAS réinitialiser incomingCall tout de suite
    // setIncomingCall(null); // ← COMMENTÉ

    localStorage.setItem("activeCall", JSON.stringify(incomingCall));
  }, [incomingCall]);

  /* ❌ Refuser */
  const rejectCall = useCallback(() => {
    console.log("❌ [CallContext] rejectCall appelé");
    
    if (!incomingCall) {
      console.error("❌ Pas d'appel entrant à refuser");
      return;
    }

    stopRingtone();
    setShowIncomingCallModal(false);
    setAcceptedCall(null);

    socketService.socket?.emit("reject-call", {
      channelName: incomingCall.channelName,
      callerSocketId: incomingCall.callerSocketId,
      callType: incomingCall.callType,
      reason: "busy",
      chatId: incomingCall.chatId,
      callId: incomingCall.callId,
    });

    setIncomingCall(null);
  }, [incomingCall]);

  /* 🎧 Socket global - VERSION CORRIGÉE */
  useEffect(() => {
    const socket = socketService.socket;
    
    if (!socket) {
      console.warn("⚠️ Socket non disponible dans CallContext");
      return;
    }

    console.log("🔌 [CallContext] Installation des listeners socket");

    // 🔥 CORRECTION 5: Wrapper pour mieux logger
    const wrappedIncomingCall = (data) => {
      console.log("🔔 [Socket Event] incoming-call reçu:", data);
      handleIncomingCall(data);
    };

    const handleCallCancelled = (data) => {
      console.log("🚫 [Socket Event] call-cancelled reçu:", data);
      stopRingtone();
      setShowIncomingCallModal(false);
      setIncomingCall(null);
    };

    const handleCallTimeout = (data) => {
      console.log("⏱️ [Socket Event] call-timeout reçu:", data);
      stopRingtone();
      setShowIncomingCallModal(false);
      setIncomingCall(null);
    };

    socket.on("incoming-call", wrappedIncomingCall);
    socket.on("call-cancelled", handleCallCancelled);
    socket.on("call-timeout", handleCallTimeout);

    // 🔥 CORRECTION 6: Vérifier que les listeners sont bien installés
    console.log("✅ Listeners installés:", {
      "incoming-call": true,
      "call-cancelled": true,
      "call-timeout": true
    });

    return () => {
      console.log("🧹 [CallContext] Nettoyage listeners");
      socket.off("incoming-call", wrappedIncomingCall);
      socket.off("call-cancelled", handleCallCancelled);
      socket.off("call-timeout", handleCallTimeout);
    };
  }, [handleIncomingCall]);

  /* 🔄 Utilitaires */
  const getActiveCall = () => {
    const call = localStorage.getItem("activeCall");
    return call ? JSON.parse(call) : null;
  };

  const clearActiveCall = () => {
    localStorage.removeItem("activeCall");
    setAcceptedCall(null);
    setIncomingCall(null); // 🔥 AJOUTÉ
  };

  // 🔥 CORRECTION 7: Logger les changements d'états
  useEffect(() => {
    console.log("📊 [CallContext] État mis à jour:", {
      hasIncomingCall: !!incomingCall,
      showModal: showIncomingCallModal,
      hasAcceptedCall: !!acceptedCall
    });
  }, [incomingCall, showIncomingCallModal, acceptedCall]);

  return (
    <CallContext.Provider
      value={{
        // States
        incomingCall,
        showIncomingCallModal,
        acceptedCall,
        
        // Setters
        setIncomingCall,
        setShowIncomingCallModal,
        setAcceptedCall,
        
        // Actions
        acceptCall,
        rejectCall,
        
        // Utilitaires
        getActiveCall,
        clearActiveCall,
        
        // Fonctions de sonnerie
        playRingtone,
        stopRingtone,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall doit être utilisé dans un CallProvider");
  }
  return context;
};
