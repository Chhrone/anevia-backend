# Anevia Backend

A Node.js backend application for the Anevia eye conjunctiva scanning system for anemia detection.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Local Development Setup](#local-development-setup)
- [AWS EC2 Deployment](#aws-ec2-deployment)
- [Testing](#testing)
- [License](#license)

## Features

- Upload and process eye conjunctiva images
- Two-step AI processing:
  1. Eye image cropping to extract conjunctiva
  2. Anemia detection from conjunctiva analysis
- Store scan results in PostgreSQL database
- User authentication with Firebase
- Multiple authentication providers (Email/Password and Google)
- User profile management
- RESTful API for client applications

## Tech Stack

- Node.js
- Hapi.js framework
- PostgreSQL database
- Firebase Admin SDK for authentication
- UUID for generating unique scan IDs

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Firebase project with Authentication enabled

## Database Schema

### Scans Table
```sql
CREATE TABLE scans (
  scan_id VARCHAR2(10) PRIMARY KEY,
  photo_url VARCHAR2(50) NOT NULL,
  scan_result BOOLEAN NOT NULL,
  scan_date TIMESTAMP NOT NULL
);
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

## Authentication

The application uses Firebase Authentication for user management with the following features:

- Multiple sign-in methods:
  - Email/Password
  - Google OAuth
- Provider linking (connect multiple auth methods to one account)
- Token-based authentication
- User profile management
- Secure password handling

### Authentication Flow

1. User authenticates with Firebase (frontend) using Email/Password or Google
2. Firebase returns an ID token to the frontend
3. Frontend sends the token to the backend's `/auth/verify` endpoint
4. Backend verifies the token using Firebase Admin SDK
5. If valid, backend creates or retrieves user from PostgreSQL database
6. Backend returns user profile data to frontend
7. Frontend stores the token (typically in localStorage) for subsequent authenticated requests
8. Frontend must handle token refresh as Firebase tokens expire after 1 hour

For detailed implementation guidance, including code examples for frontend integration, refer to the web documentation. The documentation includes specific considerations for:

- Firebase SDK integration
- Token management and refresh
- Authentication state monitoring
- Making authenticated requests
- Provider linking (adding email/password to OAuth accounts)

A reference implementation is available in the `auth-test.html` file, which demonstrates all authentication features.

## Local Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/Chhrone/anevia-backend.git
   cd anevia-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE anevia_db;
   CREATE USER anevia_admin WITH ENCRYPTED PASSWORD '<your_secure_password>';
   GRANT ALL PRIVILEGES ON DATABASE anevia_db TO anevia_admin;
   ```

4. Create the required tables:
   ```sql
   -- Scans table
   CREATE TABLE scans (
     scan_id VARCHAR2(10) PRIMARY KEY,
     photo_url VARCHAR2(50) NOT NULL,
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
   ```

5. Set up Firebase Authentication:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Email/Password and Google authentication providers
   - Generate a service account key from Project Settings > Service Accounts
   - Download the service account key JSON file

6. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

7. Configure your `.env` file with the following variables:
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
   ```

8. Start the development server:
   ```
   npm run dev
   ```

## AWS EC2 Deployment

### Option 1: Manual Deployment

1. Launch an EC2 instance (Amazon Linux 2 or Ubuntu recommended)

2. Install Node.js and PostgreSQL on the instance

3. Clone the repository:
   ```
   git clone https://github.com/Chhrone/anevia-backend.git
   cd anevia-backend
   ```

4. Set up the database as described in the local setup (both scans and users tables)

5. Set up Firebase Authentication as described in the local setup

6. Install dependencies:
   ```
   npm install
   ```

7. Create a `.env` file with appropriate values:
   ```
   cp .env.example .env
   nano .env  # Edit with your values
   ```

8. Start the server:
   ```
   npm start
   ```

9. (Optional) Use PM2 to keep the application running:
   ```
   npm install -g pm2
   pm2 start server.js --name "anevia-backend"
   pm2 save
   pm2 startup
   ```

### Option 2: Using the Deployment Script

**Note:** This script assumes you already have a PostgreSQL database set up on your EC2 instance with the required 'scans' and 'users' tables. The script will NOT create or modify your database schema, only configure the connection.

1. Clone the repository on your EC2 instance:
   ```
   git clone https://github.com/Chhrone/anevia-backend.git
   cd anevia-backend
   ```

2. Make the deployment script executable:
   ```
   chmod +x deploy.sh
   ```

3. Run the deployment script:
   ```
   ./deploy.sh
   ```

4. Follow the prompts to configure your environment with your existing database credentials and Firebase configuration

### Accessing the API on EC2

After deployment, the API will be accessible at:

```
http://<Your EC2 Public IP>:5000/api/scans
http://<Your EC2 Public IP>:5000/auth/verify
```

For better accessibility, consider:

1. Setting up a domain name using AWS Route 53 or another DNS provider
2. Configuring HTTPS using a service like Let's Encrypt
3. Setting up a reverse proxy like Nginx to handle SSL termination and serve the API on port 80/443

## License

ISC