'use strict';

const db = require('../config/database');

class Chat {
  constructor({ chatId, sessionId, sender, message, photoUrl, timestamp, type }) {
    this.chatId = chatId;
    this.sessionId = sessionId;
    this.sender = sender;
    this.message = message;
    this.photoUrl = photoUrl;
    this.timestamp = timestamp || new Date();
    this.type = type || 'text';
  }

  // Create a new chat message
  static async create(chat) {
    try {
      const query = `
        INSERT INTO chats (session_id, sender, message, photo_url, timestamp, type)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [
        chat.sessionId,
        chat.sender,
        chat.message,
        chat.photoUrl,
        chat.timestamp,
        chat.type
      ];

      const result = await db.query(query, values);
      return new Chat(this.mapDbChatToModel(result.rows[0]));
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw error;
    }
  }

  // Get all chat messages for a session
  static async getByChatSession(sessionId) {
    try {
      const query = 'SELECT * FROM chats WHERE session_id = $1 ORDER BY timestamp ASC';
      const result = await db.query(query, [sessionId]);

      return result.rows.map(row => new Chat(this.mapDbChatToModel(row)));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  // Map database column names (snake_case) to model properties (camelCase)
  static mapDbChatToModel(dbChat) {
    return {
      chatId: dbChat.chat_id,
      sessionId: dbChat.session_id,
      sender: dbChat.sender,
      message: dbChat.message,
      photoUrl: dbChat.photo_url,
      timestamp: dbChat.timestamp,
      type: dbChat.type
    };
  }
}

module.exports = Chat;
