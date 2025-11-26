import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function CallManager() {
  const [myId, setMyId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [status, setStatus] = useState("Idle");

  useEffect(() => {
    socket.on("connect", () => {
      setMyId(socket.id);
      setStatus("Connected");
    });

    socket.on("incoming-call", ({ from }) => {
      setIncomingCall(from);
      setStatus("Incoming call...");
    });

    socket.on("call-response", ({ accepted }) => {
      if (accepted) setStatus("Call accepted ✅");
      else setStatus("Call refused ❌");
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-response");
    };
  }, []);

  const callUser = () => {
    socket.emit("call-user", { targetId });
    setStatus(`Calling ${targetId}...`);
  };

  const respondToCall = (accepted) => {
    socket.emit("call-response", { from: incomingCall, accepted });
    setIncomingCall(null);
    setStatus(accepted ? "Call accepted ✅" : "Call refused ❌");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Call Test</h2>
      <p>Your ID: {myId}</p>
      <p>Status: {status}</p>

      {incomingCall && (
        <div style={{ marginTop: 20 }}>
          <p>📞 Incoming call from {incomingCall}</p>
          <button onClick={() => respondToCall(true)}>✅ Accept</button>
          <button onClick={() => respondToCall(false)}>❌ Refuse</button>
        </div>
      )}

      {!incomingCall && (
        <div style={{ marginTop: 20 }}>
          <input
            type="text"
            placeholder="Enter target socket ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          />
          <button onClick={callUser}>📞 Call</button>
        </div>
      )}
    </div>
  );
}
