import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    
    // Replace with your server URL if different
    return io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', options);
};
