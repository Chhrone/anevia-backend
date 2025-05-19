'use strict';

const scanController = require('../controllers/scanController');

module.exports = [
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
    }
];
