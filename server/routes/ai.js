const express = require('express');
const router = express.Router();

const setupAIRoutes = () => {
    router.post('/chat', async (req, res) => {
        try {
            const userPrompt = req.body.prompt || "";
            const userMessage = userPrompt.toLowerCase();
            const code = req.body.code || "";
            let reply = "";

            // Dynamic logic based on keywords
            if (userMessage.includes('fix') || userMessage.includes('bug') || userMessage.includes('error')) {
                const hasSemicolons = code.includes(';');
                reply = `🤖 **CodeSync Bot (Code Review):** I've scanned your workspace. 
                \n- **Analysis:** Your code seems to have ${code.split('\n').length} lines. ${hasSemicolons ? "I see you're using semicolons consistently." : "Consider adding semicolons for better readability."}
                \n- **Suggestion:** If you're seeing an error, check if all your brackets \`{}\` and parentheses \`()\` are balanced. 
                \n- **Tip:** Use \`console.log()\` to debug the state of your variables before the crash!`;
            } else if (userMessage.includes('explain') || userMessage.includes('how') || userMessage.includes('what')) {
                const variables = code.match(/(const|let|var)\s+(\w+)/g) || [];
                const varNames = variables.map(v => v.split(' ')[1]).join(', ');
                
                reply = `🤖 **CodeSync Bot (Explainer):** Here's a breakdown of your current workspace:
                \n- **Variable Detection:** I found these declarations: ${varNames || "None detected yet"}.
                \n- **Logic Flow:** You're currently working with ${code.length} characters of code. 
                \n- **Need more help?** Ask me to "fix bugs" or "optimize" this specific snippet!`;
            } else if (userMessage.includes('optimize') || userMessage.includes('clean')) {
                reply = `🤖 **CodeSync Bot (Optimization):** To make your code more efficient:
                \n1. **DRY Principle:** Look for repeating logic and move it into a reusable function.
                \n2. **Modern JS:** Ensure you're using \`const\` for values that don't change and arrow functions \`() => {}\` for cleaner syntax.
                \n3. **Readability:** Add comments to complex blocks so your collaborators can follow along!`;
            } else if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
                reply = "🤖 **CodeSync Bot:** Hey there! I'm your live room assistant. I'm currently monitoring your editor. Try asking me to **'explain my code'**, **'fix bugs'**, or **'optimize'** your work!";
            } else {
                reply = `🤖 **CodeSync Bot:** I'm listening! You mentioned: "${userPrompt}". 
                \nTry using keywords like **'fix'**, **'explain'**, or **'optimize'** for a detailed analysis of your live editor canvas.`;
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
