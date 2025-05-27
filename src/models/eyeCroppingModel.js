'use strict';

const axios = require('axios');
const FormData = require('form-data');

/**
 * Eye cropping model that uses external API for conjunctiva extraction
 * Sends eye images to external endpoint and returns cropped conjunctiva image
 */
class EyeCroppingModel {
    /**
     * Process an eye image to extract the conjunctiva region using external API
     * @param {Buffer} imageBuffer - The original eye image data as a buffer
     * @returns {Promise<Buffer>} - A buffer containing the cropped conjunctiva image
     */
    static async extractConjunctiva(imageBuffer) {
        try {
            // Create form data for multipart/form-data request
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'eye_image.jpg',
                contentType: 'image/jpeg'
            });

            // API endpoint for conjunctiva cropping at localhost:8000
            const CROPPING_API_URL = process.env.EYE_CROPPING_API_URL || 'http://localhost:8000/crop/';
            const response = await axios.post(CROPPING_API_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Content-Type': 'multipart/form-data'
                },
                responseType: 'arraybuffer', // Important: to receive image data as buffer
                timeout: 30000 // 30 second timeout
            });

            // Convert response data to Buffer
            const conjunctivaBuffer = Buffer.from(response.data);

            console.log('Eye cropping completed successfully - received PNG image');
            return conjunctivaBuffer;

        } catch (error) {
            console.error('Error in eye cropping model:', error.message);

            // Fallback: return original image if API fails
            console.log('Falling back to original image due to API error');
            return imageBuffer;
        }
    }
}

module.exports = EyeCroppingModel;
