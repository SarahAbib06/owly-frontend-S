import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const SIGNALING_SERVER = "http://localhost:5000";
//const SIGNALING_SERVER = "http://192.168.0.64:5000";


export default function VideoCall() {
  const [myId, setMyId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [status, setStatus] = useState("Idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [callDisabled, setCallDisabled] = useState(false); 
  const [rejectDisabled, setRejectDisabled] = useState(true); 
  const [isSharing, setIsSharing] = useState(false); 
  const [isRemoteSharing, setIsRemoteSharing] = useState(false);
  const [shareDisabled, setShareDisabled] = useState(false);
  
 
  const [callDuration, setCallDuration] = useState(0);

 

  
  const socketRef = useRef();
  const pcRef = useRef();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationIntervalRef = useRef(null);
   


  // ========================
  // Socket.io
  // ========================
  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);

    socketRef.current.on("connect", () => setMyId(socketRef.current.id));

    socketRef.current.on("offer", async ({ from, sdp }) => {
      setIncomingCall({ from, sdp });
      setStatus("Incoming call...");
      setCallDisabled(true); 
    });

socketRef.current.on("answer", async ({ sdp }) => {
      console.log("Answer event received:", sdp);
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          setStatus("Call connected ✅");
          setInCall(true);
          setCallDisabled(false); 

          // Démarrer le minuteur de durée côté appelant
          console.log("Start call duration timer on caller side");
          durationIntervalRef.current = setInterval(() => {
            setCallDuration((prev) => {
              console.log("Call duration incremented:", prev + 1);
              return prev + 1;
            });
          }, 1000);
          console.log("Call duration timer started");
        } catch (error) {
          console.error("Error setting remote description on answer:", error);
        }
      }
    });

    socketRef.current.on("ice-candidate", async ({ candidate }) => {
      if (candidate && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("ICE candidate error:", e);
        }
      }
    });
   

// GESTION DU PARTAGE D'ÉCRAN À DISTANCE
socketRef.current.on("start-screen-share", () => { 
  setIsRemoteSharing(true);
  setShareDisabled(true); // Désactiver le bouton local
  setStatus("Remote peer is sharing screen 🖥️");
});

socketRef.current.on("stop-screen-share", () => { 
  setIsRemoteSharing(false);
  setShareDisabled(false); // Réactiver le bouton local
  setStatus("Back to camera video call.");
});

// ...
    socketRef.current.on("hang-up", () => {
      endCall();
      setCallDisabled(false); 
    })
    

    return () => {
      // Nettoyer le minuteur de durée
  if (durationIntervalRef.current) {
    clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = null;
  }
      if (pcRef.current) pcRef.current.close();
      socketRef.current.disconnect();
    };
  }, []);

  // ========================
  // PeerConnection
  // ========================
  const createPeerConnection = async (otherId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    // Remote stream
    const remoteStream = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };

    // Local stream
    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && otherId) {
        socketRef.current.emit("ice-candidate", { to: otherId, candidate: event.candidate });
      }
    };
  };

  // le partage d'ecran
  const startScreenShare = async () => {
    // Émettre immédiatement pour demander le verrouillage au backend
    socketRef.current.emit("start-screen-share", { to: targetId });

    try {
      // Récupérer le flux de l'écran
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, 
        audio: false , // Audio inclus pour le partage, si disponible
      });

      // Trouver les senders vidéo et audio
      const videoSender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
      const audioSender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'audio');
      setIsSharing(true);

      if (videoSender) {
        // Arrêter la piste vidéo actuelle avant de la remplacer
        if (videoSender.track) {
          videoSender.track.stop();
        }

        // Remplacer la piste vidéo par celle de l'écran
        const videoTrack = screenStream.getVideoTracks()[0];
        await videoSender.replaceTrack(videoTrack);

        // Gérer l'arrêt automatique (Arrêt via le bandeau du navigateur)
        videoTrack.onended = () => {
             // 1. Émettre le signal au correspondant pour débloquer son bouton
             if (targetId) {
                socketRef.current.emit("stop-screen-share", { to: targetId });
             }
             // 2. Exécuter le nettoyage local. Le flag est 'false' car le signal a déjà été envoyé.
             stopScreenShare(false);
        }; 
      }

      if (audioSender && screenStream.getAudioTracks().length > 0) {
        // Arrêter la piste audio actuelle avant de la remplacer
        if (audioSender.track) {
          audioSender.track.stop();
        }

        // Remplacer la piste audio par celle de l'écran
        const audioTrack = screenStream.getAudioTracks()[0];
        await audioSender.replaceTrack(audioTrack);
      }
      
      // Stocker la référence pour pouvoir l'arrêter plus tard
      localStreamRef.current = screenStream;

      // Mettre à jour l'élément vidéo local pour afficher l'écran
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setStatus("Screen sharing in progress 🖥️");

    } catch (error) {
      console.error("Erreur lors du partage d'écran :", error);
      // Si l'utilisateur annule (dans le sélecteur) ou si erreur, on nettoie.
      setIsSharing(false);
      if (targetId) {
          socketRef.current.emit("stop-screen-share", { to: targetId }); // Assurez-vous que l'autre côté est débloqué.
      }
      setStatus("Screen share cancelled or failed.");
    }
  };

// function pour arreter le screenShare
// Ajout d'un paramètre pour gérer l'émission du signal Socket.io
const stopScreenShare = async (emitSignal = true) => {
    
    // **MODIFICATION 1 : Prévention des crashs**
    if (!pcRef.current) {
        setIsSharing(false); 
        return;
    }
    
    // Si l'arrêt vient du bandeau (onended), isSharing peut être déjà faux, mais on continue le nettoyage.
    if (emitSignal && !isSharing) return; 

    // Arrêter tous les tracks du flux actuel (écran)
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
        // Obtenir un nouveau flux caméra (le flux d'origine)
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        // Trouver les senders vidéo et audio
        const videoSender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        const audioSender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'audio');

        if (videoSender) {
            // Remplacer par la nouvelle piste caméra vidéo
            await videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
        }

        if (audioSender) {
            // Remplacer par la nouvelle piste caméra audio
            await audioSender.replaceTrack(cameraStream.getAudioTracks()[0]);
        }

        // Mettre à jour la vidéo locale
        localVideoRef.current.srcObject = cameraStream;
        localStreamRef.current = cameraStream;

        // Mettre à jour l'état de l'UI
        setIsSharing(false); 
        setCameraOff(false); 

        // Émettre le signal au correspondant uniquement si la fonction a été appelée par l'utilisateur (bouton)
        if (emitSignal && targetId) {
             socketRef.current.emit("stop-screen-share", { to: targetId });
        }
        
        setStatus("Back to camera video call.");
    } catch (error) {
        console.error("Error stopping screen share and resuming camera:", error);
        // En cas d'erreur, on réinitialise l'état pour permettre un nouveau partage.
        setIsSharing(false);
        setCameraOff(false);
        if (emitSignal && targetId) {
             socketRef.current.emit("stop-screen-share", { to: targetId });
        }
    }
};


  // ========================
  // Start Call
  // ========================
  const startCall = async () => {
    if (!targetId.trim() || targetId === myId) return alert("Enter a valid target ID");

    setStatus("Calling…");
    await createPeerConnection(targetId);
    setRejectDisabled(false); 
    setCallDisabled(true); 
     

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socketRef.current.emit("offer", { to: targetId, sdp: offer });
  };

    //affichage de muniteur 
    const formatDuration = (seconds) => {
     const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

  // ========================
  // Accept Call
  // ========================
  const acceptCall = async () => {
    if (!incomingCall) return;

     

    setTargetId(incomingCall.from);
    setStatus("Call accepted ✅");
    await createPeerConnection(incomingCall.from);

    // Set remote offer
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

    // Create and send answer
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    socketRef.current.emit("answer", { to: incomingCall.from, sdp: answer });

    setIncomingCall(null);
    setInCall(true);
    // Démarrer le minuteur de durée
durationIntervalRef.current = setInterval(() => {
  setCallDuration((prev) => prev + 1);
}, 1000); // Incrémenter chaque seconde

  };

  //Mute et cameraOff
  const toggleMute = () => {
    if (!localStreamRef.current) return;
     localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
     setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCameraOff((prev) => !prev);
  };



  // Hang up
  // ========================
  const endCall = () => {
    // Arrêter le minuteur de durée
   if (durationIntervalRef.current) {
    clearInterval(durationIntervalRef.current);
     durationIntervalRef.current = null;
}
setCallDuration(0); // Réinitialiser la durée

    setStatus("Call ended 📴");
    setInCall(false);
    setIncomingCall(null);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      

    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (targetId) {
      socketRef.current.emit("hang-up", { targetId });
      setTargetId("");
      setCallDisabled(false); 
      //detruire la connexiot webrtc etabier
       if (pcRef.current) { // Utiliser pcRef.current qui est l'objet PeerConnection réel
        pcRef.current.close();
       }}
  };
  // ========================
  // UI
  // ========================
  return (
    <div style={{ padding: 20 }}>
      <h1>Owly Video Call</h1>
      <p>Status: {status}</p>
      <p>Your ID: <b>{myId}</b></p>

      

      {!inCall && (
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Enter target socket ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            style={{ padding: 8, width: "300px" }}
          />
          
        <button
       onClick={startCall}
       disabled={callDisabled}
      style={{
        marginLeft: 10,
       padding: 10,
       opacity: callDisabled ? 0.5 : 1,
       cursor: callDisabled ? "not-allowed" : "pointer"
  }}
    >
  📞 Call
    </button>
          <button onClick={endCall}
          disabled={rejectDisabled}
          style={{ padding: 10,
          display: rejectDisabled ? 'none' : 'inline-block'
}}
          >
  ❌  annuler
</button>
 </div>   
      )} 
         

      {incomingCall && !inCall && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            border: "1px solid black",
            borderRadius: 10,
            width: 300,
          }}
        >
          <h3>📞 Incoming Call</h3>
          <p>From: {incomingCall.from}</p>
          <button
            onClick={acceptCall}
            style={{ padding: 10, marginRight: 10, background: "green", color: "white" }}
          >
            ✔ Accept
          </button>
          <button
            onClick={endCall}
            style={{ padding: 10, background: "red", color: "white" }}
          >
            ❌ Reject
          </button>
        </div>
      )}
         {inCall   && <p>Durée de l'appel : {formatDuration(callDuration)}</p>}
      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
       
           
        <div>
          

          <h3>Your Video</h3>
           
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: 300, borderRadius: 10 }}
          />
        </div>
        <div>
          <h3>Remote Video</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: 300, borderRadius: 10 }}
          />
        </div>
      </div>

      {inCall && (
        <div style={{ marginTop: 20 }}>
          <button onClick={endCall} style={{ padding: 10, background: "red", color: "white" }}>
            📞 Hang Up
          </button>
          <button onClick={toggleMute}>{isMuted ? "🔇 Unmute" : "🎙️ Mute"}</button>
          <button onClick={toggleCamera}>{cameraOff ? "📷 Turn On" : "🚫 Turn Off Cam"}</button>
          <button 
            onClick={isSharing ? stopScreenShare : startScreenShare}
            disabled={shareDisabled} 
            style={{ 
               // Style pour indiquer visuellement qu'il est désactivé par l'autre
               backgroundColor: shareDisabled && !isSharing ? 'lightgray' : 'white',
               cursor: shareDisabled && !isSharing ? 'not-allowed' : 'pointer',
            }}
          >
            {isSharing 
                ? "🚫 Arrêter le Partage" 
                : isRemoteSharing ? "vous pouvez pas parteger" : "🖥️ Partager l'Écran"
            }
          </button>
        </div>
      )}

    </div>
  );
}