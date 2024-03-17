const firebase = require('firebase-admin');

const serviceAccount = require('path/to/your-service-account-key.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});

const db = firebase.firestore();

module.exports = { db };