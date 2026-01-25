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

    // 🔥 CORRECTION 1 : Utiliser le BON nom d'événement
    socketService.socket?.emit("call-accepted", {
      channelName: incomingCall.channelName,
      callerSocketId: incomingCall.callerSocketId,
      callType: incomingCall.callType,
      chatId: incomingCall.chatId, // ✅ Ajouté
    });

    console.log("✅ Appel accepté - Événement 'call-accepted' émis");

    // 🔥 Déclencher l'affichage de VideoCallScreen
    setAcceptedCall({
      ...incomingCall,
      // ✅ GARANTIR que ces props existent
      channelName: incomingCall.channelName,
      callType: incomingCall.callType,
      chatId: incomingCall.chatId,
    });

    // 🔥 Nettoyage
    setIncomingCall(null);

    localStorage.setItem(
      "activeCall",
      JSON.stringify(incomingCall)
    );
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
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    socket.on("incoming-call", handleIncomingCall);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
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
  };

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        showIncomingCallModal,
        acceptCall,
        rejectCall,
        acceptedCall,
        getActiveCall,
        clearActiveCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);