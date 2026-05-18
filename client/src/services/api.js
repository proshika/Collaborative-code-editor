import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const executeCode = async (language, code) => {
    const response = await axios.post(`${BACKEND_URL}/execute`, {
        language,
        code,
    });
    return response.data;
};

export const chatWithAI = async (prompt, code, language, onChunk) => {
    try {
        // Ensure payload is explicitly structured as simple strings
        const payload = {
            prompt: String(prompt || ""),
            code: String(code || ""),
            language: String(language || "javascript")
        };

        const response = await fetch(`${BACKEND_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.message || data.error || 'AI request failed');
        }

        // For non-streaming, we just call onChunk once with the full reply
        if (data.reply) {
            onChunk(data.reply, false);
            onChunk(null, true); // Signal completion
        }
    } catch (error) {
        console.error('AI Chat Error:', error);
        throw error;
    }
};
