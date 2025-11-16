import "./i18n"; 

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import OtpPge from "./pages/OtpPage.jsx";
import ForgotPassword from "./pages/ForgotPassword";




//import { useState } from "react";
//import TestButton from "./pages/TestButton";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OtpPage from "./pages/OtpPage.jsx";


export default function App() {
    
     return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Welcome" element={<Welcome />} /> {/* page par défaut */}
         <Route path="/OtpPage" element={<OtpPage />} />
           <Route path="/ForgotPassword" element={<ForgotPassword />} />
        
      </Routes>
    </Router>
  );
  }