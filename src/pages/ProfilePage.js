import React from 'react';
import '../styles/ProfilePage.css'; // Using a dedicated CSS file

function ProfilePage() {
  // Mock user data - in a real app, this would come from state or props
  const user = {
    fullName: 'שירה שטיינבוך',
    email: 'Linoyt456@gmail.com',
    age: 36,
    bio: '😍 אוהבת שקיעות, במיוחד בשפע יששכר. אין קליטה לוואטסאפ, אבל אולי אליך יש',
    profileImage: 'https://tse4.mm.bing.net/th?id=OIP.XYhLdebJ7-qrS0AQbQZklwHaE8&pid=Api'
  };

  return (
    <div className="profile-page-container">
      <div className="profile-card">
        <div className="profile-header">
          <img src={user.profileImage} alt="Profile" className="profile-image" />
          <h1 className="profile-name">{user.fullName}</h1>
          <p className="profile-age">{user.age} | {user.email}</p>
        </div>
        <div className="profile-body">
          <h2 className="section-title">קצת עליי</h2>
          <p className="profile-bio">{user.bio}</p>
        </div>
        <div className="profile-actions">
          <button className="edit-profile-btn">עריכת פרופיל</button>
          <button className="settings-btn">הגדרות</button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage; 