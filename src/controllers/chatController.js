'use strict';

const ChatSession = require('../models/chatSession');
const Chat = require('../models/chat');
const geminiService = require('../services/geminiService');
const Scan = require('../models/scan');

// Store active chat sessions in memory
const activeChatSessions = new Map();

// Create a new chat session
exports.createChatSession = async (request, h) => {
  try {
    const { uid } = request.user;

    // Find the user's most recent scan
    const scans = await Scan.getAll();
    const userScans = scans.filter(scan => scan.photoUrl.includes(`scan-${uid}`));

    if (userScans.length === 0) {
      return h.response({
        error: true,
        message: 'No scan found for this user. Please upload a scan first.'
      }).code(404);
    }

    // Get the most recent scan
    const latestScan = userScans[0]; // Scans are already ordered by date DESC

    // Create a new chat session
    const chatSession = new ChatSession({
      userId: uid,
      title: 'Anemia Analysis Chat'
    });

    // Save the chat session to the database
    const savedSession = await ChatSession.create(chatSession);

    // Initialize Gemini chat and store it in memory
    const geminiChat = await geminiService.initializeChat();
    activeChatSessions.set(savedSession.sessionId, geminiChat);

    // Add the first message (scan image) from the system
    const firstMessage = new Chat({
      sessionId: savedSession.sessionId,
      sender: 'user',
      message: 'Eye scan image for analysis',
      photoUrl: latestScan.photoUrl,
      type: 'image'
    });

    await Chat.create(firstMessage);

    // Provide the scan context to Gemini and get initial advice
    const analysisResponse = await geminiService.provideScanContext(latestScan.scanId);

    // Add the AI response to the chat
    const aiResponse = new Chat({
      sessionId: savedSession.sessionId,
      sender: 'ai',
      message: analysisResponse,
      type: 'text'
    });

    await Chat.create(aiResponse);

    // Add a welcome message from the AI
    const welcomeMessage = "Silahkan bertanya!";

    const welcomeResponse = new Chat({
      sessionId: savedSession.sessionId,
      sender: 'ai',
      message: welcomeMessage,
      type: 'text'
    });

    await Chat.create(welcomeResponse);

    // Get all messages for the session
    const messages = await Chat.getByChatSession(savedSession.sessionId);

    return h.response({
      error: false,
      message: 'Chat session created successfully',
      data: {
        session: savedSession,
        messages
      }
    }).code(201);
  } catch (error) {
    console.error('Error creating chat session:', error);
    return h.response({
      error: true,
      message: 'Failed to create chat session',
      details: error.message
    }).code(500);
  }
};

// Send a message in a chat session
exports.sendMessage = async (request, h) => {
  try {
    const { sessionId } = request.params;
    const { message } = request.payload;
    const { uid } = request.user;

    // Check if the session exists
    const session = await ChatSession.getById(sessionId);
    if (!session) {
      return h.response({
        error: true,
        message: 'Chat session not found'
      }).code(404);
    }

    // Check if the user owns this session
    if (session.userId !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only access your own chat sessions'
      }).code(403);
    }

    // Create and save the user message
    const userMessage = new Chat({
      sessionId,
      sender: 'user',
      message,
      type: 'text'
    });

    await Chat.create(userMessage);

    // Get or initialize the Gemini chat session
    let geminiChat = activeChatSessions.get(sessionId);
    if (!geminiChat) {
      geminiChat = await geminiService.initializeChat();
      activeChatSessions.set(sessionId, geminiChat);
    }

    // Get response from Gemini
    const aiResponse = await geminiService.sendMessage(message, geminiChat);

    // Create and save the AI response
    const aiMessage = new Chat({
      sessionId,
      sender: 'ai',
      message: aiResponse,
      type: 'text'
    });

    await Chat.create(aiMessage);

    // Update the session's updated_at timestamp
    await ChatSession.update(sessionId, {});

    return h.response({
      error: false,
      message: 'Message sent successfully',
      data: {
        userMessage: userMessage,
        aiMessage: aiMessage
      }
    }).code(200);
  } catch (error) {
    console.error('Error sending message:', error);
    return h.response({
      error: true,
      message: 'Failed to send message',
      details: error.message
    }).code(500);
  }
};

// Get chat history for a session
exports.getChatHistory = async (request, h) => {
  try {
    const { sessionId } = request.params;
    const { uid } = request.user;

    // Check if the session exists
    const session = await ChatSession.getById(sessionId);
    if (!session) {
      return h.response({
        error: true,
        message: 'Chat session not found'
      }).code(404);
    }

    // Check if the user owns this session
    if (session.userId !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only access your own chat sessions'
      }).code(403);
    }

    // Get all messages for the session
    const messages = await Chat.getByChatSession(sessionId);

    return h.response({
      error: false,
      message: 'Chat history retrieved successfully',
      data: {
        session,
        messages
      }
    }).code(200);
  } catch (error) {
    console.error('Error getting chat history:', error);
    return h.response({
      error: true,
      message: 'Failed to get chat history',
      details: error.message
    }).code(500);
  }
};

// Get all chat sessions for a user
exports.getUserChatSessions = async (request, h) => {
  try {
    const { uid } = request.user;

    // Get all chat sessions for the user
    const sessions = await ChatSession.getByUserId(uid);

    return h.response({
      error: false,
      message: 'User chat sessions retrieved successfully',
      data: {
        sessions
      }
    }).code(200);
  } catch (error) {
    console.error('Error getting user chat sessions:', error);
    return h.response({
      error: true,
      message: 'Failed to get user chat sessions',
      details: error.message
    }).code(500);
  }
};

// Delete a chat session
exports.deleteChatSession = async (request, h) => {
  try {
    const { sessionId } = request.params;
    const { uid } = request.user;

    // Check if the session exists
    const session = await ChatSession.getById(sessionId);
    if (!session) {
      return h.response({
        error: true,
        message: 'Chat session not found'
      }).code(404);
    }

    // Check if the user owns this session
    if (session.userId !== uid) {
      return h.response({
        error: true,
        message: 'Unauthorized: You can only delete your own chat sessions'
      }).code(403);
    }

    // Delete the session
    const deletedSession = await ChatSession.delete(sessionId);

    // Remove from active sessions if it exists
    if (activeChatSessions.has(sessionId)) {
      activeChatSessions.delete(sessionId);
    }

    return h.response({
      error: false,
      message: 'Chat session deleted successfully',
      data: {
        session: deletedSession
      }
    }).code(200);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return h.response({
      error: true,
      message: 'Failed to delete chat session',
      details: error.message
    }).code(500);
  }
};
