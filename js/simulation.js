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

    // Resolve contact attempt (physics-based: timing and location)
    resolveContact(pitch) {
        const contact = this.currentBatter.batting.contact;
        const discipline = this.currentBatter.batting.discipline;
        const power = this.currentBatter.batting.power;

        // 1. TIMING: Can the batter time their swing to meet the ball?
        // Faster pitches = smaller timing window
        const pitchSpeed = pitch.velocity;
        const timingWindowMs = 150 - (Utils.normalizeStatForProbability(pitchSpeed) * 50); // 100-150ms window

        // Batter's contact skill determines how precisely they can time the swing
        const batterTiming = Utils.normalizeStatForProbability(contact) * 150; // 0-150ms precision

        // Random swing timing error (simulates human variance)
        const swingTimingError = (Math.random() - 0.5) * 100; // ±50ms
        const actualTiming = batterTiming + swingTimingError;

        // Does the swing timing fall within the window?
        const timingSuccess = actualTiming >= (timingWindowMs * 0.5);

        // 2. LOCATION: Is the bat in the right place to meet the ball?
        const pitchX = pitch.location.x; // -1 to 1 (inside/outside)
        const pitchY = pitch.location.y; // -1 to 1 (high/low)

        // Batter's discipline determines how well they can identify pitch location
        const locationReadSkill = Utils.normalizeStatForProbability(discipline);

        // Bat placement error (better contact = less error)
        const batPlacementError = (1 - Utils.normalizeStatForProbability(contact)) * 0.5;

        // Calculate distance from bat to ball
        const batX = pitchX + (Math.random() - 0.5) * batPlacementError * 2;
        const batY = pitchY + (Math.random() - 0.5) * batPlacementError * 2;
        const distance = Math.sqrt(Math.pow(pitchX - batX, 2) + Math.pow(pitchY - batY, 2));

        // Contact zone radius (power hitters have bigger "barrel")
        const contactRadius = 0.5 + (Utils.normalizeStatForProbability(power) * 0.3);
        const locationSuccess = distance <= contactRadius;

        // 3. PITCH QUALITY: Harder to make contact with better pitches
        const pitchQuality = pitch.quality;
        const pitchDifficultyMod = Utils.normalizeStatForProbability(pitchQuality) * 0.2;

        // Final check: both timing and location must succeed (with pitch difficulty modifier)
        const baseSuccess = timingSuccess && locationSuccess;
        const finalChance = baseSuccess ? (1.0 - pitchDifficultyMod) : 0.2; // Small chance of lucky contact

        return Math.random() < finalChance;
    }

    // Determine batted ball trajectory and type (physics-based on contact point)
    resolveBattedBall(pitch) {
        const power = this.currentBatter.batting.power;
        const aggression = this.currentBatter.batting.aggression;
        const contact = this.currentBatter.batting.contact;
        const pitchVelocity = pitch.velocity;

        // Contact quality based on pitch location
        // Center of strike zone = best contact, edges = weaker contact
        const pitchX = pitch.location.x;
        const pitchY = pitch.location.y;
        const distanceFromCenter = Math.sqrt(pitchX * pitchX + pitchY * pitchY);
        const contactQuality = Math.max(0.5, 1.0 - (distanceFromCenter * 0.35)); // 0.5 to 1.0

        // Exit velocity in MPH (70-115 range for realistic baseball)
        // MLB average exit velo: ~88 mph, elite: 95+, weak: 70-80
        const normalizedPower = Utils.normalizeStatForProbability(power);
        const normalizedContact = Utils.normalizeStatForProbability(contact);
        const normalizedPitchVelo = Utils.normalizeStatForProbability(pitchVelocity);

        const baseExitVelo = 70 + (normalizedPower * 30) + (normalizedContact * 10) + (normalizedPitchVelo * 10);
        const exitVelocity = baseExitVelo * contactQuality; // 35-115 mph range

        // Launch angle influenced by pitch location and batter approach
        // High pitches = higher launch angle, low pitches = ground balls
        const pitchHeightInfluence = pitchY * 20; // -20 to +20 degrees
        const aggressionFactor = Utils.normalizeStatForProbability(aggression);

        // Base launch angle depends on swing approach
        const launchAngleRoll = Math.random();
        let baseLaunchAngle;
        let type, description;

        if (launchAngleRoll < 0.25) {
            // Ground ball tendency
            baseLaunchAngle = Utils.random(-10, 5);
            type = 'groundball';
            description = 'A ground ball';
        } else if (launchAngleRoll < 0.45) {
            // Line drive tendency
            baseLaunchAngle = Utils.random(10, 20);
            type = 'linedrive';
            description = 'A line drive';
        } else if (launchAngleRoll < 0.45 + (0.45 * aggressionFactor)) {
            // Fly ball tendency (more likely with high aggression)
            baseLaunchAngle = Utils.random(25, 40);
            type = 'flyball';
            description = 'A fly ball';
        } else {
            // Pop up (weak contact or topped ball)
            baseLaunchAngle = Utils.random(50, 75);
            type = 'popup';
            description = 'A pop up';
        }

        // Final launch angle = base + pitch height influence
        const launchAngle = Math.max(-15, Math.min(85, baseLaunchAngle + pitchHeightInfluence));

        // Adjust type based on final angle
        if (launchAngle < 10 && type !== 'groundball') {
            type = 'groundball';
            description = 'A ground ball';
        } else if (launchAngle > 50 && type === 'flyball') {
            type = 'popup';
            description = 'A pop up';
        }

        // Direction influenced by pitch location (inside = pulled, outside = opposite field)
        const pullTendency = -pitchX * 30; // Inside pitch = negative (pull for right-hander)
        const baseDirection = Utils.random(-45, 45);
        const direction = Math.max(-45, Math.min(45, baseDirection + pullTendency));

        // Distance based on exit velocity and launch angle
        // Optimal angle for distance is 25-30 degrees
        const optimalAngle = 28;
        const angleDiff = Math.abs(launchAngle - optimalAngle);
        const anglePenalty = angleDiff / 50; // Penalty increases with angle deviation

        // Distance formula: higher exit velo = more distance
        // 90 mph @ optimal = ~350ft, 100 mph = ~400ft, 110 mph = ~450ft
        const baseDistance = (exitVelocity / 110) * 450;
        const distance = Math.max(50, baseDistance * Math.max(0.3, 1 - anglePenalty));

        // Calculate flight time based on ball type and distance
        // Ground balls arrive quickly, fly balls take longer
        let flightTime; // in milliseconds
        if (type === 'groundball') {
            flightTime = 800 + (distance / 400) * 400; // 800-1200ms
        } else if (type === 'linedrive') {
            flightTime = 1000 + (distance / 400) * 500; // 1000-1500ms
        } else if (type === 'flyball') {
            flightTime = 1500 + (distance / 400) * 1500; // 1500-3000ms
        } else { // popup
            flightTime = 2000 + (distance / 200) * 1000; // 2000-3000ms
        }

        return {
            type,
            launchAngle,
            exitVelocity,
            direction,
            distance,
            flightTime,
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

        // Calculate fielding physics
        const fielderPos = this.getFielderPosition(fielder.position);
        const ballLandPos = this.getBallLandingPosition(battedBall);
        const dx = ballLandPos.x - fielderPos.x;
        const dy = ballLandPos.y - fielderPos.y;
        const distanceToTravel = Math.sqrt(dx * dx + dy * dy);

        const speed = fielder.fielding.speed;
        const reaction = fielder.fielding.reactionTime;
        const reactionDelay = 500 - (Utils.normalizeStatForProbability(reaction) * 400);
        const fielderSpeed = 15 + (Utils.normalizeStatForProbability(speed) * 30);

        // Time to reach ball (distance / speed + reaction)
        const timeToReachBall = reactionDelay + (distanceToTravel / fielderSpeed) * 1000;

        // Fielder attempts to reach ball
        const reachesball = this.fielderReachesBall(fielder, battedBall);

        if (!reachesball) {
            this.logPlay(`${fielder.name} can't reach it!`);
            const result = this.resolveHit(battedBall, false, fielder);
            result.fieldingPhysics = { timeToReachBall, ballFlightTime: battedBall.flightTime, distanceToTravel };
            return result;
        }

        // Fielder attempts to field cleanly
        const fieldsCleanly = this.fielderFieldsCleanly(fielder);

        if (!fieldsCleanly) {
            this.logPlay(`${fielder.name} bobbles the ball!`);
            const result = this.resolveHit(battedBall, false, fielder);
            result.fieldingPhysics = { timeToReachBall, ballFlightTime: battedBall.flightTime, distanceToTravel };
            return result;
        }

        // Successful fielding - attempt to make out
        this.logPlay(`${fielder.name} fields it cleanly!`);
        const result = this.resolveFieldedBall(fielder, battedBall);
        result.fieldingPhysics = { timeToReachBall, ballFlightTime: battedBall.flightTime, distanceToTravel };
        return result;
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

    // Check if fielder reaches ball (physics-based)
    fielderReachesBall(fielder, battedBall) {
        const speed = fielder.fielding.speed;
        const reaction = fielder.fielding.reactionTime;

        // Calculate fielder's starting position in field units
        const fielderPos = this.getFielderPosition(fielder.position);

        // Calculate where ball lands in field units
        const ballLandPos = this.getBallLandingPosition(battedBall);

        // Calculate distance fielder needs to cover
        const dx = ballLandPos.x - fielderPos.x;
        const dy = ballLandPos.y - fielderPos.y;
        const distanceToTravel = Math.sqrt(dx * dx + dy * dy);

        // Reaction time delay (better reaction = less delay)
        // Range: 100ms to 500ms
        const reactionDelay = 500 - (Utils.normalizeStatForProbability(reaction) * 400);

        // Calculate fielder speed in field units per second
        // Speed stat range: 0-100, maps to ~15-45 units/sec (roughly 5-15 mph)
        const fielderSpeed = 15 + (Utils.normalizeStatForProbability(speed) * 30);

        // Time available to reach ball (flight time minus reaction time)
        const timeAvailable = Math.max(0, battedBall.flightTime - reactionDelay);

        // Distance fielder can cover in available time
        const maxDistance = (fielderSpeed * timeAvailable) / 1000;

        // Add some randomness for variation (±10%)
        const randomFactor = 0.9 + Math.random() * 0.2;

        // Can the fielder reach it?
        return (maxDistance * randomFactor) >= distanceToTravel;
    }

    // Get fielder position in field coordinates (abstract units)
    getFielderPosition(position) {
        // Field coordinate system: home plate at (0, 0), center field at (0, 100)
        // Pitcher now at center of diamond
        const positions = {
            'P': { x: 0, y: 32 }, // Moved from 20 to center (halfway to 2nd base at ~64)
            'C': { x: 0, y: -5 },
            '1B': { x: 30, y: 30 },
            '2B': { x: 25, y: 50 },
            '3B': { x: -30, y: 30 },
            'SS': { x: -25, y: 50 },
            'LF': { x: -60, y: 90 },
            'CF': { x: 0, y: 100 },
            'RF': { x: 60, y: 90 }
        };
        return positions[position] || { x: 0, y: 50 };
    }

    // Get ball landing position in field coordinates
    getBallLandingPosition(battedBall) {
        const directionRad = (battedBall.direction / 180) * Math.PI;
        // Distance in feet maps to field units (scale: 1 unit ≈ 4 feet)
        const fieldDistance = battedBall.distance / 4;

        return {
            x: Math.sin(directionRad) * fieldDistance,
            y: Math.cos(directionRad) * fieldDistance
        };
    }

    // Check if fielder fields ball cleanly
    fielderFieldsCleanly(fielder) {
        const fielding = fielder.fielding.fielding;

        // MLB: ~98% of reached balls are fielded cleanly
        const fieldingProb = 0.90 + (Utils.normalizeStatForProbability(fielding) * 0.09);

        return Math.random() < fieldingProb;
    }

    // Resolve successfully fielded ball (physics-based baserunning)
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

        // Ground ball - physics-based race to first
        this.logPlay(`${fielder.name} throws to first...`);

        // 1. Calculate runner's time to first base
        const runnerSpeed = this.currentBatter.baserunning.speed;
        const normalizedRunSpeed = Utils.normalizeStatForProbability(runnerSpeed);
        // MLB average: 4.2-4.5 seconds home to first for RHB
        // Fast runners: 3.8-4.0 seconds
        const runnerTimeMs = 4500 - (normalizedRunSpeed * 700); // 3800-4500ms

        // 2. Calculate time for ball to reach first
        // Time = fielding time + throw time + catch time
        const fieldingPos = this.getFielderPosition(fielder.position);
        const firstBasePos = this.getFielderPosition('1B');
        const throwDistance = Math.sqrt(
            Math.pow(firstBasePos.x - fieldingPos.x, 2) +
            Math.pow(firstBasePos.y - fieldingPos.y, 2)
        );

        // Throw velocity based on throwing power (40-70 units/second)
        const throwPower = fielder.fielding.throwingPower;
        const normalizedThrowPower = Utils.normalizeStatForProbability(throwPower);
        const throwVelocity = 40 + (normalizedThrowPower * 30);

        // Time for throw to reach first
        const throwTimeMs = (throwDistance / throwVelocity) * 1000;

        // Release time (how quickly fielder releases ball)
        const fieldingSkill = fielder.fielding.fielding;
        const normalizedFielding = Utils.normalizeStatForProbability(fieldingSkill);
        const releaseTimeMs = 400 - (normalizedFielding * 200); // 200-400ms

        // Total time for ball to reach first
        const ballTimeMs = throwTimeMs + releaseTimeMs;

        // 3. Check throwing accuracy - might make bad throw
        const throwAccuracy = fielder.fielding.throwingAccuracy;
        const normalizedAccuracy = Utils.normalizeStatForProbability(throwAccuracy);
        const throwIsAccurate = Math.random() < (0.8 + normalizedAccuracy * 0.19); // 80-99% accurate

        // 4. Determine outcome
        let result;
        if (!throwIsAccurate) {
            this.logPlay(`Throwing error! Safe at first!`);
            result = this.resolveHit(battedBall, false, fielder);
        } else if (ballTimeMs < runnerTimeMs) {
            // Ball beats runner
            this.logPlay(`OUT at first base!`);
            result = this.resolveOut('groundout');
            result.fielder = fielder;
            result.throwTarget = 'first';
        } else {
            // Runner beats throw
            this.logPlay(`Safe at first!`);
            result = this.resolveHit(battedBall, false, fielder);
        }

        // Add timing info for animations
        result.baserunningPhysics = {
            runnerTimeMs,
            ballTimeMs,
            throwDistance
        };

        return result;
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
