const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5050;

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
const mongoURI = 'mongodb+srv://linoyt456:nWxpYunzKDd6qUjW@cluster0.liiatwi.mongodb.net/tilder?';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas!'))
.catch((err) => console.error('Error connecting to MongoDB:', err));

// route לבדיקה שהשרת רץ ו־CORS תקין
app.get('/api/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// route להרשמה
app.post('/api/register', async (req, res) => {
  try {
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

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { favorites },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found' });
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

// מאזין לפורט
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
