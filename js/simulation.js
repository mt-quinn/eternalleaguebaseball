// Baseball Simulation Engine for Eternal League Baseball
// Pitch-by-pitch simulation with realistic probability models based on MLB statistics

class BaseballSimulation {
    constructor(homeTeam, awayTeam) {
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;

        // Game state
        this.inning = 1;
        this.isTopInning = true; // true = away batting, false = home batting
        this.outs = 0;
        this.balls = 0;
        this.strikes = 0;

        // Bases (null = empty, Player object = occupied)
        this.bases = {
            first: null,
            second: null,
            third: null
        };

        // Score
        this.score = {
            home: 0,
            away: 0
        };

        // Current batter/pitcher
        this.currentBatterIndex = 0;
        this.currentPitcher = null;
        this.currentBatter = null;

        // Play-by-play log
        this.playLog = [];

        // Game events for economy/snacks
        this.gameEvents = {
            homeRuns: 0,
            strikeouts: 0,
            stolenBases: 0,
            rbis: 0,
            incinerations: 0,
            injuries: 0
        };

        // Animation queue
        this.animationQueue = [];

        // Game finished flag
        this.isGameOver = false;

        this.initializeGame();
    }

    initializeGame() {
        // Set starting pitcher
        this.currentPitcher = this.isTopInning ? this.homeTeam.pitcher : this.awayTeam.pitcher;
        this.updateCurrentBatter();

        this.logPlay(`Game Start: ${this.awayTeam.name} at ${this.homeTeam.name}`);
        this.logPlay(`Top of the 1st inning...`);
        this.logPlay(`${this.currentBatter.name} steps up to the plate.`);
    }

    logPlay(message, important = false, incineration = false) {
        this.playLog.push({
            message,
            important,
            incineration,
            timestamp: Date.now()
        });
    }

    updateCurrentBatter() {
        const battingTeam = this.isTopInning ? this.awayTeam : this.homeTeam;
        if (!battingTeam || !battingTeam.lineup || battingTeam.lineup.length === 0) {
            console.error('Invalid batting team or lineup');
            return;
        }
        this.currentBatter = battingTeam.lineup[this.currentBatterIndex];
        if (!this.currentBatter) {
            console.error('Current batter is undefined at index', this.currentBatterIndex, 'lineup length:', battingTeam.lineup.length);
        }
    }

    // Main simulation step - simulates one pitch
    async simulatePitch() {
        if (this.isGameOver) return null;

        // Check for incineration before pitch
        if (this.checkIncineration(this.currentBatter)) {
            return this.simulatePitch(); // New batter, continue
        }

        // 1. Pitcher throws
        const pitch = this.generatePitch();

        // 2. Batter decides to swing
        const swings = this.batterSwingDecision(pitch);

        if (!swings) {
            // Called ball or strike
            if (pitch.isStrike) {
                this.strikes++;
                this.logPlay(`Called strike ${this.strikes}.`);

                if (this.strikes >= 3) {
                    return this.resolveStrikeout();
                }
            } else {
                this.balls++;
                this.logPlay(`Ball ${this.balls}.`);

                if (this.balls >= 4) {
                    return this.resolveWalk();
                }
            }
            return { type: 'pitch', swings: false, pitch };
        }

        // 3. Batter swings - check for contact
        const makesContact = this.resolveContact(pitch);

        if (!makesContact) {
            // Swing and miss
            this.strikes++;
            this.logPlay(`Swings and misses! Strike ${this.strikes}.`);

            if (this.strikes >= 3) {
                return this.resolveStrikeout();
            }
            return { type: 'swing', contact: false, pitch };
        }

        // 4. Contact made - determine ball trajectory
        const battedBall = this.resolveBattedBall(pitch);

        this.logPlay(`${this.currentBatter.name} makes contact! ${battedBall.description}`);

        // 5. Simulate ball in play
        const playResult = await this.resolveBallInPlay(battedBall);

        // Include batted ball info in result for animations
        if (playResult) {
            playResult.battedBall = battedBall;
        }

        return playResult;
    }

    // Generate pitch with location and quality
    generatePitch() {
        const velocity = this.currentPitcher.getEffectiveStat('pitching', 'velocity');
        const control = this.currentPitcher.getEffectiveStat('pitching', 'control');
        const movement = this.currentPitcher.getEffectiveStat('pitching', 'movement');

        // Determine if pitch is in strike zone (based on control)
        const strikeZoneProb = Utils.normalizeStatForProbability(control);
        const isStrike = Math.random() < strikeZoneProb;

        // Pitch quality (velocity + movement)
        const quality = (velocity + movement) / 2;

        // Degrade pitcher stamina slightly
        this.currentPitcher.degradeStamina(0.5);

        return {
            velocity,
            control,
            movement,
            quality,
            isStrike,
            location: {
                x: Utils.random(-1, 1),
                y: Utils.random(-1, 1)
            }
        };
    }

    // Batter decides whether to swing based on discipline and pitch quality
    batterSwingDecision(pitch) {
        const discipline = this.currentBatter.batting.discipline;

        // If pitch is a ball, check if batter swings at bad pitch
        if (!pitch.isStrike) {
            // Better discipline = less likely to swing at balls
            // MLB: ~30% swing rate at balls outside zone
            const swingAtBallProb = 0.4 - (Utils.normalizeStatForProbability(discipline) * 0.3);
            return Math.random() < swingAtBallProb;
        }

        // If pitch is a strike, likely to swing
        // MLB: ~65% swing rate at strikes
        const swingAtStrikeProb = 0.55 + (Utils.normalizeStatForProbability(discipline) * 0.2);
        return Math.random() < swingAtStrikeProb;
    }

    // Resolve contact attempt
    resolveContact(pitch) {
        const contact = this.currentBatter.batting.contact;
        const pitchQuality = pitch.quality;

        // MLB average contact rate on swings: ~75%
        // Better contact skill vs worse pitch quality = more contact
        const baseContactProb = 0.75;
        const contactMod = (Utils.normalizeStatForProbability(contact) - 0.5) * 0.3;
        const pitchMod = (Utils.normalizeStatForProbability(pitchQuality) - 0.5) * -0.2;

        const contactProb = baseContactProb + contactMod + pitchMod;

        return Math.random() < contactProb;
    }

    // Determine batted ball trajectory and type
    resolveBattedBall(pitch) {
        const power = this.currentBatter.batting.power;
        const aggression = this.currentBatter.batting.aggression;
        const pitchVelocity = pitch.velocity;

        // Exit velocity (combination of power, aggression, pitch velocity)
        const exitVelocity = (power * 0.6 + aggression * 0.2 + pitchVelocity * 0.2);

        // Launch angle influenced by aggression (higher aggression = more fly balls)
        // MLB: ~20% ground balls, ~20% line drives, ~40% fly balls, ~20% pop ups
        const launchAngleRoll = Math.random();
        const aggressionFactor = Utils.normalizeStatForProbability(aggression);

        let type, launchAngle, description;

        if (launchAngleRoll < 0.25) {
            type = 'groundball';
            launchAngle = Utils.random(-10, 10);
            description = 'A ground ball';
        } else if (launchAngleRoll < 0.45) {
            type = 'linedrive';
            launchAngle = Utils.random(10, 25);
            description = 'A line drive';
        } else if (launchAngleRoll < 0.45 + (0.45 * aggressionFactor)) {
            type = 'flyball';
            launchAngle = Utils.random(25, 45);
            description = 'A fly ball';
        } else {
            type = 'popup';
            launchAngle = Utils.random(50, 80);
            description = 'A pop up';
        }

        // Direction (left, center, right)
        const direction = Utils.random(-45, 45);

        // Distance based on exit velocity and launch angle
        const optimalAngle = 30; // Optimal launch angle for distance
        const anglePenalty = Math.abs(launchAngle - optimalAngle) / 60;
        const distance = (exitVelocity / 100) * 400 * (1 - anglePenalty);

        return {
            type,
            launchAngle,
            exitVelocity,
            direction,
            distance,
            description
        };
    }

    // Resolve ball in play with fielding
    async resolveBallInPlay(battedBall) {
        // Check for home run (distance > 380ft and proper angle)
        if (battedBall.distance > 380 && battedBall.type === 'flyball') {
            return this.resolveHomeRun();
        }

        // Determine which fielder is responsible
        const fielder = this.getFielderForBall(battedBall);

        // Check for incineration of fielder
        if (this.checkIncineration(fielder)) {
            // Fielder incinerated, ball drops for hit
            this.logPlay(`The ball falls! No one there to make the play!`);
            return this.resolveHit(battedBall, true, fielder);
        }

        // Fielder attempts to reach ball
        const reachesball = this.fielderReachesBall(fielder, battedBall);

        if (!reachesball) {
            this.logPlay(`${fielder.name} can't reach it!`);
            return this.resolveHit(battedBall, false, fielder);
        }

        // Fielder attempts to field cleanly
        const fieldsCleanly = this.fielderFieldsCleanly(fielder);

        if (!fieldsCleanly) {
            this.logPlay(`${fielder.name} bobbles the ball!`);
            return this.resolveHit(battedBall, false, fielder);
        }

        // Successful fielding - attempt to make out
        this.logPlay(`${fielder.name} fields it cleanly!`);
        return this.resolveFieldedBall(fielder, battedBall);
    }

    // Determine which fielder handles the ball
    getFielderForBall(battedBall) {
        const fieldingTeam = this.isTopInning ? this.homeTeam : this.awayTeam;

        // Simplified fielding assignment based on ball type and direction
        if (battedBall.type === 'groundball') {
            if (battedBall.direction < -20) return fieldingTeam.getPlayerAtPosition('3B');
            if (battedBall.direction < -5) return fieldingTeam.getPlayerAtPosition('SS');
            if (battedBall.direction < 5) return fieldingTeam.getPlayerAtPosition('2B');
            return fieldingTeam.getPlayerAtPosition('1B');
        } else if (battedBall.type === 'popup') {
            return fieldingTeam.getPlayerAtPosition('C'); // Catcher or close infielder
        } else {
            // Fly balls and line drives to outfield
            if (battedBall.direction < -15) return fieldingTeam.getPlayerAtPosition('LF');
            if (battedBall.direction < 15) return fieldingTeam.getPlayerAtPosition('CF');
            return fieldingTeam.getPlayerAtPosition('RF');
        }
    }

    // Check if fielder reaches ball
    fielderReachesBall(fielder, battedBall) {
        const speed = fielder.fielding.speed;
        const reaction = fielder.fielding.reactionTime;

        // Different ball types have different difficulty
        let baseDifficulty = 0.85; // 85% catch rate for average fielder

        if (battedBall.type === 'linedrive') {
            baseDifficulty = 0.70; // Line drives harder
        } else if (battedBall.type === 'groundball') {
            baseDifficulty = 0.90; // Ground balls easier to reach
        } else if (battedBall.type === 'popup') {
            baseDifficulty = 0.95; // Pop ups easiest
        }

        const speedMod = (Utils.normalizeStatForProbability(speed) - 0.5) * 0.2;
        const reactionMod = (Utils.normalizeStatForProbability(reaction) - 0.5) * 0.1;

        const reachProb = baseDifficulty + speedMod + reactionMod;

        return Math.random() < reachProb;
    }

    // Check if fielder fields ball cleanly
    fielderFieldsCleanly(fielder) {
        const fielding = fielder.fielding.fielding;

        // MLB: ~98% of reached balls are fielded cleanly
        const fieldingProb = 0.90 + (Utils.normalizeStatForProbability(fielding) * 0.09);

        return Math.random() < fieldingProb;
    }

    // Resolve successfully fielded ball
    resolveFieldedBall(fielder, battedBall) {
        // Force out at first base (for now, simplified)
        // TODO: Double plays, force outs at other bases

        if (battedBall.type === 'flyball' || battedBall.type === 'popup') {
            this.logPlay(`${fielder.name} makes the catch!`);
            const result = this.resolveOut('flyout');
            result.fielder = fielder;
            result.throwTarget = null; // Caught in air, no throw needed
            return result;
        }

        // Ground ball - throw to first
        this.logPlay(`${fielder.name} throws to first...`);

        const throwAccuracy = fielder.fielding.throwingAccuracy;
        const throwPower = fielder.fielding.throwingPower;
        const runnerSpeed = this.currentBatter.baserunning.speed;

        // Check if throw beats runner (simplified)
        const throwSuccess = Utils.normalizeStatForProbability(throwAccuracy);
        const throwSpeed = Utils.normalizeStatForProbability(throwPower);
        const runSpeed = Utils.normalizeStatForProbability(runnerSpeed);

        const beatsRunner = (throwSuccess * throwSpeed) > (runSpeed * 0.9);

        if (beatsRunner && throwSuccess > 0.6) {
            this.logPlay(`OUT at first base!`);
            const result = this.resolveOut('groundout');
            result.fielder = fielder;
            result.throwTarget = 'first';
            return result;
        } else {
            this.logPlay(`Safe at first!`);
            return this.resolveHit(battedBall, false, fielder);
        }
    }

    // Resolve hit (batter reaches base)
    resolveHit(battedBall, fielderMissed, fielder = null) {
        // Determine how many bases (simplified - single, double, triple)
        let bases = 1;

        if (battedBall.distance > 300 || battedBall.type === 'linedrive') {
            bases = 2; // Double
        }
        if (battedBall.distance > 350 && fielderMissed) {
            bases = 3; // Triple
        }

        const hitTypes = ['single', 'double', 'triple'];
        const hitType = hitTypes[bases - 1];

        this.logPlay(`${this.currentBatter.name} hits a ${hitType}!`, true);

        // Advance runners and batter
        const rbis = this.advanceRunners(bases);

        // Place batter on base
        if (bases === 1) this.bases.first = this.currentBatter;
        else if (bases === 2) this.bases.second = this.currentBatter;
        else if (bases === 3) this.bases.third = this.currentBatter;

        if (rbis > 0) {
            this.gameEvents.rbis += rbis;
            this.logPlay(`${rbis} RBI${rbis > 1 ? 's' : ''}!`, true);
        }

        // Reset count, next batter
        this.resetCount();
        this.nextBatter();

        return { type: 'hit', bases, rbis, fielder, throwTarget: null };
    }

    // Resolve home run
    resolveHomeRun() {
        this.logPlay(`IT'S GOING... GOING... GONE! HOME RUN!`, true);

        let runs = 1;

        // Score runners on base
        if (this.bases.first) {
            runs++;
            this.bases.first = null;
        }
        if (this.bases.second) {
            runs++;
            this.bases.second = null;
        }
        if (this.bases.third) {
            runs++;
            this.bases.third = null;
        }

        this.addRuns(runs);
        this.gameEvents.homeRuns++;
        this.gameEvents.rbis += runs;

        this.logPlay(`${runs} run${runs > 1 ? 's' : ''} score!`, true);

        this.resetCount();
        this.nextBatter();

        return { type: 'homerun', runs };
    }

    // Resolve strikeout
    resolveStrikeout() {
        this.logPlay(`${this.currentBatter.name} strikes out!`, true);
        this.gameEvents.strikeouts++;
        return this.resolveOut('strikeout');
    }

    // Resolve walk
    resolveWalk() {
        this.logPlay(`${this.currentBatter.name} walks.`);

        // Force advance runners if needed
        if (this.bases.first) {
            if (this.bases.second) {
                if (this.bases.third) {
                    // Bases loaded, runner scores
                    this.addRuns(1);
                    this.logPlay(`Runner scores from third!`, true);
                }
                this.bases.third = this.bases.second;
            }
            this.bases.second = this.bases.first;
        }
        this.bases.first = this.currentBatter;

        this.resetCount();
        this.nextBatter();

        return { type: 'walk' };
    }

    // Resolve out
    resolveOut(outType) {
        this.outs++;
        this.logPlay(`${this.outs} out${this.outs > 1 ? 's' : ''}.`);

        this.resetCount();

        if (this.outs >= 3) {
            this.endHalfInning();
        } else {
            this.nextBatter();
        }

        return { type: 'out', outType };
    }

    // Advance runners based on hit
    advanceRunners(bases) {
        let runs = 0;

        // Move runners (simplified - all runners advance same number of bases)
        if (this.bases.third) {
            if (bases >= 1) {
                runs++;
                this.bases.third = null;
            }
        }
        if (this.bases.second) {
            if (bases >= 2) {
                runs++;
                this.bases.second = null;
            } else if (bases === 1) {
                this.bases.third = this.bases.second;
                this.bases.second = null;
            }
        }
        if (this.bases.first) {
            if (bases >= 3) {
                runs++;
                this.bases.first = null;
            } else if (bases === 2) {
                this.bases.third = this.bases.first;
                this.bases.first = null;
            } else if (bases === 1) {
                this.bases.second = this.bases.first;
                this.bases.first = null;
            }
        }

        this.addRuns(runs);

        return runs;
    }

    // Add runs to batting team
    addRuns(runs) {
        if (this.isTopInning) {
            this.score.away += runs;
        } else {
            this.score.home += runs;
        }
    }

    // Reset count
    resetCount() {
        this.balls = 0;
        this.strikes = 0;
    }

    // Next batter in lineup
    nextBatter() {
        const battingTeam = this.isTopInning ? this.awayTeam : this.homeTeam;
        const lineupLength = battingTeam.lineup.length;
        this.currentBatterIndex = (this.currentBatterIndex + 1) % lineupLength;
        this.updateCurrentBatter();
        if (this.currentBatter) {
            this.logPlay(`${this.currentBatter.name} steps up to the plate.`);
        }
    }

    // End half inning
    endHalfInning() {
        this.logPlay(`End of ${this.isTopInning ? 'top' : 'bottom'} of inning ${this.inning}.`, true);

        // Clear bases
        this.bases.first = null;
        this.bases.second = null;
        this.bases.third = null;

        // Reset outs
        this.outs = 0;

        // Switch sides
        if (this.isTopInning) {
            this.isTopInning = false;
            this.currentPitcher = this.awayTeam.pitcher;
            this.logPlay(`Bottom of the ${this.inning}${this.getInningOrdinal(this.inning)} inning...`);
        } else {
            // Inning complete
            this.inning++;
            this.isTopInning = true;
            this.currentPitcher = this.homeTeam.pitcher;

            // Check if game is over (9 innings, home team winning)
            if (this.inning > 9 && this.score.home !== this.score.away) {
                if (this.score.home > this.score.away || this.inning > 9) {
                    this.endGame();
                    return;
                }
            }

            this.logPlay(`Top of the ${this.inning}${this.getInningOrdinal(this.inning)} inning...`);
        }

        this.updateCurrentBatter();
        this.logPlay(`${this.currentBatter.name} steps up to the plate.`);
    }

    // Check for incineration (1% per play)
    checkIncineration(player) {
        if (Math.random() < 0.01) {
            const team = this.isTopInning ? this.awayTeam : this.homeTeam;
            const newPlayer = team.incinerateAndReplace(player);

            this.logPlay(`⚡ ${player.name} HAS BEEN INCINERATED! ⚡`, true, true);
            this.logPlay(`${newPlayer.name} emerges from the ashes to take their place.`, true);

            this.gameEvents.incinerations++;

            // Update current references if needed
            if (this.currentBatter === player) {
                this.currentBatter = newPlayer;
            }
            if (this.currentPitcher === player) {
                this.currentPitcher = newPlayer;
            }

            // Update bases if runner was incinerated
            if (this.bases.first === player) this.bases.first = null;
            if (this.bases.second === player) this.bases.second = null;
            if (this.bases.third === player) this.bases.third = null;

            return true;
        }
        return false;
    }

    // End game
    endGame() {
        this.isGameOver = true;
        this.logPlay(`FINAL SCORE: ${this.awayTeam.name} ${this.score.away}, ${this.homeTeam.name} ${this.score.home}`, true);

        const winner = this.score.home > this.score.away ? this.homeTeam : this.awayTeam;
        this.logPlay(`${winner.name} wins!`, true);
    }

    // Get inning ordinal (1st, 2nd, 3rd, etc.)
    getInningOrdinal(inning) {
        const j = inning % 10;
        const k = inning % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    }

    // Get current game state for display
    getGameState() {
        return {
            inning: this.inning,
            isTopInning: this.isTopInning,
            outs: this.outs,
            balls: this.balls,
            strikes: this.strikes,
            bases: {
                first: this.bases.first !== null,
                second: this.bases.second !== null,
                third: this.bases.third !== null
            },
            score: this.score,
            currentBatter: this.currentBatter,
            currentPitcher: this.currentPitcher,
            isGameOver: this.isGameOver
        };
    }
}
