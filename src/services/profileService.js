// frontend/src/services/profileService.js
import api from "./api";


export const profileService = {

  //  1. Récupérer le profil
  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data.user;
  },

  //  2. Modifier le username
  updateUsername: async (newUsername) => {
    const response = await api.put("/auth/profile/username", {
      username: newUsername,
    });
    return response.data.user;
  },

  // 3. Upload photo de profil
 uploadProfilePicture: async (file) => {
    const formData = new FormData();

    
    formData.append("profile", file);

    const response = await api.post("/auth/upload-profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.user;
  },
     // 4. Supprimer le compte
  deleteAccount: async (password) => {
    const response = await api.post("/auth/delete-account", { password });
    return response.data;
  },

   deleteProfilePicture: async ()=>{
    const response = await api.delete("/auth/profile/picture")
    return response.data;
   }
};

