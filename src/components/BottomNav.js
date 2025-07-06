import React from 'react';
import '../styles/BottomNav.css';

// We get the active page from props to highlight the correct icon
function BottomNav({ active }) {
    return (
        <div className="bottom-nav">
            <button onClick={() => window.location.href = '/favorite'} className={`nav-btn ${active === 'match' ? 'active' : ''}`}>
                <span role="img" aria-label="match">❤️</span>
            </button>
            <button onClick={() => window.location.href = '/chats'} className={`nav-btn ${active === 'chat' || active === 'chats' ? 'active' : ''}`}>
                <span role="img" aria-label="chat">💬</span>
            </button>
            <button onClick={() => window.location.href = '/profile'} className={`nav-btn ${active === 'profile' ? 'active' : ''}`}>
                <span role="img" aria-label="profile">👤</span>
            </button>
        </div>
    );
}

export default BottomNav; 