# Anevia Backend

A Node.js backend application for the Anevia eye conjunctiva scanning system for anemia detection.

## Features

- Upload and process eye conjunctiva images
- Detect anemia using a simulated model
- Store scan results in PostgreSQL database
- RESTful API for client applications

## Tech Stack

- Node.js
- Hapi.js framework
- PostgreSQL database
- UUID for generating unique scan IDs

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database

## Local Development Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd anevia-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a PostgreSQL database:
   ```sql
   CREATE DATABASE anevia_db;
   CREATE USER anevia_admin WITH ENCRYPTED PASSWORD 'anevia';
   GRANT ALL PRIVILEGES ON DATABASE anevia_db TO anevia_admin;
   ```

4. Create the required table:
   ```sql
   CREATE TABLE scans (
     scan_id VARCHAR(10) PRIMARY KEY,
     photo_url VARCHAR(255) NOT NULL,
     scan_result BOOLEAN NOT NULL,
     scan_date TIMESTAMP NOT NULL
   );
   ```

5. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

6. Start the development server:
   ```
   npm run dev
   ```

## AWS EC2 Deployment

### Option 1: Manual Deployment

1. Launch an EC2 instance (Amazon Linux 2 or Ubuntu recommended)

2. Install Node.js and PostgreSQL on the instance

3. Clone the repository:
   ```
   git clone <repository-url>
   cd anevia-backend
   ```

4. Set up the database as described in the local setup

5. Install dependencies:
   ```
   npm install
   ```

6. Create a `.env` file with appropriate values:
   ```
   cp .env.example .env
   nano .env  # Edit with your values
   ```

7. Start the server:
   ```
   npm start
   ```

8. (Optional) Use PM2 to keep the application running:
   ```
   npm install -g pm2
   pm2 start server.js --name "anevia-backend"
   pm2 save
   pm2 startup
   ```

### Option 2: Using the Deployment Script

**Note:** This script assumes you already have a PostgreSQL database set up on your EC2 instance with the required 'scans' table. The script will NOT create or modify your database schema, only configure the connection.

1. Clone the repository on your EC2 instance:
   ```
   git clone <repository-url>
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

4. Follow the prompts to configure your environment with your existing database credentials

## API Endpoints

### POST /api/scans

Upload an eye conjunctiva image for anemia detection.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - image: File (image)

**Response:**
```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "scanId": "a1b2c3d4",
    "photoUrl": "/scans/scan-a1b2c3d4.jpg",
    "scanResult": true,
    "scanDate": "2023-05-20T12:34:56.789Z"
  }
}
```

## Testing

You can test the API using tools like Postman, cURL, or any HTTP client that can send multipart/form-data requests to the `/api/scans` endpoint.

### Example cURL command:

```bash
curl -X POST \
  http://localhost:5000/api/scans \
  -H 'Content-Type: multipart/form-data' \
  -F 'image=@/path/to/your/image.jpg'
```

Replace `/path/to/your/image.jpg` with the actual path to an image file on your system.

## License

ISC
