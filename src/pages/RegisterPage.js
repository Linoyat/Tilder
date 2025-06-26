import React, { useState } from 'react';
import '../styles/HomePage.css'; // Reusing styles for consistency

function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('http://localhost:5050/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const data = await response.json();
      if (response.ok) {
        alert('נרשמת בהצלחה!');
        window.location.href = "/match";
      } else {
        alert(data.message || 'שגיאה בהרשמה');
      }
    } catch (err) {
      alert('שגיאה בשרת');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="title">הרשמה</h1>
        <p className="subtitle">פרטים בסיסיים ומתחילים</p>
        
        {/* A simple registration form */}
        <form onSubmit={handleRegister} style={{ display: 'contents' }}>
          <input
            type="text"
            placeholder="שם מלא"
            required
            minLength="2"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={{ width: '90%', padding: '10px', margin: '5px 0', borderRadius: '20px', border: '1px solid #ddd' }}
          />
          <input
            type="email"
            placeholder="אימייל"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '90%', padding: '10px', margin: '5px 0', borderRadius: '20px', border: '1px solid #ddd' }}
          />
          <input
            type="password"
            placeholder="סיסמה"
            required
            minLength="8"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '90%', padding: '10px', margin: '5px 0', borderRadius: '20px', border: '1px solid #ddd' }}
          />
          
          {/* After registration, we can navigate to the match page */}
          <button type="submit" className="start-btn">
            סיום הרשמה
          </button>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;