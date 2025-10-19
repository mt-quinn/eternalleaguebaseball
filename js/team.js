// Team class for Eternal League Baseball

class Team {
    constructor(name = null, isPlayerTeam = false) {
        this.name = name || Utils.generateTeamName();
        this.isPlayerTeam = isPlayerTeam;
        this.roster = [];
        this.lineup = []; // Batting order with positions
        this.pitcher = null;

        this.initializeRoster();
    }

    initializeRoster() {
        // Create pitcher
        const pitcher = new Player(null, 'P', true);
        this.pitcher = pitcher;
        this.roster.push(pitcher);

        // Standard positions for lineup
        const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

        positions.forEach(pos => {
            const player = new Player(null, pos, false);
            this.roster.push(player);
            this.lineup.push(player);
        });
    }

    // Get player by position
    getPlayerAtPosition(position) {
        if (position === 'P') return this.pitcher;
        return this.lineup.find(p => p.position === position);
    }

    // Reorder lineup
    reorderLineup(newOrder) {
        // newOrder is array of player IDs
        const newLineup = [];
        newOrder.forEach(id => {
            const player = this.lineup.find(p => p.id === id);
            if (player) newLineup.push(player);
        });

        if (newLineup.length === this.lineup.length) {
            this.lineup = newLineup;
            return true;
        }
        return false;
    }

    // Replace player in roster
    replacePlayer(oldPlayer, newPlayer) {
        const index = this.roster.indexOf(oldPlayer);
        if (index !== -1) {
            this.roster[index] = newPlayer;

            // Update in lineup if present
            const lineupIndex = this.lineup.indexOf(oldPlayer);
            if (lineupIndex !== -1) {
                this.lineup[lineupIndex] = newPlayer;
                newPlayer.position = oldPlayer.position;
            }

            // Update pitcher if needed
            if (this.pitcher === oldPlayer) {
                this.pitcher = newPlayer;
            }

            return true;
        }
        return false;
    }

    // Remove player and add new random player (for incineration)
    incinerateAndReplace(player) {
        const newPlayer = new Player(null, player.position, player.isPitcher);
        this.replacePlayer(player, newPlayer);
        return newPlayer;
    }

    // Get team overall rating
    getTeamRating() {
        let total = 0;
        this.roster.forEach(player => {
            total += player.getOverallRating();
        });
        return Math.round(total / this.roster.length);
    }

    // Get batting lineup order with stats
    getLineupDisplay() {
        return this.lineup.map((player, index) => ({
            order: index + 1,
            player: player,
            position: player.position,
            stats: player.getStatsSummary()
        }));
    }

    // Get pitcher display
    getPitcherDisplay() {
        return {
            player: this.pitcher,
            stats: this.pitcher.getStatsSummary()
        };
    }

    // Rest all pitchers
    restPitchers() {
        this.roster.forEach(player => {
            if (player.isPitcher) {
                player.restPitcher();
            }
        });
    }

    // Apply team-wide stat boost
    applyTeamStatBoost(category, statName, percentChange) {
        this.roster.forEach(player => {
            player.applyStatModifier(category, statName, percentChange);
        });
    }

    // Serialize for storage
    toJSON() {
        return {
            name: this.name,
            isPlayerTeam: this.isPlayerTeam,
            roster: this.roster.map(p => p.toJSON()),
            lineupOrder: this.lineup.map(p => p.id),
            pitcherId: this.pitcher.id
        };
    }

    // Deserialize from storage
    static fromJSON(data) {
        const team = new Team(data.name, data.isPlayerTeam);
        team.roster = data.roster.map(p => Player.fromJSON(p));
        team.pitcher = team.roster.find(p => p.id === data.pitcherId);
        team.lineup = data.lineupOrder.map(id => team.roster.find(p => p.id === id));
        return team;
    }

    // Generate opponent team with scaling
    static generateOpponent(playerTeamRating, variance = 20) {
        const opponent = new Team(null, false);

        // Adjust opponent strength based on player team
        // Loose scaling with high variance
        const targetRating = playerTeamRating + Utils.randomInt(-variance, variance);

        // Adjust each player's stats
        opponent.roster.forEach(player => {
            const currentRating = player.getOverallRating();
            const adjustment = ((targetRating - currentRating) / currentRating) * 100;

            // Apply scaled adjustment (not full adjustment to maintain variance)
            const scaledAdjustment = adjustment * Utils.random(0.3, 0.7);
            player.applyRandomModifierAll(scaledAdjustment);
        });

        return opponent;
    }
}
