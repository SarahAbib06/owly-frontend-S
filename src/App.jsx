import "./i18n"; // ton i18next

import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Welcome from "./pages/Welcome.jsx";
import OtpPage from "./pages/OtpPage";
import MessagesPage from "./pages/MessagesPage";
import MainLayout from "./components/MainLayout";
import SettingsPage from "./pages/SettingsPage";
import ForgotPassword from "./pages/ForgetPassword";

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
        <Route path="/Welcome" element={<Welcome />} /> 
        <Route path="/ForgotPassword" element={<ForgotPassword />} />
        <Route element={<MainLayout />}>

        <Route path="/MessagesPage" element={<MessagesPage />} /> 
         </Route>
         <Route element={<MainLayout />}>
             <Route path="/Settings" element={<SettingsPage />} />
          </Route>


        {/* page par défaut */}
        
      </Routes>
    </Router>
  );
  }