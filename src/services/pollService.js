// src/services/pollService.js
import api from "./api";

export const pollService = {
  createPoll: async (data) => {
    try {
      console.log("Envoi de la requête de création de sondage:", data);

      // Validation côté client
      if (!data.conversationId) {
        throw new Error("conversationId est requis");
      }
      if (!data.question || !data.options || data.options.length < 2) {
        throw new Error("Question et au moins 2 options sont requis");
      }

      const response = await api.post("/polls/create", data);
      console.log("Réponse de création de sondage:", response.data);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error("Erreur création sondage:", errorMessage);
      throw new Error(errorMessage);
    }
  },

  // ✅ FONCTION VOTE CORRECTE
  votePoll: async (pollId, optionIndexes) => {
    try {
      console.log(
        "🗳️ Envoi du vote pour sondage:",
        pollId,
        "options:",
        optionIndexes
      );

      const response = await api.post(`/polls/${pollId}/vote`, {
        optionIndexes,
      });

      console.log("✅ Réponse vote reçue:", response.data);
      return response.data;
    } catch (error) {
      let messageErreur = "Erreur inconnue lors du vote";

      if (error.response) {
        messageErreur =
          error.response.data?.error ||
          error.response.data?.message ||
          `Erreur ${error.response.status}: ${error.response.statusText}`;
        console.error("❌ Erreur serveur:", {
          status: error.response.status,
          data: error.response.data,
        });
      } else if (error.request) {
        messageErreur = "Aucune réponse du serveur. Vérifiez votre connexion.";
        console.error("❌ Pas de réponse du serveur:", error.request);
      } else {
        messageErreur = error.message;
        console.error("❌ Erreur configuration requête:", error.message);
      }

      console.error("❌ Erreur vote sondage:", {
        message: messageErreur,
        pollId,
        optionIndexes,
        erreurComplete: error,
      });

      throw new Error(messageErreur);
    }
  },

  getConversationPolls: async (conversationId) => {
    try {
      if (!conversationId) {
        console.warn("Aucun conversationId fourni pour getConversationPolls");
        return [];
      }

      const response = await api.get(`/polls/conversation/${conversationId}`);
      return response.data.polls || [];
    } catch (error) {
      console.error("Erreur récupération sondages:", error);
      return [];
    }
  },

  getPoll: async (pollId) => {
    try {
      const response = await api.get(`/polls/${pollId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur récupération sondage:", error);
      throw error;
    }
  },

  getPollResults: async (pollId) => {
    try {
      const response = await api.get(`/polls/${pollId}/results`);
      return response.data;
    } catch (error) {
      console.error("Erreur récupération résultats:", error);
      throw error;
    }
  },

  closePoll: async (pollId) => {
    try {
      const response = await api.post(`/polls/${pollId}/close`);
      return response.data;
    } catch (error) {
      console.error("Erreur fermeture sondage:", error);
      throw error;
    }
  },

  deletePoll: async (pollId) => {
    try {
      const response = await api.delete(`/polls/${pollId}`);
      return response.data;
    } catch (error) {
      console.error("Erreur suppression sondage:", error);
      throw error;
    }
  },
};
