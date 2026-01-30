import api from './api';

// Ajouter une conversation aux favoris
export const addFavorite = (userId, conversationId) => {
  return api.post('/favorites/add', {
    userId,
    conversationId
  });
};

// Supprimer une conversation des favoris
export const removeFavorite = (userId, conversationId) => {
  return api.post('/favorites/remove', {
    userId,
    conversationId
  });
};

// Récupérer toutes les conversations favorites
export const getFavorites = (userId) => {
  return api.get(`/favorites?userId=${userId}`);
};