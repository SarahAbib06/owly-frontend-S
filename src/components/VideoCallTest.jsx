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
      // Vérifier que les champs ne sont pas vides
      if (!userId.trim() || !conversationId.trim()) {
        setMessage("Veuillez remplir tous les champs");
        setLoading(false);
        return;
      }

      // Vérifier le format ObjectId
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(userId)) {
        setMessage("Format userId invalide (doit être un ObjectId MongoDB)");
        setLoading(false);
        return;
      }
      
      if (!objectIdRegex.test(conversationId)) {
        setMessage("Format conversationId invalide (doit être un ObjectId MongoDB)");
        setLoading(false);
        return;
      }

      // Récupérer le token
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("⚠️ Vous devez vous connecter d'abord (token manquant)");
        setLoading(false);
        return;
      }

      console.log("Envoi de la requête avec:", { userId, conversationId });

      const res = await axios.post(
        "http://localhost:5000/api/test-auth/validate", 
        { userId, conversationId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (res.data.ok) {
        setMessage("✅ Validation réussie ! Redirection vers l'appel...");
        
        // Petit délai pour voir le message
        setTimeout(() => {
          navigate(`/video-call?userId=${userId}&conversationId=${conversationId}`);
        }, 1000);
      } else {
        setMessage(`❌ ${res.data.message || "Échec de validation"}`);
      }
    } catch (err) {
      console.error("Erreur complète:", err);
      
      if (err.response) {
        // Le serveur a répondu avec un code d'erreur
        const status = err.response.status;
        const errorMsg = err.response.data?.message || err.response.data?.error || "Erreur inconnue";
        
        if (status === 404) {
          setMessage(`❌ Route non trouvée (404). Vérifiez que le serveur est bien configuré.`);
        } else if (status === 403) {
          setMessage(`❌ Accès refusé: ${errorMsg}`);
        } else if (status === 401) {
          setMessage(`❌ Non authentifié: ${errorMsg}. Vérifiez votre token.`);
        } else {
          setMessage(`❌ Erreur ${status}: ${errorMsg}`);
        }
      } else if (err.request) {
        // La requête a été faite mais aucune réponse
        setMessage("❌ Pas de réponse du serveur. Vérifiez que le serveur est démarré.");
      } else {
        // Erreur de configuration
        setMessage(`❌ Erreur: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour tester directement l'appel (sans validation)
  const handleDirectCall = () => {
    if (!userId.trim() || !conversationId.trim()) {
      setMessage("Veuillez remplir tous les champs");
      return;
    }
    
    setMessage("⚠️ Redirection directe (sans validation serveur)...");
    navigate(`/video-call?userId=${userId}&conversationId=${conversationId}`);
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>Video Call - Test Auth</h2>
      <p>Entrer un userId et conversationId pour valider l'accès (test).</p>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          UserId (ObjectId MongoDB)
        </label>
        <input
          placeholder="Ex: 64a1b2c3d4e5f67890123456"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{ padding: 10, width: "100%", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginBottom: 15 }}>
        <label style={{ display: "block", marginBottom: 5 }}>
          ConversationId (ObjectId MongoDB)
        </label>
        <input
          placeholder="Ex: 64a1b2c3d4e5f67890123456"
          value={conversationId}
          onChange={(e) => setConversationId(e.target.value)}
          style={{ padding: 10, width: "100%", boxSizing: "border-box" }}
        />
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <button 
          onClick={handleValidate} 
          disabled={loading} 
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "#007bff", 
            color: "white", 
            border: "none", 
            borderRadius: 5,
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Vérification..." : "Vérifier et Aller à l'appel"}
        </button>
        
        <button 
          onClick={handleDirectCall}
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "#6c757d", 
            color: "white", 
            border: "none", 
            borderRadius: 5,
            cursor: "pointer"
          }}
        >
          Direct (sans validation)
        </button>
      </div>

      {message && (
        <div style={{ 
          marginTop: 20, 
          padding: 15, 
          backgroundColor: message.includes("✅") ? "#d4edda" : 
                          message.includes("❌") ? "#f8d7da" : "#fff3cd",
          border: `1px solid ${message.includes("✅") ? "#c3e6cb" : 
                          message.includes("❌") ? "#f5c6cb" : "#ffeeba"}`,
          borderRadius: 5,
          color: message.includes("✅") ? "#155724" : 
                 message.includes("❌") ? "#721c24" : "#856404"
        }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: 30, padding: 15, backgroundColor: "#f8f9fa", borderRadius: 5 }}>
        <h4>Instructions de débogage :</h4>
        <ol>
          <li>Assurez-vous que le serveur est démarré sur le port 5000</li>
          <li>Connectez-vous d'abord via le chat pour obtenir un token</li>
          <li>Vérifiez les logs du serveur pour les erreurs</li>
          <li>Utilisez "Direct" pour tester sans validation serveur</li>
        </ol>
        
        <div style={{ marginTop: 10 }}>
          <strong>Token actuel :</strong> 
          <div style={{ 
            marginTop: 5, 
            padding: 5, 
            backgroundColor: "#e9ecef", 
            borderRadius: 3,
            fontSize: "0.8em",
            wordBreak: "break-all"
          }}>
            {localStorage.getItem("token") ? "Token présent ✓" : "Aucun token ✗"}
          </div>
        </div>
      </div>
    </div>
  );
}