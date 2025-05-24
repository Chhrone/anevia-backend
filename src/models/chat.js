'use strict';

const db = require('../config/database');

class Chat {
    constructor({ chatId, sessionId, sender, message, photoUrl, timestamp, type }) {
        this.chatId = chatId;
        this.sessionId = sessionId;
        this.sender = sender;
        this.message = message;
        this.photoUrl = photoUrl;
        this.timestamp = timestamp;
        this.type = type;
    }

    static async add(chat) {
        try {
            const query = `
                INSERT INTO chats (session_id, sender, message, photo_url, timestamp, type)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const values = [chat.sessionId, chat.sender, chat.message, chat.photoUrl, chat.timestamp, chat.type];
            const result = await db.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error adding chat message to database:', error);
            throw error;
        }
    }

    static async getMessagesBySessionId(sessionId) {
        try {
            const query = 'SELECT * FROM chats WHERE session_id = $1 ORDER BY timestamp ASC';
            const result = await db.query(query, [sessionId]);

            return result.rows.map(chat => new Chat({
                chatId: chat.chat_id,
                sessionId: chat.session_id,
                sender: chat.sender,
                message: chat.message,
                photoUrl: chat.photo_url,
                timestamp: chat.timestamp,
                type: chat.type
            }));
        } catch (error) {
            console.error('Error getting chat messages by session ID:', error);
            throw error;
        }
    }
}

module.exports = Chat;
