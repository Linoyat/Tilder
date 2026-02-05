const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // המשתמש שמקבל את ההתראה
  type: { 
    type: String, 
    enum: ['like', 'message', 'user_entered_shelter'], 
    required: true 
  },
  fromUserId: { type: String, required: true }, // המשתמש שגרם להתראה
  fromUserName: { type: String, required: true },
  fromUserImage: { type: String, default: '' },
  shelterId: { type: String, default: null }, // למקרה של כניסה למקלט
  shelterName: { type: String, default: null },
  message: { type: String, default: null }, // למקרה של הודעה
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// אינדקס למציאת התראות של משתמש מסוים
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

