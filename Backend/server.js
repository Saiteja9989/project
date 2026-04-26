const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
// Import route handlers
const search = require('./routes/livesearch');
const netraid = require('./routes/netraid');
const feedback = require('./routes/feedback');
const profile = require('./routes/dashboard');
const subattendance = require('./routes/sub_attendance');
const timetable = require('./routes/timetable');
const internalexam = require('./routes/internalres');
const externalexam = require('./routes/externalres');
const netraqr = require('./routes/gethallticketnumfromnetraid');
const fetchqr = require('./routes/fetchqr');
const browserlogin = require('./routes/puppeteerlogin');
require('./models/refreshToken'); // Register RefreshToken model
// const getSubjects = require('./routes/getSemSubjects');

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://spectra-beta.vercel.app',
  'https://spectra.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Allow all localhost and local network origins in development
    if (/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(bodyParser.json());

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

app.get('/', (req, res) => {
  res.send('Backend uploaded..');
});


app.use('/api', search);
app.use('/api', netraid);
app.use('/api', feedback);
app.use('/api', profile);
app.use('/api', subattendance);
app.use('/api', timetable);
app.use('/api', internalexam);
app.use('/api', externalexam);
app.use('/api', netraqr);
app.use('/api', fetchqr);
app.use('/api', browserlogin);
// app.use('/api', getSubjects);

const db = process.env.CONNECTION;
mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.error('MongoDB connection error:', err));


app.listen(5000, () => console.log(`Server started on port 5000`));
