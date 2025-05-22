'use strict';

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with environment variables
// The service account credentials should be stored in environment variables
// for security reasons
const initializeFirebaseAdmin = () => {
  // Check if Firebase Admin SDK is already initialized
  if (admin.apps.length === 0) {
    try {
      // Initialize with service account credentials from environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  return admin;
};

module.exports = {
  admin: initializeFirebaseAdmin(),
  auth: initializeFirebaseAdmin().auth(),
};
