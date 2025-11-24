// frontend/src/App.jsx
import "./i18n";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import OtpPage from "./pages/OtpPage";
import VideoCall from './components/VideoCall';
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Route par défaut : Welcome (page d'accueil publique) */}
          <Route path="/" element={<Welcome />} />
          
          {/* Routes publiques */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/OtpPage" element={<OtpPage />} />

          {/* Routes protégées */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video-call"
            element={
              <ProtectedRoute>
                <VideoCall roomId="room123" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}