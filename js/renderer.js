// 2D Canvas Renderer for Eternal League Baseball with full animations

class FieldRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Field dimensions (proper baseball diamond)
        this.centerX = this.width / 2;
        this.centerY = this.height * 0.75; // Home plate near bottom

        // Base positions (90 feet apart, 45-degree diamond)
        this.baseDistance = 120;
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

        // Fielder positions (proper baseball alignment)
        this.fieldPositions = {
            'P': { x: this.centerX, y: this.centerY - 50 },
            'C': { x: this.centerX, y: this.centerY + 20 },
            '1B': { x: this.firstBase.x + 15, y: this.firstBase.y + 15 },
            '2B': { x: this.centerX + 60, y: this.secondBase.y + 40 },
            '3B': { x: this.thirdBase.x - 15, y: this.thirdBase.y + 15 },
            'SS': { x: this.centerX - 60, y: this.secondBase.y + 40 },
            'LF': { x: this.centerX - 140, y: this.centerY - 220 },
            'CF': { x: this.centerX, y: this.centerY - 250 },
            'RF': { x: this.centerX + 140, y: this.centerY - 220 }
        };

        // Animation state
        this.ball = null;
        this.animatingPlayers = new Map();
        this.isAnimating = false;
    }

    // Draw the entire field with proper baseball diamond
    drawField() {
        // Clear canvas
        this.ctx.fillStyle = '#0d4d0d';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw outfield grass (arc)
        this.ctx.fillStyle = '#0a3d0a';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 280, Math.PI, 0);
        this.ctx.lineTo(this.centerX, this.centerY);
        this.ctx.fill();

        // Draw infield dirt (diamond shape)
        this.ctx.fillStyle = '#8b6f47';
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.firstBase.x + 25, this.firstBase.y + 25);
        this.ctx.lineTo(this.secondBase.x, this.secondBase.y - 25);
        this.ctx.lineTo(this.thirdBase.x - 25, this.thirdBase.y + 25);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw infield grass cutout
        this.ctx.fillStyle = '#0d4d0d';
        this.ctx.beginPath();
        const insetDistance = 40;
        this.ctx.moveTo(
            this.centerX + insetDistance * Math.cos(Math.PI / 4),
            this.centerY - insetDistance * Math.sin(Math.PI / 4)
        );
        this.ctx.lineTo(this.secondBase.x + insetDistance, this.secondBase.y);
        this.ctx.lineTo(
            this.centerX - insetDistance * Math.cos(Math.PI / 4),
            this.centerY - insetDistance * Math.sin(Math.PI / 4)
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Draw pitcher's mound
        this.ctx.fillStyle = '#7a5c3a';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY - 50, 18, 0, Math.PI * 2);
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

        // Draw foul lines
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;

        // Right field line
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.centerX + 400, this.homeplate.y - 400);
        this.ctx.stroke();

        // Left field line
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.centerX - 400, this.homeplate.y - 400);
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

    // Draw ball
    drawBall(x, y, shadow = true) {
        // Draw shadow if ball is in air
        if (shadow && y < this.centerY - 10) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(x, this.centerY, 8, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw ball
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
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

    // ANIMATION: Ball flight with arc
    async animateBallFlight(startX, startY, endX, endY, duration, arcHeight) {
        this.isAnimating = true;
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const x = Utils.lerp(startX, endX, progress);
                let y = Utils.lerp(startY, endY, progress);

                // Add parabolic arc
                if (arcHeight > 0) {
                    y -= Math.sin(progress * Math.PI) * arcHeight;
                }

                this.ball = { x, y };

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
        this.drawBatter(simulation.currentBatter);

        // Draw ball if animating
        if (this.ball) {
            this.drawBall(this.ball.x, this.ball.y);
        }
    }
}
