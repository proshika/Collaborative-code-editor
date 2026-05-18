import React from 'react';

const Client = ({ username, color, isSynced, isLocal }) => {
    // Get initials from username
    const initials = username
        ?.split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="flex flex-col items-center gap-2 group relative">
            <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg transition-all duration-300 hover:scale-110 ${
                    isLocal 
                        ? 'border-2 border-indigo-500 ring-2 ring-indigo-500/30' 
                        : 'border-2 border-transparent'
                } ${!isSynced ? 'grayscale' : ''}`}
                style={{ backgroundColor: color }}
            >
                {initials || '?'}
            </div>
            
            <div className="flex flex-col items-center">
                <span className={`text-xs font-medium truncate w-16 text-center transition-colors ${
                    isLocal ? 'text-indigo-400 font-bold' : isSynced ? 'text-gray-300' : 'text-gray-500'
                }`}>
                    {username} {isLocal && '(You)'}
                </span>
            </div>
        </div>
    );
};

export default Client;
