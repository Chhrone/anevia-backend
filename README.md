# Anevia Backend

<div align="center">
  <h3>Eye Conjunctiva Scanning System for Anemia Detection</h3>
</div>

Anevia is an innovative healthcare solution that uses AI-powered image analysis to detect potential anemia through eye conjunctiva scans. This repository contains the backend API that powers the Anevia platform.

## 📚 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [Prerequisites](#prerequisites)
- [Database Schema](#database-schema)
- [Authentication System](#authentication-system)
- [Chat System](#chat-system)
- [Local Development Setup](#local-development-setup)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [License](#license)

## 🔍 Overview

Anevia's backend provides a robust API for processing eye conjunctiva images to detect potential anemia. The system uses a two-step AI model approach:

1. **Eye Region Extraction**: Identifies and crops the conjunctiva region from uploaded eye images
2. **Anemia Analysis**: Analyzes the extracted conjunctiva to determine potential anemia indicators

The backend also handles user authentication, profile management, scan history storage, and provides an AI-powered chat assistant.

## ✨ Features

- **AI-Powered Image Analysis**:
  - Upload and process eye conjunctiva images
  - Two-step AI processing pipeline
  - Accurate anemia detection from conjunctiva analysis

- **User Management**:
  - Secure authentication with Firebase
  - Multiple authentication providers (Email/Password, Google, and GitHub)
  - Provider linking capabilities
  - Comprehensive user profile management

- **Data Storage**:
  - Efficient PostgreSQL database integration
  - Secure storage of scan results and user data
  - Image file management

- **AI Chat Assistant (ChatVia)**:
  - Integrates with Google Gemini model
  - Initiates chat sessions based on scan data
  - Provides health advice related to anemia
  - Manages chat history for users

- **RESTful API**:
  - Well-documented endpoints
  - Token-based authentication
  - Comprehensive error handling

## 🛠️ Tech Stack

- **Backend**: Node.js with Hapi.js framework
- **Database**: PostgreSQL
- **Authentication**: Firebase Admin SDK
- **AI Model**: Google Gemini API
- **Image Processing**: Custom AI models
- **Unique IDs**: UUID for generating identifiers
- **Documentation**: Custom HTML/CSS/JS documentation

## 📝 API Documentation

For comprehensive API documentation, visit:

**[https://server.anevia.my.id](https://server.anevia.my.id)**

The documentation includes:
- Detailed endpoint descriptions
- Request/response formats
- Authentication requirements
- Example usage

## 🔧 Prerequisites

- **Node.js** (v14 or higher)
- **PostgreSQL** database
- **Firebase** project with Authentication enabled
- **Google Cloud Project** with Gemini API enabled and API Key
- **Storage** space for image files

## 💾 Database Schema

> **Important**: Before creating tables, make sure to connect to the anevia_db database using `\c anevia_db` in the psql shell or by specifying the database when connecting: `psql -U postgres -d anevia_db`. After creating tables, grant all necessary privileges to your database user.

### Scans Table
```sql
CREATE TABLE scans (
  scan_id VARCHAR(10) PRIMARY KEY,
  photo_url VARCHAR(50) NOT NULL,
  scan_result BOOLEAN NOT NULL,
  confidence DECIMAL(5,4),
  scan_date TIMESTAMP NOT NULL
);
```

### Add confidence column to existing scans table
```sql
ALTER TABLE scans ADD COLUMN confidence DECIMAL(5,4);
```

### Users Table
```sql
CREATE TABLE users (
  uid VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(50),
  photo_url VARCHAR(100) DEFAULT '/profiles/default-profile.jpg',
  birthdate DATE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Chat Sessions Table
```sql
CREATE TABLE chat_sessions (
    session_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(uid),
    title TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Chats Table
```sql
CREATE TABLE chats (
    chat_id SERIAL PRIMARY KEY,
    session_id VARCHAR(50) REFERENCES chat_sessions(session_id),
    sender VARCHAR(10) CHECK (sender IN ('user', 'ai')),
    message TEXT,
    photo_url VARCHAR(255),
    timestamp TIMESTAMP DEFAULT NOW(),
    type VARCHAR(10) DEFAULT 'text'
);
```

### Privileges
After creating tables, ensure your database user has all necessary privileges:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anevia_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anevia_admin;
```

## 🔐 Authentication System

Anevia uses Firebase Authentication for secure user management:

### Key Features

- **Multiple Sign-in Methods**:
  - Email/Password authentication
  - Google OAuth integration
  - GitHub authentication

- **Account Management**:
  - Provider linking (connect multiple auth methods to one account)
  - Password reset functionality
  - Profile updates
  - Account deletion (both from Firebase and PostgreSQL)

- **Security**:
  - Token-based authentication
  - Secure password handling
  - Token verification and refresh

### Authentication Flow

1. User authenticates with Firebase on the frontend
2. Firebase issues an ID token
3. Frontend sends token to backend's `/auth/verify` endpoint
4. Backend verifies token with Firebase Admin SDK
5. Backend creates or retrieves user from PostgreSQL database
6. User profile data is returned to frontend
7. Frontend stores token for authenticated requests
8. Token refresh is handled automatically (Firebase tokens expire after 1 hour)

For detailed implementation guidance and code examples, refer to the [API documentation](https://server.anevia.my.id).

## 💬 Chat System

The Anevia backend integrates with Google Gemini to provide an AI-powered chat assistant (ChatVia!) for users to get health advice related to anemia.

### Key Features

- **AI-Powered Conversations**:
  - Utilizes Google Gemini model for natural language understanding and generation.
  - Provides advice based on scan results and user queries.

- **Session Management**:
  - Creates new chat sessions linked to user and scan data.
  - Maintains chat history within sessions.

- **Safety Handling**:
  - Configured to handle content safety filters (though filters can be disabled for specific use cases).

### Endpoints

- **`POST /api/chats`**: Start a new chat session with ChatVia! based on scan data.
- **`POST /api/chats/messages`**: Send a message within an existing chat session and get AI response.
- **`GET /api/chats/{userId}`**: Retrieve all chat sessions for a specific user.
- **`GET /api/chats/{userId}/{sessionId}`**: Retrieve all messages within a specific chat session (with user ownership verification).

## 💻 Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Chhrone/anevia-backend.git
   cd anevia-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a PostgreSQL database and user**:
   ```sql
   CREATE DATABASE anevia_db;
   CREATE USER anevia_admin WITH ENCRYPTED PASSWORD '<your_secure_password>';
   GRANT ALL PRIVILEGES ON DATABASE anevia_db TO anevia_admin;
   ```

4. **Connect to the database and create the required tables**:
   ```bash
   # Connect to the anevia_db database
   psql -U postgres -d anevia_db

   # Or if you're already in the psql shell
   \c anevia_db
   ```

   Then create the tables using the schema definitions provided in the [Database Schema](#database-schema) section:
   ```sql
   -- Scans table
   CREATE TABLE scans (
     scan_id VARCHAR(10) PRIMARY KEY,
     photo_url VARCHAR(50) NOT NULL,
     scan_result BOOLEAN NOT NULL,
     scan_date TIMESTAMP NOT NULL
   );

   -- Users table
   CREATE TABLE users (
     uid VARCHAR(50) PRIMARY KEY,
     username VARCHAR(50) NOT NULL UNIQUE,
     email VARCHAR(100) NOT NULL UNIQUE,
     password VARCHAR(50),
     photo_url VARCHAR(100) DEFAULT '/profiles/default-profile.jpg',
     birthdate DATE,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
   );

   -- Chat Sessions table
   CREATE TABLE chat_sessions (
       session_id VARCHAR(50) PRIMARY KEY,
       user_id VARCHAR(50) REFERENCES users(uid),
       title TEXT,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Chats table
   CREATE TABLE chats (
       chat_id SERIAL PRIMARY KEY,
       session_id VARCHAR(50) REFERENCES chat_sessions(session_id),
       sender VARCHAR(10) CHECK (sender IN ('user', 'ai')),
       message TEXT,
       photo_url VARCHAR(255),
       timestamp TIMESTAMP DEFAULT NOW(),
       type VARCHAR(10) DEFAULT 'text'
   );

   -- Ensure the anevia_admin user has all necessary privileges
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anevia_admin;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anevia_admin;
   ```

5. **Set up Firebase Authentication**:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Email/Password, Google, and GitHub authentication providers
   - Generate a service account key from Project Settings > Service Accounts
   - Download the service account key JSON file

6. **Set up Google Gemini API**:
   - Create a Google Cloud Project and enable the Gemini API.
   - Generate an API Key for the Gemini API.

7. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

8. **Update your `.env` file** with your specific configuration:
   ```
   # Server Configuration
   PORT=5000
   HOST=localhost

   # PostgreSQL Configuration
   PGUSER=anevia_admin
   PGHOST=localhost
   PGPASSWORD=your_secure_password
   PGDATABASE=anevia_db
   PGPORT=5432

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key\n-----END PRIVATE KEY-----\n"

   # Google Gemini API Configuration
   GEMINI_API_KEY=your_gemini_api_key
   ```

9. **Create required directories**:
   ```bash
   mkdir -p public/images/scans
   mkdir -p public/images/conjunctivas
   mkdir -p public/images/profiles
   ```

10. **Start the development server**:
    ```bash
    npm run dev
    ```

11. **Access the API documentation** at [http://localhost:5000](http://localhost:5000)

## 🚀 AWS EC2 Deployment

### Option 1: Manual Deployment

1. **Launch an EC2 instance**:
   - Amazon Linux 2 or Ubuntu recommended
   - Ensure security groups allow inbound traffic on port 5000 (or your configured port)

2. **Set up the environment**:
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PostgreSQL
   sudo apt-get install -y postgresql postgresql-contrib
   ```

3. **Clone the repository**:
   ```bash
   git clone https://github.com/Chhrone/anevia-backend.git
   cd anevia-backend
   ```

4. **Set up the database**:
   - Follow steps 3-4 from the Local Development Setup section
   - Make sure to connect to the anevia_db database before creating tables
   - Ensure the database user has all necessary privileges on tables and sequences

5. **Configure Firebase** following step 5 from the Local Development Setup section

6. **Configure Google Gemini API** following step 6 from the Local Development Setup section

7. **Install dependencies and create directories**:
   ```bash
   npm install
   mkdir -p public/images/scans public/images/conjunctivas public/images/profiles
   ```

8. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env  # Edit with your production values
   ```

9. **Use PM2 for process management**:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "anevia-backend"
   pm2 save
   pm2 startup
   ```

### Option 2: Using the Deployment Script

**Note:** This script assumes you already have a PostgreSQL database set up on your EC2 instance with the required tables.

1. **Clone and prepare**:
   ```bash
   git clone https://github.com/Chhrone/anevia-backend.git
   cd anevia-backend
   chmod +x deploy.sh
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

3. **Follow the prompts** to configure your environment:
   - Database connection details
   - Server port configuration
   - Optional Nginx reverse proxy setup
   - Optional SSL configuration with Let's Encrypt

The deployment script can automatically:
- Install and configure Nginx as a reverse proxy
- Set up SSL certificates with Let's Encrypt
- Configure proper headers and proxy settings
- Enable the site and restart services

### Production Recommendations

For a production-ready deployment, consider:

1. **Domain and HTTPS**:
   - Register a domain with AWS Route 53 or another provider
   - Set up HTTPS using Let's Encrypt
   - Configure Nginx as a reverse proxy

2. **Monitoring and Logging**:
   - Set up PM2 monitoring (`pm2 monitor`)
   - Configure application logging
   - Set up AWS CloudWatch alarms

3. **Backup Strategy**:
   - Regular PostgreSQL database backups
   - Image file backups
   - Environment configuration backups

## 📄 License

ISC

---

<div align="center">
  <p>Visit our API documentation at <a href="https://server.anevia.my.id">https://server.anevia.my.id</a></p>
  <p>© 2025 Anevia - Eye Conjunctiva Scanning System for Anemia Detection</p>
</div>
