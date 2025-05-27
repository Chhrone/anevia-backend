'use strict';

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const Scan = require('../models/scan');
const EyeCroppingModel = require('../models/eyeCroppingModel');
const AnemiaDetectionModel = require('../models/anemiaDetectionModel');

// Use fs.promises for file operations
const fsPromises = fs.promises;

const generateScanId = () => {
    // Generate a random 8-character string
    return uuidv4().replace(/-/g, '').substring(0, 8);
};

// Get all scans
exports.getAllScans = async (request, h) => {
    try {
        const scans = await Scan.getAll();

        // Transform data to match the required response format
        const listScans = scans.map(scan => ({
            scanId: scan.scanId,
            photoUrl: scan.photoUrl,
            scanResult: scan.scanResult,
            confidence: scan.confidence,
            scanDate: scan.scanDate
        }));

        return h.response({
            error: false,
            message: 'Scans fetched successfully',
            listScans
        }).code(200);
    } catch (error) {
        console.error('Error fetching scans:', error);
        return h.response({
            error: true,
            message: 'Failed to fetch scans'
        }).code(500);
    }
};

// Get scan by ID
exports.getScanById = async (request, h) => {
    try {
        const { id } = request.params;
        const scan = await Scan.findByScanId(id);

        if (!scan) {
            return h.response({
                error: true,
                message: `Scan with ID ${id} not found`
            }).code(404);
        }

        // Transform data to match the required response format
        const scanData = {
            scanId: scan.scanId,
            photoUrl: scan.photoUrl,
            scanResult: scan.scanResult,
            confidence: scan.confidence,
            scanDate: scan.scanDate
        };

        return h.response({
            error: false,
            message: 'Scan fetched successfully',
            scan: scanData
        }).code(200);
    } catch (error) {
        console.error(`Error fetching scan with ID ${request.params.id}:`, error);
        return h.response({
            error: true,
            message: 'Failed to fetch scan'
        }).code(500);
    }
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

        // Create directories if they don't exist
        const scansDir = path.join(__dirname, '../../images/scans');
        const conjunctivasDir = path.join(__dirname, '../../images/conjunctivas');

        if (!fs.existsSync(scansDir)) {
            fs.mkdirSync(scansDir, { recursive: true });
        }

        if (!fs.existsSync(conjunctivasDir)) {
            fs.mkdirSync(conjunctivasDir, { recursive: true });
        }

        // Get file extension
        const filename = image.hapi.filename;
        const extension = path.extname(filename);

        // Create file paths
        const scanFilepath = path.join(scansDir, `scan-${scanId}${extension}`);
        const conjunctivaFilepath = path.join(conjunctivasDir, `conj-${scanId}${extension}`);

        // Read the image data
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

        // Save the original eye image
        await fsPromises.writeFile(scanFilepath, buffer);

        // Create photo URL for the original image
        const photoUrl = `/scans/scan-${scanId}${extension}`;

        // Step 1: Use the eye cropping model to extract the conjunctiva
        console.log(`Processing image ${scanId} to extract conjunctiva...`);
        const conjunctivaBuffer = await EyeCroppingModel.extractConjunctiva(buffer);

        // Save the cropped conjunctiva image
        await fsPromises.writeFile(conjunctivaFilepath, conjunctivaBuffer);

        // Step 2: Use the anemia detection model to analyze the conjunctiva
        console.log(`Analyzing conjunctiva image ${scanId} for anemia detection...`);
        const detectionResult = await AnemiaDetectionModel.analyzeConjunctiva(conjunctivaBuffer);

        // Extract detection result and confidence
        const scanResult = detectionResult.detection === "Anemic";
        const confidence = detectionResult.confidence.Anemic; // Store the confidence for "Anemic" detection

        // Record the timestamp after all processing is complete
        const scanDate = new Date();

        // Create scan record
        const scan = new Scan({
            scanId,
            photoUrl,
            scanResult, // true if "Anemic", false if "Non-Anemic"
            confidence, // confidence score for anemic detection
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
                detectionDetails: detectionResult, // Include full detection result with both confidence scores
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
