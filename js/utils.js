// Utility functions for Eternal League Baseball

const Utils = {
    // Random number generation
    random: (min, max) => {
        return Math.random() * (max - min) + min;
    },

    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Weighted random selection
    weightedRandom: (weights) => {
        const total = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * total;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i;
        }
        return weights.length - 1;
    },

    // Clamp stat values (can go negative or >100, but won't break calculations)
    clampStat: (value) => {
        return Math.max(-100, Math.min(200, value));
    },

    // Normalize stat to 0-1 range for probability calculations
    // Stats can be negative or >100, but we normalize for calculations
    normalizeStatForProbability: (stat) => {
        // Clamp between 0-100 for probability purposes
        const clamped = Math.max(0, Math.min(100, stat));
        return clamped / 100;
    },

    // Calculate success probability based on stat (75% stat-based, 25% random)
    calculateSuccessProbability: (stat) => {
        const normalized = Utils.normalizeStatForProbability(stat);
        const statPortion = normalized * 0.75;
        const randomPortion = Math.random() * 0.25;
        return statPortion + randomPortion;
    },

    // Opposed roll between two stats (e.g., batter contact vs pitcher control)
    opposedRoll: (stat1, stat2) => {
        const prob1 = Utils.calculateSuccessProbability(stat1);
        const prob2 = Utils.calculateSuccessProbability(stat2);
        return prob1 > prob2;
    },

    // Generate random name
    generateName: () => {
        const firstNames = [
            'Alex', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Riley', 'Quinn',
            'Avery', 'Cameron', 'Dakota', 'Parker', 'Skyler', 'Jamie', 'Rowan',
            'Sam', 'Charlie', 'Jesse', 'Blake', 'Reese', 'Sage', 'River',
            'Phoenix', 'Hayden', 'Peyton', 'Drew', 'Ellis', 'Finley', 'Indigo'
        ];

        const lastNames = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
            'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
            'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
            'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Hill',
            'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell',
            'Starfall', 'Moonwhisper', 'Thunderstrike', 'Blazeheart', 'Stormwind',
            'Ashborne', 'Ironside', 'Silverfang', 'Goldleaf', 'Darkwater'
        ];

        return `${firstNames[Utils.randomInt(0, firstNames.length - 1)]} ${lastNames[Utils.randomInt(0, lastNames.length - 1)]}`;
    },

    // Generate random team name
    generateTeamName: () => {
        const adjectives = [
            'Eternal', 'Infinite', 'Cosmic', 'Mystic', 'Blazing', 'Thunder',
            'Shadow', 'Crystal', 'Iron', 'Golden', 'Silver', 'Crimson',
            'Phantom', 'Obsidian', 'Radiant', 'Volcanic', 'Frozen', 'Wild',
            'Rogue', 'Noble', 'Ancient', 'Mighty', 'Royal', 'Savage'
        ];

        const nouns = [
            'Dragons', 'Phoenixes', 'Wolves', 'Bears', 'Tigers', 'Eagles',
            'Serpents', 'Lions', 'Hawks', 'Falcons', 'Panthers', 'Vipers',
            'Titans', 'Giants', 'Warriors', 'Knights', 'Reapers', 'Hunters',
            'Guardians', 'Legends', 'Champions', 'Storms', 'Thunder', 'Lightning'
        ];

        return `${adjectives[Utils.randomInt(0, adjectives.length - 1)]} ${nouns[Utils.randomInt(0, nouns.length - 1)]}`;
    },

    // Format number with commas
    formatNumber: (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    // Calculate distance between two points
    distance: (x1, y1, x2, y2) => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },

    // Linear interpolation
    lerp: (start, end, t) => {
        return start + (end - start) * t;
    },

    // Get position descriptions
    getPositionName: (position) => {
        const positions = {
            'P': 'Pitcher',
            'C': 'Catcher',
            '1B': 'First Base',
            '2B': 'Second Base',
            '3B': 'Third Base',
            'SS': 'Shortstop',
            'LF': 'Left Field',
            'CF': 'Center Field',
            'RF': 'Right Field'
        };
        return positions[position] || position;
    },

    // Delay utility for async operations
    delay: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Deep clone object
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    }
};
