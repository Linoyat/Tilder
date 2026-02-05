import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css'; // We can reuse some styles

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError(''); // Clear previous errors
    try {
      const response = await fetch('http://localhost:5050/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'שגיאה בהתחברות');
      }

      // Save the token and user info to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.userName);

      // Navigate to the profile page
      navigate('/match');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="title">התחברות</h1>
        <p className="subtitle">שמחים לראות אותך שוב 💜 </p>
        <input
          type="email"
          required
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '90%', padding: '10px', margin: '10px 0', borderRadius: '20px', border: '1px solid #ddd' }}
        />
        <input
          type="password"
          required
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '90%', padding: '10px', margin: '10px 0', borderRadius: '20px', border: '1px solid #ddd' }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button className="start-btn" onClick={handleLogin}>כניסה</button>
      </div>
    </div>
  );
}

export default LoginPage;
