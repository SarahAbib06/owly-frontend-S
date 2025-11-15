import "./i18n"; // ton i18next

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import OtpPage from "./pages/OtpPage";


//import { useState } from "react";
//import TestButton from "./pages/TestButton";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";


export default function App() {
    
     return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Welcome" element={<Welcome />} /> 
        <Route path="/OtpPage" element={<OtpPage />} /> 
        {/* page par défaut */}
        
      </Routes>
    </Router>
  );
  }