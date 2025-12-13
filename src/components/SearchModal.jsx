// frontend/src/components/SearchModal.jsx
import { useState, useEffect } from "react";
import { X, Search, UserPlus, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserSearch } from "../hooks/useUserSearch";
import { conversationService } from "../services/conversationService";

export default function SearchModal({ onClose, onUserSelect }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const { results, loading, searchUsers, sendInvitation } = useUserSearch();
  const [sendingInvitation, setSendingInvitation] = useState(null);

  // Recherche avec délai (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleSendInvitation = async (userId) => {
    try {
      setSendingInvitation(userId);
      await sendInvitation(userId);
      alert(t("search.invitationSent") || "Invitation envoyée !");
    } catch (error) {
      alert(error.message || "Erreur lors de l'envoi de l'invitation");
    } finally {
      setSendingInvitation(null);
    }
  };

  const handleStartConversation = async (user) => {
    try {
      // Créer une conversation directe avec cet utilisateur
      const response = await conversationService.createGroup([user._id], null);
      onUserSelect(user);
    } catch (error) {
      console.error("Erreur création conversation:", error);
      alert("Impossible de démarrer la conversation");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("search.title") || "Rechercher des utilisateurs"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* BARRE DE RECHERCHE */}
        <div className="p-4">
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder={t("search.placeholder") || "Nom d'utilisateur ou email..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500"
              autoFocus
            />
          </div>
        </div>

        {/* RÉSULTATS */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 size={32} className="animate-spin text-myYellow" />
            </div>
          ) : results.length === 0 && searchQuery.length >= 2 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>{t("search.noResults") || "Aucun utilisateur trouvé"}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-50" />
              <p>{t("search.startTyping") || "Commencez à taper pour rechercher..."}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
                  onClick={() => handleStartConversation(user)}
                >
                  <img
                    src={user.profilePicture || "/default-avatar.png"}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {user.username}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendInvitation(user._id);
                    }}
                    disabled={sendingInvitation === user._id}
                    className="p-2 bg-myYellow hover:bg-yellow-500 rounded-full transition disabled:opacity-50"
                  >
                    {sendingInvitation === user._id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <UserPlus size={18} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}