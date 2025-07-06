import React from 'react';
import '../styles/TopBar.css';

function TopBar() {
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  return (
    <div className="top-bar">
      <div className="top-bar__logo" onClick={() => window.location.href = '/match'} style={{ cursor: 'pointer' }}>
       טילדר
    </div>

      <div className="top-bar__center">
        {user && <span className="top-bar__greeting">ברוכים הבאים, {user.fullName}</span>}
      </div>
      <div className="top-bar__right">
        <button className="notification-btn" title="התראות">
          <span role="img" aria-label="notifications">🔔</span>
        </button>

        {user && (
          <button className="logout-btn" onClick={handleLogout} title="התנתקות">
            <span role="img" aria-label="logout">🚪</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default TopBar;
