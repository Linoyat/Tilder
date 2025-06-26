import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage";
import MatchPage from "./pages/MatchPage";
import ChatPage from "./pages/ChatPage";
import ActualLoginPage from "./pages/ActualLoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import TopBar from './components/TopBar';

function App() {
  return (
    <div>
      <TopBar />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<ActualLoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/match" element={<MatchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/chat/:id" element={<ChatPage />} />
        </Routes>
      </Router>
    </div>
  );
}


export default App;
