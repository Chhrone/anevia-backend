'use strict';

const scanController = require('../controllers/scanController');

module.exports = [
    // POST endpoint to upload a new scan
    {
        method: 'POST',
        path: '/api/scans',
        options: {
            payload: {
                output: 'stream',
                parse: true,
                allow: 'multipart/form-data',
                multipart: true,
                maxBytes: 10 * 1024 * 1024 // 10MB max file size
            },
            handler: scanController.uploadScan
        }
    },

    // GET endpoint to retrieve all scans
    {
        method: 'GET',
        path: '/api/scans',
        handler: scanController.getAllScans
    },

    // GET endpoint to retrieve a specific scan by ID
    {
        method: 'GET',
        path: '/api/scans/{id}',
        handler: scanController.getScanById
    }
];
