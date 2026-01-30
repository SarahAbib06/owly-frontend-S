import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Save, Trash2 } from "lucide-react";
import socketService from "../services/socketService";
import { padService } from "../services/padService";

const PadModal = ({ conversationId, isOpen, onClose }) => {
  const [content, setContent] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [saveStatus, setSaveStatus] = useState("Prêt");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // ==================== CHARGEMENT INITIAL ====================
  const loadPadContent = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const response = await padService.getOrCreate(conversationId);
      if (response.data.success) {
        setContent(response.data.pad.content || "");
      }
    } catch (error) {
      console.error("❌ Erreur chargement pad:", error);
    }
  }, [conversationId]);

  // ==================== SAUVEGARDE ====================
  const savePadContent = useCallback(async (contentToSave) => {
    if (!conversationId) return;
    
    try {
      await padService.updateContent(conversationId, contentToSave);
      return true;
    } catch (error) {
      console.error("❌ Erreur sauvegarde pad:", error);
      throw error;
    }
  }, [conversationId]);

  // ==================== GESTION DES ÉVÉNEMENTS SOCKET ====================
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    // Rejoindre le pad
    socketService.joinPad(conversationId);

    // Écouter les mises à jour
    const handlePadJoined = (data) => {
      if (data.conversationId === conversationId) {
        setActiveUsers(data.activeUsers || []);
        if (data.pad?.content) {
          setContent(data.pad.content);
        }
      }
    };

    const handlePadUpdate = (data) => {
      if (data.conversationId === conversationId && data.type === "content_changed") {
        // Ne pas mettre à jour si c'est notre propre modification
        if (data.userId !== socketService.socket?.id) {
          setContent(data.content);
        }
      }
    };

    const handleUserJoined = (data) => {
      if (data.conversationId === conversationId) {
        setActiveUsers(prev => {
          const exists = prev.some(user => user.id === data.userId);
          if (!exists) {
            return [...prev, { id: data.userId, username: data.username }];
          }
          return prev;
        });
      }
    };

    const handleUserLeft = (data) => {
      if (data.conversationId === conversationId) {
        setActiveUsers(prev => prev.filter(user => user.id !== data.userId));
      }
    };

    socketService.onPadJoined(handlePadJoined);
    socketService.onPadUpdate(handlePadUpdate);
    socketService.onPadUserJoined(handleUserJoined);
    socketService.onPadUserLeft(handleUserLeft);

    // Charger le contenu
    loadPadContent();

    return () => {
      socketService.leavePad(conversationId);
      socketService.off("pad_joined", handlePadJoined);
      socketService.off("pad_update", handlePadUpdate);
      socketService.off("pad_user_joined", handleUserJoined);
      socketService.off("pad_user_left", handleUserLeft);
    };
  }, [isOpen, conversationId, loadPadContent]);

  // ==================== GESTION TEXTE ====================
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Mettre à jour en temps réel via socket
    if (socketService.socket) {
      socketService.updatePadContent(conversationId, newContent);
    }
    
    // Sauvegarde auto
    setSaveStatus("Modification...");
    setIsSaving(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await savePadContent(newContent);
        setSaveStatus("Sauvegardé ✓");
        setTimeout(() => {
          setSaveStatus("Prêt");
          setIsSaving(false);
        }, 1500);
      } catch (error) {
        setSaveStatus("Erreur de sauvegarde");
        setIsSaving(false);
      }
    }, 800);
  };

  // ==================== VIDER LE PAD ====================
  const handleClearPad = async () => {
    if (window.confirm("Voulez-vous vraiment vider tout le contenu du pad ?")) {
      try {
        await padService.clear(conversationId);
        setContent("");
        if (socketService.socket) {
          socketService.updatePadContent(conversationId, "");
        }
        setSaveStatus("Pad vidé ✓");
      } catch (error) {
        console.error("❌ Erreur:", error);
        setSaveStatus("Erreur");
      }
    }
  };

  // ==================== COULEURS UTILISATEURS ====================
  const getColorFromId = (userId) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#FFD166",
      "#06D6A0",
      "#118AB2",
      "#EF476F",
      "#7209B7",
      "#F72585",
    ];
    const hash = userId?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;
    return colors[hash % colors.length];
  };

  // ==================== FERMETURE AVEC ESC ====================
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-80 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - EXACTEMENT comme ton frontend test */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-6xl h-[92vh] bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{
            boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
          }}
        >
          {/* HEADER */}
          <div
            className="bg-[#2d2d2d] text-white px-7 py-4 flex justify-between items-center border-b border-[#444]"
            style={{ padding: "16px 28px" }}
          >
            <div className="flex items-center gap-5">
              <h3 className="text-2xl font-semibold m-0" style={{ fontSize: "26px" }}>
                Pad Collaboratif
              </h3>

              {/* UTILISATEURS ACTIFS */}
              <div className="flex items-center gap-2 text-sm opacity-95">
                <div className="flex items-center gap-2">
                  {activeUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#3a3a3a] rounded-lg"
                      title={user.username}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getColorFromId(user.id) }}
                      />
                      <span className="text-gray-200">{user.username}</span>
                    </div>
                  ))}
                </div>
                <span
                  className="bg-[#444] px-2 py-1 rounded text-xs"
                  style={{ padding: "2px 8px", borderRadius: "4px" }}
                >
                  {activeUsers.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* BOUTON VIDER */}
              <button
                onClick={handleClearPad}
                className="px-4 py-2 bg-[#5c2a2a] hover:bg-[#7a3636] text-white rounded-lg transition-colors flex items-center gap-2"
                style={{ padding: "10px 18px" }}
                title="Vider le pad"
              >
                <Trash2 size={16} />
                Vider
              </button>

              {/* BOUTON FERMER */}
              <button
                onClick={onClose}
                className="w-11 h-11 bg-[#444] hover:bg-[#555] text-white rounded-lg flex items-center justify-center text-2xl"
                style={{
                  width: "44px",
                  height: "44px",
                  fontSize: "24px",
                }}
                title="Fermer"
              >
                ×
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="flex-1 flex flex-col relative p-5">
            {/* ÉDITEUR */}
            <div
              className="flex-1 relative bg-[#252526] rounded-xl overflow-hidden"
              style={{
                border: "2px solid #3a3a3a",
                boxShadow: "0 6px 16px rgba(0,0,0,0.5)",
              }}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder="Commencez à écrire... (Collaboration en temps réel)"
                spellCheck="true"
                autoComplete="off"
                className="w-full h-full p-7 bg-transparent text-[#e0e0e0] font-mono text-base border-none outline-none resize-none"
                style={{
                  padding: "28px",
                  fontFamily: "'Consolas', 'Courier New', monospace",
                  lineHeight: "1.7",
                  letterSpacing: "0.3px",
                }}
              />
            </div>

            {/* INDICATEUR DE SAUVEGARDE */}
            <div
              className="absolute bottom-7 right-7 bg-[#2d2d2d] px-4 py-2 rounded-lg text-sm text-[#aaa]"
              style={{
                padding: "8px 16px",
                fontSize: "13px",
              }}
            >
              <span>{saveStatus}</span>
              {isSaving && (
                <span className="ml-2 animate-pulse">●</span>
              )}
            </div>
          </div>

          {/* FOOTER INFO */}
          <div className="px-7 py-3 bg-[#2d2d2d] border-t border-[#444] text-xs text-gray-400">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Save size={14} />
                  <span>Sauvegarde automatique</span>
                </div>
                <span>•</span>
                <span>Appuyez sur Esc pour fermer</span>
              </div>
              <div className="text-xs opacity-70">
                ID: {conversationId?.substring(0, 8)}...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PadModal;