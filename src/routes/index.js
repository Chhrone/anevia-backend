'use strict';

const scanController = require('../controllers/scanController');
const userController = require('../controllers/userController');
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

module.exports = [
    // POST endpoint to start a new chat session from a scan
    {
        method: 'POST',
        path: '/api/chats',
        options: {
            payload: {
                parse: true,
                allow: 'application/json'
            },
            handler: chatController.startChatFromScan
        }
    },
    // POST endpoint to send a message within an existing chat session
    {
        method: 'POST',
        path: '/api/chats/messages',
        options: {
            payload: {
                parse: true,
                allow: 'application/json'
            },
            handler: chatController.sendMessage
        }
    },
    // GET endpoint to retrieve all chat sessions for a user
    {
        method: 'GET',
        path: '/api/chats/{userId}',
        handler: chatController.getAllChatSessionsForUser // This function will be created next
    },
    // GET endpoint to retrieve messages for a specific chat session by user and session ID
    {
        method: 'GET',
        path: '/api/chats/{userId}/{sessionId}',
        handler: chatController.getChatMessagesBySessionId // This function will be created next
    },

    // POST endpoint to upload a new scan
    {
        method: 'POST',
        path: '/api/scans',
        options: {
            payload: {
                output: 'stream',
                parse: true,
                allow: 'multipart/form-data',
                multipart: true,
                maxBytes: 10 * 1024 * 1024 // 10MB max file size
            },
            handler: scanController.uploadScan
        }
    },

    // GET endpoint to retrieve all scans
    {
        method: 'GET',
        path: '/api/scans',
        handler: scanController.getAllScans
    },

    // GET endpoint to retrieve a specific scan by ID
    {
        method: 'GET',
        path: '/api/scans/{id}',
        handler: scanController.getScanById
    },

    // Authentication endpoints

    // POST endpoint to verify Firebase token and sync user data
    {
        method: 'POST',
        path: '/auth/verify',
        options: {
            payload: {
                parse: true,
                allow: 'application/json'
            },
            handler: userController.verifyToken
        }
    },

    // GET endpoint to retrieve user profile
    {
        method: 'GET',
        path: '/auth/profile/{uid}',
        options: {
            pre: [
                { method: verifyToken }
            ],
            handler: userController.getUserProfile
        }
    },

    // PUT endpoint to update user profile
    {
        method: 'PUT',
        path: '/auth/profile/{uid}',
        options: {
            pre: [
                { method: verifyToken }
            ],
            payload: {
                parse: true,
                allow: 'application/json'
            },
            handler: userController.updateUserProfile
        }
    },

    // POST endpoint to upload profile image
    {
        method: 'POST',
        path: '/auth/profile/{uid}/image',
        options: {
            pre: [
                { method: verifyToken }
            ],
            payload: {
                output: 'stream',
                parse: true,
                allow: 'multipart/form-data',
                multipart: true,
                maxBytes: 5 * 1024 * 1024 // 5MB max file size
            },
            handler: userController.uploadProfileImage
        }
    },

    // DELETE endpoint to delete user profile
    {
        method: 'DELETE',
        path: '/auth/profile/{uid}',
        options: {
            pre: [
                { method: verifyToken }
            ],
            handler: userController.deleteUserProfile
        }
    },

    // POST endpoint to link email/password provider to existing account
    {
        method: 'POST',
        path: '/auth/profile/{uid}/link-password',
        options: {
            pre: [
                { method: verifyToken }
            ],
            payload: {
                parse: true,
                allow: 'application/json'
            },
            handler: userController.linkEmailPassword
        }
    },

    // PUT endpoint to reset user password
    {
        method: 'PUT',
        path: '/auth/profile/{uid}/reset-password',
        options: {
            pre: [
                { method: verifyToken }
            ],
            payload: {
                parse: true,
                allow: 'application/json'
            },
            handler: userController.resetPassword
        }
    }
];
