import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import useShelters from '../data/useShelters'; // או ../hooks/useShelters אם שמרת שם
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

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

const dummyShelter = {
  id: 'dummy1',
  name: 'מקלט דיזנגוף 100',
  address: 'דיזנגוף 100, תל אביב',
  lat: 32.0805,
  lng: 34.7748,
};

function MatchPage() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { shelters, loading: sheltersLoading, error: sheltersError } = useShelters();
  const navigate = useNavigate();

  // הוסף את המקלט הדמי לכל המקלטים
  const allShelters = [...shelters, dummyShelter];

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
          console.warn("שגיאה באיתור מיקום:", err.message);
          setError("לא הצלחנו לאתר את מיקומך – מוצגת מפה כללית");
          setLocation({ lat: 32.0853, lng: 34.7818 }); // תל אביב כ fallback
          setLoading(false);
        }
      );
    } else {
      setError("המכשיר שלך לא תומך בגישה למיקום");
      setLocation({ lat: 32.0853, lng: 34.7818 }); // ברירת מחדל
      setLoading(false);
    }
  }, []);

  return (
    <div>
      {loading && <p>טוען מיקום...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {location && (
        <MapContainer
          center={[location.lat, location.lng]}
          zoom={13}
          style={{ height: "calc(100vh - 60px)", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[location.lat, location.lng]}>
            <Popup>את כאן 🎯</Popup>
          </Marker>

          {/* סימון מקלטים */}
          {allShelters.map((shelter) => (
            <Marker key={shelter.id} position={[shelter.lat, shelter.lng]} icon={shelterIcon}>
              <Popup>
                <strong>{shelter.name}</strong><br />
                {shelter.address}
                <br />
                <button style={{ marginTop: '5px' }} onClick={() => navigate(`/shelter/${shelter.id}`)}>בחר/י מקלט</button>
              </Popup>
            </Marker>
          ))}

        </MapContainer>
      )}
    </div>
  );
}

export default MatchPage;
