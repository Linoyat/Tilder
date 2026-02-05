import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

// משתמשים דמיוניים (בעתיד יבואו מהשרת)
const allUsers = [
  {
    id: 1,
    name: 'דנה, 27',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    bio: 'מחפשת מישהו לחלוק איתו ממ"ד 🏃‍♀️',
  },
  {
    id: 2,
    name: 'איתי, 31',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    bio: 'מהנדס תוכנה ביום, שומר על השמיים בלילה',
  },
  {
    id: 3,
    name: 'ירדן, 25',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
    bio: 'מקווה שהאזעקה הבאה תהיה אזעקת חתונה 😉',
  },
];

function FavoritePage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shelterId, setShelterId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('עליך להתחבר כדי לראות את המועדפים שלך');
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const response = await fetch('http://localhost:5050/api/favorites', {
          headers: {
            'x-auth-token': token,
          },
        });

        if (response.ok) {
          const favoriteIds = await response.json();
          const favoriteUsers = allUsers.filter(user => 
            favoriteIds.includes(user.id.toString())
          );
          setFavorites(favoriteUsers);
        } else {
          setError('שגיאה בטעינת המועדפים');
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setError('שגיאה בטעינת המועדפים');
      } finally {
        setLoading(false);
      }
    };

    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:5050/api/profile', {
          headers: { 'x-auth-token': token },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shelterId) setShelterId(data.shelterId);
        }
      } catch (e) {
        console.warn('Error fetching profile for shelterId', e);
      }
    };

    fetchFavorites();
    fetchProfile();
  }, []);

  const handleRemoveFavorite = async (userId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('עליך להתחבר כדי לערוך מועדפים');
      return;
    }

    try {
      const newFavorites = favorites.filter(user => user.id !== userId);
      const favoriteIds = newFavorites.map(user => user.id.toString());

      const response = await fetch('http://localhost:5050/api/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          favorites: favoriteIds
        }),
      });

      if (response.ok) {
        setFavorites(newFavorites);
      } else {
        throw new Error('Failed to update favorites');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      alert('שגיאה בעדכון המועדפים');
    }
  };

  if (loading) {
    return (
      <div style={{textAlign: 'center', marginTop: 40}}>
        טוען מועדפים...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{textAlign: 'center', marginTop: 40, color: 'red'}}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #0001', position: 'relative', minHeight: '80vh' }}>
      {shelterId && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => navigate(`/shelter/${shelterId}`)}
            title="חזרה למקלט"
            style={{
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ←
          </button>
        </div>
      )}
      <h1 style={{textAlign: 'center', marginBottom: 24}}>המועדפים שלי</h1>
      
      {favorites.length === 0 ? (
        <div style={{textAlign: 'center', color: '#666', marginTop: 40}}>
          <p>אין לך עדיין מועדפים</p>
          <p>לך למקלטים וסמן לייק על אנשים שמעניינים אותך! ❤️</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          {favorites.map(user => (
            <div key={user.id} style={{
              display: 'flex', 
              alignItems: 'center', 
              background: '#f9f9f9', 
              borderRadius: 12, 
              padding: 16,
              position: 'relative'
            }}>
              <img src={user.image} alt={user.name} style={{width: 56, height: 56, borderRadius: '50%', marginInlineEnd: 16}} />
              <div style={{flex: 1}}>
                <div style={{fontWeight: 700}}>{user.name}</div>
                <div style={{color: '#555'}}>{user.bio}</div>
              </div>
              <button 
                onClick={() => handleRemoveFavorite(user.id)}
                style={{
                  background: '#ff6b6b',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  transition: 'all 0.2s ease'
                }}
                title="הסר ממועדפים"
              >
                ❤️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoritePage; 