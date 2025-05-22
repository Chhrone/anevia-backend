'use strict';

const { auth } = require('../config/firebase');
const User = require('../models/user');

// Middleware to verify Firebase authentication token
const verifyToken = async (request, h) => {
  try {
    // Get the authorization header
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return h.response({
        error: true,
        message: 'Unauthorized: No token provided'
      }).code(401).takeover();
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return h.response({
        error: true,
        message: 'Unauthorized: Invalid token format'
      }).code(401).takeover();
    }
    
    try {
      // Verify the token with Firebase
      const decodedToken = await auth.verifyIdToken(token);
      
      // Add the user ID to the request for use in route handlers
      request.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        // Include other relevant user info from the token
        name: decodedToken.name,
        picture: decodedToken.picture
      };
      
      // Continue to the route handler
      return h.continue;
    } catch (error) {
      console.error('Error verifying token:', error);
      return h.response({
        error: true,
        message: 'Unauthorized: Invalid token'
      }).code(401).takeover();
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return h.response({
      error: true,
      message: 'Internal server error during authentication'
    }).code(500).takeover();
  }
};

module.exports = {
  verifyToken
};
