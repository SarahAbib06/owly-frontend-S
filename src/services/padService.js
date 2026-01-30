// src/services/padService.js
import api from './api';

export const padService = {
  /**
   * Récupérer ou créer un pad
   */
  getOrCreate: async (conversationId) => {
    try {
      const response = await api.get(`/pad/${conversationId}`);
      return response;
    } catch (error) {
      console.error('❌ Erreur getOrCreate pad:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour le contenu
   */
  updateContent: async (conversationId, content) => {
    try {
      const response = await api.put(`/pad/${conversationId}/content`, {
        content: content || ''
      });
      return response;
    } catch (error) {
      console.error('❌ Erreur updateContent pad:', error);
      throw error;
    }
  },

  /**
   * Vider le pad
   */
  clear: async (conversationId) => {
    try {
      const response = await api.delete(`/pad/${conversationId}/content`);
      return response;
    } catch (error) {
      console.error('❌ Erreur clear pad:', error);
      throw error;
    }
  },

  /**
   * Vérifier si un pad existe
   */
  exists: async (conversationId) => {
    try {
      const response = await api.get(`/pad/${conversationId}/exists`);
      return response.data.exists;
    } catch (error) {
      console.error('❌ Erreur exists pad:', error);
      return false;
    }
  }
};

export default padService;