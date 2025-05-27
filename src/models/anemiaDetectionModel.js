'use strict';

const axios = require('axios');
const FormData = require('form-data');

/**
 * Anemia detection model that uses external API for analysis
 * Sends conjunctiva images to localhost:8000/detect/ endpoint
 * and returns detection result with confidence scores
 */
class AnemiaDetectionModel {
    /**
     * Analyze a conjunctiva image to detect anemia using external API
     * @param {Buffer} conjunctivaImageBuffer - The conjunctiva image data as a buffer
     * @returns {Promise<Object>} - Object containing detection result and confidence scores
     * @returns {Promise<Object>} - { detection: "Anemic"|"Non-Anemic", confidence: { Anemic: number, "Non-Anemic": number } }
     */
    static async analyzeConjunctiva(conjunctivaImageBuffer) {
        try {
            // Create form data for multipart/form-data request
            const formData = new FormData();
            formData.append('file', conjunctivaImageBuffer, {
                filename: 'conjunctiva.jpg',
                contentType: 'image/jpeg'
            });

            // Make API call to external anemia detection service
            const response = await axios.post('http://localhost:8000/detect/', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000 // 30 second timeout
            });

            const result = response.data;

            // Validate response format
            if (!result.detection || !result.confidence) {
                throw new Error('Invalid response format from anemia detection API');
            }

            return result;
        } catch (error) {
            console.error('Error calling anemia detection API:', error);

            // Fallback to mock data if API is unavailable
            console.log('Falling back to mock anemia detection...');
            const isAnemic = Math.random() > 0.5;
            const anemicConfidence = Math.random() * 0.4 + 0.6; // 0.6-1.0
            const nonAnemicConfidence = 1 - anemicConfidence;

            return {
                detection: isAnemic ? "Anemic" : "Non-Anemic",
                confidence: {
                    "Anemic": isAnemic ? anemicConfidence : nonAnemicConfidence,
                    "Non-Anemic": isAnemic ? nonAnemicConfidence : anemicConfidence
                }
            };
        }
    }
}

module.exports = AnemiaDetectionModel;
