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
  const [acceptedCall, setAcceptedCall] = useState(null); // ✅ 1️⃣ État ajouté

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

  /* ✅ Accepter - MODIFIÉ selon l'instruction 2️⃣ */
const acceptCall = useCallback(() => {
  if (!incomingCall) return;

  stopRingtone();
  setShowIncomingCallModal(false);

  socketService.socket?.emit("accept-video-call", {
  channelName: incomingCall.channelName,
  callerId: incomingCall.callerId,
  callerSocketId: incomingCall.callerSocketId,
});


  // 🔥 CLÉ : déclenche l'affichage de VideoCallScreen
  setAcceptedCall(incomingCall);

  // 🔥 NETTOYAGE ABSOLU (manquant chez toi)
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
    setAcceptedCall(null); // ✅ Réinitialise l'appel accepté

    socketService.socket?.emit("reject-call", {
      callId: incomingCall.callId,
      receiverId: localStorage.getItem("userId"),
    });

    setIncomingCall(null);
  }, [incomingCall]);

  /* 🎧 Socket global */
  useEffect(() => {
    const socket = socketService.socket;
    if (!socket) return;

    socket.on("incoming-video-call", handleIncomingCall);
    socket.on("incoming-audio-call", handleIncomingCall);

    return () => {
      socket.off("incoming-video-call", handleIncomingCall);
      socket.off("incoming-audio-call", handleIncomingCall);
    };
  }, [handleIncomingCall]);

  /* 🔄 Utilitaires */
  const getActiveCall = () => {
    const call = localStorage.getItem("activeCall");
    return call ? JSON.parse(call) : null;
  };

  const clearActiveCall = () => {
    localStorage.removeItem("activeCall");
  };

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        showIncomingCallModal,
        acceptCall,
        rejectCall,
        acceptedCall,          // ✅ Exposé      // ✅ Exposé
        getActiveCall,
        clearActiveCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);