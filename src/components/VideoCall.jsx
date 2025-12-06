// src/components/VideoCall.jsx
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { useSearchParams } from "react-router-dom";

const SIGNALING_SERVER = "http://localhost:5000";

export default function VideoCall(props) {
const [searchParams] = useSearchParams();
const initialUserId = props.userId || searchParams.get("userId") || "";
const initialConversationId = props.conversationId || searchParams.get("conversationId") || "";

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
// Connect to signaling server
// ========================
useEffect(() => {
socketRef.current = io(SIGNALING_SERVER);


socketRef.current.on("connect", () => {
  setStatus("Connected to signaling server");
  if (myUserId) {
    socketRef.current.emit("register-user", myUserId);
  }
});

socketRef.current.on("offer", async ({ fromUserId, sdp }) => {
  setIncomingCall({ fromUserId, sdp });
  setStatus("Incoming call...");
  setCallDisabled(true);
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

socketRef.current.on("ice-candidate", async ({ candidate }) => {
  if (candidate && pcRef.current) {
    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

socketRef.current.on("start-screen-share", () => {
  setIsRemoteSharing(true);
  setShareDisabled(true);
  setStatus("Remote peer is sharing screen 🖥️");
});

socketRef.current.on("stop-screen-share", () => {
  setIsRemoteSharing(false);
  setShareDisabled(false);
  setStatus("Back to camera video call.");
});

socketRef.current.on("hang-up", () => {
  endCall();
  setCallDisabled(false);
});

socketRef.current.on("call-rejected", () => {
  setStatus("Call rejected ❌");
  setIncomingCall(null);
  setCallDisabled(false);
  setRejectDisabled(true);
});

socketRef.current.on("call-error", ({ message }) => {
  setStatus(`Error: ${message}`);
});

return () => {
  if (durationIntervalRef.current) {
    clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = null;
  }
  if (pcRef.current) pcRef.current.close();
  socketRef.current.disconnect();
};


}, [myUserId]);

// Register userId if it changes
useEffect(() => {
if (socketRef.current && myUserId) {
socketRef.current.emit("register-user", myUserId);
}
}, [myUserId]);

// ========================
// PeerConnection
// ========================
const createPeerConnection = async (otherUserId) => {
const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
pcRef.current = pc;


const remoteStream = new MediaStream();
if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

pc.ontrack = (event) => {
  event.streams[0].getTracks().forEach((track) => remoteStream.addTrack(track));
};

const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
localStreamRef.current = localStream;
if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

pc.onicecandidate = (event) => {
  if (event.candidate && otherUserId) {
    socketRef.current.emit("ice-candidate", {
      toUserId: otherUserId,
      candidate: event.candidate,
      fromUserId: myUserId,
    });
  }
};


};

// ========================
// Screen Share
// ========================
const startScreenShare = async () => {
if (!targetUserId) return;
socketRef.current.emit("start-screen-share", { to: targetUserId });


try {
  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
  if (videoSender) await videoSender.replaceTrack(screenStream.getVideoTracks()[0]);

  screenStream.getVideoTracks()[0].onended = () => stopScreenShare(false);

  localStreamRef.current = screenStream;
  if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
  setIsSharing(true);
  setStatus("Screen sharing in progress 🖥️");
} catch (err) {
  console.error("Screen share error:", err);
  setIsSharing(false);
  socketRef.current.emit("stop-screen-share", { to: targetUserId });
  setStatus("Screen share cancelled or failed.");
}


};

const stopScreenShare = async (emitSignal = true) => {
if (!pcRef.current) return;
if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());


const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const videoSender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
const audioSender = pcRef.current.getSenders().find((s) => s.track?.kind === "audio");

if (videoSender) await videoSender.replaceTrack(cameraStream.getVideoTracks()[0]);
if (audioSender) await audioSender.replaceTrack(cameraStream.getAudioTracks()[0]);

localVideoRef.current.srcObject = cameraStream;
localStreamRef.current = cameraStream;
setIsSharing(false);
setCameraOff(false);

if (emitSignal && targetUserId) socketRef.current.emit("stop-screen-share", { to: targetUserId });
setStatus("Back to camera video call.");


};

// ========================
// Call Control
// ========================
const startCall = async () => {
if (!targetUserId || targetUserId === myUserId) return alert("Enter a valid target userId");


setStatus("Calling…");
await createPeerConnection(targetUserId);
setRejectDisabled(false);
setCallDisabled(true);

const offer = await pcRef.current.createOffer();
await pcRef.current.setLocalDescription(offer);

socketRef.current.emit("offer", {
  toUserId: targetUserId,
  sdp: offer,
  fromUserId: myUserId,
});


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

durationIntervalRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);


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


if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
if (pcRef.current) pcRef.current.close();

if (targetUserId) {
  socketRef.current.emit("hang-up", { toUserId: targetUserId, fromUserId: myUserId });
  setTargetUserId("");
  setCallDisabled(false);
}


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
<div style={{ padding: 20 }}> <h1>Owly Video Call</h1> <p>Status: {status}</p> <p>Your userId: <b>{myUserId}</b></p> <p>ConversationId: <b>{initialConversationId}</b></p>


  {!myUserId && (
    <input placeholder="Enter your userId" value={myUserId} onChange={(e) => setMyUserId(e.target.value)} />
  )}

  {!inCall && (
    <div style={{ marginTop: 10 }}>
      <input placeholder="Target userId" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} />
      <button onClick={startCall} disabled={callDisabled}>📞 Call</button>
      <button onClick={endCall} disabled={rejectDisabled}>❌ Cancel</button>
    </div>
  )}

  {incomingCall && !inCall && (
    <div>
      <p>Incoming call from {incomingCall.fromUserId}</p>
      <button onClick={acceptCall}>✔ Accept</button>
      <button onClick={endCall}>❌ Reject</button>
    </div>
  )}

  {inCall && <p>Duration: {formatDuration(callDuration)}</p>}

  <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
    <div>
      <h3>Your Video</h3>
      <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 300, borderRadius: 10 }} />
    </div>
    <div>
      <h3>Remote Video</h3>
      <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 300, borderRadius: 10 }} />
    </div>
  </div>

  {inCall && (
    <div style={{ marginTop: 20 }}>
      <button onClick={endCall} style={{ backgroundColor: "red", color: "white" }}>📞 Hang Up</button>
      <button onClick={toggleMute}>{isMuted ? "🔇 Unmute" : "🎙️ Mute"}</button>
      <button onClick={toggleCamera}>{cameraOff ? "📷 Turn On" : "🚫 Turn Off Cam"}</button>
      <button onClick={isSharing ? stopScreenShare : startScreenShare} disabled={shareDisabled}>
        {isSharing ? "🚫 Stop Sharing" : isRemoteSharing ? "Remote sharing active" : "🖥️ Share Screen"}
      </button>
    </div>
  )}
</div>


);
}













