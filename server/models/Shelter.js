const mongoose = require('mongoose');
// Shelter Schema
const shelterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String, default: '' },
    placeId: { type: String, unique: true, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    currentUsers: { type: [String], default: [] }, // מערך של user IDs שנמצאים כרגע במקלט
    peopleCount: { type: Number, default: 0 }, // כמות אנשים במקלט (חישוב אוטומטי)
  },
  { timestamps: true }
);

shelterSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Shelter', shelterSchema);

