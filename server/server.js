require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Shelter = require('./models/Shelter');
const Notification = require('./models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5050;

// Trust first proxy so req.ip is the real client IP (e.g. behind Heroku, Nginx)
app.set('trust proxy', 1);

// --- Israel-only access: server-side IP geolocation (do not trust URL or client) ---
const ISRAEL_COUNTRY_CODE = 'IL';
const GEO_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const geoCache = new Map(); // ip -> { countryCode, expires }

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || '';
}

function isLocalhost(ip) {
  if (!ip) return false;
  const normalized = ip.replace(/^::ffff:/i, '');
  return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}

async function getCountryCodeByIp(ip) {
  if (geoCache.has(ip)) {
    const entry = geoCache.get(ip);
    if (Date.now() < entry.expires) return entry.countryCode;
    geoCache.delete(ip);
  }
  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`;
    const res = await fetch(url, { timeout: 5000 });
    const data = await res.json();
    const countryCode = data?.countryCode || null;
    geoCache.set(ip, { countryCode, expires: Date.now() + GEO_CACHE_TTL_MS });
    return countryCode;
  } catch (err) {
    console.error('Geo lookup failed for IP', ip, err.message);
    return null;
  }
}

/**
 * Checks if the request is from Israel by IP geolocation.
 * @returns {{ allowed: boolean, reason?: string }} allowed true if from Israel (or localhost in dev); reason set for error message when not allowed
 */
async function checkIsraelAccess(req) {
  const ip = getClientIp(req);
  if (isLocalhost(ip)) {
    if (process.env.NODE_ENV === 'production') {
      return { allowed: false, reason: 'not_israel' };
    }
    return { allowed: true }; // allow localhost in development
  }
  const countryCode = await getCountryCodeByIp(ip);
  if (countryCode === ISRAEL_COUNTRY_CODE) return { allowed: true };
  if (countryCode == null) return { allowed: false, reason: 'geo_unavailable' };
  return { allowed: false, reason: 'not_israel' };
}

// הגדרות CORS מדויקות
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  credentials: true
}));

// תומך בגוף בקשות JSON
app.use(express.json());

// התחברות ל־MongoDB Atlas
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error('Mongo connection string missing. Set MONGO_URI in server/.env');
  process.exit(1);
}

// בדיקת טעינת משתני סביבה
console.log('Environment variables check:');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY.length);
  console.log('GEMINI_API_KEY starts with:', process.env.GEMINI_API_KEY.substring(0, 10) + '...');
}

mongoose.connect(mongoURI)
.then(() => console.log('Connected to MongoDB Atlas!'))
.catch((err) => {
  console.error('Error connecting to MongoDB:', err);
  console.log('אנא ודא שיש לך חיבור לאינטרנט וה-IP שלך מורשה ב-MongoDB Atlas');
});

// route לבדיקה שהשרת רץ ו־CORS תקין
app.get('/api/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// Shelters near user
app.get('/api/shelters', async (req, res) => {
  try {
    const { lat, lng, radius = 2.5 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }

    const shelters = await Shelter.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
          $maxDistance: Number(radius) * 1000,
        },
      },
    }).limit(100);

    // חישוב כמות אנשים לכל מקלט
    const sheltersWithCount = shelters.map(shelter => ({
      ...shelter.toObject(),
      peopleCount: shelter.currentUsers?.length || 0
    }));

    res.json(sheltersWithCount);
  } catch (error) {
    console.error('Error fetching shelters:', error);
    res.status(500).json({ message: 'שגיאה בשרת בעת שליפת מקלטים' });
  }
});

// @route   GET api/shelters/:id
// @desc    Get specific shelter details
// @access  Public
app.get('/api/shelters/:id', async (req, res) => {
  try {
    const shelter = await Shelter.findById(req.params.id);
    if (!shelter) {
      return res.status(404).json({ message: 'מקלט לא נמצא' });
    }
    
    const shelterData = {
      ...shelter.toObject(),
      peopleCount: shelter.currentUsers?.length || 0
    };
    
    res.json(shelterData);
  } catch (error) {
    console.error('Error fetching shelter:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

const ISRAEL_ACCESS_MESSAGES = {
  not_israel: 'השירות זמין רק למשתמשים המחוברים מישראל. אם את/ה בישראל, נסה/י שוב או וודא/י שלא משתמש/ת ב-VPN שמציג מיקום אחר.',
  geo_unavailable: 'לא ניתן לאמת את המיקום כרגע. נסה/י שוב בעוד כמה דקות.'
};

// route להרשמה
app.post('/api/register', async (req, res) => {
  try {
    const access = await checkIsraelAccess(req);
    if (!access.allowed) {
      const status = access.reason === 'geo_unavailable' ? 503 : 403;
      return res.status(status).json({
        message: ISRAEL_ACCESS_MESSAGES[access.reason] || ISRAEL_ACCESS_MESSAGES.not_israel
      });
    }

    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'אימייל כבר קיים במערכת' });
    }

    // Encrypt the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'המשתמש נרשם בהצלחה!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// Route for login
app.post('/api/login', async (req, res) => {
  try {
    const access = await checkIsraelAccess(req);
    if (!access.allowed) {
      const status = access.reason === 'geo_unavailable' ? 503 : 403;
      return res.status(status).json({
        message: ISRAEL_ACCESS_MESSAGES[access.reason] || ISRAEL_ACCESS_MESSAGES.not_israel
      });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'אימייל או סיסמה לא נכונים' });
    }

    // Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'אימייל או סיסמה לא נכונים' });
    }

    // User is authenticated, create JWT
    const payload = {
      user: {
        id: user.id,
      },
    };

    jwt.sign(
      payload,
      'your_jwt_secret', // In production, use an environment variable
      { expiresIn: '5h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, userName: user.fullName });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// Auth middleware to verify token
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, 'your_jwt_secret');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// @route   POST api/shelters/:id/enter
// @desc    User enters shelter (automatically exits previous shelter if exists)
// @access  Private
app.post('/api/shelters/:id/enter', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const newShelterId = req.params.id;
    
    // מצא את המשתמש כדי לראות אם הוא במקלט אחר
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // אם המשתמש במקלט אחר, הוצא אותו מהמקלט הקודם
    if (user.shelterId && user.shelterId !== newShelterId) {
      const oldShelter = await Shelter.findById(user.shelterId);
      if (oldShelter) {
        oldShelter.currentUsers = oldShelter.currentUsers.filter(
          id => id.toString() !== userId
        );
        await oldShelter.save();
      }
    }

    // מצא את המקלט החדש
    const newShelter = await Shelter.findById(newShelterId);
    if (!newShelter) {
      return res.status(404).json({ message: 'מקלט לא נמצא' });
    }

    // הוסף את המשתמש לרשימת האנשים במקלט החדש (אם עוד לא שם)
    const isNewEntry = !newShelter.currentUsers.includes(userId);
    if (isNewEntry) {
      newShelter.currentUsers.push(userId);
      await newShelter.save();

      // שלח התראות לכל המשתמשים שכבר במקלט (חוץ מהמשתמש שנכנס)
      const usersInShelter = newShelter.currentUsers.filter(id => id.toString() !== userId);
      if (usersInShelter.length > 0) {
        for (const otherUserId of usersInShelter) {
          await createNotification(
            otherUserId.toString(),
            'user_entered_shelter',
            userId,
            user.fullName,
            user.profileImage,
            newShelterId,
            newShelter.name
          );
        }
      }
    }

    // עדכן את shelterId של המשתמש
    await User.findByIdAndUpdate(userId, { shelterId: newShelterId });

    res.json({ 
      message: 'נכנסת למקלט בהצלחה',
      peopleCount: newShelter.currentUsers.length 
    });
  } catch (error) {
    console.error('Error entering shelter:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   POST api/shelters/:id/leave
// @desc    User leaves shelter
// @access  Private
app.post('/api/shelters/:id/leave', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const shelter = await Shelter.findById(req.params.id);
    
    if (!shelter) {
      return res.status(404).json({ message: 'מקלט לא נמצא' });
    }

    // הסר את המשתמש מרשימת האנשים במקלט
    shelter.currentUsers = shelter.currentUsers.filter(id => id.toString() !== userId);
    await shelter.save();

    // עדכן את shelterId של המשתמש
    await User.findByIdAndUpdate(userId, { shelterId: null });

    res.json({ 
      message: 'יצאת מהמקלט בהצלחה',
      peopleCount: shelter.currentUsers.length 
    });
  } catch (error) {
    console.error('Error leaving shelter:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   GET api/profile
// @desc    Get current user's profile
// @access  Private
app.get('/api/profile', auth, async (req, res) => {
  try {
    // req.user.id comes from the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profile
// @desc    Update user's profile
// @access  Private
app.put('/api/profile', auth, async (req, res) => {
  try {
    const { bio, profileImage, preference } = req.body;
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { bio, profileImage, preference },
      { new: true } // Return the updated document
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/favorites
// @desc    Get user's favorites
// @access  Private
app.get('/api/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user.favorites);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/favorites
// @desc    Update user's favorites
// @access  Private
app.put('/api/favorites', auth, async (req, res) => {
  try {
    const { favorites } = req.body;
    const userId = req.user.id;

    // קבל את המשתמש הנוכחי כדי לראות את הרשימה הישנה
    const currentUser = await User.findById(userId).select('-password');
    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const oldFavorites = currentUser.favorites || [];
    const newFavorites = favorites || [];

    // מצא לייקים חדשים (שנוספו)
    const newLikes = newFavorites.filter(fav => !oldFavorites.includes(fav));

    // עדכן את המועדפים
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { favorites },
      { new: true }
    ).select('-password');

    // שלח התראות לכל משתמש שקיבל לייק חדש
    if (newLikes.length > 0) {
      const currentUserData = await User.findById(userId);
      for (const likedUserId of newLikes) {
        const likedUser = await User.findById(likedUserId);
        if (likedUser) {
          await createNotification(
            likedUserId,
            'like',
            userId,
            currentUserData.fullName,
            currentUserData.profileImage
          );
        }
      }
    }

    res.json(updatedUser.favorites);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/chats
// @desc    Get user's chats
// @access  Private
app.get('/api/chats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user.chats);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/chats/:userId
// @desc    Get specific chat with user
// @access  Private
app.get('/api/chats/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const chat = user.chats.find(c => c.userId === req.params.userId);
    
    if (!chat) {
      // במקום 404, נחזיר צ'אט ריק
      return res.json({
        userId: req.params.userId,
        userName: 'משתמש',
        userImage: '',
        messages: []
      });
    }
    
    res.json(chat);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/chats/:userId
// @desc    Send message to user
// @access  Private
app.post('/api/chats/:userId', auth, async (req, res) => {
  try {
    const { message, userName, userImage } = req.body;
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    // מצא את המשתמש הנוכחי
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ msg: 'Current user not found' });
    }
    
    // מצא או צור צ'אט עם המשתמש המטרה
    let chat = currentUser.chats.find(c => c.userId === targetUserId);
    
    if (!chat) {
      // צור צ'אט חדש
      chat = {
        userId: targetUserId,
        userName: userName,
        userImage: userImage,
        messages: []
      };
      currentUser.chats.push(chat);
    }

    // הוסף הודעה
    chat.messages.push({
      sender: 'me',
      text: message,
      timestamp: new Date()
    });

    await currentUser.save();

    // נסה למצוא את המשתמש השני (אם הוא קיים)
    try {
      const targetUser = await User.findById(targetUserId);
      if (targetUser) {
        let targetChat = targetUser.chats.find(c => c.userId === currentUserId);
        
        if (!targetChat) {
          targetChat = {
            userId: currentUserId,
            userName: currentUser.fullName,
            userImage: currentUser.profileImage,
            messages: []
          };
          targetUser.chats.push(targetChat);
        }

        targetChat.messages.push({
          sender: 'other',
          text: message,
          timestamp: new Date()
        });

        await targetUser.save();

        // שלח התראה למשתמש שקיבל הודעה
        await createNotification(
          targetUserId,
          'message',
          currentUserId,
          currentUser.fullName,
          currentUser.profileImage,
          null,
          null,
          message
        );
      }
    } catch (targetUserError) {
      // אם המשתמש השני לא קיים (כמו במקרה של משתמשים דמה), זה בסדר
      console.log('Target user not found, continuing with current user only');
    }

    res.json(chat);
  } catch (err) {
    console.error('Error in POST /api/chats/:userId:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/chats/:userId
// @desc    Delete chat with specific user
// @access  Private
app.delete('/api/chats/:userId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    // מצא את המשתמש הנוכחי
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ msg: 'Current user not found' });
    }

    // הסר את הצ'אט מהרשימה
    currentUser.chats = currentUser.chats.filter(chat => chat.userId !== targetUserId);
    await currentUser.save();

    res.json({ msg: 'Chat deleted successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/chats/:userId:', err.message);
    res.status(500).send('Server Error');
  }
});

// ============================================
// NOTIFICATIONS API
// ============================================

// @route   GET api/notifications
// @desc    Get all notifications for current user
// @access  Private
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // רק 50 התראות אחרונות
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   GET api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({ userId, read: false });
    res.json({ count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      return res.status(404).json({ message: 'התראה לא נמצאה' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({ message: 'התראה סומנה כנקראה' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ message: 'כל ההתראות סומנו כנקראו' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      return res.status(404).json({ message: 'התראה לא נמצאה' });
    }
    
    await Notification.deleteOne({ _id: notificationId });
    res.json({ message: 'התראה נמחקה' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// @route   POST api/notifications/demo
// @desc    Create a demo notification (for testing)
// @access  Private
app.post('/api/notifications/demo', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.body;

    // קבל את המשתמש הנוכחי
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    // צור התראה דמו לפי הסוג
    let notification;
    switch (type) {
      case 'like':
        notification = await createNotification(
          userId,
          'like',
          userId, // נשלח לעצמו לדמו
          currentUser.fullName,
          currentUser.profileImage
        );
        break;
      case 'message':
        notification = await createNotification(
          userId,
          'message',
          userId,
          currentUser.fullName,
          currentUser.profileImage,
          null,
          null,
          'זוהי הודעה דמו להתראה!'
        );
        break;
      case 'user_entered_shelter':
        // מצא מקלט אקראי
        const shelters = await Shelter.find().limit(1);
        const shelter = shelters[0];
        notification = await createNotification(
          userId,
          'user_entered_shelter',
          userId,
          currentUser.fullName,
          currentUser.profileImage,
          shelter ? shelter._id.toString() : null,
          shelter ? shelter.name : 'מקלט דמו'
        );
        break;
      default:
        return res.status(400).json({ message: 'סוג התראה לא תקין' });
    }

    res.json({ message: 'התראה דמו נוצרה בהצלחה', notification });
  } catch (error) {
    console.error('Error creating demo notification:', error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});

// Helper function to create notification
async function createNotification(userId, type, fromUserId, fromUserName, fromUserImage, shelterId = null, shelterName = null, message = null) {
  try {
    const notification = new Notification({
      userId,
      type,
      fromUserId,
      fromUserName,
      fromUserImage,
      shelterId,
      shelterName,
      message
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// ============================================
// AI CHAT ASSISTANT API
// ============================================

// @route   POST api/ai/opening-line
// @desc    Get AI-generated opening line
// @access  Private
app.post('/api/ai/opening-line', auth, async (req, res) => {
  try {
    const { context } = req.body; //get the context from the user request

    if (!context || !context.trim()) { //validate the context
      return res.status(400).json({ message: 'נא לספק הקשר' });
    }

    console.log('Generating opening line for context:', context);
    const errors = [];

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim(); // get the gemini api key from the environment variables
    if (geminiApiKey && geminiApiKey.length > 0) { //if the gemini api key is valid
      try {
        console.log('Attempting to call Google Gemini API with gemini-2.5-flash...');
        // const promt to gimini
        const prompt = `You are a relationship counselor who helps the user write a funny and light-hearted opening sentence.

אני רוצה לכתוב משפט פתיחה. ההקשר הוא: ${context}
תן לי משפט פתיחה אחד מעולה, קצר (עד 20 מילים), מצחיק וקליל. תשובה בעברית בלבד.`;

        const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
        
        const response = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt, //send the prompt to the gemini api
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 150,
          }
        });


        // get the opening line from the response
        const openingLine = response.text?.trim(); 
        if (openingLine && openingLine.length > 10) {
          console.log('Successfully got opening line from Gemini:', openingLine);
          return res.json({ openingLine });
        } else {
          console.error('Gemini API returned empty or invalid response:', response);
          errors.push(`Gemini API: Empty or invalid response`);
        }
      } catch (geminiError) {
        errors.push(`Gemini API: ${geminiError.message}`);
        console.error('Gemini API error:', geminiError.message);
        console.error('Gemini API error details:', geminiError);
      }
    }

    // אם Gemini API נכשל, נחזיר שגיאה - ללא fallback
    console.error('All AI APIs failed. Errors:', errors);
    return res.status(503).json({ 
      message: 'שירות ה-AI לא זמין כרגע. נסה שוב בעוד כמה רגעים.',
      errors: errors
    });
  } catch (error) {
    console.error('Error generating opening line:', error);
    res.status(500).json({ message: 'שגיאה ביצירת משפט פתיחה' });
  }
});

// make a test connection to the gemini api
app.get('/api/ai/test-connection', auth, async (req, res) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
    
    const testResult = {
      hasApiKey: !!geminiApiKey,
      apiKeyLength: geminiApiKey ? geminiApiKey.length : 0,
      apiKeyPrefix: geminiApiKey ? geminiApiKey.substring(0, 10) + '...' : 'N/A',
      connectionStatus: 'unknown',
      error: null
    };

    if (!geminiApiKey || geminiApiKey.length === 0) {
      return res.json({
        ...testResult,
        connectionStatus: 'no_api_key',
        message: 'לא נמצא מפתח Google Gemini API. הוסיפי GEMINI_API_KEY לקובץ server/.env'
      });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
      
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'שלום',//Route בדיקת החיבור לג׳מיני
        generationConfig: {
          maxOutputTokens: 10,
        }
      });

      if (response.text) {
        testResult.connectionStatus = 'connected';
        testResult.message = 'חיבור ל-Google Gemini API הצליח! ✅';
      } else {
        testResult.connectionStatus = 'error';
        testResult.error = 'תשובה ריקה מ-API';
        testResult.message = 'שגיאה בחיבור ל-Google Gemini API';
      }
    } catch (fetchError) {
      testResult.connectionStatus = 'error';
      testResult.error = fetchError.message;
      testResult.message = 'שגיאה בחיבור ל-Google Gemini API';
    }

    res.json(testResult);
  } catch (error) {
    console.error('Error testing Gemini connection:', error);
    res.status(500).json({ 
      message: 'שגיאה בבדיקת החיבור',
      error: error.message 
    });
  }
});

// מאזין לפורט
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
