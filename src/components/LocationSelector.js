// src/components/LocationSelector.jsx
import React, { useState } from 'react';

/**
 * props.onLocationSelect({ lat, lng })
 * ייקרא ברגע שיש קואורדינטות.
 */
function LocationSelector({ onLocationSelect }) {
  const [address, setAddress] = useState('');
  const [status, setStatus]  = useState('');

  /** גיאוקוד ל-Nominatim (OpenStreetMap) */
  const geocodeAddress = async () => {
    if (!address.trim()) return;
    setStatus('מחפש כתובת…');
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
      const res  = await fetch(url, { headers: { 'User-Agent': 'tilder-app/1.0' }});
      const data = await res.json();
      if (!data.length) throw new Error('לא נמצאה כתובת.');
      onLocationSelect({ lat: +data[0].lat, lng: +data[0].lon });
      setStatus('');
    } catch (err) {
      setStatus(err.message);
    }
  };

  /** קבלת מיקום נוכחי */
  const useCurrentPosition = () => {
    if (!('geolocation' in navigator)) {
      setStatus('הדפדפן לא תומך במיקום.');
      return;
    }
    setStatus('מבקש מיקום…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        onLocationSelect({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus('');
      },
      err => setStatus('שגיאה: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <input
        type="text"
        placeholder="הקלד כתובת (למשל: דיזנגוף 100, תל-אביב)…"
        value={address}
        onChange={e => setAddress(e.target.value)}
        style={{ width: '70%', padding: '8px' }}
      />
      <button onClick={geocodeAddress} style={{ marginInlineStart: 8 }}>🔍 חפש</button>
      <span style={{ marginInline: 10 }}>או</span>
      <button onClick={useCurrentPosition}>📡 השתמש במיקום הנוכחי</button>
      {status && <p style={{ color: 'red' }}>{status}</p>}
    </div>
  );
}

export default LocationSelector;
