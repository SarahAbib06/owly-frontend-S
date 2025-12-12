
// frontend/src/App.jsx avec le jeux hajar waraq miqas
import "./i18n";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import RockPaper from "./pages/RockPaper";


import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import OtpPage from "./pages/OtpPage";

import MessagesPage from "./pages/MessagesPage";
import MainLayout from "./components/MainLayout";
import SettingsPage from "./pages/SettingsPage";
import ForgotPassword from "./pages/ForgotPassword";


import VideoCall from "./components/VideoCall";
import ProtectedRoute from "./components/ProtectedRoute";
import MemoryGame from "./components/MemoryGame";
import WhackAMole from "./components/WhackAMole";
import OwlyQuiz from "./components/OwlyQuiz";


import GamesPage from "./pages/GamesPage";





export default function App() {

  return (
    <Router>
      <AuthProvider>
        <Routes>



          {/* Route par défaut */}
          <Route path="/" element={<Welcome />} />

          {/* Routes publiques */}

          <Route path="/welcome" element={<Welcome />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/OtpPage" element={<OtpPage />} />
          <Route path="/ForgotPassword" element={<ForgotPassword />} />


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


            {/* Mini-jeu intégré dans ton layout */}
</Route>

          {/* Autres routes protégées */}

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
  path="/whack-a-mole"
  element={
    <ProtectedRoute>
      <WhackAMole />
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





        </Routes>
      </AuthProvider>
    </Router>
  );
}
