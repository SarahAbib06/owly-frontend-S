// frontend/src/hooks/useConversations.js
import { useState, useEffect, useCallback } from 'react';
import { conversationService } from '../services/conversationService';
import socketService from '../services/socketService';

export const useConversations = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger les conversations
const loadConversations = useCallback(async () => {
  try {
    setLoading(true);
    const response = await conversationService.getMyConversations();
    
    console.log('📂 Conversations chargées:', response);
    
    // ✅ INVERSER l'ordre : plus récent EN PREMIER
    const sorted = (response.conversations || []).sort((a, b) => 
      new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
    );
    
    console.log('✅ Après tri:', sorted); // Debug
    
    setConversations(sorted);
    setError(null);
  } catch (err) {
    console.error('❌ Erreur chargement conversations:', err);
    setError(err.message);
  } finally {
    setLoading(false);
  }
}, []);

  // Créer un groupe
  const createGroup = useCallback(async (participantIds, groupName) => {
    try {
      const response = await conversationService.createGroup(participantIds, groupName);
      
      console.log('👥 Groupe créé:', response);
      
      // Ajouter le groupe à la liste
      if (response.group) {
        setConversations(prev => [response.group, ...prev]);
      }
      
      return response.group;
    } catch (err) {
      console.error('❌ Erreur création groupe:', err);
      throw err;
    }
  }, []);

  // Marquer une conversation comme lue
  const markAsRead = useCallback(async (conversationId) => {
    try {
      await conversationService.markAsRead(conversationId);
      
      // Mettre à jour localement
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      // Notifier via Socket.IO
      socketService.markConversationRead(conversationId);
      
      console.log('✅ Conversation marquée comme lue:', conversationId);
    } catch (err) {
      console.error('❌ Erreur marquer comme lu:', err);
    }
  }, []);

  // Archiver une conversation
  const archiveConversation = useCallback(async (conversationId) => {
    try {
      await conversationService.archiveConversation(conversationId);
      
      // Retirer de la liste
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      
      // Notifier via Socket.IO
      socketService.archiveConversation(conversationId);
      
      console.log('📁 Conversation archivée:', conversationId);
    } catch (err) {
      console.error('❌ Erreur archivage:', err);
      throw err;
    }
  }, []);

  // Désarchiver une conversation
  const unarchiveConversation = useCallback(async (conversationId) => {
    try {
      await conversationService.unarchiveConversation(conversationId);
      
      // Recharger les conversations
      await loadConversations();
      
      // Notifier via Socket.IO
      socketService.unarchiveConversation(conversationId);
      
      console.log('📂 Conversation désarchivée:', conversationId);
    } catch (err) {
      console.error('❌ Erreur désarchivage:', err);
      throw err;
    }
  }, [loadConversations]);

  // Écouter les nouveaux messages via Socket.IO
 // Écouter les nouveaux messages via Socket.IO
useEffect(() => {
  console.log('🎧 Socket listeners activés');
  
  // Test : écouter TOUS les événements
  socketService.socket.onAny((eventName, ...args) => {
    console.log(`📡 Événement reçu: ${eventName}`, args);
  });
  
  const handleNewMessage = (message) => {
    console.log('🔔 SOCKET - handleNewMessage déclenché:', message);
    
    const currentUserId = localStorage.getItem('userId');
    const isMyMessage = message.Id_sender === currentUserId || message.senderId === currentUserId;
    
    setConversations(prev => {
      console.log('🔄 Mise à jour conversations, avant:', prev.length);
      
      // Vérifier si la conversation existe déjà
      const exists = prev.some(conv => conv._id === message.conversationId);
      
      let updated;
      if (exists) {
        // Mettre à jour la conversation existante
        updated = prev.map(conv => {
          if (conv._id === message.conversationId) {
            return {
              ...conv,
              lastMessageAt: new Date().toISOString(),
              unreadCount: isMyMessage ? conv.unreadCount : (conv.unreadCount || 0) + 1
            };
          }
          return conv;
        });
      } else {
        // Ajouter la nouvelle conversation (cas rare)
        updated = [...prev];
      }
      
      // ✅ TOUJOURS trier après mise à jour
      const sorted = updated.sort((a, b) => {
        const dateA = new Date(a.lastMessageAt || 0);
        const dateB = new Date(b.lastMessageAt || 0);
        return dateB - dateA; // Plus récent en premier
      });
      
      console.log('✅ Mise à jour conversations, après:', sorted.length);
      console.log('📋 Première conversation:', sorted[0]?.name, sorted[0]?.lastMessageAt);
      
      return sorted;
    });
  };

  socketService.onNewMessage(handleNewMessage);

  return () => {
    socketService.off('new_message', handleNewMessage);
    socketService.socket.offAny();
  };
}, []);

// Charger au montage
useEffect(() => {
  loadConversations();
}, [loadConversations]);
  

  return {
    conversations,
    loading,
    error,
    loadConversations,
    createGroup,
    markAsRead,
    archiveConversation,
    unarchiveConversation
  };
};