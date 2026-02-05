require('dotenv').config();
const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Shelter = require('../models/Shelter');

const { MONGO_URI, GOOGLE_PLACES_KEY } = process.env;

if (!MONGO_URI || !GOOGLE_PLACES_KEY) {
  console.error('Missing MONGO_URI or GOOGLE_PLACES_KEY in server/.env');
  process.exit(1);
}

const DELAY_MS = 200; // הפסקה בין בקשות כדי לא לחרוג ממגבלות Google

async function connectMongo() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
}

async function getPlaceDetails(placeId) {
  const url = 'https://maps.googleapis.com/maps/api/place/details/json';
  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_PLACES_KEY,
    fields: 'formatted_address,vicinity,name',
  });
  const res = await fetch(`${url}?${params.toString()}`);
  if (!res.ok) throw new Error(`Place Details failed: ${res.status}`);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(data.error_message || data.status);
  }
  const result = data.result || {};
  return (
    (result.formatted_address && result.formatted_address.trim()) ||
    (result.vicinity && result.vicinity.trim()) ||
    result.name ||
    ''
  );
}

async function run() {
  try {
    await connectMongo();

    const shelters = await Shelter.find({}).lean();
    console.log(`Found ${shelters.length} shelters to update.\n`);

    let updated = 0;
    let failed = 0;

    for (const shelter of shelters) {
      if (!shelter.placeId) {
        console.log(`Skip _id ${shelter._id}: no placeId`);
        failed++;
        continue;
      }

      try {
        const address = await getPlaceDetails(shelter.placeId);
        if (!address) {
          console.log(`No address for placeId ${shelter.placeId}, keeping current`);
          continue;
        }

        await Shelter.updateOne(
          { _id: shelter._id },
          { $set: { name: address, address } }
        );
        updated++;
        console.log(`Updated: ${address.substring(0, 50)}...`);
      } catch (err) {
        console.error(`Error for placeId ${shelter.placeId}:`, err.message);
        failed++;
      }

      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.connection.close();
  }
}

run();
