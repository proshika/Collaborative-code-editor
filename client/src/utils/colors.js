export const COLORS = [
    '#48bb78', // green
    '#4299e1', // blue
    '#f6ad55', // orange
    '#f687b3', // pink
    '#9f7aea', // purple
    '#ed64a1', // rose
    '#ecc94b', // yellow
    '#4fd1c5', // teal
];

export const getRandomColor = (username) => {
    if (!username) {
        return COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    
    // Simple hash function to get stable index
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
};
