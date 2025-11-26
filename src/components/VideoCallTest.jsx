// src/components/VideoCallTest.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function VideoCallTest() {
  const [userId, setUserId] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleValidate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await axios.post("http://localhost:5000/api/test-auth/validate", {
        userId,
        conversationId,
      });
      if (res.data.ok) {
        setMessage("Validated ✅ Redirecting to call...");
        // redirect to video-call and pass userId & conversationId as query params
        navigate(`/video-call?userId=${userId}&conversationId=${conversationId}`);
      } else {
        setMessage(res.data.message || "Validation failed");
      }
    } catch (err) {
      console.error(err);
      const m = err?.response?.data?.message || err.message || "Erreur";
      setMessage(`Erreur: ${m}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Video Call - Test Auth</h2>
      <p>Entrer un userId et conversationId pour valider l'accès (test).</p>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="UserId (ObjectId)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: 8, width: 400 }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="ConversationId (ObjectId)"
          value={conversationId}
          onChange={(e) => setConversationId(e.target.value)}
          style={{ padding: 8, width: 400 }}
        />
      </div>

      <div>
        <button onClick={handleValidate} disabled={loading} style={{ padding: 10 }}>
          {loading ? "Vérification..." : "Vérifier et Aller à l'appel"}
        </button>
      </div>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}
