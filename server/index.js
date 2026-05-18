require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { setupSocketHandlers } = require('./socketHandlers');
const { setupAIRoutes } = require('./routes/ai');
const { setupExecuteRoutes } = require('./routes/execute');

const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
}));
app.use(express.json());

// Routes
app.use('/ai', setupAIRoutes());
app.use('/execute', setupExecuteRoutes());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Socket.io
setupSocketHandlers(io);

// Export the app for Vercel Serverless
module.exports = app;

// Only listen when running locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
