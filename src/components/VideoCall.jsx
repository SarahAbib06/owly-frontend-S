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

  const socketRef = useRef();
  const pcRef = useRef();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // ========================
  // Socket.io
  // ========================
  useEffect(() => {
    socketRef.current = io(SIGNALING_SERVER);

    socketRef.current.on("connect", () => setMyId(socketRef.current.id));

    socketRef.current.on("offer", async ({ from, sdp }) => {
      setIncomingCall({ from, sdp });
      setStatus("Incoming call...");
    });

    socketRef.current.on("answer", async ({ sdp }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setStatus("Call connected ✅");
        setInCall(true);
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

    socketRef.current.on("hang-up", () => {
      endCall();
    });

    return () => {
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

  // ========================
  // Start Call
  // ========================
  const startCall = async () => {
    if (!targetId.trim() || targetId === myId) return alert("Enter a valid target ID");

    setStatus("Calling…");
    await createPeerConnection(targetId);

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    socketRef.current.emit("offer", { to: targetId, sdp: offer });
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



  // ========================
  // Hang up
  // ========================
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

    if (targetId) {
      socketRef.current.emit("hang-up", { targetId });
      setTargetId("");
    }
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
          <button onClick={startCall} style={{ marginLeft: 10, padding: 10 }}>
            📞 Call
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
        </div>
      )}

    </div>
  );
}



/*
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
***********************************
*/

