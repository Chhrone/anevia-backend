# Anevia Backend

A Node.js backend application for the Anevia eye conjunctiva scanning system for anemia detection.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
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
   git clone https://github.com/Chhrone/anevia-backend.git
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

4. Follow the prompts to configure your environment with your existing database credentials

### Accessing the API on EC2

After deployment, the API will be accessible at:

```
http://<Your EC2 Public IP>:5000/api/scans
```

For better accessibility, consider:

1. Setting up a domain name using AWS Route 53 or another DNS provider
2. Configuring HTTPS using a service like Let's Encrypt
3. Setting up a reverse proxy like Nginx to handle SSL termination and serve the API on port 80/443

## API Endpoints

### POST /api/scans

Upload an eye conjunctiva image for anemia detection.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - image: File (image)

**Constraints:**
- Maximum file size: 10MB
- Accepted file types: jpg, jpeg, png

**Processing Flow:**
1. Original eye image is saved to `/images/scans/scan-{scanId}.jpg`
2. Eye cropping AI model extracts the conjunctiva region
3. Cropped conjunctiva is saved to `/images/conjunctivas/conj-{scanId}.jpg`
4. Anemia detection AI model analyzes the conjunctiva image
5. Results are stored in the database and returned to the client

**Success Response (201 Created):**
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

**Error Responses:**

- **400 Bad Request**
```json
{
  "status": "fail",
  "message": "Invalid file format or request"
}
```

- **413 Payload Too Large**
```json
{
  "status": "fail",
  "message": "File size exceeds the 10MB limit"
}
```

- **500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Server error while uploading scan"
}
```

### GET /api/scans

Retrieve a list of all scans.

**Request:**
- Method: GET

**Success Response (200 OK):**
```json
{
  "error": false,
  "message": "Scans fetched successfully",
  "listScans": [
    {
      "scanId": "a1b2c3d4",
      "photoUrl": "/scans/scan-a1b2c3d4.jpg",
      "scanResult": true,
      "scanDate": "2023-05-20T12:34:56.789Z"
    },
    {
      "scanId": "e5f6g7h8",
      "photoUrl": "/scans/scan-e5f6g7h8.jpg",
      "scanResult": false,
      "scanDate": "2023-05-19T10:24:36.123Z"
    }
  ]
}
```

**Error Response:**
- **500 Internal Server Error**
```json
{
  "error": true,
  "message": "Failed to fetch scans"
}
```

### GET /api/scans/{id}

Retrieve a specific scan by ID.

**Request:**
- Method: GET
- URL Parameters:
  - id: The scan ID to retrieve

**Success Response (200 OK):**
```json
{
  "error": false,
  "message": "Scan fetched successfully",
  "scan": {
    "scanId": "a1b2c3d4",
    "photoUrl": "/scans/scan-a1b2c3d4.jpg",
    "scanResult": true,
    "scanDate": "2023-05-20T12:34:56.789Z"
  }
}
```

**Error Responses:**

- **404 Not Found**
```json
{
  "error": true,
  "message": "Scan with ID a1b2c3d4 not found"
}
```

- **500 Internal Server Error**
```json
{
  "error": true,
  "message": "Failed to fetch scan"
}
```

## Testing

You can test the API using tools like Postman, cURL, or any HTTP client that can send multipart/form-data requests to the `/api/scans` endpoint.

### Example cURL commands:

#### POST /api/scans (Upload a scan):

**Local testing:**
```bash
curl -X POST \
  http://localhost:5000/api/scans \
  -H 'Content-Type: multipart/form-data' \
  -F 'image=@/path/to/your/image.jpg'
```

**EC2 testing:**
```bash
curl -X POST \
  http://<Your EC2 Public IP>:5000/api/scans \
  -H 'Content-Type: multipart/form-data' \
  -F 'image=@/path/to/your/image.jpg'
```

Replace `/path/to/your/image.jpg` with the actual path to an image file on your system.

#### GET /api/scans (Get all scans):

**Local testing:**
```bash
curl -X GET http://localhost:5000/api/scans
```

**EC2 testing:**
```bash
curl -X GET http://<Your EC2 Public IP>:5000/api/scans
```

#### GET /api/scans/{id} (Get scan by ID):

**Local testing:**
```bash
curl -X GET http://localhost:5000/api/scans/a1b2c3d4
```

**EC2 testing:**
```bash
curl -X GET http://<Your EC2 Public IP>:5000/api/scans/a1b2c3d4
```

Replace `a1b2c3d4` with the actual scan ID you want to retrieve.

## License

ISC
