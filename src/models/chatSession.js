'use strict';

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ChatSession {
  constructor({ sessionId, userId, title, createdAt, updatedAt }) {
    this.sessionId = sessionId || uuidv4();
    this.userId = userId;
    this.title = title || 'New Chat';
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  // Create a new chat session
  static async create(chatSession) {
    try {
      const query = `
        INSERT INTO chat_sessions (session_id, user_id, title, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      const values = [
        chatSession.sessionId,
        chatSession.userId,
        chatSession.title,
        chatSession.createdAt,
        chatSession.updatedAt
      ];

      const result = await db.query(query, values);
      return new ChatSession(this.mapDbSessionToModel(result.rows[0]));
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  // Get a chat session by ID
  static async getById(sessionId) {
    try {
      const query = 'SELECT * FROM chat_sessions WHERE session_id = $1';
      const result = await db.query(query, [sessionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return new ChatSession(this.mapDbSessionToModel(result.rows[0]));
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw error;
    }
  }

  // Get all chat sessions for a user
  static async getByUserId(userId) {
    try {
      const query = 'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC';
      const result = await db.query(query, [userId]);

      return result.rows.map(row => new ChatSession(this.mapDbSessionToModel(row)));
    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      throw error;
    }
  }

  // Update a chat session
  static async update(sessionId, updates) {
    try {
      const updateFields = [];
      const values = [];
      let valueIndex = 1;

      // Build the SET clause dynamically based on provided updates
      if (updates.title !== undefined) {
        updateFields.push(`title = $${valueIndex}`);
        values.push(updates.title);
        valueIndex++;
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = $${valueIndex}`);
      values.push(new Date());
      valueIndex++;

      // Add the session ID as the last parameter
      values.push(sessionId);

      const query = `
        UPDATE chat_sessions
        SET ${updateFields.join(', ')}
        WHERE session_id = $${valueIndex}
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return new ChatSession(this.mapDbSessionToModel(result.rows[0]));
    } catch (error) {
      console.error('Error updating chat session:', error);
      throw error;
    }
  }

  // Delete a chat session
  static async delete(sessionId) {
    try {
      // First delete all chat messages associated with this session
      await db.query('DELETE FROM chats WHERE session_id = $1', [sessionId]);
      
      // Then delete the session itself
      const query = 'DELETE FROM chat_sessions WHERE session_id = $1 RETURNING *';
      const result = await db.query(query, [sessionId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbSessionToModel(result.rows[0]);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw error;
    }
  }

  // Map database column names (snake_case) to model properties (camelCase)
  static mapDbSessionToModel(dbSession) {
    return {
      sessionId: dbSession.session_id,
      userId: dbSession.user_id,
      title: dbSession.title,
      createdAt: dbSession.created_at,
      updatedAt: dbSession.updated_at
    };
  }
}

module.exports = ChatSession;
