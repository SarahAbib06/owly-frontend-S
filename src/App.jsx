import "./i18n";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CallProvider, useCall } from "./context/CallContext"; // 1️⃣ Importé useCall
import IncomingCallModal from "./components/IncomingCallModal";

import RockPaper from "./pages/RockPaper";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import OtpPage from "./pages/OtpPage";
<<<<<<< HEAD
import ProfilPic from "./pages/ProfilPic.jsx";

import TicTacToe2 from "./components/TicTacToe2";
=======
>>>>>>> agora-video-call
import MessagesPage from "./pages/MessagesPage";
import MainLayout from "./components/MainLayout";
import SettingsPage from "./pages/SettingsPage";
import ForgotPassword from "./pages/ForgotPassword";
<<<<<<< HEAD


=======
import VideoCallScreen  from "./components/VideoCallScreen";
>>>>>>> agora-video-call
import ProtectedRoute from "./components/ProtectedRoute";
import MemoryGame from "./components/MemoryGame";
import TicTacToe2 from "./components/TicTacToe2";
import OwlyQuiz from "./components/OwlyQuiz";
import GamesPage from "./pages/GamesPage";
<<<<<<< HEAD
import { ChatProvider } from "./context/ChatContext";
import { useEffect } from "react";
=======
import RockPaperGame from "./pages/RockPaper";

// 2️⃣ Composant AppContent pour gérer le VideoCall global
function AppContent() {
  const { acceptedCall } = useCall();

  return (
    <>
      {/* 🔔 Modal d'appel GLOBAL */}
      <IncomingCallModal />

      {/* 🎥 APPEL VIDÉO GLOBAL */}
      {acceptedCall && <VideoCallScreen />}

      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Welcome />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/OtpPage" element={<OtpPage />} />
        <Route path="/ForgotPassword" element={<ForgotPassword />} />

        {/* Layout protégé */}
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

          {/* ❌ SUPPRIMÉ : la route /video-call devient inutile
          <Route
            path="/video-call"
            element={
              <ProtectedRoute>
                <VideoCall />
              </ProtectedRoute>
            }
          /> */}

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
                <RockPaperGame />
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

// 3️⃣ Envelopper correctement les providers
>>>>>>> agora-video-call
export default function App() {
  const currentUser = JSON.parse(localStorage.getItem("user")); // récupère l'utilisateur connecté
  useEffect(() => {
  if (!currentUser) return;

  const fetchUserTheme = async () => {
    try {
      const res = await fetch(`/api/user/${currentUser._id}`);
      const data = await res.json();
      const theme = data.theme;

      if (theme.type === "gradient") {
        document.body.style.background = theme.value;
      } else if (theme.type === "color" || theme.type === "seasonal") {
        document.body.style.background = theme.value;
      } else if (theme.type === "upload") {
        document.body.style.backgroundImage = `url(${theme.value})`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
      }
    } catch (err) {
      console.error(err);
    }
  };

  fetchUserTheme();
}, []);

  return (
    <Router>
      <AuthProvider>
<<<<<<< HEAD
        <ChatProvider>
          <Routes>
            {/* Route par défaut */}
            <Route path="/" element={<Welcome />} />

            {/* Routes publiques */}
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/OtpPage" element={<OtpPage />} />
            <Route path="/ForgotPassword" element={<ForgotPassword />} />
            <Route path="/profil-pic" element={<ProfilPic />} />

            {/* Layout avec sidebar/header */}
            <Route element={<MainLayout />}>
              {/* Ces pages doivent être accessibles avec layout mais protégées */}
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
        </ChatProvider>
=======
        <CallProvider>
          <AppContent />
        </CallProvider>
>>>>>>> agora-video-call
      </AuthProvider>
    </Router>
  );
}