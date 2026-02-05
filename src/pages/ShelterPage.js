import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const dummyShelter = {
  id: 'dummy1',
  name: 'מקלט דיזנגוף 100',
  address: 'דיזנגוף 100, תל אביב',
};

const dummyUsers = [
  {
    id: 1,
    name: 'דנה, 27',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    bio: 'מחפשת מישהו לחלוק איתו ממ"ד 🏃‍♀️',
    gender: 'women'
  },
  {
    id: 2,
    name: 'איתי, 31',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    bio: 'מהנדס תוכנה ביום, שומר על השמיים בלילה',
    gender: 'men'
  },
  {
    id: 3,
    name: 'ירדן, 25',
    image: 'https://randomuser.me/api/portraits/women/68.jpg',
    bio: 'מקווה שהאזעקה הבאה תהיה אזעקת חתונה 😉',
    gender: 'women'
  },
];

function ShelterPage() {
  const { id } = useParams();
  const [likedUsers, setLikedUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [userPreference, setUserPreference] = useState('both');
  const [peopleCount, setPeopleCount] = useState(0);
  const [isInShelter, setIsInShelter] = useState(false);
  const [shelterInfo, setShelterInfo] = useState(null); // מידע על המקלט מהשרת / דמו
  const navigate = useNavigate();

  // טעינת מועדפים ומידע על המקלט מהשרת
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      
      // למקלט דמי, נגדיר כניסה אוטומטית גם בלי token
      if (id === 'dummy1') {
        setIsInShelter(true);
        setPeopleCount(dummyUsers.length);
        setShelterInfo(dummyShelter);
        setLoading(false);
        return;
      }
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // טעינת פרטי המקלט (שם וכתובת) – תמיד למקלטים אמיתיים
        try {
          const shelterRes = await fetch(`http://localhost:5050/api/shelters/${id}`);
          if (shelterRes.ok) {
            const data = await shelterRes.json();
            setShelterInfo({
              name: data.name || '',
              address: data.address || '',
            });
          }
        } catch (err) {
          console.warn('Error fetching shelter details:', err);
        }

        // טעינת מועדפים
        try {
          const favoritesResponse = await fetch('http://localhost:5050/api/favorites', {
            headers: {
              'x-auth-token': token,
            },
          });

          if (favoritesResponse.ok) {
            const favorites = await favoritesResponse.json();
            setLikedUsers(new Set(favorites));
          }
        } catch (err) {
          console.warn('Error fetching favorites:', err);
        }

        // טעינת העדפות המשתמש
        let userShelterId = null;
        try {
          const profileResponse = await fetch('http://localhost:5050/api/profile', {
            headers: {
              'x-auth-token': token,
            },
          });

          if (profileResponse.ok) {
            const userData = await profileResponse.json();
            setUserPreference(userData.preference || 'both');
            userShelterId = userData.shelterId;
            setIsInShelter(userData.shelterId === id);
          }
        } catch (err) {
          console.warn('Error fetching profile:', err);
        }

        // כניסה אוטומטית למקלט
        // אם המשתמש במקלט אחר, השרת יוציא אותו אוטומטית מהמקלט הקודם
        if (userShelterId !== id) {
          try {
            const enterResponse = await fetch(`http://localhost:5050/api/shelters/${id}/enter`, {
              method: 'POST',
              headers: {
                'x-auth-token': token,
              },
            });

            if (enterResponse.ok) {
              const enterData = await enterResponse.json();
              setIsInShelter(true);
              setPeopleCount(enterData.peopleCount);
            }
          } catch (err) {
            console.warn('Error entering shelter automatically:', err);
          }
        } else if (userShelterId === id) {
          // אם המשתמש כבר במקלט הזה, נטען את כמות האנשים
          try {
            const shelterResponse = await fetch(`http://localhost:5050/api/shelters/${id}`);
            if (shelterResponse.ok) {
              const shelterData = await shelterResponse.json();
              setPeopleCount(shelterData.peopleCount || 0);
              setShelterInfo({
                name: shelterData.name || '',
                address: shelterData.address || '',
              });
            }
          } catch (err) {
            console.warn('Error fetching shelter:', err);
          }
        }

        // אם המשתמש כבר במקלט, נטען את כמות האנשים
        if (id !== 'dummy1' && userShelterId === id) {
          try {
            const shelterResponse = await fetch(`http://localhost:5050/api/shelters/${id}`);
            if (shelterResponse.ok) {
              const shelterData = await shelterResponse.json();
              setPeopleCount(shelterData.peopleCount || 0);
              setShelterInfo({
                name: shelterData.name || '',
                address: shelterData.address || '',
              });
            }
          } catch (err) {
            console.warn('Error fetching shelter:', err);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  // סינון משתמשים לפי העדפה
  const filteredUsers = dummyUsers.filter(user => {
    if (userPreference === 'both') return true;
    return user.gender === userPreference;
  });

  const handleLike = async (userId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('עליך להתחבר כדי לסמן לייק');
      return;
    }

    const newLikedUsers = new Set(likedUsers);
    if (newLikedUsers.has(userId.toString())) {
      newLikedUsers.delete(userId.toString());
    } else {
      newLikedUsers.add(userId.toString());
    }

    setLikedUsers(newLikedUsers);

    // שמירה בשרת
    try {
      const response = await fetch('http://localhost:5050/api/favorites', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          favorites: Array.from(newLikedUsers)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorites');
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      // אם השמירה נכשלה, נחזור למצב הקודם
      setLikedUsers(likedUsers);
      alert('שגיאה בשמירת הלייק');
    }
  };

  const handleMessage = (user) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('עליך להתחבר כדי לשלוח הודעה');
      return;
    }
    
    // ניווט לדף צ'אט עם המשתמש הספציפי
    navigate(`/chat/${user.id}`, { 
      state: { 
        userName: user.name, 
        userImage: user.image,
        fromShelterId: id,
      } 
    });
  };

  const handleLeaveShelter = async () => {
    if (id === 'dummy1') {
      setIsInShelter(false);
      setPeopleCount(prev => Math.max(0, prev - 1));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('עליך להתחבר כדי לצאת מהמקלט');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5050/api/shelters/${id}/leave`, {
        method: 'POST',
        headers: {
          'x-auth-token': token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsInShelter(false);
        setPeopleCount(data.peopleCount);
      } else {
        alert('שגיאה ביציאה מהמקלט');
      }
    } catch (error) {
      console.error('Error leaving shelter:', error);
      alert('שגיאה ביציאה מהמקלט');
    }
  };

  if (loading) {
    return <div style={{textAlign: 'center', marginTop: 40}}>טוען...</div>;
  }

  const currentShelter =
    id === 'dummy1'
      ? dummyShelter
      : shelterInfo || { name: 'מקלט', address: '' };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #0001', position: 'relative', minHeight: '80vh' }}>
      <h2 style={{textAlign: 'center', marginTop: 0}}>
        ברוכים הבאים
      </h2>
      <p style={{textAlign: 'center', color: '#666'}}>{currentShelter.address}</p>
      
      {/* כמות אנשים במקלט */}
      <div style={{
        background: '#e8f5e9',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: 600,
        color: '#2e7d32'
      }}>
        👥 {peopleCount} אנשים במקלט
      </div>

      {/* הצגת העדפה נוכחית */}
      <div style={{
        background: '#f0f8ff',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '16px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#555'
      }}>
        העדפה נוכחית: {
          userPreference === 'women' ? 'נשים' :
          userPreference === 'men' ? 'גברים' :
          'שניהם'
        }
      </div>

      <h3 style={{marginTop: 32, marginBottom: 16}}>אנשים במקלט:</h3>
      <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
        {filteredUsers.length === 0 ? (
          <div style={{textAlign: 'center', color: '#666', padding: '20px'}}>
            <p>אין אנשים במקלט שמתאימים להעדפות שלך</p>
            <p>נסה לשנות את ההעדפות בפרופיל</p>
          </div>
        ) : (
          filteredUsers.map(user => (
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
              <div style={{display: 'flex', gap: 8}}>
                <button 
                  onClick={() => handleLike(user.id)}
                  style={{
                    background: likedUsers.has(user.id.toString()) ? '#ff6b6b' : '#f0f0f0',
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
                  title={likedUsers.has(user.id.toString()) ? 'ביטול לייק' : 'לייק'}
                >
                  {likedUsers.has(user.id.toString()) ? '❤️' : '🤍'}
                </button>
                <button 
                  onClick={() => handleMessage(user)}
                  style={{
                    background: '#4ecdc4',
                    border: 'none',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: 'white',
                    transition: 'all 0.2s ease'
                  }}
                  title="שלח הודעה"
                >
                  💬
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ShelterPage; 