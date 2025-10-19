// 2D Canvas Renderer for Eternal League Baseball

class FieldRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Field dimensions (in canvas pixels)
        this.centerX = this.width / 2;
        this.centerY = this.height * 0.7; // Home plate lower on screen

        // Base positions (relative to home plate)
        this.baseDistance = 100;
        this.homeplate = { x: this.centerX, y: this.centerY };
        this.firstBase = { x: this.centerX + this.baseDistance, y: this.centerY };
        this.secondBase = { x: this.centerX, y: this.centerY - this.baseDistance };
        this.thirdBase = { x: this.centerX - this.baseDistance, y: this.centerY };

        // Fielder positions (default defensive alignment)
        this.fieldPositions = {
            'P': { x: this.centerX, y: this.centerY - 40 },
            'C': { x: this.centerX, y: this.centerY + 15 },
            '1B': { x: this.centerX + 80, y: this.centerY - 10 },
            '2B': { x: this.centerX + 55, y: this.centerY - 55 },
            '3B': { x: this.centerX - 80, y: this.centerY - 10 },
            'SS': { x: this.centerX - 55, y: this.centerY - 55 },
            'LF': { x: this.centerX - 120, y: this.centerY - 150 },
            'CF': { x: this.centerX, y: this.centerY - 170 },
            'RF': { x: this.centerX + 120, y: this.centerY - 150 }
        };

        // Animation state
        this.ball = null; // { x, y, visible }
        this.animatingPlayers = {}; // playerPosition -> { x, y, targetX, targetY }
    }

    // Draw the entire field
    drawField() {
        // Clear canvas
        this.ctx.fillStyle = '#1a5c1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw outfield grass (darker)
        this.ctx.fillStyle = '#155015';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, 200, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw infield dirt
        this.ctx.fillStyle = '#8b7355';
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.firstBase.x + 20, this.firstBase.y + 20);
        this.ctx.lineTo(this.secondBase.x, this.secondBase.y - 20);
        this.ctx.lineTo(this.thirdBase.x - 20, this.thirdBase.y + 20);
        this.ctx.closePath();
        this.ctx.fill();

        // Draw pitcher's mound
        this.ctx.fillStyle = '#7a6345';
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY - 40, 15, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw bases
        this.drawBase(this.firstBase.x, this.firstBase.y, false);
        this.drawBase(this.secondBase.x, this.secondBase.y, false);
        this.drawBase(this.thirdBase.x, this.thirdBase.y, false);
        this.drawHomeplate();

        // Draw foul lines
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.homeplate.x + 300, this.homeplate.y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.homeplate.x - 300, this.homeplate.y);
        this.ctx.stroke();
    }

    // Draw a base
    drawBase(x, y, occupied) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(Math.PI / 4);

        this.ctx.fillStyle = occupied ? '#ffd93d' : '#ffffff';
        this.ctx.fillRect(-8, -8, 16, 16);

        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-8, -8, 16, 16);

        this.ctx.restore();
    }

    // Draw home plate
    drawHomeplate() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(this.homeplate.x, this.homeplate.y);
        this.ctx.lineTo(this.homeplate.x - 10, this.homeplate.y - 10);
        this.ctx.lineTo(this.homeplate.x - 10, this.homeplate.y - 20);
        this.ctx.lineTo(this.homeplate.x + 10, this.homeplate.y - 20);
        this.ctx.lineTo(this.homeplate.x + 10, this.homeplate.y - 10);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    // Draw fielders
    drawFielders(fieldingTeam) {
        fieldingTeam.lineup.forEach(player => {
            const pos = this.fieldPositions[player.position];
            if (pos) {
                this.drawPlayer(pos.x, pos.y, '#4a90e2', player.name);
            }
        });

        // Draw pitcher
        const pitcherPos = this.fieldPositions['P'];
        this.drawPlayer(pitcherPos.x, pitcherPos.y, '#e24a4a', fieldingTeam.pitcher.name);
    }

    // Draw a player (circle with label)
    drawPlayer(x, y, color, label = '') {
        // Draw circle
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw label
        if (label) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(label.split(' ')[1] || label, x, y - 12);
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
        const batterPos = { x: this.homeplate.x + 15, y: this.homeplate.y - 5 };
        this.drawPlayer(batterPos.x, batterPos.y, '#ffd93d', batter.name);
    }

    // Draw ball
    drawBall(x, y) {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    // Update bases display
    updateBasesDisplay(bases) {
        this.drawBase(this.firstBase.x, this.firstBase.y, bases.first);
        this.drawBase(this.secondBase.x, this.secondBase.y, bases.second);
        this.drawBase(this.thirdBase.x, this.thirdBase.y, bases.third);
    }

    // Animate ball trajectory
    async animateBallTrajectory(startX, startY, endX, endY, type, duration = 1000) {
        const startTime = Date.now();

        return new Promise(resolve => {
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Clear and redraw
                this.drawField();

                // Calculate ball position with arc
                const x = Utils.lerp(startX, endX, progress);
                let y = Utils.lerp(startY, endY, progress);

                // Add arc based on ball type
                if (type === 'flyball' || type === 'popup') {
                    const arcHeight = type === 'popup' ? 100 : 60;
                    y -= Math.sin(progress * Math.PI) * arcHeight;
                } else if (type === 'linedrive') {
                    const arcHeight = 20;
                    y -= Math.sin(progress * Math.PI) * arcHeight;
                }

                this.drawBall(x, y);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            animate();
        });
    }

    // Convert batted ball direction/distance to canvas coordinates
    battedBallToCanvas(battedBall) {
        const directionRad = (battedBall.direction * Math.PI) / 180;
        const distanceScale = 2; // Scale factor for visualization

        const endX = this.centerX + Math.sin(directionRad) * battedBall.distance * distanceScale;
        const endY = this.centerY - Math.cos(directionRad) * battedBall.distance * distanceScale;

        return { endX, endY };
    }

    // Render full game state
    renderGameState(simulation) {
        const state = simulation.getGameState();
        const fieldingTeam = simulation.isTopInning ? simulation.homeTeam : simulation.awayTeam;

        // Draw field
        this.drawField();

        // Draw fielders
        this.drawFielders(fieldingTeam);

        // Draw runners
        this.drawRunners(simulation.bases);

        // Draw batter
        this.drawBatter(state.currentBatter);
    }
}
