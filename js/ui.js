// UI Controller for Eternal League Baseball

class UIController {
    constructor(game) {
        this.game = game;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Pre-game phase
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('reorder-lineup-btn').addEventListener('click', () => {
            this.showLineupReorder();
        });

        document.getElementById('manage-snacks-btn').addEventListener('click', () => {
            this.showSnackManagement();
        });

        // Game phase
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.game.togglePause();
        });

        document.getElementById('speed-btn').addEventListener('click', () => {
            this.game.cycleSpeed();
            this.updateSpeedButton();
        });

        document.getElementById('skip-btn').addEventListener('click', () => {
            this.game.skipToEnd();
        });

        // Post-game phase
        document.getElementById('shop-btn').addEventListener('click', () => {
            this.showShop();
        });

        document.getElementById('graveyard-btn').addEventListener('click', () => {
            this.showGraveyard();
        });

        document.getElementById('next-day-btn').addEventListener('click', () => {
            this.game.nextDay();
        });

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Shop tabs
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchShopTab(e.target.dataset.tab);
            });
        });
    }

    // Show/hide phases
    showPhase(phase) {
        document.querySelectorAll('.game-phase').forEach(el => el.classList.add('hidden'));
        document.getElementById(`${phase}-phase`).classList.remove('hidden');
    }

    // Update coins display
    updateCoinsDisplay() {
        document.getElementById('coins-amount').textContent = Utils.formatNumber(this.game.economy.coins);
    }

    // Pre-game: Display matchup
    displayMatchup() {
        this.displayTeamLineup('player', this.game.playerTeam);
        this.displayTeamLineup('opponent', this.game.opponentTeam);

        document.getElementById('player-team-name').textContent = this.game.playerTeam.name;
        document.getElementById('opponent-team-name').textContent = this.game.opponentTeam.name;

        document.getElementById('max-bet').textContent = this.game.economy.maxBet;
        document.getElementById('bet-amount').max = this.game.economy.maxBet;
    }

    displayTeamLineup(teamType, team) {
        const container = document.getElementById(`${teamType}-lineup`);
        container.innerHTML = '';

        // Pitcher
        const pitcherCard = this.createPlayerCard(team.pitcher, 0);
        container.appendChild(pitcherCard);

        // Lineup
        team.lineup.forEach((player, index) => {
            const card = this.createPlayerCard(player, index + 1);
            container.appendChild(card);
        });
    }

    createPlayerCard(player, order) {
        const card = document.createElement('div');
        card.className = 'player-card';

        const stats = player.getStatsSummary();
        const statsHTML = Object.entries(stats)
            .map(([key, value]) => `<span class="stat">${key}: ${value}</span>`)
            .join('');

        card.innerHTML = `
            ${order > 0 ? `<span>${order}.</span>` : ''}
            <span class="player-name">${player.name}</span>
            <span class="player-position">${Utils.getPositionName(player.position)}</span>
            <div class="player-stats">${statsHTML}</div>
        `;

        return card;
    }

    // Start game
    startGame() {
        // Get bet info
        const betAmount = parseInt(document.getElementById('bet-amount').value) || 0;
        const betTeam = document.querySelector('input[name="bet-team"]:checked').value;

        // Place bet
        if (betAmount > 0) {
            const success = this.game.economy.placeBet(betAmount, betTeam);
            if (!success) {
                alert('Insufficient coins for bet!');
                return;
            }
        }

        this.updateCoinsDisplay();
        this.game.startSimulation();
    }

    // Game phase: Update scoreboard
    updateScoreboard(simulation) {
        const state = simulation.getGameState();

        document.getElementById('score-home').textContent = simulation.score.home;
        document.getElementById('score-away').textContent = simulation.score.away;
        document.getElementById('score-home-name').textContent = simulation.homeTeam.name;
        document.getElementById('score-away-name').textContent = simulation.awayTeam.name;

        const inningText = `${state.isTopInning ? 'Top' : 'Bottom'} ${state.inning}${simulation.getInningOrdinal(state.inning)}`;
        document.getElementById('inning-text').textContent = inningText;
    }

    // Update game state display
    updateGameState(simulation) {
        const state = simulation.getGameState();

        document.getElementById('outs-display').textContent = `Outs: ${state.outs}`;
        document.getElementById('count-display').textContent = `Count: ${state.balls}-${state.strikes}`;

        // Update bases
        document.getElementById('base-1').classList.toggle('occupied', state.bases.first);
        document.getElementById('base-2').classList.toggle('occupied', state.bases.second);
        document.getElementById('base-3').classList.toggle('occupied', state.bases.third);
    }

    // Add play to play-by-play log
    addPlayLog(playEntry) {
        const playLog = document.getElementById('play-log');
        const entry = document.createElement('div');
        entry.className = 'play-entry';

        if (playEntry.important) entry.classList.add('important');
        if (playEntry.incineration) entry.classList.add('incineration');

        entry.textContent = playEntry.message;

        playLog.appendChild(entry);
        playLog.scrollTop = playLog.scrollHeight; // Auto-scroll
    }

    clearPlayLog() {
        document.getElementById('play-log').innerHTML = '';
    }

    // Update speed button
    updateSpeedButton() {
        const speeds = ['1x', '2x', '3x', '4x'];
        document.getElementById('speed-btn').textContent = `Speed: ${speeds[this.game.gameSpeed - 1]}`;
    }

    // Post-game: Display results
    displayGameResults(won, betWinnings, snackPayouts) {
        const finalScore = `${this.game.opponentTeam.name} ${this.game.simulation.score.away} - ${this.game.playerTeam.name} ${this.game.simulation.score.home}`;
        document.getElementById('final-score').innerHTML = `
            <h2>${won ? 'VICTORY!' : 'Defeat'}</h2>
            <p>${finalScore}</p>
        `;

        // Bet results
        let betHTML = '';
        if (this.game.economy.currentBet.amount > 0) {
            if (betWinnings > 0) {
                betHTML = `<p style="color: #6bcf7f;">Bet Won! +${Utils.formatNumber(betWinnings)} coins</p>`;
            } else {
                betHTML = `<p style="color: #ff6b6b;">Bet Lost! -${Utils.formatNumber(this.game.economy.currentBet.amount)} coins</p>`;
            }
        }
        document.getElementById('bet-results').innerHTML = betHTML;

        // Snack earnings
        let snackHTML = '<h3>Snack Earnings</h3>';
        snackPayouts.breakdown.forEach(item => {
            snackHTML += `<p>${item.snackName} (${item.count}x): +${Utils.formatNumber(item.payout)} coins ${item.isActive ? '' : '(inactive)'}</p>`;
        });
        snackHTML += `<p><strong>Total Snack Earnings: +${Utils.formatNumber(snackPayouts.total)} coins</strong></p>`;
        document.getElementById('snack-earnings').innerHTML = snackHTML;

        this.updateCoinsDisplay();
    }

    // Shop modal
    showShop() {
        document.getElementById('shop-modal').classList.remove('hidden');
        this.switchShopTab('snacks');
    }

    switchShopTab(tab) {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.shop-tab[data-tab="${tab}"]`).classList.add('active');

        const content = document.getElementById('shop-content');

        switch (tab) {
            case 'snacks':
                this.renderSnackShop(content);
                break;
            case 'upgrades':
                this.renderUpgradeShop(content);
                break;
            case 'roster':
                this.renderRosterShop(content);
                break;
        }
    }

    renderSnackShop(content) {
        content.innerHTML = '<h3>Purchase Snacks</h3>';

        this.game.economy.snackCatalog.forEach((snackData, index) => {
            const item = document.createElement('div');
            item.className = 'shop-item';
            item.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-name">${snackData.name}</div>
                    <div class="shop-item-description">${snackData.description} - ${snackData.basePayout} coins per trigger</div>
                </div>
                <span class="shop-item-price">${Utils.formatNumber(snackData.cost)} coins</span>
                <button onclick="game.purchaseSnack(${index})">Buy</button>
            `;
            content.appendChild(item);
        });

        // Owned snacks
        content.innerHTML += '<h3>Your Snacks</h3>';
        this.game.economy.snacks.forEach(snack => {
            const item = document.createElement('div');
            item.className = 'shop-item';
            item.innerHTML = `
                <div class="shop-item-info">
                    <div class="shop-item-name">${snack.name} (Level ${snack.level}) ${snack.isActive ? '✓ ACTIVE' : ''}</div>
                    <div class="shop-item-description">Current payout: ${snack.getPayout()} coins</div>
                </div>
                <span class="shop-item-price">Upgrade: ${Utils.formatNumber(snack.getUpgradeCost())} coins</span>
                <button onclick="game.upgradeSnack(${snack.id})">Upgrade</button>
                <button onclick="game.toggleSnackActive(${snack.id})">${snack.isActive ? 'Deactivate' : 'Activate'}</button>
            `;
            content.appendChild(item);
        });
    }

    renderUpgradeShop(content) {
        content.innerHTML = '<h3>Upgrades</h3>';

        // Betting ceiling
        const bettingItem = document.createElement('div');
        bettingItem.className = 'shop-item';
        bettingItem.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-name">Increase Betting Ceiling</div>
                <div class="shop-item-description">Current max: ${this.game.economy.maxBet} coins. Increase by 50 coins.</div>
            </div>
            <span class="shop-item-price">${Utils.formatNumber(this.game.economy.maxBet * 2)} coins</span>
            <button onclick="game.upgradeBettingCeiling()">Upgrade</button>
        `;
        content.appendChild(bettingItem);

        // Active snack slots
        const slotItem = document.createElement('div');
        slotItem.className = 'shop-item';
        slotItem.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-name">Add Active Snack Slot</div>
                <div class="shop-item-description">Current slots: ${this.game.economy.activeSnackSlots}. Add 1 more slot.</div>
            </div>
            <span class="shop-item-price">${Utils.formatNumber(this.game.economy.getActiveSlotUpgradeCost())} coins</span>
            <button onclick="game.upgradeActiveSlots()">Upgrade</button>
        `;
        content.appendChild(slotItem);
    }

    renderRosterShop(content) {
        content.innerHTML = '<h3>Roster Modifications</h3><p>Player modification features coming soon!</p>';

        // TODO: Implement player stat modifications, trades, new player purchases
    }

    // Graveyard modal
    showGraveyard() {
        const modal = document.getElementById('graveyard-modal');
        const content = document.getElementById('graveyard-content');

        modal.classList.remove('hidden');

        content.innerHTML = '<h3>Fallen Heroes</h3>';

        if (this.game.economy.graveyard.length === 0) {
            content.innerHTML += '<p>No players have been incinerated yet.</p>';
        } else {
            this.game.economy.graveyard.forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'shop-item';
                const date = new Date(entry.deathDate).toLocaleDateString();
                item.innerHTML = `
                    <div class="shop-item-info">
                        <div class="shop-item-name">${entry.player.name}</div>
                        <div class="shop-item-description">${Utils.getPositionName(entry.player.position)} - Died ${date}</div>
                    </div>
                    <span class="shop-item-price">1,000 coins</span>
                    <button onclick="game.resurrectPlayer(${index})">Resurrect</button>
                `;
                content.appendChild(item);
            });
        }
    }

    showLineupReorder() {
        alert('Lineup reordering UI coming soon!');
        // TODO: Implement drag-and-drop lineup reordering
    }

    showSnackManagement() {
        this.showShop();
        this.switchShopTab('snacks');
    }
}
