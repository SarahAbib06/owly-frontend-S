// frontend/src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  // ========================================
  // INSCRIPTION
  // ========================================
  const register = async (userData) => {
    try {
      setError(null);
      const data = await authService.register(userData);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // VÉRIFIER OTP (INSCRIPTION)
  // ========================================
  const verifyOtp = async (email, otp) => {
    try {
      setError(null);
      const data = await authService.verifyOtp(email, otp);
      setUser(data.data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // RENVOYER OTP
  // ========================================
  const resendOtp = async (email) => {
    try {
      setError(null);
      const data = await authService.resendOtp(email);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // CONNEXION
  // ========================================
  const login = async (credentials) => {
    try {
      setError(null);
      const data = await authService.login(credentials);
      
      // Si connexion réussie sans OTP
      if (data.token) {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email
        });
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // VÉRIFIER OTP INACTIVITÉ
  // ========================================
  const verifyInactivityOtp = async (token, otp) => {
    try {
      setError(null);
      const data = await authService.verifyInactivityOtp(token, otp);
      setUser({
        id: data.id,
        username: data.username,
        email: data.email
      });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // MOT DE PASSE OUBLIÉ
  // ========================================
  const forgotPassword = async (email) => {
    try {
      setError(null);
      const data = await authService.forgotPassword(email);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // RÉINITIALISER LE MOT DE PASSE
  // ========================================
  const resetPassword = async (token, otp, newPassword, newPasswordConfirm) => {
    try {
      setError(null);
      const data = await authService.verifyOtpReset(token, otp, newPassword, newPasswordConfirm);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // ========================================
  // DÉCONNEXION
  // ========================================
  const logout = () => {
    authService.logout();  // Supprime token de localStorage
    setUser(null);  // Réinitialise l'état
  };

  const value = {
    user,
    loading,
    error,
    register,
    verifyOtp,
    resendOtp,
    login,
    verifyInactivityOtp,
    forgotPassword,
    resetPassword,
    logout,
    isAuthenticated: authService.isAuthenticated()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};