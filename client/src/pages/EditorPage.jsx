import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import Client from '../components/Client';
import { getRandomColor } from '../utils/colors';
import { initSocket } from '../services/socket';
import { useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { executeCode, chatWithAI } from '../services/api';

const EditorPage = () => {
    const socketRef = useRef(null);
    const editorRef = useRef(null);
    const aiScrollRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [code, setCode] = useState('// Start coding here...');
    const [output, setOutput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [language, setLanguage] = useState('javascript');
    
    // AI Assistant State
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiMessages, setAiMessages] = useState([]);
    const [isAILoading, setIsAILoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            
            // Error handling for socket connection
            socketRef.current.on('connect_error', handleErrors);
            socketRef.current.on('connect_failed', handleErrors);

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            // Join the room
            socketRef.current.emit('join-room', {
                roomId,
                username: location.state?.username || `User_${Math.floor(Math.random() * 1000)}`,
            });

            // Listening for joined event
            socketRef.current.on('joined', ({ username, socketId }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the room.`);
                }
            });

            // Requirement 2: Dynamic Sidebar UI Updates
            socketRef.current.on('user-list-updated', (users) => {
                const localUsername = location.state?.username;

                // 1. Filter out duplicates by username, prioritizing synced users
                const uniqueUsersMap = new Map();
                users.forEach(user => {
                    if (!uniqueUsersMap.has(user.username) || user.isSynced) {
                        uniqueUsersMap.set(user.username, user);
                    }
                });

                // 2. Sort users: Local user always first, then others by joinedAt
                const sortedUsers = Array.from(uniqueUsersMap.values()).sort((a, b) => {
                    if (a.username === localUsername) return -1;
                    if (b.username === localUsername) return 1;
                    return b.joinedAt - a.joinedAt;
                });

                const usersWithColors = sortedUsers.map(u => ({
                    ...u,
                    color: getRandomColor(u.username),
                    isLocal: u.username === localUsername
                }));
                setClients(usersWithColors);
            });

            // Listening for disconnected (legacy, but keep for robustness)
            socketRef.current.on('disconnected', ({ socketId, username }) => {
                // The 'user-list-updated' event will handle the UI state
                // We just show a notification here
                if (username) {
                    toast.error(`${username} left the room.`);
                }
            });

            // Listening for code change from server
            socketRef.current.on('CODE_CHANGE_RECEIVE', ({ code }) => {
                if (code !== null) {
                    setCode(code);
                }
            });
        };
        init();

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.off('connect_error');
                socketRef.current.off('connect_failed');
                socketRef.current.off('joined');
                socketRef.current.off('user-list-updated');
                socketRef.current.off('disconnected');
                socketRef.current.off('CODE_CHANGE_RECEIVE');
                socketRef.current.disconnect();
            }
        };
    }, [roomId, location.state?.username, reactNavigator]);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
    };

    const handleEditorChange = (value) => {
        setCode(value);
        // Emit code change to server
        socketRef.current.emit('CODE_CHANGE', {
            roomId,
            code: value,
        });
    };

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard');
        } catch (err) {
            toast.error('Could not copy Room ID');
        }
    };

    const leaveRoom = () => {
        reactNavigator('/');
    };

    const runCode = async () => {
        setIsLoading(true);
        try {
            const result = await executeCode(language, code);
            const { stdout, stderr } = result.run;
            setOutput(stdout || stderr);
            setIsError(!!stderr);
            if (stderr) {
                toast.error('Execution finished with errors');
            } else {
                toast.success('Code executed successfully');
            }
        } catch (err) {
            console.error(err);
            const errorMsg = err.response?.data?.details?.message || err.response?.data?.error || 'Could not reach execution server';
            toast.error('Failed to execute code');
            setOutput(`Error: ${errorMsg}`);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAISubmit = async (e) => {
        if (e) e.preventDefault();
        
        // 1. Validation before triggering any logic
        const trimmedPrompt = aiPrompt.trim();
        const currentCode = code || '';
        
        if (!trimmedPrompt) {
            toast.error('Please enter a question for the AI assistant.');
            return;
        }

        if (isAILoading) return;

        // 2. Prepare UI for response
        const userMessage = { role: 'user', content: trimmedPrompt };
        
        // Clear input and update loading state immediately
        setAiPrompt('');
        setIsAILoading(true);
        
        // Update messages with user message and placeholder for AI
        setAiMessages(prev => [...prev, userMessage, { role: 'ai', content: '' }]);

        const aiMessageIndex = aiMessages.length + 1;
        let aiResponseContent = '';

        try {
            // 3. Structured payload stringification (handled by chatWithAI)
            await chatWithAI(trimmedPrompt, currentCode, language, (chunk, isDone) => {
                if (isDone) {
                    setIsAILoading(false);
                    return;
                }
                aiResponseContent += chunk;
                setAiMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages[aiMessageIndex]) {
                        newMessages[aiMessageIndex] = { role: 'ai', content: aiResponseContent };
                    }
                    return newMessages;
                });
            });
        } catch (err) {
            console.error('AI Error:', err);
            const userFriendlyError = err.message || 'AI Assistant is currently unavailable';
            toast.error(userFriendlyError);
            setIsAILoading(false);
            
            // Update the placeholder with the actual error message
            setAiMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > aiMessageIndex) {
                    newMessages[aiMessageIndex] = { 
                        role: 'ai', 
                        content: `Error: ${userFriendlyError}` 
                    };
                }
                return newMessages;
            });
        }
    };

    useEffect(() => {
        if (aiScrollRef.current) {
            aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
        }
    }, [aiMessages]);

    return (
        <div className="flex h-screen w-full bg-[#1e1e1e] text-white overflow-hidden">
            {/* Left Sidebar */}
            <aside className="w-64 bg-[#141414] border-r border-gray-800 flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-xl">C</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">CodeSync</h1>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-gray-500 uppercase text-xs font-bold tracking-widest">
                            CONNECTED USERS ({clients.length})
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-y-6 gap-x-2">
                        {clients.map((client) => (
                            <Client 
                                key={client.socketId} 
                                username={client.username} 
                                color={client.color} 
                                isSynced={client.isSynced}
                                isLocal={client.isLocal}
                            />
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-800 flex flex-col gap-3">
                    <button 
                        onClick={copyRoomId}
                        className="w-full bg-white text-black font-semibold py-2 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        Copy Room ID
                    </button>
                    <button 
                        onClick={leaveRoom}
                        className="w-full bg-red-500/10 text-red-500 font-semibold py-2 rounded-md hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                    >
                        Leave Room
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Main Editor Section */}
                <main className="flex-1 flex flex-col min-w-0">
                    <div className="h-12 bg-[#1a1a1a] border-b border-gray-800 flex items-center px-4 justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <select 
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-gray-800 px-2 py-0.5 rounded text-xs uppercase font-mono border-none outline-none cursor-pointer hover:bg-gray-700 transition-colors"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                            className={`flex items-center gap-2 px-3 py-1 rounded font-semibold text-sm transition-all ${
                                isAIPanelOpen 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI Assistant
                        </button>
                        <button 
                            onClick={runCode}
                            disabled={isLoading}
                            className={`flex items-center gap-2 px-4 py-1 rounded font-semibold text-sm transition-all ${
                                isLoading 
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                                : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                            }`}
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            )}
                            {isLoading ? 'Running...' : 'Run Code'}
                        </button>
                        <span className="text-xs text-green-500 flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    </div>
                </div>
                <div className="flex-1 relative flex flex-col">
                    <div className="flex-1">
                        <Editor
                            height="100%"
                            language={language}
                            value={code}
                            theme="vs-dark"
                            onMount={handleEditorDidMount}
                            options={{
                                fontSize: 16,
                                minimap: { enabled: true },
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                cursorBlinking: 'smooth',
                                formatOnPaste: true,
                            }}
                            onChange={handleEditorChange}
                        />
                    </div>
                    
                    {/* Terminal Output */}
                    <div className="h-48 bg-[#0f0f0f] border-t border-gray-800 flex flex-col">
                        <div className="h-8 bg-[#1a1a1a] border-b border-gray-800 px-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Console Output</span>
                            <button 
                                onClick={() => setOutput('')}
                                className="text-[10px] text-gray-500 hover:text-white transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                        <div className="flex-1 p-4 font-mono text-sm overflow-y-auto whitespace-pre-wrap">
                            {output ? (
                                <pre className={isError ? 'text-red-400' : 'text-green-400'}>
                                    {output}
                                </pre>
                            ) : (
                                <span className="text-gray-600 italic">No output yet. Click "Run Code" to execute.</span>
                            )}
                        </div>
                    </div>
                </div>
            </main>

                {/* AI Assistant Side Panel */}
                {isAIPanelOpen && (
                    <aside className="w-96 bg-[#141414] border-l border-gray-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="h-12 bg-[#1a1a1a] border-b border-gray-800 px-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold uppercase tracking-wider">AI Debugger</span>
                            </div>
                            <button 
                                onClick={() => setIsAIPanelOpen(false)}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div 
                            ref={aiScrollRef}
                            className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scroll-smooth"
                        >
                            {aiMessages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-gray-300 font-semibold mb-2">How can I help you?</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Ask me to debug your code, explain a concept, or suggest improvements.
                                    </p>
                                </div>
                            ) : (
                                aiMessages.map((msg, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        <div className={`max-w-[90%] p-3 rounded-lg text-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-purple-600 text-white rounded-tr-none' 
                                            : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
                                        }`}>
                                            <div className="whitespace-pre-wrap leading-relaxed">
                                                {msg.content || (
                                                    <span className="flex gap-1">
                                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form 
                            onSubmit={handleAISubmit}
                            className="p-4 border-t border-gray-800 bg-[#1a1a1a]"
                        >
                            <div className="relative">
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ask the AI assistant..."
                                    rows="3"
                                    className="w-full bg-[#0f0f0f] border border-gray-700 rounded-lg p-3 pr-10 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none placeholder:text-gray-600"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAISubmit(e);
                                        }
                                    }}
                                />
                                <button 
                                    type="submit"
                                    disabled={!aiPrompt.trim() || isAILoading}
                                    className="absolute right-2 bottom-2 p-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 transition-all"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">
                                AI can make mistakes. Check important info.
                            </p>
                        </form>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default EditorPage;
