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
    ringtoneRef.current.play().catch(() => {});
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  };

  /* 📞 Appel entrant */
  const handleIncomingCall = useCallback((data) => {
    console.log("📞 Appel entrant:", data);
    setIncomingCall(data);
    setShowIncomingCallModal(true);
    playRingtone();
  }, []);

  /* ✅ Accepter - CORRIGÉ */
const acceptCall = useCallback(() => {
  if (!incomingCall) return;

  stopRingtone();
  setShowIncomingCallModal(false);

  socketService.socket?.emit("accept-call", {
    channelName: incomingCall.channelName,
    callerSocketId: incomingCall.callerSocketId,
    callType: incomingCall.callType,
    chatId: incomingCall.chatId,
    callId: incomingCall.callId,
  });

  console.log("✅ Appel accepté - Événement 'accept-call' émis");

  setAcceptedCall({
    ...incomingCall,
    channelName: incomingCall.channelName,
    callType: incomingCall.callType,
    chatId: incomingCall.chatId,
  });

- setIncomingCall(null);           // ← SUPPRIME CETTE LIGNE ou mets-la en commentaire

  localStorage.setItem("activeCall", JSON.stringify(incomingCall));
}, [incomingCall]);

  /* ❌ Refuser */
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

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

  /* 🎧 Socket global */
/* 🎧 Socket global */
useEffect(() => {
  const socket = socketService.socket;
  if (!socket) {
    console.error('❌ Socket non disponible dans CallContext');
    return;
  }

  console.log('🎧 Installation listeners CallContext');

  const handleIncomingCall = (data) => {
    console.log('📞 INCOMING-CALL reçu:', data);
    setIncomingCall(data);
    setShowIncomingCallModal(true);
    playRingtone();
  };

  // ✅ AJOUTER ces handlers cruciaux
  const handleCallCancelled = (data) => {
    console.log('🚫 CALL-CANCELLED:', data);
    stopRingtone();
    setShowIncomingCallModal(false);
    setIncomingCall(null);
  };

  const handleCallTimeout = (data) => {
    console.log('⏱️ CALL-TIMEOUT:', data);
    stopRingtone();
    setShowIncomingCallModal(false);
    setIncomingCall(null);
  };

  const handleCallFailed = (data) => {
    console.log('❌ CALL-FAILED:', data);
    stopRingtone();
    setShowIncomingCallModal(false);
    setIncomingCall(null);
    // ✅ Optionnel : afficher une notification à l'utilisateur
  };

  // ✅ S'abonner à TOUS les événements
  socket.on("incoming-call", handleIncomingCall);
  socket.on("call-cancelled", handleCallCancelled);
  socket.on("call-timeout", handleCallTimeout);
  socket.on("call-failed", handleCallFailed);

  return () => {
    socket.off("incoming-call", handleIncomingCall);
    socket.off("call-cancelled", handleCallCancelled);
    socket.off("call-timeout", handleCallTimeout);
    socket.off("call-failed", handleCallFailed);
  };
}, []); // ✅ Dependencies vides pour éviter les re-renders // ← Ajouter handleIncomingCall dans les dépendances

  /* 🔄 Utilitaires */
  const getActiveCall = () => {
    const call = localStorage.getItem("activeCall");
    return call ? JSON.parse(call) : null;
  };

  const clearActiveCall = () => {
    localStorage.removeItem("activeCall");
    setAcceptedCall(null);
  };

  return (
    <CallContext.Provider
      value={{
        // States
        incomingCall,
        showIncomingCallModal,
        acceptedCall,
        
        // Setters - AJOUTÉS ICI
        setIncomingCall,
        setShowIncomingCallModal,
        setAcceptedCall,
        
        // Actions
        acceptCall,
        rejectCall,
        
        // Utilitaires
        getActiveCall,
        clearActiveCall,
        
        // Fonctions de sonnerie (si besoin dans d'autres composants)
        playRingtone,
        stopRingtone,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);