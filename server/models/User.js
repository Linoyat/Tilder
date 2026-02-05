const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  bio:       { type: String, default: 'אין עדיין ביו' },
  profileImage: { type: String, default: 'https://ui-avatars.com/api/?name=User&size=300&background=667eea&color=fff&bold=true' },
  shelterId: { type: String, default: null },
  preference: { type: String, enum: ['women', 'men', 'both'], default: 'both' }, // העדפה: נשים, גברים, או שניהם
  favorites: { type: [String], default: [] },
  chats: { type: [{
    userId: String,
    userName: String,
    userImage: String,
    messages: [{
      sender: String, // 'me' או 'other'
      text: String,
      timestamp: { type: Date, default: Date.now }
    }]
  }], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
