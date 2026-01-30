import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Users, Save, Trash2, Download, Copy, Check } from "lucide-react";
import socketService from "../services/socketService";
import { padService } from "../services/padService";

const PadModal = ({ conversationId, isOpen, onClose }) => {
  const [content, setContent] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [saveStatus, setSaveStatus] = useState("Prêt");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
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

    socketService.joinPad(conversationId);

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
    
    if (socketService.socket) {
      socketService.updatePadContent(conversationId, newContent);
    }
    
    setSaveStatus("Modification...");
    setIsSaving(true);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await savePadContent(newContent);
        setSaveStatus("Sauvegardé");
        setTimeout(() => {
          setSaveStatus("Prêt");
          setIsSaving(false);
        }, 1500);
      } catch (error) {
        setSaveStatus("Erreur");
        setIsSaving(false);
      }
    }, 800);
  };

  // ==================== COPIER LE CONTENU ====================
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==================== TÉLÉCHARGER LE CONTENU ====================
  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pad-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        setSaveStatus("Pad vidé");
      } catch (error) {
        console.error("❌ Erreur:", error);
        setSaveStatus("Erreur");
      }
    }
  };

  // ==================== COULEURS UTILISATEURS ====================
  const getColorFromId = (userId) => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#FFD166", "#06D6A0", 
      "#118AB2", "#EF476F", "#7209B7", "#F72585",
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay avec effet de flou */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-7xl h-[90vh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-700/50">
          
          {/* HEADER MODERNE */}
          <div className="bg-gradient-to-r from-gray-800/90 to-gray-900/90 backdrop-blur-xl text-white px-8 py-5 flex justify-between items-center border-b border-gray-700/50">
            <div className="flex items-center gap-6">
              {/* Titre avec icône */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Save size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Pad Collaboratif
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Collaboration en temps réel
                  </p>
                </div>
              </div>

              {/* UTILISATEURS ACTIFS - Design moderne */}
              <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-2 bg-gray-700/30 rounded-full px-4 py-2 border border-gray-600/50">
                  <Users size={16} className="text-blue-400" />
                  <span className="text-sm font-medium text-gray-300">
                    {activeUsers.length} {activeUsers.length > 1 ? 'en ligne' : 'connecté'}
                  </span>
                </div>
                
                {/* Avatars des utilisateurs */}
                <div className="flex -space-x-2">
                  {activeUsers.slice(0, 4).map((user) => (
                    <div
                      key={user.id}
                      className="w-9 h-9 rounded-full border-2 border-gray-800 flex items-center justify-center text-white text-sm font-semibold shadow-lg"
                      style={{ 
                        backgroundColor: getColorFromId(user.id),
                        zIndex: activeUsers.indexOf(user)
                      }}
                      title={user.username}
                    >
                      {user.username?.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {activeUsers.length > 4 && (
                    <div className="w-9 h-9 rounded-full bg-gray-700 border-2 border-gray-800 flex items-center justify-center text-xs text-gray-300 font-medium">
                      +{activeUsers.length - 4}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-2">
              {/* Bouton Copier */}
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 bg-gray-700/50 hover:bg-gray-700 text-white rounded-xl transition-all flex items-center gap-2 border border-gray-600/50 hover:border-gray-500"
                title="Copier le contenu"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-400" />
                    <span className="text-sm">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span className="text-sm">Copier</span>
                  </>
                )}
              </button>

              {/* Bouton Télécharger */}
              <button
                onClick={handleDownload}
                className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl transition-all flex items-center gap-2 border border-blue-500/30 hover:border-blue-500/50"
                title="Télécharger"
              >
                <Download size={16} />
                <span className="text-sm">Télécharger</span>
              </button>

              {/* Bouton Vider */}
              <button
                onClick={handleClearPad}
                className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-all flex items-center gap-2 border border-red-500/30 hover:border-red-500/50"
                title="Vider le pad"
              >
                <Trash2 size={16} />
                <span className="text-sm">Vider</span>
              </button>

              {/* Bouton Fermer */}
              <button
                onClick={onClose}
                className="w-11 h-11 bg-gray-700/50 hover:bg-gray-700 text-white rounded-xl flex items-center justify-center transition-all border border-gray-600/50 hover:border-gray-500"
                title="Fermer (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* BODY - Éditeur */}
          <div className="flex-1 flex flex-col relative p-6">
            <div className="flex-1 relative bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 shadow-inner">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder="✨ Commencez à écrire... Vos modifications sont synchronisées en temps réel avec les autres utilisateurs."
                spellCheck="true"
                autoComplete="off"
                className="w-full h-full p-8 bg-transparent text-gray-100 font-mono text-[15px] border-none outline-none resize-none placeholder:text-gray-500/50"
                style={{
                  fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                  lineHeight: "1.8",
                  letterSpacing: "0.2px",
                }}
              />
            </div>

            {/* INDICATEUR DE SAUVEGARDE - Position en bas à droite */}
            <div className="absolute bottom-8 right-8 flex items-center gap-2 bg-gray-800/90 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-700/50 shadow-lg">
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-300">{saveStatus}</span>
                  </>
                ) : saveStatus === "Sauvegardé" ? (
                  <>
                    <Check size={14} className="text-green-400" />
                    <span className="text-sm text-green-400">{saveStatus}</span>
                  </>
                ) : saveStatus === "Erreur" ? (
                  <>
                    <X size={14} className="text-red-400" />
                    <span className="text-sm text-red-400">{saveStatus}</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-sm text-gray-400">{saveStatus}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* FOOTER - Infos */}
          <div className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700/50">
            <div className="flex justify-between items-center text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span>Sauvegarde automatique activée</span>
                </div>
                <span className="text-gray-600">•</span>
                <span>Appuyez sur <kbd className="px-2 py-0.5 bg-gray-700 rounded text-[10px] font-mono">Esc</kbd> pour fermer</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                <span>ID: {conversationId?.substring(0, 8)}...</span>
                <span className="text-gray-600">•</span>
                <span>{content.length} caractères</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PadModal;