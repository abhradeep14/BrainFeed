const express = require('express');
const session = require('express-session');
const firebase = require('./firebase');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const admin = require('firebase-admin'); // For Google authentication

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Firebase
const serviceAccount = require('path/to/your-service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Express app setup
app.use(session({
  secret: 'your_secret_key', // Replace with a secure string
  resave: false,
  saveUninitialized: false,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('<h1>Welcome!</h1>');
});

// Login routes for students and professors (combined)
app.get('/login', (req, res) => {
  const userType = req.query.type; // Get user type from query parameter
  if (userType !== 'student' && userType !== 'professor') {
    return res.status(400).send('Invalid user type.');
  }
  res.sendFile(`${__dirname}/${userType}_login.html`); // Serve appropriate login page
});

app.post('/login', async (req, res) => {
  const { email, password, userType } = req.body;

  try {
    // Firebase authentication
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Check if user type matches
    const userDoc = await firebase.db.collection(userType + 's').doc(user.uid).get();
    if (!userDoc.exists) {
      return res.status(400).send('Invalid email or password.');
    }

    // Create session and redirect to dashboard
    req.session[userType] = {
      id: user.uid,
      email: user.email,
    };
    res.redirect(`/${userType}_dashboard`);
  } catch (error) {
    console.error(error);
    res.status(400).send('Invalid email or password.');
  }
});

// Google authentication route
app.get('/auth/google', async (req, res) => {
  const userType = req.query.type; // Get user type from query parameter

  // Generate Google sign-in URL
  const provider = new admin.auth.GoogleAuthProvider();
  const signInUrl = await admin.auth().generateSignInWithEmailLink(
    req.body.email,
    {
      url: `http://localhost:${PORT}/auth/google/callback?type=${userType}`, // Callback URL
      provider: provider,
    }
  );

  // Redirect to Google sign-in page
  res.redirect(signInUrl);
});

// Google authentication callback route
app.get('/auth/google/callback', async (req, res) => {
  const userType = req.query.type;

  try {
    // Complete Google sign-in
    const result = await admin.auth().signInWithEmailLink(req.body.email, req.url);
    const user = result.user;

    // Check if user type matches
    const userDoc = await firebase.db.collection(userType + 's').doc(user.uid).get();
    if (!userDoc.exists) {
      return res.status(400).send('Invalid user type.');
    }

    // Create session and redirect to dashboard
    req.session[userType] = {
      id: user.uid,
      email: user.email,
    };
    res.redirect(`/${userType}_dashboard`);
  } catch (error) {
    console.error(error);
    res.status(400).send('Google authentication failed.');
  }
});

// Dashboard routes (protected)
app.get('/student_dashboard', (req, res) => {
  if (!req.session.student) {
    return res.status(401).send('Unauthorized');
  }
  res.send('Student Dashboard');
});

app.get('/professor_dashboard', (req, res) => {
  if (!req.session.professor) {
    return res.status(401).send('Unauthorized');
  }
  res.send('Professor Dashboard');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});