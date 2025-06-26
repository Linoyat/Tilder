import React from 'react';
import '../styles/HomePage.css'; // We can reuse some styles

function ActualLoginPage() {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="title">התחברות</h1>
        <p className="subtitle">שמחים לראות אותך שוב 💜 </p>
        {/* Login form fields will go here */}
        <input type="email" required placeholder="אימייל" style={{width: '90%', padding: '10px', margin: '10px 0', borderRadius: '20px', border: '1px solid #ddd'}} />
        <input type="password" required placeholder="סיסמה" style={{width: '90%', padding: '10px', margin: '10px 0', borderRadius: '20px', border: '1px solid #ddd'}} />
        <button className="start-btn" onClick={() => window.location.href = "/match"}>כניסה</button>
      </div>
    </div>
  );
}

export default ActualLoginPage; 