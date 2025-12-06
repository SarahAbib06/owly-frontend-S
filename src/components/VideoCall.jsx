// src/components/VideoCall.jsx
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useSearchParams } from "react-router-dom";

const SIGNALING_SERVER = "http://localhost:5000";

export default function VideoCall(props) {
  const [searchParams] = useSearchParams();
  const initialUserId = props.userId || searchParams.get("userId") || "";
  const initialConversationId = props.conversationId || searchParams.get("conversationId") || "";
  
  // 🔴 IMPORTANT: Récupérer le token depuis localStorage
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  
  const [myUserId, setMyUserId] = useState(initialUserId);
  const [targetUserId, setTargetUserId] = useState("");
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
  // Connect to signaling server WITH AUTH
  // ========================
  useEffect(() => {
    if (!token) {
      setStatus("Erreur: Token d'authentification manquant");
      return;
    }

    socketRef.current = io(SIGNALING_SERVER, {
      auth: {
        token: token
      },
      query: {
        userId: myUserId
      }
    });

    socketRef.current.on("connect", () => {
      setStatus("Connected to signaling server");
      if (myUserId) {
        // Enregistrer l'utilisateur pour les appels vidéo
        socketRef.current.emit("register-user", myUserId);
      }
    });

    socketRef.current.on("connect_error", (err) => {
      setStatus(`Connection error: ${err.message}`);
      console.error("Socket connection error:", err);
    });

    socketRef.current.on("offer", async ({ fromUserId, sdp }) => {
      setIncomingCall({ fromUserId, sdp });
      setStatus(`Incoming call from ${fromUserId}...`);
      setCallDisabled(true);
      setRejectDisabled(false);
    });

    socketRef.current.on("answer", async ({ fromUserId, sdp }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus("Call connected ✅");
        setInCall(true);
        setCallDisabled(false);

        durationIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    });

    socketRef.current.on("ice-candidate", async ({ candidate, fromUserId }) => {
      if (candidate && pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socketRef.current.on("start-screen-share", ({ fromUserId }) => {
      setIsRemoteSharing(true);
      setShareDisabled(true);
      setStatus(`${fromUserId} is sharing screen 🖥️`);
    });

    socketRef.current.on("stop-screen-share", ({ fromUserId }) => {
      setIsRemoteSharing(false);
      setShareDisabled(false);
      setStatus(`${fromUserId} stopped sharing`);
    });

    socketRef.current.on("hang-up", ({ fromUserId }) => {
      setStatus(`${fromUserId} ended the call`);
      endCall();
      setCallDisabled(false);
    });

    socketRef.current.on("call-rejected", ({ fromUserId }) => {
      setStatus(`${fromUserId} rejected the call ❌`);
      setIncomingCall(null);
      setCallDisabled(false);
      setRejectDisabled(true);
    });

    socketRef.current.on("call-error", ({ message }) => {
      setStatus(`Error: ${message}`);
    });

    socketRef.current.on("screen-share-denied", () => {
      setStatus("Screen sharing denied: Someone else is sharing");
    });

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (pcRef.current) pcRef.current.close();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token, myUserId]);

  // ========================
  // PeerConnection
  // ========================
  const createPeerConnection = async (otherUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
    pcRef.current = pc;

    const remoteStream = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
    };

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && otherUserId) {
          socketRef.current.emit("ice-candidate", {
            toUserId: otherUserId,
            candidate: event.candidate,
            fromUserId: myUserId,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("ICE state:", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          setStatus("Connection lost");
          endCall();
        }
      };

    } catch (error) {
      console.error("Error accessing media devices:", error);
      setStatus("Error accessing camera/microphone");
    }
  };

  // ========================
  // Screen Share
  // ========================
  const startScreenShare = async () => {
    if (!targetUserId) return;
    
    socketRef.current.emit("start-screen-share", {
      toUserId: targetUserId,
      fromUserId: myUserId
    });

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      const videoSenders = pcRef.current.getSenders().filter(s => s.track?.kind === "video");
      if (videoSenders.length > 0) {
        await videoSenders[0].replaceTrack(screenStream.getVideoTracks()[0]);
      }

      screenStream.getVideoTracks()[0].onended = () => stopScreenShare(true);

      localStreamRef.current = screenStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      setIsSharing(true);
      setStatus("Screen sharing in progress 🖥️");
    } catch (err) {
      console.error("Screen share error:", err);
      setIsSharing(false);
      socketRef.current.emit("stop-screen-share", {
        toUserId: targetUserId,
        fromUserId: myUserId
      });
      setStatus("Screen share cancelled");
    }
  };

  const stopScreenShare = async (emitSignal = true) => {
    if (!pcRef.current || !localStreamRef.current) return;
    
    try {
      // Récupérer le flux caméra original
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      const videoSenders = pcRef.current.getSenders().filter(s => s.track?.kind === "video");
      const audioSenders = pcRef.current.getSenders().filter(s => s.track?.kind === "audio");
      
      if (videoSenders.length > 0) {
        await videoSenders[0].replaceTrack(cameraStream.getVideoTracks()[0]);
      }
      
      if (audioSenders.length > 0 && cameraStream.getAudioTracks().length > 0) {
        await audioSenders[0].replaceTrack(cameraStream.getAudioTracks()[0]);
      }

      // Arrêter l'ancien flux
      localStreamRef.current.getTracks().forEach(track => track.stop());
      
      localVideoRef.current.srcObject = cameraStream;
      localStreamRef.current = cameraStream;
      setIsSharing(false);
      setCameraOff(false);

      if (emitSignal && targetUserId) {
        socketRef.current.emit("stop-screen-share", {
          toUserId: targetUserId,
          fromUserId: myUserId
        });
      }
      
      setStatus("Back to camera");
    } catch (error) {
      console.error("Error stopping screen share:", error);
    }
  };

  // ========================
  // Call Control
  // ========================
  const startCall = async () => {
    if (!targetUserId || targetUserId === myUserId) {
      alert("Enter a valid target userId");
      return;
    }

    if (!socketRef.current || !socketRef.current.connected) {
      alert("Not connected to server");
      return;
    }

    setStatus("Calling…");
    await createPeerConnection(targetUserId);
    setRejectDisabled(false);
    setCallDisabled(true);

    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);

      socketRef.current.emit("offer", {
        toUserId: targetUserId,
        sdp: offer,
        fromUserId: myUserId,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      setStatus("Error starting call");
      endCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    
    setTargetUserId(incomingCall.fromUserId);
    await createPeerConnection(incomingCall.fromUserId);

    await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    socketRef.current.emit("answer", {
      toUserId: incomingCall.fromUserId,
      sdp: answer,
      fromUserId: myUserId,
    });

    setIncomingCall(null);
    setInCall(true);

    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const rejectCall = () => {
    if (incomingCall) {
      socketRef.current.emit("call-rejected", {
        toUserId: incomingCall.fromUserId,
        fromUserId: myUserId
      });
      setIncomingCall(null);
      setCallDisabled(false);
      setRejectDisabled(true);
      setStatus("Call rejected");
    }
  };

  const endCall = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    setCallDuration(0);
    setStatus("Call ended 📴");
    setInCall(false);
    setIncomingCall(null);
    setRejectDisabled(true);
    setCallDisabled(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (targetUserId && socketRef.current) {
      socketRef.current.emit("hang-up", {
        toUserId: targetUserId,
        fromUserId: myUserId
      });
      setTargetUserId("");
    }
    
    // Réinitialiser les flux vidéo
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

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

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ========================
  // UI
  // ========================
  return (
    <div style={{ padding: 20 }}>
      <h1>Owly Video Call</h1>
      <p>Status: {status}</p>
      <p>Your userId: <b>{myUserId}</b></p>
      <p>ConversationId: <b>{initialConversationId}</b></p>

      {!token && (
        <div style={{ color: "red", marginBottom: 10 }}>
          ⚠️ No authentication token found. Please login first.
        </div>
      )}

      {!myUserId && (
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Enter your userId"
            value={myUserId}
            onChange={(e) => setMyUserId(e.target.value)}
            style={{ padding: 8, width: 300 }}
          />
        </div>
      )}

      {!inCall && !incomingCall && (
        <div style={{ marginTop: 10 }}>
          <input
            placeholder="Target userId"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            style={{ padding: 8, width: 300, marginRight: 10 }}
          />
          <button onClick={startCall} disabled={callDisabled || !token} style={{ padding: 8, marginRight: 10 }}>
            📞 Call
          </button>
        </div>
      )}

      {incomingCall && !inCall && (
        <div style={{ marginTop: 20, padding: 15, backgroundColor: "#f0f0f0", borderRadius: 8 }}>
          <p><strong>Incoming call from {incomingCall.fromUserId}</strong></p>
          <button onClick={acceptCall} style={{ padding: 10, marginRight: 10, backgroundColor: "green", color: "white" }}>
            ✔ Accept
          </button>
          <button onClick={rejectCall} style={{ padding: 10, backgroundColor: "red", color: "white" }}>
            ❌ Reject
          </button>
        </div>
      )}

      {inCall && (
        <div style={{ marginTop: 10 }}>
          <p>Duration: {formatDuration(callDuration)}</p>
          <p>Connected to: {targetUserId}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <div>
          <h3>Your Video {isSharing && "(Sharing)"}</h3>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: 320, height: 240, borderRadius: 10, backgroundColor: "#000" }}
          />
          {cameraOff && <div style={{ position: "absolute", color: "white" }}>Camera Off</div>}
        </div>
        <div>
          <h3>Remote Video {isRemoteSharing && "(Sharing)"}</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: 320, height: 240, borderRadius: 10, backgroundColor: "#000" }}
          />
        </div>
      </div>

      {inCall && (
        <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button onClick={endCall} style={{ padding: 10, backgroundColor: "red", color: "white" }}>
            📞 Hang Up
          </button>
          <button onClick={toggleMute} style={{ padding: 10 }}>
            {isMuted ? "🔇 Unmute" : "🎙️ Mute"}
          </button>
          <button onClick={toggleCamera} style={{ padding: 10 }}>
            {cameraOff ? "📷 Turn On" : "🚫 Turn Off Cam"}
          </button>
          <button
            onClick={isSharing ? stopScreenShare : startScreenShare}
            disabled={shareDisabled}
            style={{ padding: 10, backgroundColor: isSharing ? "orange" : "#4CAF50", color: "white" }}
          >
            {isSharing ? "🚫 Stop Sharing" : "🖥️ Share Screen"}
          </button>
        </div>
      )}
    </div>
  );
}












