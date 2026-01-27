// frontend/src/services/audioService.js modefie
import api from './api';

export const audioService = {
  // 🔧 FONCTION CORRIGÉE: Envoyer un message audio avec statut
  sendAudioMessage: async (conversationId, audioBlob, status = 'sent') => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.webm');
    formData.append('conversationId', conversationId);
    // 🆕 AJOUT: Envoyer le statut pour avoir 2 flèches (✓✓)
    formData.append('status', status);

    console.log('📤 Envoi vocal avec statut:', status);

    const response = await api.post('/messages/audio/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    console.log('✅ Vocal envoyé:', response.data);
    return response.data;
  },

  // Récupérer les messages audio d'une conversation
  getAudioMessages: async (conversationId) => {
    const response = await api.get(`/messages/audio/${conversationId}`);
    return response.data;
  }
};