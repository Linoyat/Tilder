import React from 'react';
import '../styles/TopBar.css';
import NotificationBell from './NotificationBell';
import AIChatAssistant from './AIChatAssistant';

function TopBar() {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <div className="top-bar">
      <div className="top-bar__left">
        {user && (
          <button className="top-bar__logout" onClick={handleLogout} title="התנתקות" aria-label="התנתקות">
            🚪
          </button>
        )}
        <AIChatAssistant />
        <NotificationBell />
        <div className="top-bar__logo" onClick={() => window.location.href = '/match'} style={{ cursor: 'pointer' }}>
          טילדר
        </div>
      </div>
      <div className="top-bar__center">
        {user && <span className="top-bar__greeting">ברוכים הבאים, {user.fullName}</span>}
      </div>
      <div className="top-bar__right" />
    </div>
  );
}

export default TopBar;
