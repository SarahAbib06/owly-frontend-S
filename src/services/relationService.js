import api from "./api";


export const relationService = {
  // Liste des utilisateurs bloqués
  getBlockedUsers: async () => {
    // ✅ Changé de "/users/blocked" à "/auth/blocked"
    const response = await api.get("/auth/blocked");
    return response.data;
  },

  // Débloquer un utilisateur
  unblockUser: async (contactId) => {
    // ✅ Changé de "/users/unblock" à "/auth/unblock"
    const response = await api.put(`/auth/unblock/${contactId}`);
    return response.data;
  }
};