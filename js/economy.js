// Economy system for Eternal League Baseball - Coins, Snacks, Betting, Shop

class Snack {
    constructor(type, name, description, basePayout, cost, level = 1) {
        this.id = Utils.randomInt(100000, 999999);
        this.type = type; // 'win', 'loss', 'homerun', 'rbi', 'strikeout', 'incineration', 'stolenbase', 'injury'
        this.name = name;
        this.description = description;
        this.basePayout = basePayout;
        this.cost = cost;
        this.level = level;
        this.isActive = false;
    }

    getPayout() {
        return this.basePayout * this.level;
    }

    getUpgradeCost() {
        return Math.floor(this.cost * Math.pow(1.5, this.level - 1));
    }

    upgrade() {
        this.level++;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            description: this.description,
            basePayout: this.basePayout,
            cost: this.cost,
            level: this.level,
            isActive: this.isActive
        };
    }

    static fromJSON(data) {
        const snack = new Snack(data.type, data.name, data.description, data.basePayout, data.cost, data.level);
        snack.id = data.id;
        snack.isActive = data.isActive;
        return snack;
    }
}

class Economy {
    constructor() {
        this.coins = 500; // Starting coins
        this.snacks = [];
        this.activeSnackSlots = 4;
        this.maxBet = 100;

        // Snack shop catalog
        this.snackCatalog = this.initializeSnackCatalog();

        // Graveyard (dead players)
        this.graveyard = [];

        // Betting state
        this.currentBet = {
            amount: 0,
            team: null, // 'player' or 'opponent'
            odds: 1.0
        };

        // Game history
        this.gamesPlayed = 0;
        this.gamesWon = 0;
        this.totalCoinsEarned = 0;
    }

    initializeSnackCatalog() {
        return [
            { type: 'win', name: 'Victory Burger', description: 'Earn coins for each win', basePayout: 50, cost: 100 },
            { type: 'loss', name: 'Consolation Fries', description: 'Earn coins even in defeat', basePayout: 25, cost: 80 },
            { type: 'homerun', name: 'Homer Hot Dog', description: 'Coins per home run', basePayout: 20, cost: 150 },
            { type: 'rbi', name: 'RBI Nachos', description: 'Coins per RBI', basePayout: 5, cost: 120 },
            { type: 'strikeout', name: 'Strikeout Soda', description: 'Coins per strikeout', basePayout: 3, cost: 100 },
            { type: 'incineration', name: 'Phoenix Popcorn', description: 'Coins per incineration', basePayout: 30, cost: 200 },
            { type: 'stolenbase', name: 'Stolen Pretzel', description: 'Coins per stolen base', basePayout: 10, cost: 90 },
            { type: 'injury', name: 'Injury Ice Cream', description: 'Coins per injury (not implemented)', basePayout: 15, cost: 110 }
        ];
    }

    // Coins management
    addCoins(amount) {
        this.coins += amount;
        this.totalCoinsEarned += amount;
        return this.coins;
    }

    spendCoins(amount) {
        if (this.coins >= amount) {
            this.coins -= amount;
            return true;
        }
        return false;
    }

    // Snacks
    purchaseSnack(catalogIndex) {
        const snackData = this.snackCatalog[catalogIndex];
        if (!snackData) return null;

        if (this.spendCoins(snackData.cost)) {
            const snack = new Snack(
                snackData.type,
                snackData.name,
                snackData.description,
                snackData.basePayout,
                snackData.cost
            );
            this.snacks.push(snack);
            return snack;
        }
        return null;
    }

    upgradeSnack(snackId) {
        const snack = this.snacks.find(s => s.id === snackId);
        if (!snack) return false;

        const cost = snack.getUpgradeCost();
        if (this.spendCoins(cost)) {
            snack.upgrade();
            return true;
        }
        return false;
    }

    activateSnack(snackId) {
        const snack = this.snacks.find(s => s.id === snackId);
        if (!snack) return false;

        const activeCount = this.snacks.filter(s => s.isActive).length;
        if (activeCount >= this.activeSnackSlots) return false;

        snack.isActive = true;
        return true;
    }

    deactivateSnack(snackId) {
        const snack = this.snacks.find(s => s.id === snackId);
        if (!snack) return false;

        snack.isActive = false;
        return true;
    }

    // Calculate snack payouts from game events
    calculateSnackPayouts(gameEvents, won) {
        let total = 0;
        const breakdown = [];

        this.snacks.forEach(snack => {
            const multiplier = snack.isActive ? 1.0 : 0.1; // Active = full, inactive = 10%
            let count = 0;
            let payout = 0;

            switch (snack.type) {
                case 'win':
                    if (won) {
                        count = 1;
                        payout = snack.getPayout() * multiplier;
                    }
                    break;
                case 'loss':
                    if (!won) {
                        count = 1;
                        payout = snack.getPayout() * multiplier;
                    }
                    break;
                case 'homerun':
                    count = gameEvents.homeRuns;
                    payout = count * snack.getPayout() * multiplier;
                    break;
                case 'rbi':
                    count = gameEvents.rbis;
                    payout = count * snack.getPayout() * multiplier;
                    break;
                case 'strikeout':
                    count = gameEvents.strikeouts;
                    payout = count * snack.getPayout() * multiplier;
                    break;
                case 'incineration':
                    count = gameEvents.incinerations;
                    payout = count * snack.getPayout() * multiplier;
                    break;
                case 'stolenbase':
                    count = gameEvents.stolenBases;
                    payout = count * snack.getPayout() * multiplier;
                    break;
                case 'injury':
                    count = gameEvents.injuries;
                    payout = count * snack.getPayout() * multiplier;
                    break;
            }

            if (payout > 0) {
                total += payout;
                breakdown.push({
                    snackName: snack.name,
                    count,
                    payout: Math.floor(payout),
                    isActive: snack.isActive
                });
            }
        });

        return { total: Math.floor(total), breakdown };
    }

    // Betting
    placeBet(amount, team) {
        if (amount > this.maxBet) return false;
        if (!this.spendCoins(amount)) return false;

        this.currentBet = {
            amount,
            team,
            odds: 1.0 // Could vary based on team strength difference
        };

        return true;
    }

    resolveBet(playerTeamWon) {
        if (this.currentBet.amount === 0) return 0;

        const wonBet = (this.currentBet.team === 'player' && playerTeamWon) ||
                       (this.currentBet.team === 'opponent' && !playerTeamWon);

        if (wonBet) {
            const winnings = Math.floor(this.currentBet.amount * (1 + this.currentBet.odds));
            this.addCoins(winnings);
            return winnings;
        }

        return 0; // Lost bet (already spent)
    }

    clearBet() {
        this.currentBet = { amount: 0, team: null, odds: 1.0 };
    }

    // Upgrade betting ceiling
    upgradeBettingCeiling(amount) {
        const cost = this.maxBet * 2; // Cost scales with current limit
        if (this.spendCoins(cost)) {
            this.maxBet += amount;
            return true;
        }
        return false;
    }

    // Upgrade active snack slots
    upgradeActiveSlots() {
        const cost = 500 * Math.pow(2, this.activeSnackSlots - 4); // Exponential cost
        if (this.spendCoins(cost)) {
            this.activeSnackSlots++;
            return true;
        }
        return false;
    }

    getActiveSlotUpgradeCost() {
        return 500 * Math.pow(2, this.activeSnackSlots - 4);
    }

    // Graveyard
    addToGraveyard(player) {
        this.graveyard.push({
            player: player.clone(),
            deathDate: Date.now(),
            cause: 'incineration'
        });
    }

    resurrectPlayer(graveyardIndex) {
        if (graveyardIndex < 0 || graveyardIndex >= this.graveyard.length) return null;

        const cost = 1000; // Fixed resurrection cost
        if (!this.spendCoins(cost)) return null;

        const deadPlayer = this.graveyard[graveyardIndex].player;
        const resurrectedPlayer = deadPlayer.clone();

        // Apply -100% penalty to random stat
        const randomStat = resurrectedPlayer.getRandomStat();
        if (randomStat) {
            resurrectedPlayer.applyStatModifier(randomStat.category, randomStat.statName, -100);
        }

        return resurrectedPlayer;
    }

    // Roster modifications
    applyRandomModifier(player, cost = 200) {
        if (!this.spendCoins(cost)) return false;

        const modifier = Utils.randomInt(-20, 40);
        player.applyRandomModifierAll(modifier);
        return true;
    }

    applyTargetedBuff(player, category, statName, cost = 250) {
        if (!this.spendCoins(cost)) return false;

        // +20% to target stat
        player.applyStatModifier(category, statName, 20);

        // -20% to random other stat
        const randomStat = player.getRandomStat();
        if (randomStat) {
            player.applyStatModifier(randomStat.category, randomStat.statName, -20);
        }

        return true;
    }

    stealAndWeaken(fromPlayer, toPlayer, category, statName, cost = 300) {
        if (!this.spendCoins(cost)) return false;

        fromPlayer.applyStatModifier(category, statName, -20);
        toPlayer.applyStatModifier(category, statName, 20);

        return true;
    }

    // Serialize
    toJSON() {
        return {
            coins: this.coins,
            snacks: this.snacks.map(s => s.toJSON()),
            activeSnackSlots: this.activeSnackSlots,
            maxBet: this.maxBet,
            graveyard: this.graveyard.map(g => ({
                player: g.player.toJSON(),
                deathDate: g.deathDate,
                cause: g.cause
            })),
            gamesPlayed: this.gamesPlayed,
            gamesWon: this.gamesWon,
            totalCoinsEarned: this.totalCoinsEarned
        };
    }

    static fromJSON(data) {
        const economy = new Economy();
        economy.coins = data.coins;
        economy.snacks = data.snacks.map(s => Snack.fromJSON(s));
        economy.activeSnackSlots = data.activeSnackSlots;
        economy.maxBet = data.maxBet;
        economy.graveyard = data.graveyard.map(g => ({
            player: Player.fromJSON(g.player),
            deathDate: g.deathDate,
            cause: g.cause
        }));
        economy.gamesPlayed = data.gamesPlayed || 0;
        economy.gamesWon = data.gamesWon || 0;
        economy.totalCoinsEarned = data.totalCoinsEarned || 0;
        return economy;
    }
}
