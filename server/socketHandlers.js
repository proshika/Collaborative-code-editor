const userSocketMap = {};
const roomCodeMap = {};

/**
 * Get all connected users in a specific room with their sync status
 * @param {object} io - Socket.io instance
 * @param {string} roomId - Room identifier
 * @returns {Array} Array of user objects
 */
function getAllConnectedUsers(io, roomId) {
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    
    // Also include users who are "offline" but in the grace period
    const allUsersInRoom = Object.values(userSocketMap).filter(u => u.roomId === roomId);
    
    return allUsersInRoom.map((user) => {
        return {
            socketId: user.socketId,
            username: user.username,
            isSynced: user.isSynced,
            joinedAt: user.joinedAt,
        };
    });
}

const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);

        // Requirement 1: join-room event
        socket.on('join-room', ({ roomId, username }) => {
            // Map socket ID to user object with isSynced: true
            userSocketMap[socket.id] = { 
                socketId: socket.id, 
                username, 
                roomId, 
                isSynced: true,
                joinedAt: Date.now()
            };
            
            socket.join(roomId);

            const users = getAllConnectedUsers(io, roomId);

            // Requirement 1 & 2: Broadcast updated user list to everyone in the room
            io.to(roomId).emit('user-list-updated', users);

            // Also notify specifically that someone joined
            socket.to(roomId).emit('joined', {
                username,
                socketId: socket.id,
            });

            // Sync current code state if it exists
            if (roomCodeMap[roomId]) {
                socket.emit('CODE_CHANGE_RECEIVE', { code: roomCodeMap[roomId] });
            }
        });

        socket.on('CODE_CHANGE', ({ roomId, code }) => {
            roomCodeMap[roomId] = code;
            socket.to(roomId).emit('CODE_CHANGE_RECEIVE', { code });
        });

        // Requirement 3: Handle disconnection gracefully
        socket.on('disconnecting', () => {
            const rooms = [...socket.rooms];
            
            rooms.forEach((roomId) => {
                if (userSocketMap[socket.id]) {
                    // Temporarily mark status as false (offline)
                    userSocketMap[socket.id].isSynced = false;
                    
                    // Broadcast instantly so peer badge turns red
                    const users = getAllConnectedUsers(io, roomId);
                    io.to(roomId).emit('user-list-updated', users);

                    // 5-second grace period before purging
                    setTimeout(() => {
                        // Check if the user is still in the map and still offline
                        if (userSocketMap[socket.id] && !userSocketMap[socket.id].isSynced) {
                            delete userSocketMap[socket.id];
                            
                            const finalUsers = getAllConnectedUsers(io, roomId);
                            io.to(roomId).emit('user-list-updated', finalUsers);
                            
                            // Clean up room code if it's the last user
                            const remainingInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
                            if (remainingInRoom.length === 0) {
                                delete roomCodeMap[roomId];
                            }
                        }
                    }, 5000);
                }
            });
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
        });
    });
};

module.exports = { setupSocketHandlers };
