// frontend/src/components/ConversationList.jsx
import { useState, useEffect } from "react";
import ConversationItem from "./ConversationItem";
import { SlidersHorizontal, Search, Loader2, Plus } from "lucide-react";
import { Star, Archive, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConversations } from "../hooks/useConversations";
import socketService from "../services/socketService";
import { conversationService } from "../services/conversationService";
import { getFavorites } from "../services/favoritesService";

// Shadcn Select Components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export default function ConversationList({ onSelect, onNewChat }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [filterMode, setFilterMode] = useState("all"); // "all", "archived", "favorites"
  
  const [favoritesList, setFavoritesList] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [archivedList, setArchivedList] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [lastMessages, setLastMessages] = useState({});

  const currentUserId = localStorage.getItem('userId');

  const { 
    conversations, 
    loading, 
    error, 
    markAsRead 
  } = useConversations();

  // Déterminer quelle liste afficher
  let listToDisplay = conversations;
  if (filterMode === "archived") {
    listToDisplay = archivedList;
  } else if (filterMode === "favorites") {
    listToDisplay = favoritesList;
  }

  // Charger les derniers messages
  useEffect(() => {
    const fetchLastMessages = async () => {
      const messages = {};
      
      for (const conv of listToDisplay) {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `http://localhost:5000/api/messages/${conv._id}?page=1&limit=1`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
              const lastMsg = data.messages[0];
              
              let preview = '';
              if (lastMsg.typeMessage === 'text') {
                preview = lastMsg.content;
              } else if (lastMsg.typeMessage === 'image') {
                preview = '📷 Photo';
              } else if (lastMsg.typeMessage === 'video') {
                preview = '🎥 Vidéo';
              } else if (lastMsg.typeMessage === 'audio') {
                preview = '🎤 Audio';
              } else if (lastMsg.typeMessage === 'file') {
                preview = '📎 Fichier';
              }
              
              messages[conv._id] = {
                content: preview,
                senderId: lastMsg.Id_sender || lastMsg.senderId,
                createdAt: lastMsg.createdAt || lastMsg.timestamp
              };
            }
          }
        } catch (error) {
          console.error(`Erreur chargement message conv ${conv._id}:`, error);
        }
      }
      
      setLastMessages(messages);
    };

    if (listToDisplay.length > 0) {
      fetchLastMessages();
    }
  }, [listToDisplay]);

  // Filtrer les conversations selon la recherche
  const filteredList = listToDisplay.filter((conv) => {
    const otherParticipant = conv.participants?.find(
      p => p._id !== currentUserId
    );
    
    const conversationName = conv.isGroup
      ? conv.groupName
      : otherParticipant?.username || "Utilisateur";
   
    return conversationName.toLowerCase().includes(search.toLowerCase());
  });

  // Écouter les nouveaux messages
  useEffect(() => {
    const handleNewMessage = (data) => {
      if (data.conversationId) {
        let preview = '';
        if (data.typeMessage === 'text') {
          preview = data.content;
        } else if (data.typeMessage === 'image') {
          preview = '📷 Photo';
        } else if (data.typeMessage === 'video') {
          preview = '🎥 Vidéo';
        } else if (data.typeMessage === 'audio') {
          preview = '🎤 Audio';
        } else if (data.typeMessage === 'file') {
          preview = '📎 Fichier';
        }
        
        setLastMessages(prev => ({
          ...prev,
          [data.conversationId]: {
            content: preview,
            senderId: data.Id_sender || data.senderId,
            createdAt: data.createdAt || data.timestamp || new Date()
          }
        }));
      }
    };

    socketService.onNewMessage(handleNewMessage);
    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, []);

  const handleSelectConversation = async (conv) => {
    setSelectedId(conv._id);
    onSelect(conv, filterMode !== "all");

    if (conv.unreadCount > 0) {
      await markAsRead(conv._id);
    }
  };

  // Fonction pour charger les conversations archivées
  const loadArchived = async () => {
    if (archivedList.length === 0) {
      setLoadingArchived(true);
      try {
        const userId = localStorage.getItem('userId');
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

  // Fonction pour charger les favoris
  const loadFavorites = async () => {
    if (favoritesList.length === 0) {
      setLoadingFavorites(true);
      try {
        const userId = localStorage.getItem('userId');
        if (userId) {
          const response = await getFavorites(userId);
          
          let favoriteIds = [];
          if (response.data && Array.isArray(response.data)) {
            favoriteIds = response.data.map(item => item._id || item.conversationId || item);
          } else if (Array.isArray(response)) {
            favoriteIds = response.map(item => item._id || item.conversationId || item);
          }
          
          const enrichedFavorites = conversations.filter(conv => {
            return favoriteIds.some(favId => 
              String(favId) === String(conv._id) ||
              (favId._id && String(favId._id) === String(conv._id))
            );
          });
          
          setFavoritesList(enrichedFavorites);
        }
      } catch (err) {
        console.error("❌ Erreur chargement favoris:", err);
      }
      setLoadingFavorites(false);
    }
  };

  // Gérer le changement de filtre
  const handleFilterChange = async (mode) => {
    setFilterMode(mode);

    if (mode === "archived") {
      await loadArchived();
    } else if (mode === "favorites") {
      await loadFavorites();
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
      <div className="flex px-4 pt-3 sm:px-6 sm:pt-4 sm:pb-2 items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Owly
        </h2>

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
              placeholder={t("messages.searchFriends") || "Rechercher..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent outline-none text-xs placeholder-gray-500 dark:placeholder-gray-400 text-myBlack dark:text-white"
            />
          </div>

          {/* SHADCN SELECT */}
          <Select value={filterMode} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[70px] h-9 md:h-10 rounded-xl bg-[#f0f0f0] dark:bg-[#2E2F2F] border-0 hover:bg-gray-200 dark:hover:bg-neutral-700 transition">
              <SelectValue>
                {filterMode === "all" && (
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-gray-600 dark:text-gray-300" />
                  </div>
                )}
                {filterMode === "favorites" && (
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  </div>
                )}
                {filterMode === "archived" && (
                  <div className="flex items-center gap-2">
                    <Archive size={16} className="text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
              <SelectItem value="all" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  <span>Toutes les conversations</span>
                </div>
              </SelectItem>
              <SelectItem value="favorites" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Star size={16} className="text-yellow-500" />
                  <span>Favoris</span>
                </div>
              </SelectItem>
              <SelectItem value="archived" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Archive size={16} />
                  <span>Archivées</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* BADGE DE FILTRE ACTIF */}
      {filterMode !== "all" && (
        <div className="px-4 sm:px-6 pb-2">
          <div className="text-sm px-3 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 inline-flex items-center gap-2">
            {filterMode === "favorites" ? (
              <>
                <Star size={14} className="fill-yellow-500" />
                <span>Conversations favorites</span>
              </>
            ) : (
              <>
                <Archive size={14} />
                <span>Conversations archivées</span>
              </>
            )}
            <button 
              onClick={() => setFilterMode("all")}
              className="ml-2 text-xs hover:underline"
            >
              Tout voir
            </button>
          </div>
        </div>
      )}

      {/* LISTE SCROLLABLE */}
      <div className="px-2 pb-28 md:pb-6 overflow-y-auto space-y-2 md:space-y-2.5 conv-scroll z-0">
        {filteredList.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>
              {filterMode === "archived" 
                ? (loadingArchived ? "Chargement..." : "Aucune conversation archivée")
                : filterMode === "favorites"
                ? (loadingFavorites ? "Chargement..." : "Aucune conversation favorite")
                : t("messages.noConversations") || "Aucune conversation"}
            </p>
          </div>
        ) : (
          filteredList.map((conv) => {
            const isGroup = conv.isGroup || conv.type === 'group';
            const otherParticipant = conv.participants?.find(
              p => p._id !== currentUserId
            );
            
            const conversationName = isGroup
              ? conv.groupName
              : otherParticipant?.username || "Utilisateur";
           
            const avatar = isGroup
              ? "/group-avatar.png"
              : otherParticipant?.profilePicture || "/default-avatar.png";
           
            const lastMsg = lastMessages[conv._id];
            let lastMessage = t("messages.noMessages") || "Aucun message";
            
            if (lastMsg) {
              const isMine = lastMsg.senderId === currentUserId;
              const prefix = isMine ? "Vous : " : "";
              lastMessage = prefix + lastMsg.content;
            }
           
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
                />
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}