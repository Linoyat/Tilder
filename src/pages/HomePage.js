import React from 'react';
import '../styles/HomePage.css';

function HomePage() {
  return (
    <div className="login-page">
      <header className="page-header">
        <button className="header-login-btn" onClick={() => window.location.href = "/login"}>
          התחברות
        </button>
      </header>
      <div className="login-card">
        <div className="logo-container">
          <span role="img" aria-label="logo" className="logo">❤️‍🔥</span>
        </div>
        <h1 className="title">טילדר</h1>
        <p className="subtitle">מוצאים אהבה במרחב המוגן</p>
        <button className="start-btn" onClick={() => window.location.href = "/register"}>
          הרשמה
        </button>
      </div>
    </div>
  );
}

export default HomePage; 