import "./i18n"; // ton i18next

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";


//import { useState } from "react";
//import TestButton from "./pages/TestButton";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


export default function App() {
    
     return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Welcome" element={<Welcome />} /> {/* page par défaut */}
        
      </Routes>
    </Router>
  );
  
   //return <TestButton />;
  // état pour activer/désactiver le dark mode
}
  /*
  const [darkMode, setDarkMode] = useState(false);

  // change la classe du body quand on clique
  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <h1 className="text-4xl font-bold text-blue-600 dark:text-yellow-300">
        Hello Owly 🚀
      </h1>

      <p className="text-gray-600 dark:text-gray-300 mt-4">
        Si le fond devient sombre, le dark mode fonctionne 🎉
      </p>

      <button
        onClick={toggleDarkMode}
        className="mt-8 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-yellow-400 dark:text-black dark:hover:bg-yellow-500 transition"
      >
        {darkMode ? "☀️ Mode clair" : "🌙 Mode sombre"}
      </button>
    </div>
  );
}

*/