import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

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
        navigate('/profile'); // אם אין טוקן – שולח להתחברות
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

  if (!user) {
    return <div>טוען פרופיל...</div>;
  }

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-header">
          <img src={user.profileImage} alt="Profile" className="profile-image" />
          <h1 className="profile-name">{user.fullName}</h1>
          <p className="profile-age">
            {user.age ? `${user.age} | ` : ''}{user.email}
          </p>
        </div>

        <div className="profile-body">
          <h2 className="section-title">קצת עליי</h2>
          
          {isEditing ? (
            <textarea
              className="profile-bio-edit"
              value={editedBio}
              onChange={(e) => setEditedBio(e.target.value)}
            />
          ) : (
            <>
              <p className="profile-bio">{user.bio}</p>
              <h2 className="section-title">העדפות</h2>
              <p className="profile-preference">
                אני מתעניין ב: {
                  user.preference === 'women' ? 'נשים' :
                  user.preference === 'men' ? 'גברים' :
                  'שניהם'
                }
              </p>
            </>
          )}

          {isEditing && (
            <>
              <h2 className="section-title">תמונת פרופיל (URL)</h2>
              <input
                type="text"
                className="profile-image-edit"
                value={editedProfileImage}
                onChange={(e) => setEditedProfileImage(e.target.value)}
              />

              <h2 className="section-title">גיל</h2>
              <input
                type="number"
                className="profile-age-edit"
                value={editedAge}
                onChange={(e) => setEditedAge(e.target.value)}
              />

              <h2 className="section-title">אני מתעניין ב...</h2>
              <div className="preference-options">
                <label className="preference-option">
                  <input
                    type="radio"
                    name="preference"
                    value="women"
                    checked={editedPreference === 'women'}
                    onChange={(e) => setEditedPreference(e.target.value)}
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
                  />
                  <span>שניהם</span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="profile-actions">
          {isEditing ? (
            <>
              <button onClick={handleSaveClick} className="save-btn">שמור</button>
              <button onClick={handleCancelClick} className="cancel-btn">ביטול</button>
            </>
          ) : (
            <button onClick={handleEditClick} className="edit-profile-btn">עריכת פרופיל</button>
          )}
          <button className="settings-btn">הגדרות</button>
        </div>
      </div>
            <BottomNav active="match" />

    </div>
  );
}

export default ProfilePage;
