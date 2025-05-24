'use strict';

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ChatSession {
    constructor({ sessionId, userId, title, createdAt, updatedAt }) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.title = title;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static async add(session) {
        try {
            const query = `
                INSERT INTO chat_sessions (session_id, user_id, title, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const values = [session.sessionId, session.userId, session.title, session.createdAt, session.updatedAt];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error adding chat session to database:', error);
            throw error;
        }
    }

    static async findBySessionId(sessionId) {
        try {
            const query = 'SELECT * FROM chat_sessions WHERE session_id = $1';
            const result = await db.query(query, [sessionId]);

            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            return new ChatSession({
                sessionId: session.session_id,
                userId: session.user_id,
                title: session.title,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            });
        } catch (error) {
            console.error('Error finding chat session by ID:', error);
            throw error;
        }
    }

    static async updateTitle(sessionId, newTitle) {
        try {
            const query = `
                UPDATE chat_sessions
                SET title = $1, updated_at = NOW()
                WHERE session_id = $2
                RETURNING *
            `;
            const result = await db.query(query, [newTitle, sessionId]);

            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            return new ChatSession({
                sessionId: session.session_id,
                userId: session.user_id,
                title: session.title,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            });
        } catch (error) {
            console.error('Error updating chat session title:', error);
            throw error;
        }
    }

    static async updateUpdatedAt(sessionId) {
        try {
            const query = `
                UPDATE chat_sessions
                SET updated_at = NOW()
                WHERE session_id = $1
                RETURNING *
            `;
            const result = await db.query(query, [sessionId]);

            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            return new ChatSession({
                sessionId: session.session_id,
                userId: session.user_id,
                title: session.title,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            });
        } catch (error) {
            console.error('Error updating chat session updated_at timestamp:', error);
            throw error;
        }
    }

    static async getAllByUserId(userId) {
        try {
            const query = 'SELECT * FROM chat_sessions WHERE user_id = $1 ORDER BY updated_at DESC';
            const result = await db.query(query, [userId]);

            return result.rows.map(session => new ChatSession({
                sessionId: session.session_id,
                userId: session.user_id,
                title: session.title,
                createdAt: session.created_at,
                updatedAt: session.updated_at
            }));
        } catch (error) {
            console.error('Error getting all chat sessions by user ID:', error);
            throw error;
        }
    }
}

module.exports = ChatSession;
