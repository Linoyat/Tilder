import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ProfilePage.css';


function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [editedProfileImage, setEditedProfileImage] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedPreference, setEditedPreference] = useState('both');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:5050/api/profile', {
          headers: {
            'x-auth-token': token,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching profile:', error);
        localStorage.removeItem('token');
        navigate('/profile');
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // כשה-user נטען → נעדכן את השדות העריכים
  useEffect(() => {
    if (user) {
      setEditedBio(user.bio || '');
      setEditedProfileImage(user.profileImage || '');
      setEditedAge(user.age || '');
      setEditedPreference(user.preference || 'both');
    }
  }, [user]);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5050/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({
          bio: editedBio,
          profileImage: editedProfileImage,
          age: editedAge,
          preference: editedPreference
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedBio(user.bio || '');
    setEditedProfileImage(user.profileImage || '');
    setEditedAge(user.age || '');
    setEditedPreference(user.preference || 'both');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  };

  const sendDemoNotification = async (type) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('עליך להתחבר כדי לשלוח התראה דמו');
      return;
    }

    try {
      const response = await fetch('http://localhost:5050/api/notifications/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        alert('התראה דמו נשלחה בהצלחה! בדוק את פעמון ההתראות למעלה.');
        // רענון אוטומטי של הדף כדי לראות את ההתראה החדשה
        window.location.reload();
      } else {
        alert('שגיאה בשליחת התראה דמו');
      }
    } catch (error) {
      console.error('Error sending demo notification:', error);
      alert('שגיאה בשליחת התראה דמו');
    }
  };

  if (!user) {
    return (
      <div className="profile-page-container">
        <div className="profile-loading">טוען פרופיל...</div>
      </div>
    );
  }

  return (
    <div className="profile-page-container">
      <header className="profile-header-actions">
        {user.shelterId ? (
          <button
            type="button"
            className="profile-back-shelter"
            onClick={() => navigate(`/shelter/${user.shelterId}`)}
            title="חזרה למקלט"
            aria-label="חזרה למקלט"
          >
            ←
          </button>
        ) : (
          <span />
        )}
      </header>

      <main className="profile-card">
        <section className="profile-hero" aria-label="פרטי משתמש">
          <div className="profile-image-wrap">
            <img
              src={user.profileImage || 'https://via.placeholder.com/112'}
              alt=""
              className="profile-image"
            />
          </div>
          <h1 className="profile-name">{user.fullName}</h1>
          <p className="profile-meta">
            {user.age ? `${user.age} • ` : ''}{user.email}
          </p>
        </section>

        <div className="profile-body">
          <section className="profile-section" aria-labelledby="bio-heading">
            <h2 id="bio-heading" className="section-title">קצת עליי</h2>
            {isEditing ? (
              <textarea
                className="profile-bio-edit"
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                placeholder="ספר/י על עצמך..."
                aria-label="תיאור אישי"
              />
            ) : (
              <p className="profile-bio">{user.bio || 'עדיין לא נוסף תיאור.'}</p>
            )}
          </section>

          {!isEditing && (
            <section className="profile-section" aria-labelledby="pref-heading">
              <h2 id="pref-heading" className="section-title">העדפות</h2>
              <p className="profile-preference">
                {user.preference === 'women' ? 'נשים' :
                 user.preference === 'men' ? 'גברים' : 'שניהם'}
              </p>
            </section>
          )}

          {isEditing && (
            <>
              <section className="profile-section">
                <label className="section-title" htmlFor="profile-image-url">תמונת פרופיל (כתובת)</label>
                <input
                  id="profile-image-url"
                  type="url"
                  className="profile-image-edit"
                  value={editedProfileImage}
                  onChange={(e) => setEditedProfileImage(e.target.value)}
                  placeholder="https://..."
                  aria-label="כתובת תמונת פרופיל"
                />
              </section>
              <section className="profile-section">
                <label className="section-title" htmlFor="profile-age">גיל</label>
                <input
                  id="profile-age"
                  type="number"
                  className="profile-age-edit"
                  value={editedAge}
                  onChange={(e) => setEditedAge(e.target.value)}
                  min="18"
                  max="120"
                  aria-label="גיל"
                />
              </section>
              <section className="profile-section" aria-labelledby="pref-edit-heading">
                <h2 id="pref-edit-heading" className="section-title">אני מתעניין/ת ב...</h2>
                <div className="preference-options" role="radiogroup" aria-labelledby="pref-edit-heading">
                  <label className="preference-option">
                    <input
                      type="radio"
                      name="preference"
                      value="women"
                      checked={editedPreference === 'women'}
                      onChange={(e) => setEditedPreference(e.target.value)}
                      aria-label="נשים"
                    />
                    <span>נשים</span>
                  </label>
                  <label className="preference-option">
                    <input
                      type="radio"
                      name="preference"
                      value="men"
                      checked={editedPreference === 'men'}
                      onChange={(e) => setEditedPreference(e.target.value)}
                      aria-label="גברים"
                    />
                    <span>גברים</span>
                  </label>
                  <label className="preference-option">
                    <input
                      type="radio"
                      name="preference"
                      value="both"
                      checked={editedPreference === 'both'}
                      onChange={(e) => setEditedPreference(e.target.value)}
                      aria-label="שניהם"
                    />
                    <span>שניהם</span>
                  </label>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button type="button" onClick={handleSaveClick} className="save-btn">שמור</button>
              <button type="button" onClick={handleCancelClick} className="cancel-btn">ביטול</button>
            </>
          ) : (
            <>
              <button type="button" onClick={handleEditClick} className="edit-profile-btn">עריכת פרופיל</button>
              <button type="button" className="settings-btn">הגדרות</button>
            </>
          )}
        </div>

        <div className="profile-logout-wrap">
          <button type="button" onClick={handleLogout} className="profile-logout-btn" aria-label="התנתקות">
            התנתקות
          </button>
        </div>

        <div className="profile-demo-section">
          <h3>דמו התראות (לפיתוח)</h3>
          <div className="profile-demo-buttons">
            <button type="button" onClick={() => sendDemoNotification('like')}>❤️ לייק</button>
            <button type="button" onClick={() => sendDemoNotification('message')}>💬 הודעה</button>
            <button type="button" onClick={() => sendDemoNotification('user_entered_shelter')}>👤 מקלט</button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
