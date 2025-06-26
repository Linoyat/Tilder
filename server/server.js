const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5050;

// הגדרות CORS מדויקות
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
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

    const newUser = new User({ fullName, email, password });
    await newUser.save();

    res.status(201).json({ message: 'המשתמש נרשם בהצלחה!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'שגיאה בשרת' });
  }
});


// מאזין לפורט
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
