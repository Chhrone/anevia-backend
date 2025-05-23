'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const Scan = require('../models/scan');

// Initialize the Gemini API with the API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    // System instruction for the anemia analysis assistant
    this.systemInstruction = "You are an assistant anemia analyze. you provide advice on how to cure or prevent anemia based on the image and report given to you";
  }

  /**
   * Initialize a chat with the Gemini model
   * @returns {object} - The Gemini chat session
   */
  async initializeChat() {
    try {
      // Get the generative model (Gemini)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Start a chat session with the system instruction
      const chat = model.startChat({
        systemInstruction: this.systemInstruction,
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
        },
      });

      return chat;
    } catch (error) {
      console.error('Error initializing Gemini chat:', error);
      throw error;
    }
  }

  /**
   * Provide context about a scan and get initial advice from Gemini
   * @param {string} scanId - The scan ID
   * @returns {Promise<string>} - The AI response
   */
  async provideScanContext(scanId) {
    try {
      // Initialize a new chat session
      const chat = await this.initializeChat();

      // Get the scan result from the database
      const scan = await Scan.findByScanId(scanId);
      if (!scan) {
        throw new Error(`Scan with ID ${scanId} not found`);
      }

      // Read the image file to provide as context
      const imagePath = path.join(__dirname, '../../images/scans', path.basename(scan.photoUrl));
      let imageData;
      try {
        imageData = await fs.promises.readFile(imagePath);
      } catch (error) {
        console.error(`Error reading scan image: ${error.message}`);
        // Continue without the image if it can't be read
      }
      
      // Prepare the message with the scan result
      const anemiaStatus = scan.scanResult ? "positive" : "negative";
      const messageText = `This user has had an eye conjunctiva scan for anemia detection. The scan result was ${anemiaStatus} for anemia. Please provide initial advice about anemia based on this result.`;
      
      // Send the message to Gemini with the image as context if available
      const messages = [];
      
      if (imageData) {
        // Convert the image to base64 and add it as context
        const base64Image = imageData.toString('base64');
        messages.push({
          inlineData: {
            data: base64Image,
            mimeType: "image/jpeg"
          }
        });
      }
      
      messages.push(messageText);
      
      const result = await chat.sendMessageStream(messages);

      // Process the response
      let response = '';
      for await (const chunk of result.stream) {
        response += chunk.text();
      }

      return response;
    } catch (error) {
      console.error('Error providing scan context to Gemini:', error);
      throw error;
    }
  }

  /**
   * Send a message to the Gemini model and get a response
   * @param {string} message - The user message
   * @param {object} chat - The Gemini chat session
   * @returns {Promise<string>} - The AI response
   */
  async sendMessage(message, chat) {
    try {
      // Send the message to Gemini
      const result = await chat.sendMessageStream(message);
      
      // Process the response
      let response = '';
      for await (const chunk of result.stream) {
        response += chunk.text();
      }

      return response;
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      throw error;
    }
  }
}

module.exports = new GeminiService();
