// 2D Canvas Renderer for Eternal League Baseball with full animations

class FieldRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Use fixed dimensions to match canvas size (700x525)
        this.width = 700;
        this.height = 525;
        canvas.width = this.width;
        canvas.height = this.height;

        // Field dimensions scaled for 700x525 canvas
        this.centerX = this.width / 2;
        this.centerY = this.height - 80; // Home plate near bottom (more space for outfield)

        // Base positions - larger diamond to fill canvas better
        this.baseDistance = 90; // Scale up from 120 to use more space
        this.homeplate = { x: this.centerX, y: this.centerY };
        this.firstBase = {
            x: this.centerX + this.baseDistance * Math.cos(Math.PI / 4),
            y: this.centerY - this.baseDistance * Math.sin(Math.PI / 4)
        };
        this.secondBase = {
            x: this.centerX,
            y: this.centerY - this.baseDistance * Math.sqrt(2)
        };
        this.thirdBase = {
            x: this.centerX - this.baseDistance * Math.cos(Math.PI / 4),
            y: this.centerY - this.baseDistance * Math.sin(Math.PI / 4)
        };

        // Fielder positions scaled proportionally
        this.fieldPositions = {
            'P': { x: this.centerX, y: this.centerY - 40 },
            'C': { x: this.centerX, y: this.centerY + 15 },
            '1B': { x: this.firstBase.x + 12, y: this.firstBase.y + 12 },
            '2B': { x: this.centerX + 45, y: this.secondBase.y + 30 },
            '3B': { x: this.thirdBase.x - 12, y: this.thirdBase.y + 12 },
            'SS': { x: this.centerX - 45, y: this.secondBase.y + 30 },
            'LF': { x: this.centerX - 120, y: this.centerY - 180 },
            'CF': { x: this.centerX, y: this.centerY - 210 },
            'RF': { x: this.centerX + 120, y: this.centerY - 180 }
        };

        // Animation state
        this.ball = null; // { x, y, height }
        this.animatingPlayers = new Map();
        this.isAnimating = false;
    }

    // Convert batted ball distance (feet) and direction to screen coordinates
    getBallLandingScreenPos(battedBall) {
        const directionRad = (battedBall.direction / 180) * Math.PI;
        // Match the physics calculation: 1 field unit = 4 feet, then scale to screen
        const fieldDistance = battedBall.distance / 4;
        const screenScale = 2.5; // Scale field units to screen pixels

        return {
            x: this.homeplate.x + Math.sin(directionRad) * fieldDistance * screenScale,
            y: this.homeplate.y - Math.cos(directionRad) * fieldDistance * screenScale
        };
    }

    // Draw the entire field with proper baseball diamond
    drawField() {
        // Clear canvas - base grass color
        this.ctx.fillStyle = '#0d4d0d';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw outfield grass (darker semicircle for depth)
        this.ctx.fillStyle = '#0a3d0a';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 240, Math.PI, 0, false);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw infield dirt (diamond shape) - proper baseball infield
        this.ctx.fillStyle = '#8b6f47';
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.firstBase.x + 20, this.firstBase.y + 20);
        this.ctx.lineTo(this.secondBase.x, this.secondBase.y - 20);
        this.ctx.lineTo(this.thirdBase.x - 20, this.thirdBase.y + 20);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw pitcher's mound (darker dirt)
        this.ctx.fillStyle = '#7a5c3a';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY - 40, 15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#6b4d2f';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw basepaths
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;

        // First to second
        this.ctx.beginPath();
        this.ctx.moveTo(this.firstBase.x, this.firstBase.y);
        this.ctx.lineTo(this.secondBase.x, this.secondBase.y);
        this.ctx.stroke();

        // Second to third
        this.ctx.beginPath();
        this.ctx.moveTo(this.secondBase.x, this.secondBase.y);
        this.ctx.lineTo(this.thirdBase.x, this.thirdBase.y);
        this.ctx.stroke();

        // Third to home
        this.ctx.beginPath();
        this.ctx.moveTo(this.thirdBase.x, this.thirdBase.y);
        this.ctx.lineTo(this.homeplate.x, this.homeplate.y);
        this.ctx.stroke();

        // Home to first
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.firstBase.x, this.firstBase.y);
        this.ctx.stroke();

        // Draw foul lines (extend to canvas edges)
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;

        // Right field line (home to right field corner)
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.width - 10, 20);
        this.ctx.stroke();

        // Left field line (home to left field corner)
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(10, 20);
        this.ctx.stroke();

        // Draw bases
        this.drawBase(this.firstBase.x, this.firstBase.y, false);
        this.drawBase(this.secondBase.x, this.secondBase.y, false);
        this.drawBase(this.thirdBase.x, this.thirdBase.y, false);
        this.drawHomeplate();
    }

    // Draw a base
    drawBase(x, y, occupied) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(Math.PI / 4);

        this.ctx.fillStyle = occupied ? '#ffd93d' : '#ffffff';
        this.ctx.fillRect(-10, -10, 20, 20);

        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-10, -10, 20, 20);

        this.ctx.restore();
    }

    // Draw home plate
    drawHomeplate() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.homeplate.x - 12, this.homeplate.y - 12);
        this.ctx.lineTo(this.homeplate.x - 12, this.homeplate.y - 24);
        this.ctx.lineTo(this.homeplate.x + 12, this.homeplate.y - 24);
        this.ctx.lineTo(this.homeplate.x + 12, this.homeplate.y - 12);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Draw fielders
    drawFielders(fieldingTeam) {
        if (!fieldingTeam) return;

        fieldingTeam.lineup.forEach(player => {
            if (player.position === 'P') return; // Skip pitcher in lineup
            const pos = this.fieldPositions[player.position];
            if (pos) {
                // Check if this player is animating
                const animPos = this.animatingPlayers.get(player.id);
                if (animPos) {
                    this.drawPlayer(animPos.x, animPos.y, '#4a90e2', player.name);
                } else {
                    this.drawPlayer(pos.x, pos.y, '#4a90e2', player.name);
                }
            }
        });

        // Draw pitcher separately
        if (fieldingTeam.pitcher) {
            const pitcherPos = this.fieldPositions['P'];
            const animPos = this.animatingPlayers.get(fieldingTeam.pitcher.id);
            if (animPos) {
                this.drawPlayer(animPos.x, animPos.y, '#e24a4a', fieldingTeam.pitcher.name);
            } else {
                this.drawPlayer(pitcherPos.x, pitcherPos.y, '#e24a4a', fieldingTeam.pitcher.name);
            }
        }
    }

    // Draw a player (circle with label)
    drawPlayer(x, y, color, name = '', highlight = false) {
        // Draw circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, highlight ? 12 : 10, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = highlight ? '#ffff00' : '#ffffff';
        this.ctx.lineWidth = highlight ? 3 : 2;
        this.ctx.stroke();

        // Draw name label
        if (name) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 11px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            const lastName = name.split(' ')[1] || name;
            this.ctx.strokeText(lastName, x, y - 16);
            this.ctx.fillText(lastName, x, y - 16);
        }
    }

    // Draw runners on bases
    drawRunners(bases) {
        if (bases.first) {
            this.drawPlayer(this.firstBase.x, this.firstBase.y, '#6bcf7f', bases.first.name);
        }
        if (bases.second) {
            this.drawPlayer(this.secondBase.x, this.secondBase.y, '#6bcf7f', bases.second.name);
        }
        if (bases.third) {
            this.drawPlayer(this.thirdBase.x, this.thirdBase.y, '#6bcf7f', bases.third.name);
        }
    }

    // Draw batter
    drawBatter(batter) {
        if (!batter) return;
        const batterPos = { x: this.homeplate.x + 20, y: this.homeplate.y - 10 };
        this.drawPlayer(batterPos.x, batterPos.y, '#ffd93d', batter.name, true);
    }

    // Draw ball in top-down view with height
    drawBall(x, y, height = 0) {
        // In top-down view, height affects:
        // 1. Shadow position (always on ground)
        // 2. Ball size (smaller when higher)
        // 3. Ball position offset (perspective effect)

        // Draw shadow on ground (darker and smaller when ball is higher)
        if (height > 0) {
            const shadowOpacity = Math.min(0.4, 0.1 + (height / 100) * 0.3);
            const shadowSize = 6 - (height / 100) * 2; // Smaller shadow when higher
            this.ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
            this.ctx.beginPath();
            this.ctx.ellipse(x, y, shadowSize, shadowSize * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Ball appears offset up and slightly left for perspective (higher = more offset)
        const perspectiveOffset = (height / 100) * 30; // Max 30 pixels up
        const ballX = x - (height / 100) * 5; // Slight left offset
        const ballY = y - perspectiveOffset;

        // Ball size scales with height (smaller when higher = farther from "camera")
        const baseRadius = 6;
        const heightScale = 1 - (height / 100) * 0.4; // Max 40% smaller
        const ballRadius = baseRadius * Math.max(0.6, heightScale);

        // Draw ball with white fill and red stitching
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Red stitching
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        // Add slight glow when ball is high (in flight)
        if (height > 20) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(ballX, ballY, ballRadius + 2, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    // ANIMATION: Pitch (pitcher to plate)
    async animatePitch() {
        const startX = this.centerX;
        const startY = this.centerY - 50;
        const endX = this.homeplate.x;
        const endY = this.homeplate.y - 10;

        return this.animateBallFlight(startX, startY, endX, endY, 400, 0);
    }

    // ANIMATION: Batted ball (legacy, kept for compatibility)
    async animateBattedBall(battedBall, fielder) {
        const startX = this.homeplate.x;
        const startY = this.homeplate.y - 10;

        // Calculate end position based on direction and distance
        const directionRad = (battedBall.direction / 180) * Math.PI;
        const distanceScale = 0.6;
        const endX = startX + Math.sin(directionRad) * battedBall.distance * distanceScale;
        const endY = startY - Math.cos(directionRad) * battedBall.distance * distanceScale;

        // Arc height based on ball type
        let arcHeight = 0;
        if (battedBall.type === 'flyball') arcHeight = 80;
        else if (battedBall.type === 'popup') arcHeight = 120;
        else if (battedBall.type === 'linedrive') arcHeight = 30;
        else if (battedBall.type === 'groundball') arcHeight = 10;

        const duration = battedBall.type === 'groundball' ? 800 : 1200;

        return this.animateBallFlight(startX, startY, endX, endY, duration, arcHeight);
    }

    // ANIMATION: Batted ball with physics-based timing
    async animateBattedBallPhysics(battedBall, endX, endY, gameSpeed) {
        const startX = this.homeplate.x;
        const startY = this.homeplate.y - 10;

        // Arc height based on ball type
        let arcHeight = 0;
        if (battedBall.type === 'flyball') arcHeight = 80;
        else if (battedBall.type === 'popup') arcHeight = 120;
        else if (battedBall.type === 'linedrive') arcHeight = 30;
        else if (battedBall.type === 'groundball') arcHeight = 10;

        // Use the actual flight time from physics
        const duration = battedBall.flightTime / gameSpeed;

        return this.animateBallFlight(startX, startY, endX, endY, duration, arcHeight);
    }

    // ANIMATION: Ball flight with arc (proper top-down view)
    async animateBallFlight(startX, startY, endX, endY, duration, arcHeight) {
        this.isAnimating = true;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Field position (x, y on the ground)
                const x = Utils.lerp(startX, endX, progress);
                const y = Utils.lerp(startY, endY, progress);

                // Height above field (parabolic arc)
                // Height is 0 at start and end, peaks at middle
                const height = arcHeight > 0 ? Math.sin(progress * Math.PI) * arcHeight : 0;

                this.ball = { x, y, height };

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.ball = null;
                    this.isAnimating = false;
                    resolve();
                }
            };

            animate();
        });
    }

    // ANIMATION: Fielder running to ball
    async animateFielderToBall(fielder, ballX, ballY, duration = 800) {
        this.isAnimating = true;
        const pos = this.fieldPositions[fielder.position];
        if (!pos) return;

        const startX = pos.x;
        const startY = pos.y;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const x = Utils.lerp(startX, ballX, progress);
                const y = Utils.lerp(startY, ballY, progress);

                this.animatingPlayers.set(fielder.id, { x, y });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.animatingPlayers.delete(fielder.id);
                    this.isAnimating = false;
                    resolve();
                }
            };

            animate();
        });
    }

    // ANIMATION: Throw to base
    async animateThrowToBase(fromX, fromY, toBase, duration = 600) {
        this.isAnimating = true;
        let targetX, targetY;

        if (toBase === 'first') {
            targetX = this.firstBase.x;
            targetY = this.firstBase.y;
        } else if (toBase === 'second') {
            targetX = this.secondBase.x;
            targetY = this.secondBase.y;
        } else if (toBase === 'third') {
            targetX = this.thirdBase.x;
            targetY = this.thirdBase.y;
        } else {
            targetX = this.homeplate.x;
            targetY = this.homeplate.y;
        }

        return this.animateBallFlight(fromX, fromY, targetX, targetY, duration, 40);
    }

    // ANIMATION: Runner to base
    async animateRunnerToBase(runner, fromBase, toBase, duration = 1000) {
        this.isAnimating = true;
        let startX, startY, endX, endY;

        // Determine start position
        if (fromBase === 'home') {
            startX = this.homeplate.x + 20;
            startY = this.homeplate.y - 10;
        } else if (fromBase === 'first') {
            startX = this.firstBase.x;
            startY = this.firstBase.y;
        } else if (fromBase === 'second') {
            startX = this.secondBase.x;
            startY = this.secondBase.y;
        } else if (fromBase === 'third') {
            startX = this.thirdBase.x;
            startY = this.thirdBase.y;
        }

        // Determine end position
        if (toBase === 'first') {
            endX = this.firstBase.x;
            endY = this.firstBase.y;
        } else if (toBase === 'second') {
            endX = this.secondBase.x;
            endY = this.secondBase.y;
        } else if (toBase === 'third') {
            endX = this.thirdBase.x;
            endY = this.thirdBase.y;
        } else if (toBase === 'home') {
            endX = this.homeplate.x;
            endY = this.homeplate.y;
        }

        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Interpolate along the basepath (not straight line)
                const x = Utils.lerp(startX, endX, progress);
                const y = Utils.lerp(startY, endY, progress);

                // Store runner animation position
                this.animatingPlayers.set(`runner-${runner.id}`, { x, y });

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.animatingPlayers.delete(`runner-${runner.id}`);
                    this.isAnimating = false;
                    resolve();
                }
            };

            animate();
        });
    }

    // Render full game state
    renderGameState(simulation, fieldingTeam) {
        this.drawField();
        this.drawFielders(fieldingTeam);
        this.drawRunners(simulation.bases);

        // Draw animating baserunners (runners in motion)
        for (const [key, pos] of this.animatingPlayers.entries()) {
            // Convert key to string to safely check if it's a runner
            const keyStr = String(key);
            if (keyStr.startsWith('runner-')) {
                // Draw running batter/runner in yellow
                this.drawPlayer(pos.x, pos.y, '#ffd93d', '', false);
            }
        }

        // Draw batter at plate (unless they're animating as a runner)
        const batterIsRunning = this.animatingPlayers.has(`runner-${simulation.currentBatter?.id}`);
        if (!batterIsRunning) {
            this.drawBatter(simulation.currentBatter);
        }

        // Draw ball if animating (with height for top-down perspective)
        if (this.ball) {
            this.drawBall(this.ball.x, this.ball.y, this.ball.height || 0);
        }
    }
}
