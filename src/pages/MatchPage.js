import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config';

const dummyShelter = {
  id: 'dummy1',
  name: 'מקלט דיזנגוף 100',
  address: 'דיזנגוף 100, תל אביב',
  lat: 32.0805,
  lng: 34.7748,
};

// מיקום ברירת מחדל - תל אביב (מרכז העיר)
const DEFAULT_LOCATION = { lat: 32.0853, lng: 34.7818 };

// מיקום ברירת מחדל למשתמש - תל אביב, ליד המקלט הדמי (דיזנגוף)
const DEFAULT_USER_LOCATION = { lat: 32.0810, lng: 34.7750 }; // קרוב למקלט דיזנגוף 100

function MatchPage() {
  const [location, setLocation] = useState(DEFAULT_LOCATION); // תמיד תל אביב כברירת מחדל
  const [userLocation, setUserLocation] = useState(null); // מיקום המשתמש הנוכחי (אם זמין)
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shelters, setShelters] = useState([]);
  const [sheltersLoading, setSheltersLoading] = useState(false);
  const [sheltersError, setSheltersError] = useState(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const navigate = useNavigate();

  const [radiusKm] = useState(2.5); // רדיוס חיפוש ברירת מחדל

  // הוסף את המקלט הדמי לכל המקלטים
  const allShelters = [...shelters, dummyShelter];

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);

  // טעינת סקריפט Google Maps פעם אחת
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsGoogleLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[data-google-maps]');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsGoogleLoaded(true));
      return;
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.warn(
        'Google Maps API key is missing. Set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file.'
      );
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = 'true';
    script.onload = () => setIsGoogleLoaded(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // רדיוס כדור הארץ בק"מ
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const nearbyShelters = useMemo(() => {
    if (!location || !allShelters.length) return [];
    return allShelters.filter((shelter) => {
      const distance = getDistanceInKm(
        location.lat,
        location.lng,
        shelter.lat,
        shelter.lng
      );
      return distance <= radiusKm;
    });
  }, [allShelters, location, radiusKm]);

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();

    const fetchShelters = async () => {
      setSheltersLoading(true);
      setSheltersError(null);
      try {
        const params = new URLSearchParams({
          lat: location.lat,
          lng: location.lng,
          radius: radiusKm,
        });
        const response = await fetch(`${API_BASE_URL}/api/shelters?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Failed fetching shelters');
        }
        const data = await response.json();
        // המרת הנתונים מהשרת למבנה שהלקוח מצפה לו
        const formattedShelters = data.map(shelter => ({
          id: shelter._id || shelter.placeId,
          name: shelter.name || 'מקלט ללא שם',
          address: shelter.address || '',
          lat: shelter.location?.coordinates?.[1] || shelter.lat,
          lng: shelter.location?.coordinates?.[0] || shelter.lng,
        }));
        setShelters(formattedShelters);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setShelters([]);
          const isNetworkError =
            err instanceof TypeError && err.message === 'Failed to fetch';
          setSheltersError(
            isNetworkError
              ? 'לא ניתן להתחבר לשרת. ודא שהשרת רץ (בתיקיית server: npm start).'
              : 'לא ניתן לטעון מקלטים מהשרת – מוצגים נתוני ברירת מחדל'
          );
        }
      } finally {
        setSheltersLoading(false);
      }
    };

    fetchShelters();
    return () => controller.abort();
  }, [location, radiusKm]);

  // אתחול מפה של Google כאשר הסקריפט נטען ויש מיקום
  useEffect(() => {
    if (!isGoogleLoaded || !location || !mapRef.current) return;

    if (!googleMapRef.current) {
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: location.lat, lng: location.lng },
        zoom: 13,
        disableDefaultUI: false,
      });
    } else {
      googleMapRef.current.setCenter({ lat: location.lat, lng: location.lng });
    }
  }, [isGoogleLoaded, location]);

  // עדכון סימוני המקלטים והמיקום על המפה
  useEffect(() => {
    if (!googleMapRef.current || !(window.google && window.google.maps)) return;

    // נקה סימונים קודמים
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const sheltersToShow = nearbyShelters.length ? nearbyShelters : allShelters;

    sheltersToShow.forEach((shelter) => {
      if (!shelter.lat || !shelter.lng) return;

      const marker = new window.google.maps.Marker({
        position: { lat: shelter.lat, lng: shelter.lng },
        map: googleMapRef.current,
        title: shelter.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#f97316', // כתום חמים
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        navigate(`/shelter/${shelter.id}`);
      });

      markersRef.current.push(marker);
    });

    // סימון מיקום המשתמש (אם קיים)
    if (userLocation) {
      const userMarker = new window.google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map: googleMapRef.current,
        title: 'המיקום שלך',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#2563eb', // כחול
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      markersRef.current.push(userMarker);
    }
  }, [nearbyShelters, allShelters, userLocation, navigate]);

  useEffect(() => {
    // המפה תמיד תיפתח על תל אביב
    setLocation(DEFAULT_LOCATION);
    
    // מיקום ברירת מחדל למשתמש - תל אביב ליד מקלטים
    setUserLocation(DEFAULT_USER_LOCATION);
    setLoading(false);
    
    // ננסה לקבל את המיקום הנוכחי האמיתי של המשתמש (אם זמין)
    // אבל נשתמש במיקום ברירת מחדל בתל אביב במקום
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // לא נעדכן את userLocation - נשאיר את המיקום בתל אביב
          // אם תרצי להשתמש במיקום האמיתי, אפשר להסיר את ההערה:
          // setUserLocation({
          //   lat: position.coords.latitude,
          //   lng: position.coords.longitude,
          // });
        },
        (err) => {
          console.warn("שגיאה באיתור מיקום:", err.message);
          // לא נציג שגיאה כי המפה כבר פתוחה על תל אביב
        }
      );
    }
  }, []);

  return (
    <div>
      {(loading || sheltersLoading) && <p>טוען נתונים...</p>}
      {(error || sheltersError) && (
        <p style={{ color: 'red', textAlign: 'center' }}>{error || sheltersError}</p>
      )}

      {location && (
        <div
          style={{
            height: 'calc(100vh - 60px)',
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            ref={mapRef}
            style={{ height: '100%', width: '100%' }}
          />

          {!nearbyShelters.length && (
            <div
              style={{
                position: 'absolute',
                top: 70,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255,255,255,0.95)',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                zIndex: 1000,
              }}
            >
              <p style={{ margin: 0 }}>
                לא נמצאו מקלטים בטווח {radiusKm} ק&quot;מ – מוצגים כל המקלטים.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchPage;
