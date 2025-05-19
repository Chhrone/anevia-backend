'use strict';

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const Scan = require('../models/scan');
const AnemiaDetectionModel = require('../models/anemiaDetectionModel');

// Use fs.promises for file operations
const fsPromises = fs.promises;

const generateScanId = () => {
    // Generate a random 8-character string
    return uuidv4().replace(/-/g, '').substring(0, 8);
};

exports.uploadScan = async (request, h) => {
    try {
        const { payload } = request;
        const { image } = payload;

        if (!image) {
            return h.response({
                status: 'fail',
                message: 'No image uploaded'
            }).code(400);
        }

        // Generate a random 8-character scanId
        const scanId = generateScanId();

        // Create directory if it doesn't exist
        const uploadDir = path.join(__dirname, '../../images/scans');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Get file extension
        const filename = image.hapi.filename;
        const extension = path.extname(filename);

        // Create file path
        const filepath = path.join(uploadDir, `scan-${scanId}${extension}`);

        // Save the file
        const buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            image.on('data', (chunk) => {
                chunks.push(chunk);
            });
            image.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
            image.on('error', reject);
        });

        await fsPromises.writeFile(filepath, buffer);

        // Create photo URL
        const photoUrl = `/scans/scan-${scanId}${extension}`;

        // Record the timestamp when the image was received
        const scanDate = new Date();

        // Analyze the image with the anemia detection model
        const scanResult = await AnemiaDetectionModel.analyzeImage(buffer);

        // Create scan record
        const scan = new Scan({
            scanId,
            photoUrl,
            scanResult, // true or false based on anemia detection
            scanDate
        });

        // Save scan to database
        await Scan.add(scan);

        return h.response({
            status: 'success',
            message: 'Image uploaded successfully',
            data: {
                scanId,
                photoUrl,
                scanResult,
                scanDate
            }
        }).code(201);
    } catch (error) {
        console.error(error);
        return h.response({
            status: 'error',
            message: 'An error occurred while uploading the image'
        }).code(500);
    }
};
