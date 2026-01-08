// frontend/src/components/ConversationList.jsx
import { useState, useEffect } from "react";
import ConversationItem from "./ConversationItem";
import { SlidersHorizontal, Search, Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConversations } from "../hooks/useConversations";
import socketService from "../services/socketService";
import { conversationService } from "../services/conversationService";

export default function ConversationList({ onSelect, onNewChat }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [archivedList, setArchivedList] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
   const [filterType, setFilterType] = useState('all'); // 🔥 NOUVEAU : state local
  
  const { 
    conversations, 
    loading, 
    error, 
    markAsRead 
  } = useConversations();

//  je teste pour le filtre
useEffect(() => {
  console.log("📊 Conversations:", conversations);
}, [conversations]);
 // 🔥 FILTRAGE PAR TYPE (all = tout, group = uniquement groupes)
  const filteredByType = filterType === 'group'
    ? conversations.filter(conv => conv.type === 'group')
    : conversations; // 'all' = pas de filtre

  const archivedFilteredByType = filterType === 'group'
    ? archivedList.filter(conv => conv.type === 'group')
    : archivedList;

  const listToDisplay = showArchivedOnly ? archivedFilteredByType : filteredByType;

  // Filtrer les conversations selon la recherche
  const filteredList = listToDisplay.filter((conv) => {
    const conversationName = conv.type === 'group'
      ? conv.groupName || conv.name
      : conv.participants?.[0]?.username || conv.name || "Utilisateur";
    
    return conversationName.toLowerCase().includes(search.toLowerCase());
  });


  // Écouter les nouveaux messages pour mettre à jour la liste
  useEffect(() => {
    const handleNewMessage = (message) => {
      console.log("📨 Nouveau message reçu dans la liste");
      // Les conversations seront automatiquement mises à jour via le hook
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, []);

  const handleSelectConversation = async (conv) => {
    setSelectedId(conv._id);
    onSelect(conv, showArchivedOnly);
    
    // Marquer comme lu
    if (conv.unreadCount > 0) {
      await markAsRead(conv._id);
    }
  };

  const toggleArchived = async () => {
  const newShow = !showArchivedOnly;
  setShowArchivedOnly(newShow);

  if (newShow && archivedList.length === 0) {
    setLoadingArchived(true);
    try {
      // Récupère l'ID de l'utilisateur (adapte si tu as un autre moyen)
      const userId = localStorage.getItem('userId'); // ou utilise useAuth si tu l'as
      if (userId) {
        const res = await conversationService.getArchivedConversations(userId);
        setArchivedList(res.conversations || []);
      }
    } catch (err) {
      console.error("Erreur chargement archivées", err);
    }
    setLoadingArchived(false);
  }
};

  if (loading) {
    return (
      <aside className="h-screen bg-myWhite dark:bg-neutral-900 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-myYellow" />
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="h-screen bg-myWhite dark:bg-neutral-900 flex items-center justify-center p-4">
        <p className="text-red-500 text-center">{error}</p>
      </aside>
    );
  }

  return (
    <aside className="h-screen bg-myWhite dark:bg-neutral-900 flex flex-col">
      
      {/* HEADER */}
      <div className="px-4 pt-3 sm:px-6 sm:pt-4 sm:pb-2 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Owly
        </h2>

                {/* === BOUTON NOUVELLE DISCUSSION (+) === */}
          <button
            onClick={onNewChat}
            className="
              rounded-xl shrink-0
             
              text-yellow-500
              bg-[#f0f0f0] dark:bg-[#2E2F2F]
              hover:bg-gray-200 dark:hover:bg-neutral-700
              transition
               p-2.5 md:p-3
            "
            title="Nouvelle discussion"
          >
            <Plus size={18} />
          </button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="px-4 sm:px-6 pt-2 pb-4">
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="flex items-center gap-3 flex-1 min-w-0 bg-[#f0f0f0] dark:bg-[#2E2F2F] rounded-xl px-3 h-9 md:h-10">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder={
                filterType === 'group' 
                  ? (t("messages.searchGroupe") )
                  : (t("messages.searchFriends") || "Rechercher...")
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-gray-500 dark:placeholder-gray-400 text-myBlack dark:text-white"
            />
          </div>
          
          <button 
            onClick={toggleArchived}
            className="rounded-xl shrink-0 bg-[#f0f0f0] dark:bg-[#2E2F2F] hover:bg-gray-200 dark:hover:bg-neutral-700 p-2.5 md:p-3"
          >
            <SlidersHorizontal 
              size={18} 
              className={` ${showArchivedOnly ? "text-myYellow" : "text-gray-600 dark:text-gray-300"}`}
            />
          </button>
        </div>
         {/* 🔥 ONGLETS MESSAGES / GROUPES */}
        <div className="flex gap-2 mt-3 md:mt-3">
          <button
            onClick={() => setFilterType('all')}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium transition
              ${filterType === 'all'
                ? 'bg-myYellow text-myBlack'
                : 'bg-[#f0f0f0] dark:bg-[#2E2F2F] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }
            `}
          >
             {t("messages.all")} 
          </button>
          <button
            onClick={() => setFilterType('group')}
            className={`
              flex-1 py-2 px-4 rounded-lg text-sm font-medium transition
              ${filterType === 'group'
                ? 'bg-myYellow text-myBlack'
                : 'bg-[#f0f0f0] dark:bg-[#2E2F2F] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
              }
            `}
          >
           {t("messages.groups")}
          </button>
        </div>
      </div>
     
      

      {/* LISTE SCROLLABLE */}
      <div className="px-2 pb-28 md:pb-6 overflow-y-auto space-y-2 md:space-y-2.5 conv-scroll z-0">
        {filteredList.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>
              {showArchivedOnly 
                ? (loadingArchived ? "Chargement..." : "Aucune conversation archivée")
                : filterType === 'group'
                  ? (t("messages.noGroupe") || "Aucune conversation")
                  : (t("messages.noConversations") || "Aucune conversation")
              }
            </p>
          </div>
        ) : (
          filteredList.map((conv) => {
            const isGroup = conv.type === 'group';
            const conversationName = isGroup 
              ? conv.groupName || conv.name
              : conv.participants?.[0]?.username || conv.name || "Utilisateur";
            
            const avatar = isGroup
              ? conv.groupAvatar || "/group-avatar.png"
              : conv.participants?.[0]?.profilePicture || "/default-avatar.png";
            
            const lastMessage = conv.lastMessage?.content || t("messages.noMessages") || "Aucun message";
            
            const time = conv.lastMessageAt 
              ? new Date(conv.lastMessageAt).toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : "";

            return (
              <div
                key={conv._id}
                onClick={() => handleSelectConversation(conv)}
              >
                <ConversationItem
                  avatar={avatar}
                  name={conversationName}
                  lastMessage={lastMessage}
                  time={time}
                  unread={conv.unreadCount || 0}
                  selected={selectedId === conv._id}
                  isGroup={isGroup} // Passe l'info au ConversationItem pour afficher un badge
                />
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}