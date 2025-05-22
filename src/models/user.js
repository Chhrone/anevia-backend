'use strict';

const db = require('../config/database');

class User {
  constructor({ uid, username, email, password, photoUrl, birthdate, createdAt }) {
    this.uid = uid;
    this.username = username;
    this.email = email;
    this.password = password;
    this.photoUrl = photoUrl || '/profiles/default-profile.jpg';
    this.birthdate = birthdate;
    this.createdAt = createdAt || new Date();
  }

  // Create a new user in the database
  static async create(user) {
    try {
      const query = `
        INSERT INTO users (uid, username, email, password, photo_url, birthdate, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        user.uid,
        user.username,
        user.email,
        user.password,
        user.photoUrl,
        user.birthdate,
        user.createdAt
      ];

      const result = await db.query(query, values);
      return new User(this.mapDbUserToModel(result.rows[0]));
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find a user by their Firebase UID
  static async findByUid(uid) {
    try {
      const query = 'SELECT * FROM users WHERE uid = $1';
      const result = await db.query(query, [uid]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(this.mapDbUserToModel(result.rows[0]));
    } catch (error) {
      console.error('Error finding user by UID:', error);
      throw error;
    }
  }

  // Find a user by their email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await db.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(this.mapDbUserToModel(result.rows[0]));
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find a user by their username
  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await db.query(query, [username]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(this.mapDbUserToModel(result.rows[0]));
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(uid, updates) {
    try {
      // Build the SET clause dynamically based on provided updates
      const updateFields = [];
      const values = [uid];
      let valueIndex = 2;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          // Convert camelCase to snake_case for database column names
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbField} = $${valueIndex}`);
          values.push(value);
          valueIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE uid = $1
        RETURNING *
      `;

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(this.mapDbUserToModel(result.rows[0]));
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Update user's profile photo URL
  static async updatePhotoUrl(uid, photoUrl) {
    try {
      const query = `
        UPDATE users
        SET photo_url = $2
        WHERE uid = $1
        RETURNING *
      `;

      const result = await db.query(query, [uid, photoUrl]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(this.mapDbUserToModel(result.rows[0]));
    } catch (error) {
      console.error('Error updating user photo URL:', error);
      throw error;
    }
  }

  // Delete a user from the database
  static async deleteUser(uid) {
    try {
      const query = 'DELETE FROM users WHERE uid = $1 RETURNING *';
      const result = await db.query(query, [uid]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDbUserToModel(result.rows[0]);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Map database column names (snake_case) to model properties (camelCase)
  static mapDbUserToModel(dbUser) {
    return {
      uid: dbUser.uid,
      username: dbUser.username,
      email: dbUser.email,
      password: dbUser.password,
      photoUrl: dbUser.photo_url,
      birthdate: dbUser.birthdate,
      createdAt: dbUser.created_at
    };
  }
}

module.exports = User;
