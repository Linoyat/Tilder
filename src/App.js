import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import BottomNav from './components/BottomNav';

import HomePage from "./pages/HomePage";
import MatchPage from "./pages/MatchPage";
import ChatPage from "./pages/ChatPage";
import ChatsPage from "./pages/ChatsPage";
import ActualLoginPage from "./pages/ActualLoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import TopBar from './components/TopBar';
import ShelterPage from './pages/ShelterPage';
import FavoritePage from "./pages/FavoritePage";

function AppRoutes() {
  const location = useLocation();
  
  // Determine which nav item should be active
  const getActiveNav = () => {
    if (location.pathname === '/chats') return 'chats';
    if (location.pathname.startsWith('/chat/')) return 'chat';
    if (location.pathname === '/favorite') return 'match';
    if (location.pathname === '/profile') return 'profile';
    return location.pathname;
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<ActualLoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/match" element={<MatchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/shelter/:id" element={<ShelterPage />} />
        <Route path="/favorite" element={<FavoritePage />} />
      </Routes>
      <BottomNav active={getActiveNav()} />
    </>
  );
}

function App() {
  return (
    <Router>
      <TopBar />
      <AppRoutes />
    </Router>
  );
}

export default App;
