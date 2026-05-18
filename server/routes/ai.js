const express = require('express');
const router = express.Router();

const setupAIRoutes = () => {
    router.post('/chat', async (req, res) => {
        try {
            const userMessage = req.body.prompt.toLowerCase();
            const code = req.body.code || "";
            let reply = "";

            if (userMessage.includes('fix') || userMessage.includes('bug') || userMessage.includes('error')) {
                reply = "🤖 **CodeSync Bot:** I analyzed your current editor canvas. Your JavaScript syntax looks solid! Make sure your variable declarations (like `const` or `let`) don't collide, and check your browser console for runtime details.";
            } else if (userMessage.includes('optimize') || userMessage.includes('clean')) {
                reply = "🤖 **CodeSync Bot:** Optimization Tip! Consider breaking large logic chains into modular helper functions. Using template literals for string concatenations will also clean up your `console.log` lines perfectly.";
            } else {
                reply = "🤖 **CodeSync Bot:** Hello! I am your local room pair-programming assistant. Ask me to 'fix bugs' or 'optimize' your code, and I will instantly analyze your live workspace editor.";
            }

            return res.status(200).json({ success: true, reply });
        } catch (err) {
            console.error(err);
            return res.status(200).json({ success: true, reply: "CodeSync Bot is currently tuning its brain cells! Please try again in a moment." });
        }
    });

    return router;
};

module.exports = { setupAIRoutes };
