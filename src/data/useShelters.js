import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/592/query?where=1%3D1&outFields=*&f=json';

function useShelters() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchShelters = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();

        const parsedShelters = data.features.map((feature) => ({
          id: feature.attributes.OBJECTID,
          name: feature.attributes.שם_מקלט || 'מקלט ללא שם',
          address: feature.attributes.כתובת || '',
          lat: feature.geometry.y,
          lng: feature.geometry.x,
        }));

        setShelters(parsedShelters);
        setLoading(false);
      } catch (err) {
        setError('אירעה שגיאה בעת טעינת המקלטים'); 
        setLoading(false);
      }
    };

    fetchShelters();
  }, []);

  useEffect(() => {
    if (shelters.length) {
      console.log('Shelters:', shelters);
    }
  }, [shelters]);

  return { shelters, loading, error };
}

export default useShelters;

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const radiusKm = 2; // טווח ק"מ
