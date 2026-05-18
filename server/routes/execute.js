const express = require('express');
const axios = require('axios');
const router = express.Router();

const JUDGE0_API = 'https://ce.judge0.com/submissions?base64_encoded=false&wait=true';

// Language mapping for Judge0 API (Front-end value -> Judge0 language ID)
// IDs based on Judge0 CE public instance: 93 (Node.js 18.15.0), 92 (Python 3.11.2)
const languageMapping = {
    javascript: 93,
    python: 92,
};

const setupExecuteRoutes = () => {
    router.post('/', async (req, res) => {
        const { language, code } = req.body;

        if (!language || !code) {
            return res.status(400).json({ error: 'Language and code are required' });
        }

        const languageId = languageMapping[language] || 93; // Default to Node.js

        try {
            console.log('--- Code Execution Request (Judge0) ---');
            console.log(`Language ID: ${languageId}`);
            
            const payload = {
                source_code: code,
                language_id: languageId,
                stdin: '',
            };

            const response = await axios.post(JUDGE0_API, payload, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('--- Execution Result ---');
            const { stdout, stderr, compile_output, status, time, memory } = response.data;
            console.log(`Status: ${status?.description}`);
            
            // Map Judge0 response to the structure expected by the frontend
            // Frontend expects { run: { stdout, stderr } }
            res.json({
                run: {
                    stdout: stdout || '',
                    stderr: stderr || compile_output || '',
                    output: stdout || stderr || compile_output || '',
                },
                language: language,
                info: {
                    status: status?.description,
                    time,
                    memory
                }
            });
        } catch (error) {
            console.error('--- Code Execution Error ---');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
                res.status(error.response.status).json({
                    error: 'Compiler API Error',
                    details: error.response.data
                });
            } else {
                console.error('Error Message:', error.message);
                res.status(500).json({ error: 'Internal Server Error during execution' });
            }
        }
    });

    return router;
};

module.exports = { setupExecuteRoutes };
