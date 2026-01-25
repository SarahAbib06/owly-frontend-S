// frontend/src/App.jsx
import "./i18n";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider, useCall } from "./context/CallContext";
import IncomingCallModal from "./components/IncomingCallModal";
import VideoCallScreen from "./components/VideoCallScreen";

import RockPaper from "./pages/RockPaper";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import OtpPage from "./pages/OtpPage";
import MessagesPage from "./pages/MessagesPage";
import MainLayout from "./components/MainLayout";
import SettingsPage from "./pages/SettingsPage";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import MemoryGame from "./components/MemoryGame";
import TicTacToe2 from "./components/TicTacToe2";
import OwlyQuiz from "./components/OwlyQuiz";
import GamesPage from "./pages/GamesPage";
import ProfilPic from "./pages/ProfilPic.jsx";

// ✅ Composant AppContent pour gérer le VideoCall global
function AppContent() {
  const { acceptedCall } = useCall();

  return (
    <>
      {/* 🔔 Modal d'appel entrant GLOBAL */}
      <IncomingCallModal />

      {/* 🎥 Écran d'appel vidéo GLOBAL */}
      {acceptedCall && <VideoCallScreen />}

      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/OtpPage" element={<OtpPage />} />
        <Route path="/ForgotPassword" element={<ForgotPassword />} />
         <Route path="/profil-pic" element={<ProfilPic />} />

        {/* Layout protégé avec sidebar */}
        <Route element={<MainLayout />}>
          <Route
            path="/MessagesPage"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/tic-tac-toe2"
            element={
              <ProtectedRoute>
                <TicTacToe2 />
              </ProtectedRoute>
            }
          />

          <Route
            path="/memory-game"
            element={
              <ProtectedRoute>
                <MemoryGame />
              </ProtectedRoute>
            }
          />

          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <GamesPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/rock-paper-scissors"
            element={
              <ProtectedRoute>
                <RockPaper />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owly-quiz"
            element={
              <ProtectedRoute>
                <OwlyQuiz />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

// ✅ Architecture finale des Providers
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CallProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </CallProvider>
      </AuthProvider>
    </Router>
  );
}