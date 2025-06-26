import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import shelters from '../data/shelters.js'; // ייבוא המקלטים

// Fix for default icon not showing in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icon for shelters
const shelterIcon = new L.DivIcon({
  html: `<span style="font-size: 24px;">🛡️</span>`,
  className: 'shelter-map-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24]
});

function MatchPage() {
  const [location, setLocation] = useState(null);     // מיקום המשתמש
  const [error, setError] = useState(null);            // הודעת שגיאה אם קיימת
  const [loading, setLoading] = useState(true);        // בודק אם עדיין טוען

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoading(false);
        },
        (err) => {
          setError("לא ניתן לקבל מיקום: " + err.message);
          setLoading(false);
        }
      );
    } else {
      setError("המכשיר שלך לא תומך בגישה למיקום");
      setLoading(false);
    }
  }, []);

  return (
    <div style={{ height: '100vh' }}>
      {loading && <p>טוען מיקום...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {location && (
        <MapContainer center={[location.lat, location.lng]} zoom={13} style={{ height: "100vh", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker position={[location.lat, location.lng]}>
          <Popup>את פה! 🎉</Popup>
        </Marker>

        {/* Display shelter markers */}
        {shelters.map(shelter => (
          <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={shelterIcon}>
            <Popup>
              <strong>{shelter.name}</strong><br />
              {shelter.address}
              <br />
              <button style={{marginTop: '5px'}}>בחר/י מקלט</button>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
      
      
      )}
    </div>
  );
}

export default MatchPage;
