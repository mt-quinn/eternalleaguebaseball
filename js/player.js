// Player class for Eternal League Baseball

class Player {
    constructor(name = null, position = 'P', isPitcher = false) {
        this.id = Utils.randomInt(100000, 999999);
        this.name = name || Utils.generateName();
        this.position = position;
        this.isPitcher = isPitcher;

        if (isPitcher) {
            this.initPitcherStats();
        } else {
            this.initPositionPlayerStats();
        }
    }

    initPositionPlayerStats() {
        // Batting stats (1-100 scale)
        this.batting = {
            contact: Utils.randomInt(30, 90),        // Ability to make contact
            power: Utils.randomInt(30, 90),          // Hit distance/velocity
            discipline: Utils.randomInt(30, 90),     // Recognize good pitches
            aggression: Utils.randomInt(30, 90)      // Swing hard tendency
        };

        // Baserunning stats
        this.baserunning = {
            speed: Utils.randomInt(30, 90),          // Running velocity
            stealingSkill: Utils.randomInt(30, 90),  // Ability to steal
            stealingTendency: Utils.randomInt(30, 90), // Likelihood to attempt
            intelligence: Utils.randomInt(30, 90)    // Extra bases, tagging decisions
        };

        // Fielding stats
        this.fielding = {
            fielding: Utils.randomInt(30, 90),       // Clean catch/pickup
            throwingAccuracy: Utils.randomInt(30, 90), // Precision
            throwingPower: Utils.randomInt(30, 90),  // Speed of throws
            speed: Utils.randomInt(30, 90),          // Movement to ball
            reactionTime: Utils.randomInt(30, 90)    // Initial response
        };

        this.pitching = null;
    }

    initPitcherStats() {
        // Pitching stats (1-100 scale)
        this.pitching = {
            velocity: Utils.randomInt(30, 90),       // Pitch speed
            control: Utils.randomInt(30, 90),        // Pitch accuracy
            movement: Utils.randomInt(30, 90),       // Break and deception
            stamina: 100,                            // Current stamina (degrades)
            maxStamina: Utils.randomInt(70, 100)    // Max stamina
        };

        // Pitchers need minimal batting/fielding
        this.batting = {
            contact: Utils.randomInt(10, 40),
            power: Utils.randomInt(10, 40),
            discipline: Utils.randomInt(10, 40),
            aggression: Utils.randomInt(10, 40)
        };

        this.baserunning = {
            speed: Utils.randomInt(10, 50),
            stealingSkill: Utils.randomInt(10, 40),
            stealingTendency: Utils.randomInt(10, 30),
            intelligence: Utils.randomInt(10, 50)
        };

        this.fielding = {
            fielding: Utils.randomInt(30, 70),
            throwingAccuracy: Utils.randomInt(50, 90),
            throwingPower: Utils.randomInt(50, 90),
            speed: Utils.randomInt(20, 60),
            reactionTime: Utils.randomInt(30, 70)
        };
    }

    // Apply stat modifier (percentage-based)
    applyStatModifier(category, statName, percentChange) {
        if (!this[category]) return false;

        const currentValue = this[category][statName];
        const change = currentValue * (percentChange / 100);
        this[category][statName] = Utils.clampStat(currentValue + change);
        return true;
    }

    // Apply random modifier to all stats
    applyRandomModifierAll(percentChange) {
        const categories = this.isPitcher
            ? ['pitching', 'batting', 'baserunning', 'fielding']
            : ['batting', 'baserunning', 'fielding'];

        categories.forEach(category => {
            if (!this[category]) return;
            Object.keys(this[category]).forEach(statName => {
                if (statName !== 'stamina' && statName !== 'maxStamina') {
                    this.applyStatModifier(category, statName, percentChange);
                }
            });
        });
    }

    // Get random stat for modifications
    getRandomStat() {
        const categories = this.isPitcher
            ? ['pitching', 'batting', 'baserunning', 'fielding']
            : ['batting', 'baserunning', 'fielding'];

        const validStats = [];
        categories.forEach(category => {
            if (!this[category]) return;
            Object.keys(this[category]).forEach(statName => {
                if (statName !== 'stamina' && statName !== 'maxStamina') {
                    validStats.push({ category, statName });
                }
            });
        });

        return validStats[Utils.randomInt(0, validStats.length - 1)];
    }

    // Degrade pitcher stamina
    degradeStamina(amount) {
        if (this.pitching) {
            this.pitching.stamina = Math.max(0, this.pitching.stamina - amount);
        }
    }

    // Rest pitcher (between games)
    restPitcher() {
        if (this.pitching) {
            this.pitching.stamina = this.pitching.maxStamina;
        }
    }

    // Get effective stat (accounting for stamina for pitchers)
    getEffectiveStat(category, statName) {
        if (!this[category]) return 0;

        let baseStat = this[category][statName];

        // Pitchers lose effectiveness as stamina decreases
        if (this.isPitcher && category === 'pitching' && this.pitching) {
            const staminaMultiplier = this.pitching.stamina / 100;
            baseStat *= (0.5 + (staminaMultiplier * 0.5)); // 50%-100% effectiveness
        }

        return baseStat;
    }

    // Get overall rating (simplified)
    getOverallRating() {
        let total = 0;
        let count = 0;

        const categories = this.isPitcher
            ? ['pitching', 'batting', 'baserunning', 'fielding']
            : ['batting', 'baserunning', 'fielding'];

        categories.forEach(category => {
            if (!this[category]) return;
            Object.keys(this[category]).forEach(statName => {
                if (statName !== 'stamina' && statName !== 'maxStamina') {
                    total += this[category][statName];
                    count++;
                }
            });
        });

        return count > 0 ? Math.round(total / count) : 50;
    }

    // Clone player (for resurrection)
    clone() {
        const cloned = new Player(this.name, this.position, this.isPitcher);
        cloned.id = this.id;

        if (this.batting) cloned.batting = { ...this.batting };
        if (this.baserunning) cloned.baserunning = { ...this.baserunning };
        if (this.fielding) cloned.fielding = { ...this.fielding };
        if (this.pitching) cloned.pitching = { ...this.pitching };

        return cloned;
    }

    // Serialize for storage
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            position: this.position,
            isPitcher: this.isPitcher,
            batting: this.batting,
            baserunning: this.baserunning,
            fielding: this.fielding,
            pitching: this.pitching
        };
    }

    // Deserialize from storage
    static fromJSON(data) {
        const player = new Player(data.name, data.position, data.isPitcher);
        player.id = data.id;
        player.batting = data.batting;
        player.baserunning = data.baserunning;
        player.fielding = data.fielding;
        player.pitching = data.pitching;
        return player;
    }

    // Get display summary
    getStatsSummary() {
        if (this.isPitcher) {
            return {
                VEL: Math.round(this.pitching.velocity),
                CTL: Math.round(this.pitching.control),
                MOV: Math.round(this.pitching.movement),
                STA: Math.round(this.pitching.maxStamina)
            };
        } else {
            return {
                CON: Math.round(this.batting.contact),
                POW: Math.round(this.batting.power),
                SPD: Math.round(this.baserunning.speed),
                FLD: Math.round(this.fielding.fielding)
            };
        }
    }
}
