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
  const [targetUserId, setTargetUserId] = useState(""); // now userId not socket id
  const [status, setStatus] = useState("Idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const socketRef = useRef();
  const pcRef = useRef();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);

    socketRef.current.on("connect", () => {
      setStatus("Connected to signaling server");
      if (myUserId) {
        socketRef.current.emit("register-user", myUserId);
      }
    });

    // If server relays offer, it sends { fromUserId, sdp }
    socketRef.current.on("offer", async ({ fromUserId, sdp }) => {
      setIncomingCall({ fromUserId, sdp });
      setStatus("Incoming call...");
    });

    socketRef.current.on("answer", async ({ fromUserId, sdp }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus("Call connected ✅");
        setInCall(true);
      }
    });

    socketRef.current.on("ice-candidate", async ({ candidate, fromUserId }) => {
      if (candidate && pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("ICE candidate error:", e);
        }
      }
    });

    socketRef.current.on("hang-up", ({ fromUserId }) => {
      endCall();
    });

    socketRef.current.on("call-rejected", ({ fromUserId }) => {
      setStatus("Call rejected");
      // cleanup maybe
    });

    socketRef.current.on("call-error", ({ message }) => {
      setStatus(`Error: ${message}`);
    });

    return () => {
      if (pcRef.current) pcRef.current.close();
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si myUserId est fourni plus tard, enregistrer
  useEffect(() => {
    if (socketRef.current && myUserId) {
      socketRef.current.emit("register-user", myUserId);
    }
  }, [myUserId]);

  // ========================
  // PeerConnection
  // ========================
  const createPeerConnection = async (otherUserId) => {
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
      if (event.candidate && otherUserId) {
        socketRef.current.emit("ice-candidate", {
          toUserId: otherUserId,
          candidate: event.candidate,
          fromUserId: myUserId,
        });
      }
    };
  };

  // Start Call - now using userId target
  const startCall = async () => {
    if (!targetUserId.trim() || targetUserId === myUserId) return alert("Enter a valid target userId");

    setStatus("Calling…");
    await createPeerConnection(targetUserId);

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socketRef.current.emit("offer", {
      toUserId: targetUserId,
      sdp: offer,
      fromUserId: myUserId,
    });
  };

  // Accept Call
  const acceptCall = async () => {
    if (!incomingCall) return;

    setTargetUserId(incomingCall.fromUserId);
    setStatus("Call accepted ✅");
    await createPeerConnection(incomingCall.fromUserId);

    // Set remote offer
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));

    // Create and send answer
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    socketRef.current.emit("answer", {
      toUserId: incomingCall.fromUserId,
      sdp: answer,
      fromUserId: myUserId,
    });

    setIncomingCall(null);
    setInCall(true);
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

  const endCall = () => {
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

    if (targetUserId) {
      socketRef.current.emit("hang-up", { toUserId: targetUserId, fromUserId: myUserId });
      setTargetUserId("");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Owly Video Call (Test)</h1>
      <p>Status: {status}</p>
      <p>Your userId: <b>{myUserId}</b></p>
      <p>ConversationId: <b>{initialConversationId}</b></p>

      {!myUserId && (
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Enter your userId"
            value={myUserId}
            onChange={(e) => setMyUserId(e.target.value)}
            style={{ padding: 8, width: "300px" }}
          />
        </div>
      )}

      {!inCall && (
        <div style={{ marginBottom: 10 }}>
          <input
            placeholder="Enter target userId"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            style={{ padding: 8, width: "300px" }}
          />
          <button onClick={startCall} style={{ marginLeft: 10, padding: 10 }}>
            📞 Call
          </button>
        </div>
      )}

      {incomingCall && !inCall && (
        <div style={{ marginTop: 20, padding: 20, border: "1px solid black", borderRadius: 10, width: 300 }}>
          <h3>📞 Incoming Call</h3>
          <p>From userId: {incomingCall.fromUserId}</p>
          <button onClick={acceptCall} style={{ padding: 10, marginRight: 10, background: "green", color: "white" }}>
            ✔ Accept
          </button>
          <button onClick={endCall} style={{ padding: 10, background: "red", color: "white" }}>
            ❌ Reject
          </button>
        </div>
      )}

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
          <button onClick={endCall} style={{ padding: 10, background: "red", color: "white" }}>📞 Hang Up</button>
          <button onClick={toggleMute}>{isMuted ? "🔇 Unmute" : "🎙️ Mute"}</button>
          <button onClick={toggleCamera}>{cameraOff ? "📷 Turn On" : "🚫 Turn Off Cam"}</button>
        </div>
      )}
    </div>
  );
}




/*
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
*/

