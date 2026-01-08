

// frontend/src/components/ConversationList.jsx
import { useState, useEffect } from "react";
import ConversationItem from "./ConversationItem";
import { SlidersHorizontal, Search, Loader2, Plus } from "lucide-react";

import { Star } from "lucide-react"; // Ajoutez pour favoris 
import { useTranslation } from "react-i18next";
import { useConversations } from "../hooks/useConversations";
import socketService from "../services/socketService";
import { conversationService } from "../services/conversationService";

import { getFavorites } from "../services/favoritesService"; //Ajoutez pour favoris 
export default function ConversationList({ onSelect, onNewChat }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
   const [showFavoritesOnly, setShowFavoritesOnly] = useState(false); // Ajoutez pour favoris 
  const [favoritesList, setFavoritesList] = useState([]); //Ajoutez pour favoris 
  const [loadingFavorites, setLoadingFavorites] = useState(false); // Ajoutez pour favoris 
  const [archivedList, setArchivedList] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  
  // 🔥 NOUVEAU : État pour stocker les derniers messages
  const [lastMessages, setLastMessages] = useState({});

  const currentUserId = localStorage.getItem('userId');

  const { 
    conversations, 
    loading, 
    error, 
    markAsRead 
  } = useConversations();
// Modifier pour favoris 
//Avant 
//const listToDisplay = showArchivedOnly ? archivedList : conversations;
//Apres
  let listToDisplay = conversations;
if (showArchivedOnly) {
  listToDisplay = archivedList;
} else if (showFavoritesOnly) {
  listToDisplay = favoritesList;
}
// Fin de modification


  // 🔥 CHARGER LE DERNIER MESSAGE POUR CHAQUE CONVERSATION
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
              
              // Formatter le message selon son type
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

  // Écouter les nouveaux messages pour mettre à jour la liste
  useEffect(() => {
    const handleNewMessage = (data) => {
      console.log("📨 Nouveau message reçu dans la liste:", data);
      
      // Mettre à jour le dernier message pour cette conversation
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
    //avant 
    // onSelect(conv, showArchivedOnly);
    // Apres 
    onSelect(conv, showArchivedOnly || showFavoritesOnly);// ajouter pour favoris 
    


    // Marquer comme lu
    if (conv.unreadCount > 0) {
      await markAsRead(conv._id);
    }
  };

  const toggleArchived = async () => {
     setShowFavoritesOnly(false); // ajouter pour favoris dans la fonction
  const newShow = !showArchivedOnly;
  setShowArchivedOnly(newShow);

    if (newShow && archivedList.length === 0) {
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
    setLoadingArchived(false);
  }
};
// ajouter la fonction pour favoris
const toggleFavorites = async () => {
  setShowArchivedOnly(false);
  const newShow = !showFavoritesOnly;
  setShowFavoritesOnly(newShow);

  if (newShow && favoritesList.length === 0) {
    setLoadingFavorites(true);
    try {
      const userId = localStorage.getItem('userId');
      if (userId) {
        console.log("🔍 Chargement des favoris pour userId:", userId);
        
        // 1. Récupérer les IDs des conversations favorites
        const response = await getFavorites(userId);
        console.log("📊 Réponse getFavorites:", response);
        
        let favoriteIds = [];
        
        // Extraire les IDs selon le format de réponse
        if (response.data && Array.isArray(response.data)) {
          // Cas 1: response.data contient les favoris
          favoriteIds = response.data.map(item => item._id || item.conversationId || item);
        } else if (Array.isArray(response)) {
          // Cas 2: response est directement un tableau
          favoriteIds = response.map(item => item._id || item.conversationId || item);
        }
        
        console.log("📋 IDs des conversations favorites:", favoriteIds);
        
        // 2. Filtrer les conversations complètes à partir des IDs
        const enrichedFavorites = conversations.filter(conv => {
          return favoriteIds.some(favId => 
            String(favId) === String(conv._id) ||
            (favId._id && String(favId._id) === String(conv._id))
          );
        });
        
        console.log("✅ Conversations favorites enrichies:", enrichedFavorites);
        setFavoritesList(enrichedFavorites);
      }
    } catch (err) {
      console.error("❌ Erreur chargement favoris:", err);
    }
    setLoadingFavorites(false);
  }
};

// Fin de Fonction 
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

  
           <button // ajouter un button pour favoris 
    onClick={toggleFavorites}
    className="rounded-xl shrink-0 bg-[#f0f0f0] dark:bg-[#2E2F2F] hover:bg-gray-200 dark:hover:bg-neutral-700 p-2.5 md:p-3"
    title={showFavoritesOnly ? "Voir toutes les conversations" : "Voir les favoris"}
  >
    <Star 
      size={18} 
      className={`${showFavoritesOnly ? "text-yellow-500 fill-yellow-500" : "text-gray-600 dark:text-gray-300"}`}
    />
  </button>
          
          <button 
            onClick={toggleArchived}
            className="rounded-xl shrink-0 bg-[#f0f0f0] dark:bg-[#2E2F2F] hover:bg-gray-200 dark:hover:bg-neutral-700 p-2.5 md:p-3"
          >
            <SlidersHorizontal 
              size={18} 
              className={`${showArchivedOnly ? "text-myYellow" : "text-gray-600 dark:text-gray-300"}`}
            />
          </button>
        </div>
      </div>

      {/*ajouter pour favoris */}
      {/* Ajoutez ceci après la barre de recherche et avant la liste */}
{(showArchivedOnly || showFavoritesOnly) && (
  <div className="px-4 sm:px-6 pb-2">
    <div className="text-sm px-3 py-1 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 inline-flex items-center gap-2">
      {showFavoritesOnly ? (
        <>
          <Star size={14} className="fill-yellow-500" />
          <span>Conversations favorites</span>
        </>
      ) : (
        <>
          <SlidersHorizontal size={14} />
          <span>Conversations archivées</span>
        </>
      )}
      <button 
        onClick={() => {
          setShowArchivedOnly(false);
          setShowFavoritesOnly(false);
        }}
        className="ml-2 text-xs hover:underline"
      >
        Tout voir
      </button>
    </div>
  </div>
)}
    {/*fin de l'ajout*/}


      {/* LISTE SCROLLABLE */}
      <div className="px-2 pb-28 md:pb-6 overflow-y-auto space-y-2 md:space-y-2.5 conv-scroll z-0">
        {filteredList.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>
            {showArchivedOnly 
      ? (loadingArchived ? "Chargement..." : "Aucune conversation archivée")
      : showFavoritesOnly // ajouter pour favoris 
      ? (loadingFavorites ? "Chargement..." : "Aucune conversation favorite")// ajouter pour favoris 
      : t("messages.noConversations") || "Aucune conversation"}
              
          </p>
          </div>
        ) : (
          filteredList.map((conv) => {
            const isGroup = conv.isGroup || conv.type === 'group';
            
            // Trouver l'autre participant
            const otherParticipant = conv.participants?.find(
              p => p._id !== currentUserId
            );
            
            const conversationName = isGroup
              ? conv.groupName
              : otherParticipant?.username || "Utilisateur";
           
            const avatar = isGroup
              ? "/group-avatar.png"
              : otherParticipant?.profilePicture || "/default-avatar.png";
           
            // 🔥 UTILISER LE DERNIER MESSAGE DEPUIS L'ÉTAT
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
