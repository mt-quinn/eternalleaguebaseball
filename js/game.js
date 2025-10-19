// Main Game Controller for Eternal League Baseball

class EternalLeagueBaseball {
    constructor() {
        // Core systems
        this.playerTeam = null;
        this.opponentTeam = null;
        this.economy = new Economy();
        this.simulation = null;
        this.renderer = null;
        this.ui = null;

        // Game state
        this.currentDay = 1;
        this.lastPlayedDate = null;
        this.gameSpeed = 2; // 1x, 2x, 3x, 4x
        this.isPaused = false;
        this.isSimulating = false;

        // Animation timing
        this.lastPitchTime = 0;
        this.pitchDelay = 1000; // ms between pitches (affected by speed)

        this.initialize();
    }

    async initialize() {
        // Clear old saves that might have 8-player lineups
        // TODO: Remove this migration code after a few weeks
        const saveData = localStorage.getItem('eternalLeagueBaseball');
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                if (!data.version || data.version < 1) {
                    console.log('Clearing old save data...');
                    localStorage.removeItem('eternalLeagueBaseball');
                }
            } catch (e) {
                localStorage.removeItem('eternalLeagueBaseball');
            }
        }

        // Try to load saved game
        const loaded = this.loadGame();

        if (!loaded) {
            // New game
            this.playerTeam = new Team('Your Team', true);
            this.lastPlayedDate = Date.now();
        }

        // Setup UI
        this.ui = new UIController(this);
        this.ui.updateCoinsDisplay();

        // Setup renderer
        const canvas = document.getElementById('field-canvas');
        this.renderer = new FieldRenderer(canvas);

        // Generate today's opponent
        this.generateOpponent();

        // Show pre-game phase
        this.ui.showPhase('pre-game');
        this.ui.displayMatchup();

        // Process any missed days
        this.processMissedDays();
    }

    generateOpponent() {
        const playerRating = this.playerTeam.getTeamRating();
        this.opponentTeam = Team.generateOpponent(playerRating, 25);
    }

    async startSimulation() {
        this.isSimulating = true;
        this.isPaused = false;

        // Setup simulation
        // Player team is always home team for simplicity
        this.simulation = new BaseballSimulation(this.playerTeam, this.opponentTeam);

        // Show game phase
        this.ui.showPhase('game');
        this.ui.clearPlayLog();
        this.ui.updateScoreboard(this.simulation);
        this.ui.updateGameState(this.simulation);

        // Display initial play log
        this.simulation.playLog.forEach(entry => {
            this.ui.addPlayLog(entry);
        });

        // Start render loop (60fps)
        this.renderLoop();

        // Start pitch loop (handles game logic with animations)
        this.pitchLoop();
    }

    // Continuous render loop at 60fps
    renderLoop() {
        if (!this.isSimulating && !this.renderer.isAnimating) {
            return;
        }

        const fieldingTeam = this.simulation.isTopInning ? this.simulation.homeTeam : this.simulation.awayTeam;
        this.renderer.renderGameState(this.simulation, fieldingTeam);

        requestAnimationFrame(() => this.renderLoop());
    }

    // Game logic loop with animations
    async pitchLoop() {
        while (this.isSimulating && !this.simulation.isGameOver) {
            if (this.isPaused) {
                await Utils.delay(100);
                continue;
            }

            // Store log length before pitch
            const prevLogLength = this.simulation.playLog.length;

            // 1. ANIMATE PITCH (pitcher to plate)
            await this.renderer.animatePitch();
            await Utils.delay(200 / this.gameSpeed);

            // 2. SIMULATE THE PITCH (determines outcome)
            const result = await this.simulation.simulatePitch();

            // Add new log entries
            for (let i = prevLogLength; i < this.simulation.playLog.length; i++) {
                this.ui.addPlayLog(this.simulation.playLog[i]);
            }

            // Update UI
            this.ui.updateScoreboard(this.simulation);
            this.ui.updateGameState(this.simulation);

            // 3. HANDLE BALL IN PLAY (if contact was made)
            if (result && result.battedBall) {
                const battedBall = result.battedBall;

                // Calculate where ball lands (using renderer's physics-aligned conversion)
                const ballLandPos = this.renderer.getBallLandingScreenPos(battedBall);
                const ballLandX = ballLandPos.x;
                const ballLandY = ballLandPos.y;

                // 3a. Animate batted ball to landing spot (keep ball visible)
                await this.renderer.animateBattedBallPhysics(battedBall, ballLandX, ballLandY, this.gameSpeed, false);
                await Utils.delay(200 / this.gameSpeed);

                // 3b. HOME RUN - ball keeps going
                if (result.type === 'homerun') {
                    await Utils.delay(1500 / this.gameSpeed);
                    // Ball returns to pitcher from stands
                    const pitcherPos = this.renderer.fieldPositions['P'];
                    await this.renderer.animateBallFlight(
                        ballLandX, ballLandY,
                        pitcherPos.x, pitcherPos.y,
                        800 / this.gameSpeed, 60, true
                    );
                }
                // 3c. FIELDING PLAY
                else if (result.fielder && result.fieldingPhysics) {
                    const fielder = result.fielder;
                    const physics = result.fieldingPhysics;

                    // Start batter running to first (runs concurrently with fielding)
                    let batterRunAnimation = null;
                    if (result.baserunningPhysics) {
                        const runDuration = result.baserunningPhysics.runnerTimeMs / this.gameSpeed;
                        batterRunAnimation = this.renderer.animateRunnerToBase(
                            this.simulation.currentBatter,
                            'home',
                            'first',
                            runDuration
                        );
                    }

                    // Fielder runs to ball at realistic speed (ball stays on ground)
                    const fielderMoveDuration = Math.min(physics.timeToReachBall, physics.ballFlightTime);
                    await this.renderer.animateFielderToBall(fielder, ballLandX, ballLandY, fielderMoveDuration / this.gameSpeed);

                    // Fielder picks up ball (brief pause)
                    await Utils.delay(300 / this.gameSpeed);

                    // If fielder throws to base
                    if (result.throwTarget && result.baserunningPhysics) {
                        // Throw to base (races against runner)
                        const throwDuration = result.baserunningPhysics.ballTimeMs / this.gameSpeed;
                        await this.renderer.animateThrowToBase(ballLandX, ballLandY, result.throwTarget, throwDuration);

                        // Wait for runner animation to complete if still running
                        if (batterRunAnimation) {
                            await batterRunAnimation;
                        }

                        await Utils.delay(400 / this.gameSpeed);

                        // Ball returns from base to pitcher
                        let basePos;
                        if (result.throwTarget === 'first') basePos = this.renderer.firstBase;
                        else if (result.throwTarget === 'second') basePos = this.renderer.secondBase;
                        else if (result.throwTarget === 'third') basePos = this.renderer.thirdBase;
                        else basePos = this.renderer.homeplate;

                        const pitcherPos = this.renderer.fieldPositions['P'];
                        await this.renderer.animateBallFlight(
                            basePos.x, basePos.y,
                            pitcherPos.x, pitcherPos.y,
                            600 / this.gameSpeed, 40, true
                        );
                    }
                    // Hit - fielder throws back to pitcher, wait for runner
                    else {
                        if (batterRunAnimation) {
                            await batterRunAnimation;
                        }

                        const pitcherPos = this.renderer.fieldPositions['P'];
                        await this.renderer.animateBallFlight(
                            ballLandX, ballLandY,
                            pitcherPos.x, pitcherPos.y,
                            700 / this.gameSpeed, 40, true
                        );
                    }
                }
            }
            // Strikeout, walk, etc - ball just goes back to pitcher
            else {
                await Utils.delay(400 / this.gameSpeed);
            }

            // Pause between batters (3 seconds, affected by game speed)
            await Utils.delay(3000 / this.gameSpeed);
        }

        // Game over
        if (this.simulation.isGameOver) {
            this.endGame();
        }
    }

    endGame() {
        this.isSimulating = false;

        // Determine winner
        const playerTeamWon = this.simulation.score.home > this.simulation.score.away;

        // Resolve bet
        const betWinnings = this.economy.resolveBet(playerTeamWon);

        // Calculate snack payouts
        const snackPayouts = this.economy.calculateSnackPayouts(
            this.simulation.gameEvents,
            playerTeamWon
        );

        // Add snack earnings
        this.economy.addCoins(snackPayouts.total);

        // Win bonus (small fixed amount)
        if (playerTeamWon) {
            this.economy.addCoins(25);
            this.economy.gamesWon++;
        }

        this.economy.gamesPlayed++;
        this.economy.clearBet();

        // Rest pitchers
        this.playerTeam.restPitchers();
        this.opponentTeam.restPitchers();

        // Add incinerated players to graveyard
        // (They're already replaced in team, we just track them)

        // Show post-game phase
        this.ui.showPhase('post-game');
        this.ui.displayGameResults(playerTeamWon, betWinnings, snackPayouts);

        // Save game
        this.saveGame();
    }

    nextDay() {
        this.currentDay++;
        this.lastPlayedDate = Date.now();

        // Generate new opponent
        this.generateOpponent();

        // Reset UI
        this.ui.showPhase('pre-game');
        this.ui.displayMatchup();

        // Reset bet input
        document.getElementById('bet-amount').value = 10;
        document.querySelector('input[name="bet-team"][value="player"]').checked = true;

        // Save game
        this.saveGame();
    }

    processMissedDays() {
        if (!this.lastPlayedDate) return;

        const now = Date.now();
        const daysSince = Math.floor((now - this.lastPlayedDate) / (1000 * 60 * 60 * 24));

        if (daysSince > 0) {
            // Auto-resolve missed games
            let totalCoins = 0;

            for (let i = 0; i < daysSince; i++) {
                // Simulate simple win/loss (50/50)
                const won = Math.random() > 0.5;

                // Small passive income
                const passiveIncome = won ? 50 : 25;
                totalCoins += passiveIncome;

                if (won) this.economy.gamesWon++;
                this.economy.gamesPlayed++;
            }

            this.economy.addCoins(totalCoins);
            this.currentDay += daysSince;

            alert(`You missed ${daysSince} day(s)! Auto-resolved games earned you ${Utils.formatNumber(totalCoins)} coins.`);

            this.ui.updateCoinsDisplay();
        }
    }

    // Game controls
    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-btn').textContent = this.isPaused ? 'Resume' : 'Pause';
    }

    cycleSpeed() {
        this.gameSpeed = (this.gameSpeed % 4) + 1;
    }

    skipToEnd() {
        // Fast-forward by setting speed to max
        this.gameSpeed = 100; // Super fast
    }

    // Economy actions
    purchaseSnack(catalogIndex) {
        const snack = this.economy.purchaseSnack(catalogIndex);
        if (snack) {
            this.ui.updateCoinsDisplay();
            this.ui.switchShopTab('snacks'); // Refresh display
        } else {
            alert('Not enough coins!');
        }
    }

    upgradeSnack(snackId) {
        if (this.economy.upgradeSnack(snackId)) {
            this.ui.updateCoinsDisplay();
            this.ui.switchShopTab('snacks');
        } else {
            alert('Not enough coins!');
        }
    }

    toggleSnackActive(snackId) {
        const snack = this.economy.snacks.find(s => s.id === snackId);
        if (!snack) return;

        if (snack.isActive) {
            this.economy.deactivateSnack(snackId);
        } else {
            if (!this.economy.activateSnack(snackId)) {
                alert(`Maximum ${this.economy.activeSnackSlots} active snacks! Deactivate another or upgrade slots.`);
                return;
            }
        }

        this.ui.switchShopTab('snacks');
    }

    upgradeBettingCeiling() {
        if (this.economy.upgradeBettingCeiling(50)) {
            this.ui.updateCoinsDisplay();
            this.ui.switchShopTab('upgrades');
        } else {
            alert('Not enough coins!');
        }
    }

    upgradeActiveSlots() {
        if (this.economy.upgradeActiveSlots()) {
            this.ui.updateCoinsDisplay();
            this.ui.switchShopTab('upgrades');
        } else {
            alert('Not enough coins!');
        }
    }

    resurrectPlayer(graveyardIndex) {
        const resurrectedPlayer = this.economy.resurrectPlayer(graveyardIndex);
        if (resurrectedPlayer) {
            // Let player choose who to replace (for now, just show alert)
            alert(`${resurrectedPlayer.name} has been resurrected! (Player replacement UI coming soon)`);
            this.ui.updateCoinsDisplay();
            this.ui.showGraveyard();
        } else {
            alert('Not enough coins for resurrection!');
        }
    }

    // Save/Load
    saveGame() {
        const saveData = {
            version: 1,
            playerTeam: this.playerTeam.toJSON(),
            economy: this.economy.toJSON(),
            currentDay: this.currentDay,
            lastPlayedDate: this.lastPlayedDate
        };

        localStorage.setItem('eternalLeagueBaseball', JSON.stringify(saveData));
    }

    loadGame() {
        const saveData = localStorage.getItem('eternalLeagueBaseball');
        if (!saveData) return false;

        try {
            const data = JSON.parse(saveData);

            this.playerTeam = Team.fromJSON(data.playerTeam);
            this.economy = Economy.fromJSON(data.economy);
            this.currentDay = data.currentDay || 1;
            this.lastPlayedDate = data.lastPlayedDate || Date.now();

            return true;
        } catch (e) {
            console.error('Failed to load save data:', e);
            return false;
        }
    }

    resetGame() {
        if (confirm('Are you sure you want to reset your game? This cannot be undone!')) {
            localStorage.removeItem('eternalLeagueBaseball');
            location.reload();
        }
    }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new EternalLeagueBaseball();
});
