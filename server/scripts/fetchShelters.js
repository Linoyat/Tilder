require('dotenv').config();
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Shelter = require('../models/Shelter');

const { MONGO_URI, GOOGLE_PLACES_KEY } = process.env;

if (!MONGO_URI || !GOOGLE_PLACES_KEY) {
  console.error('Missing MONGO_URI or GOOGLE_PLACES_KEY in server/.env');
  process.exit(1);
}

const CITY_CENTER = { lat: 32.0853, lng: 34.7818 }; // תל אביב כברירת מחדל
const RADIUS_METERS = 5000; // 5km

// ננסה כמה חיפושים שונים
const SEARCH_QUERIES = [
  'מקלט ציבורי תל אביב',
  'shelter tel aviv',
  'מקלט תל אביב',
  'bomb shelter tel aviv',
];

async function connectMongo() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
}

async function fetchPlacesByText(query, nextPageToken) {
  // נשתמש ב-Text Search במקום Nearby Search
  const baseUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const params = new URLSearchParams({
    query: query,
    location: `${CITY_CENTER.lat},${CITY_CENTER.lng}`,
    radius: RADIUS_METERS.toString(),
    key: GOOGLE_PLACES_KEY,
  });
  if (nextPageToken) {
    params.append('pagetoken', nextPageToken);
  }

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch Google Places: ${res.status}`);
  return res.json();
}

const PLACE_DETAILS_DELAY_MS = 250;

/** מחזיר כתובת מדויקת מ-Place Details (למשל רחוב + מספר), או null אם נכשל */
async function getPlaceDetailsAddress(placeId) {
  const url = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_KEY,
    fields: 'formatted_address,vicinity,name',
  });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 'OK' || !data.result) return null;
  const r = data.result;
  const address =
    (r.formatted_address && r.formatted_address.trim()) ||
    (r.vicinity && r.vicinity.trim()) ||
    r.name ||
    '';
  return address || null;
}

/** בודק אם זו כתובת "מדויקת" (לא רק עיר/אזור כמו "Tel Aviv-Yafo, Israel") */
function isPreciseAddress(address) {
  if (!address || address.length < 15) return false;
  // אם יש רק "Tel Aviv-Yafo" או "Israel" בלי רחוב – לא מדויק
  const lower = address.toLowerCase();
  if (lower === 'tel aviv-yafo, israel' || lower === 'tel aviv-yafo') return false;
  if (/^tel aviv[^,]*,\s*israel$/i.test(address.trim())) return false;
  return true;
}

async function saveShelters(results) {
  for (const place of results) {
    const fallbackAddress =
      (place.formatted_address && place.formatted_address.trim()) ||
      (place.vicinity && place.vicinity.trim()) ||
      place.name ||
      '';

    // תמיד מנסים Place Details – שם לרוב מופיעה כתובת מדויקת (רחוב + מספר)
    let preciseAddress = null;
    try {
      preciseAddress = await getPlaceDetailsAddress(place.place_id);
    } catch (err) {
      console.warn(`Place Details failed for ${place.place_id}:`, err.message);
    }
    await new Promise((r) => setTimeout(r, PLACE_DETAILS_DELAY_MS));

    if (!preciseAddress || !isPreciseAddress(preciseAddress)) {
      preciseAddress = fallbackAddress || place.name || 'מקלט';
    }

    const doc = {
      name: preciseAddress,
      address: preciseAddress,
      placeId: place.place_id,
      location: {
        type: 'Point',
        coordinates: [place.geometry.location.lng, place.geometry.location.lat],
      },
    };

    await Shelter.findOneAndUpdate(
      { placeId: doc.placeId },
      doc,
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
}

async function run() {
  try {
    await connectMongo();

    let totalSaved = 0;
    const allPlaceIds = new Set(); // למניעת כפילויות בין חיפושים שונים

    for (const query of SEARCH_QUERIES) {
      console.log(`\nSearching for: "${query}"`);
      let nextPageToken = null;
      
      do {
        const data = await fetchPlacesByText(query, nextPageToken);
        console.log(`Google Places API response status: ${data.status}`);
        if (data.error_message) {
          console.error(`Google Places API error: ${data.error_message}`);
          break;
        }
        if (data.results?.length) {
          await saveShelters(data.results);
          data.results.forEach(r => allPlaceIds.add(r.place_id));
          totalSaved += data.results.length;
          console.log(`Processed ${data.results.length} shelters (total: ${totalSaved})`);
        } else {
          console.log('No results found for this query');
        }
        nextPageToken = data.next_page_token;
        if (nextPageToken) {
          console.log('Waiting for next page token...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } while (nextPageToken);
    }

    console.log(`\nFinished fetching shelters. Total saved: ${totalSaved}`);
  } catch (err) {
    console.error('Error in run():', err);
  } finally {
    mongoose.connection.close();
  }
}

run();

