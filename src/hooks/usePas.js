// src/hooks/usePad.js
import { useState, useEffect, useCallback } from 'react';
import socketService from '../services/socketService'; // Import DIRECT
import { padService } from '../services/padService';

export const usePad = (conversationId) => {
  const [padContent, setPadContent] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Charger le contenu initial
  const loadPadContent = useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const response = await padService.getOrCreate(conversationId);
      if (response.data.success) {
        setPadContent(response.data.pad.content || '');
      }
    } catch (error) {
      console.error('Erreur chargement pad:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Sauvegarder le contenu
  const savePadContent = useCallback(async (content) => {
    if (!conversationId) return;
    
    try {
      await padService.updateContent(conversationId, content);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde pad:', error);
      throw error;
    }
  }, [conversationId]);

  // Vider le pad
  const clearPad = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      await padService.clear(conversationId);
      setPadContent('');
      return true;
    } catch (error) {
      console.error('Erreur vidage pad:', error);
      throw error;
    }
  }, [conversationId]);

  // Rejoindre le pad
  const joinPad = useCallback(() => {
    if (!conversationId) return;
    socketService.joinPad(conversationId);
  }, [conversationId]);

  // Quitter le pad
  const leavePad = useCallback(() => {
    if (!conversationId) return;
    socketService.leavePad(conversationId);
  }, [conversationId]);

  // Écouter les mises à jour
  useEffect(() => {
    if (!conversationId) return;

    const handlePadUpdate = (data) => {
      if (data.conversationId === conversationId && data.type === 'content_changed') {
        // Évite les mises à jour de soi-même
        if (data.userId !== socketService.socket?.id) {
          setPadContent(data.content);
        }
      }
    };

    const handlePadJoined = (data) => {
      if (data.conversationId === conversationId) {
        setActiveUsers(data.activeUsers || []);
        if (data.pad?.content) {
          setPadContent(data.pad.content);
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

    // Écouter les événements
    socketService.onPadUpdate(handlePadUpdate);
    socketService.onPadJoined(handlePadJoined);
    socketService.onPadUserJoined(handleUserJoined);
    socketService.onPadUserLeft(handleUserLeft);

    return () => {
      // Nettoyer les écouteurs
      socketService.off('pad_update', handlePadUpdate);
      socketService.off('pad_joined', handlePadJoined);
      socketService.off('pad_user_joined', handleUserJoined);
      socketService.off('pad_user_left', handleUserLeft);
    };
  }, [conversationId]);

  return {
    // State
    padContent,
    setPadContent,
    activeUsers,
    isLoading,
    
    // Actions
    loadPadContent,
    savePadContent,
    clearPad,
    joinPad,
    leavePad,
    
    // Utilitaires
    hasActiveUsers: activeUsers.length > 0,
    activeUsersCount: activeUsers.length
  };
};