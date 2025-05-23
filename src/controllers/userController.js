'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { auth } = require('../config/firebase');
const User = require('../models/user');

// Convert fs functions to promise-based
const fsPromises = fs.promises;
const writeFile = fsPromises.writeFile;
const mkdir = fsPromises.mkdir;

// Verify Firebase token and sync user data with PostgreSQL
exports.verifyToken = async (request, h) => {
  try {
    const { token } = request.payload;

    if (!token) {
      return h.response({
        error: true,
        message: 'No token provided'
      }).code(400);
    }

    // Verify the token with Firebase
    const decodedToken = await auth.verifyIdToken(token);
    const { uid, email, name, picture } = decodedToken;

    try {
      // Check if user already exists in our database
      let user = await User.findByUid(uid);

      if (!user) {
        // User doesn't exist in our database, create a new user
        try {
          // Verify that the user exists in Firebase
          await auth.getUser(uid);

          // Generate a username based on email or name
          const username = name || email.split('@')[0];

          // Check if username already exists and make it unique if needed
          let uniqueUsername = username;
          let userWithSameUsername = await User.findByUsername(uniqueUsername);
          let counter = 1;

          while (userWithSameUsername) {
            uniqueUsername = `${username}${counter}`;
            userWithSameUsername = await User.findByUsername(uniqueUsername);
            counter++;
          }

          // Determine photo URL
          // If user signed in with Google, use their Google profile picture
          // Otherwise, use default profile picture
          const photoUrl = picture ? picture : '/profiles/default-profile.jpg';

          // Create new user in our database
          user = await User.create({
            uid,
            username: uniqueUsername,
            email,
            password: null, // Password is null for OAuth providers
            photoUrl,
            birthdate: null,
            createdAt: new Date()
          });

          return h.response({
            error: false,
            message: 'User authenticated and profile created',
            user: {
              uid: user.uid,
              username: user.username,
              email: user.email,
              photoUrl: user.photoUrl,
              birthdate: user.birthdate,
              createdAt: user.createdAt
            }
          }).code(201);
        } catch (createError) {
          // Check if this is a duplicate key error
          if (createError.message.includes('duplicate key value') ||
              createError.code === '23505') { // PostgreSQL unique violation code

            // Try to fetch the user again - it might have been created in a concurrent request
            user = await User.findByUid(uid);

            if (user) {
              // User was created by another concurrent request, return the existing user
              return h.response({
                error: false,
                message: 'User authenticated',
                user: {
                  uid: user.uid,
                  username: user.username,
                  email: user.email,
                  photoUrl: user.photoUrl,
                  birthdate: user.birthdate,
                  createdAt: user.createdAt
                }
              }).code(200);
            } else {
              // This is unexpected - we got a duplicate key error but can't find the user
              throw createError;
            }
          } else {
            // Some other error occurred during user creation
            throw createError;
          }
        }
      }

      // User exists, return their profile
      return h.response({
        error: false,
        message: 'User authenticated',
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          photoUrl: user.photoUrl,
          birthdate: user.birthdate,
          createdAt: user.createdAt
        }
      }).code(200);
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return h.response({
        error: true,
        message: 'Authentication failed due to database error',
        details: dbError.message
      }).code(500);
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return h.response({
      error: true,
      message: 'Authentication failed',
      details: error.message
    }).code(401);
  }
};

// Get user profile
exports.getUserProfile = async (request, h) => {
  try {
    const { uid } = request.params;

    // Check if the requesting user is authorized to view this profile
    // Only allow users to view their own profile
    if (request.user.uid !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only view your own profile'
      }).code(403);
    }

    const user = await User.findByUid(uid);

    if (!user) {
      return h.response({
        error: true,
        message: 'User not found'
      }).code(404);
    }

    return h.response({
      error: false,
      message: 'User profile retrieved successfully',
      user: {
        uid: user.uid,
        username: user.username,
        email: user.email,
        photoUrl: user.photoUrl,
        birthdate: user.birthdate,
        createdAt: user.createdAt
      }
    }).code(200);

  } catch (error) {
    console.error('Error retrieving user profile:', error);
    return h.response({
      error: true,
      message: 'Failed to retrieve user profile',
      details: error.message
    }).code(500);
  }
};

// Update user profile
exports.updateUserProfile = async (request, h) => {
  try {
    const { uid } = request.params;
    const { username, birthdate } = request.payload;

    // Check if the requesting user is authorized to update this profile
    if (request.user.uid !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only update your own profile'
      }).code(403);
    }

    // Validate input
    if (!username) {
      return h.response({
        error: true,
        message: 'Username is required'
      }).code(400);
    }

    // Update user profile
    const updatedUser = await User.updateProfile(uid, { username, birthdate });

    if (!updatedUser) {
      return h.response({
        error: true,
        message: 'User not found'
      }).code(404);
    }

    return h.response({
      error: false,
      message: 'User profile updated successfully',
      user: {
        uid: updatedUser.uid,
        username: updatedUser.username,
        email: updatedUser.email,
        photoUrl: updatedUser.photoUrl,
        birthdate: updatedUser.birthdate,
        createdAt: updatedUser.createdAt
      }
    }).code(200);

  } catch (error) {
    console.error('Error updating user profile:', error);
    return h.response({
      error: true,
      message: 'Failed to update user profile',
      details: error.message
    }).code(500);
  }
};

// Upload profile image
exports.uploadProfileImage = async (request, h) => {
  try {
    const { uid } = request.params;
    const { image } = request.payload;

    // Check if the requesting user is authorized to update this profile
    if (request.user.uid !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only update your own profile image'
      }).code(403);
    }

    if (!image) {
      return h.response({
        error: true,
        message: 'No image provided'
      }).code(400);
    }

    // Create profiles directory if it doesn't exist
    const profilesDir = path.join(__dirname, '../../images/profiles');
    if (!fs.existsSync(profilesDir)) {
      await mkdir(profilesDir, { recursive: true });
    }

    // Get file extension
    const filename = image.hapi.filename;
    const extension = path.extname(filename);

    // Create file path with user's UID
    const imagePath = path.join(profilesDir, `photo-${uid}${extension}`);

    // Read the image data
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      image.on('data', (chunk) => {
        chunks.push(chunk);
      });
      image.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      image.on('error', reject);
    });

    // Save the image
    await writeFile(imagePath, buffer);

    // Update the user's photo URL in the database
    const photoUrl = `/profiles/photo-${uid}${extension}`;
    const updatedUser = await User.updatePhotoUrl(uid, photoUrl);

    if (!updatedUser) {
      return h.response({
        error: true,
        message: 'User not found'
      }).code(404);
    }

    return h.response({
      error: false,
      message: 'Profile image uploaded successfully',
      user: {
        uid: updatedUser.uid,
        username: updatedUser.username,
        email: updatedUser.email,
        photoUrl: updatedUser.photoUrl,
        birthdate: updatedUser.birthdate,
        createdAt: updatedUser.createdAt
      }
    }).code(200);

  } catch (error) {
    console.error('Error uploading profile image:', error);
    return h.response({
      error: true,
      message: 'Failed to upload profile image',
      details: error.message
    }).code(500);
  }
};

// Link email/password provider to existing account
exports.linkEmailPassword = async (request, h) => {
  try {
    const { uid } = request.params;
    const { password } = request.payload;

    // Check if the requesting user is authorized to update this profile
    if (request.user.uid !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only update your own account'
      }).code(403);
    }

    // Validate input
    if (!password || password.length < 6) {
      return h.response({
        error: true,
        message: 'Password is required and must be at least 6 characters'
      }).code(400);
    }

    // Get the user from our database
    const user = await User.findByUid(uid);

    if (!user) {
      return h.response({
        error: true,
        message: 'User not found'
      }).code(404);
    }

    try {
      // Get the user from Firebase to check current providers
      const firebaseUser = await auth.getUser(uid);

      // Check if the user already has email/password provider
      const hasPasswordProvider = firebaseUser.providerData.some(
        provider => provider.providerId === 'password'
      );

      if (hasPasswordProvider) {
        return h.response({
          error: true,
          message: 'User already has email/password authentication'
        }).code(400);
      }

      // Update the user in Firebase to add email/password provider
      await auth.updateUser(uid, {
        email: user.email, // Use the email from our database
        password: password,
        emailVerified: true // Since we're linking to an existing verified account
      });

      // Update the password in our database
      await User.updateProfile(uid, { password: password });

      return h.response({
        error: false,
        message: 'Email/password authentication added successfully',
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          photoUrl: user.photoUrl,
          birthdate: user.birthdate,
          createdAt: user.createdAt
        }
      }).code(200);
    } catch (firebaseError) {
      console.error('Error linking email/password provider:', firebaseError);

      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/email-already-exists') {
        return h.response({
          error: true,
          message: 'Email already exists with different credentials',
          details: firebaseError.message
        }).code(400);
      }

      throw firebaseError;
    }

  } catch (error) {
    console.error('Error linking email/password provider:', error);
    return h.response({
      error: true,
      message: 'Failed to link email/password provider',
      details: error.message
    }).code(500);
  }
};

// Reset user password
exports.resetPassword = async (request, h) => {
  try {
    const { uid } = request.params;
    const { newPassword } = request.payload;

    // Check if the requesting user is authorized to reset this password
    if (request.user.uid !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only reset your own password'
      }).code(403);
    }

    // Validate input
    if (!newPassword || newPassword.length < 6) {
      return h.response({
        error: true,
        message: 'New password is required and must be at least 6 characters'
      }).code(400);
    }

    // Get the user from our database
    const user = await User.findByUid(uid);

    if (!user) {
      return h.response({
        error: true,
        message: 'User not found'
      }).code(404);
    }

    try {
      // Get the user from Firebase to check current providers
      const firebaseUser = await auth.getUser(uid);

      // Check if the user has email/password provider
      const hasPasswordProvider = firebaseUser.providerData.some(
        provider => provider.providerId === 'password'
      );

      if (!hasPasswordProvider) {
        return h.response({
          error: true,
          message: 'User does not have email/password authentication to reset'
        }).code(400);
      }

      // Update the user's password in Firebase
      await auth.updateUser(uid, {
        password: newPassword
      });

      // Update the password in our database
      await User.updateProfile(uid, { password: newPassword });

      return h.response({
        error: false,
        message: 'Password reset successfully',
        user: {
          uid: user.uid,
          username: user.username,
          email: user.email,
          photoUrl: user.photoUrl,
          birthdate: user.birthdate,
          createdAt: user.createdAt
        }
      }).code(200);
    } catch (firebaseError) {
      console.error('Error resetting password in Firebase:', firebaseError);
      throw firebaseError;
    }

  } catch (error) {
    console.error('Error resetting password:', error);
    return h.response({
      error: true,
      message: 'Failed to reset password',
      details: error.message
    }).code(500);
  }
};

// Delete user profile
exports.deleteUserProfile = async (request, h) => {
  try {
    const { uid } = request.params;

    // Check if the requesting user is authorized to delete this profile
    if (request.user.uid !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only delete your own profile'
      }).code(403);
    }

    // First, check if the user exists in our database
    const user = await User.findByUid(uid);

    if (!user) {
      return h.response({
        error: true,
        message: 'User not found'
      }).code(404);
    }

    // Delete the user's profile image if it's not the default
    if (user.photoUrl && !user.photoUrl.includes('default-profile.jpg') && !user.photoUrl.startsWith('http')) {
      try {
        const profilesDir = path.join(__dirname, '../../images/profiles');
        const imagePath = path.join(profilesDir, user.photoUrl.split('/profiles/')[1]);

        if (fs.existsSync(imagePath)) {
          await fsPromises.unlink(imagePath);
        }
      } catch (fileError) {
        console.error('Error deleting profile image file:', fileError);
        // Continue with deletion even if image deletion fails
      }
    }

    // Delete the user from PostgreSQL
    const deletedUser = await User.deleteUser(uid);

    // Delete the user from Firebase
    try {
      await auth.deleteUser(uid);
    } catch (firebaseError) {
      console.error('Error deleting user from Firebase:', firebaseError);

      // If Firebase deletion fails but PostgreSQL deletion succeeded,
      // we should inform the client but still consider it a partial success
      if (deletedUser) {
        return h.response({
          error: true,
          message: 'User deleted from database but not from Firebase authentication',
          details: firebaseError.message
        }).code(500);
      }

      throw firebaseError;
    }

    return h.response({
      error: false,
      message: 'User profile deleted successfully',
      user: {
        uid: deletedUser.uid,
        username: deletedUser.username,
        email: deletedUser.email
      }
    }).code(200);

  } catch (error) {
    console.error('Error deleting user profile:', error);
    return h.response({
      error: true,
      message: 'Failed to delete user profile',
      details: error.message
    }).code(500);
  }
};
