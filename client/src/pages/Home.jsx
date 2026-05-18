import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Home = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = Math.random().toString(36).substring(2, 11);
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username is required');
            return;
        }

        // Redirect to editor page
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-[#1e1e1e] text-white">
            <div className="bg-[#141414] p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-800">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-2xl">C</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-100">CodeSync</h1>
                </div>

                <div className="flex flex-col gap-4">
                    <h4 className="text-gray-400 text-sm font-semibold mb-2 uppercase tracking-widest">
                        Join or Create Room
                    </h4>
                    
                    <div className="flex flex-col gap-3">
                        <input
                            type="text"
                            className="bg-[#0f0f0f] border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                            placeholder="ROOM ID"
                            onChange={(e) => setRoomId(e.target.value)}
                            value={roomId}
                            onKeyUp={handleInputEnter}
                        />
                        <input
                            type="text"
                            className="bg-[#0f0f0f] border border-gray-700 rounded-lg p-3 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                            placeholder="USERNAME"
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            onKeyUp={handleInputEnter}
                        />
                        <button
                            onClick={joinRoom}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-purple-900/20 mt-2"
                        >
                            Join Room
                        </button>
                    </div>

                    <p className="text-gray-500 text-xs text-center mt-4 leading-relaxed">
                        If you don't have an invite then create &nbsp;
                        <a
                            onClick={createNewRoom}
                            href=""
                            className="text-purple-400 hover:text-purple-300 font-bold border-b border-purple-400/30 transition-colors"
                        >
                            new room
                        </a>
                    </p>
                </div>
            </div>
            
            <footer className="fixed bottom-6 text-gray-600 text-xs font-medium">
                Built with 💜 for developers
            </footer>
        </div>
    );
};

export default Home;
