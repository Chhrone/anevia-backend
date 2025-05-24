'use strict';

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');
const Scan = require('../models/scan');
const User = require('../models/user');
const ChatSession = require('../models/chatSession');
const Chat = require('../models/chat');

// Access API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// age calculator
const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

exports.startChatFromScan = async (request, h) => {
    try {
        const { scanId, userId } = request.payload;

        if (!scanId || !userId) {
            return h.response({
                status: 'fail',
                message: 'scanId and userId are required'
            }).code(400);
        }

        // 1. Fetch Scan Data
        const scan = await Scan.findByScanId(scanId);
        if (!scan) {
            return h.response({
                status: 'fail',
                message: `Scan with ID ${scanId} not found`
            }).code(404);
        }

        // 2. Fetch User Age (Optional)
        let userAge = null;
        const user = await User.findByUid(userId);
        if (user && user.birthdate) {
            userAge = calculateAge(user.birthdate);
        }

        // 3. Create New Chat Session
        const sessionId = uuidv4();
        const newSession = new ChatSession({
            sessionId,
            userId,
            title: `Chat with ChatVia! about Scan ${scanId}`, // Default title
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await ChatSession.add(newSession);

        // 4. Construct Initial Message for Gemini
        let initialMessageText = `Data hasil scan:
Scan ID: ${scan.scanId}
Photo URL: ${scan.photoUrl}
Hasil Scan (Anemia): ${scan.scanResult ? 'Terdeteksi' : 'Tidak Terdeteksi'}
Tanggal Scan: ${scan.scanDate.toLocaleString()}`;

        if (userAge !== null) {
            initialMessageText += `\nUmur Pengguna: ${userAge} tahun`;
        }

        initialMessageText += `\n\nJawab pesan ini dengan teks seperti: "Halo! Saya ChatVia, asisten Anda untuk pertanyaan seputar anemia. Silakan ajukan pertanyaan Anda."`; // Instruct Gemini for initial response

        // 5. Integrate Gemini Model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" }); // Using gemini-2.5-flash-preview-05-20 as a general-purpose model

        const chat = model.startChat({
            history: [], // Start with empty history for the first message
            generationConfig: {
                maxOutputTokens: 65536, // Set to maximum allowed
            },
            safetySettings: [ // Added safety settings to disable filters
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ],
        });

        // Set system instruction
        const systemInstruction = "Kamu adalah asisten model yang mendeteksi anemia, tugas kamu adalah menyediakan saran kepada pengguna mengenai kesehatan agar mereka bisa sembuh atau untuk menghindari jatuh sakit";

        // Send initial message to Gemini
        const result = await chat.sendMessage(initialMessageText, {
            systemInstruction: systemInstruction
        });
        // console.log('Raw Gemini result:', result); // Removed log
        // console.log('Gemini candidates:', result.response.candidates); // Removed log

        let responseText = '';
        if (result.response && result.response.text) {
            responseText = result.response.text();
        } else if (result.response && result.response.candidates && result.response.candidates.length > 0 && result.response.candidates[0].content && result.response.candidates[0].content.parts && result.response.candidates[0].content.parts.length > 0 && result.response.candidates[0].content.parts[0].text) {
            // Fallback to direct access if .text() doesn't work as expected
            responseText = result.response.candidates[0].content.parts[0].text;
        }
        
        // console.log('Extracted Gemini responseText:', responseText); // Removed log

        // 6. Save Chat Messages
        const programMessage = new Chat({
            sessionId,
            sender: 'user', // The program sends the initial data as if from the user's context
            message: initialMessageText,
            photoUrl: scan.photoUrl, // Include photo URL for context
            timestamp: new Date(),
            type: 'text' // Assuming text for now, could be 'image' if Gemini supports it directly
        });
        await Chat.add(programMessage);

        const aiMessage = new Chat({
            sessionId,
            sender: 'ai',
            message: responseText,
            photoUrl: null,
            timestamp: new Date(),
            type: 'text'
        });
        await Chat.add(aiMessage);

        // 7. Return Response
        return h.response({
            status: 'success',
            message: 'Chat session started successfully with ChatVia!',
            data: {
                sessionId,
                initialMessage: programMessage,
                aiResponse: aiMessage
            }
        }).code(201);

    } catch (error) {
        console.error('Error starting chat from scan:', error);
        return h.response({
            status: 'error',
            message: 'An error occurred while starting the chat session.'
        }).code(500);
    }
};

exports.getAllChatSessionsForUser = async (request, h) => {
    try {
        const { userId } = request.params;

        if (!userId) {
            return h.response({
                status: 'fail',
                message: 'userId is required'
            }).code(400);
        }

        const chatSessions = await ChatSession.getAllByUserId(userId);

        return h.response({
            status: 'success',
            message: 'Chat sessions fetched successfully',
            data: {
                chatSessions
            }
        }).code(200);

    } catch (error) {
        console.error('Error fetching chat sessions for user:', error);
        return h.response({
            status: 'error',
            message: 'An error occurred while fetching chat sessions.'
        }).code(500);
    }
};

exports.getChatMessagesBySessionId = async (request, h) => {
    try {
        const { userId, sessionId } = request.params;

        if (!userId || !sessionId) {
            return h.response({
                status: 'fail',
                message: 'userId and sessionId are required'
            }).code(400);
        }

        // 1. Fetch existing chat session to verify ownership
        const chatSession = await ChatSession.findBySessionId(sessionId);
        if (!chatSession) {
            return h.response({
                status: 'fail',
                message: `Chat session with ID ${sessionId} not found`
            }).code(404);
        }

        // Ensure the user requesting the messages is the owner of the session
        if (chatSession.userId !== userId) {
            return h.response({
                status: 'fail',
                message: 'Unauthorized: User does not own this chat session'
            }).code(403);
        }

        // 2. Fetch chat messages
        const chatMessages = await Chat.getMessagesBySessionId(sessionId);

        return h.response({
            status: 'success',
            message: 'Chat messages fetched successfully',
            data: {
                chatMessages
            }
        }).code(200);

    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return h.response({
            status: 'error',
            message: 'An error occurred while fetching chat messages.'
        }).code(500);
    }
};

exports.sendMessage = async (request, h) => {
    try {
        const { sessionId, userId, message } = request.payload;

        if (!sessionId || !userId || !message) {
            return h.response({
                status: 'fail',
                message: 'sessionId, userId, and message are required'
            }).code(400);
        }

        // 1. Fetch existing chat session
        const chatSession = await ChatSession.findBySessionId(sessionId);
        if (!chatSession) {
            return h.response({
                status: 'fail',
                message: `Chat session with ID ${sessionId} not found`
            }).code(404);
        }

        // Ensure the user sending the message is the owner of the session
        if (chatSession.userId !== userId) {
            return h.response({
                status: 'fail',
                message: 'Unauthorized: User does not own this chat session'
            }).code(403);
        }

        // 2. Add user's message to database
        const userMessage = new Chat({
            sessionId,
            sender: 'user',
            message,
            photoUrl: null, // Assuming no photo for regular chat messages
            timestamp: new Date(),
            type: 'text'
        });
        await Chat.add(userMessage);

        // 3. Fetch existing chat history to send to Gemini
        const chatHistory = await Chat.getMessagesBySessionId(sessionId);

        // Convert chat history to Gemini's expected format
        const geminiHistory = chatHistory.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model', // Gemini uses 'user' and 'model' roles
            parts: [{ text: msg.message }]
        }));

        // 4. Integrate Gemini Model
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        const chat = model.startChat({
            history: geminiHistory,
            generationConfig: {
                maxOutputTokens: 65536, // Set to maximum allowed
            },
            safetySettings: [ // Added safety settings to disable filters
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ],
        });

        // Set system instruction (re-apply for each message to ensure context)
        const systemInstruction = "Kamu adalah asisten model yang mendeteksi anemia, tugas kamu adalah menyediakan saran kepada pengguna mengenai kesehatan agar mereka bisa sembuh atau untuk menghindari jatuh sakit";

        // Send the new user message to Gemini
        const result = await chat.sendMessage(message, {
            systemInstruction: systemInstruction
        });
        const aiResponseText = result.response.text();
        console.log('Raw Gemini result for sendMessage:', result); // Add log for sendMessage
        console.log('Extracted Gemini responseText for sendMessage:', aiResponseText); // Add log for sendMessage

        // Check if AI response is empty (likely due to safety filters)
        let finalAiResponseText = aiResponseText;
        if (!finalAiResponseText || finalAiResponseText.trim() === '') {
            finalAiResponseText = "Maaf, saya tidak dapat memproses pertanyaan tersebut karena melanggar pedoman keamanan. Mohon ajukan pertanyaan Anda dengan cara yang berbeda.";
            console.warn('Gemini response was empty, likely due to safety filters. Sending a fallback message.');
        }

        // 5. Save Gemini's response to database
        const aiMessage = new Chat({
            sessionId,
            sender: 'ai',
            message: finalAiResponseText, // Use finalAiResponseText
            photoUrl: null,
            timestamp: new Date(),
            type: 'text'
        });
        await Chat.add(aiMessage);

        // 6. Update chat session's updated_at timestamp
        await ChatSession.updateUpdatedAt(sessionId);

        // 7. Return Response
        return h.response({
            status: 'success',
            message: 'Message sent and AI responded successfully',
            data: {
                sessionId,
                userMessage: userMessage,
                aiResponse: aiMessage
            }
        }).code(200);

    } catch (error) {
        console.error('Error sending message in chat:', error);
        return h.response({
            status: 'error',
            message: 'An error occurred while sending the message.'
        }).code(500);
    }
};
