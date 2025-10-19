
# Eternal League Baseball

## Game Design Document

-----

## Core Concept

A daily single-player baseball simulation game inspired by Blaseball. Each day, the player’s team faces a randomly-generated opponent. The player reviews the matchup, places a bet, then watches an accelerated 2D real-time simulation of the game with full play-by-play action.

**Platform:** Web-based game

**Target Session Length:** 5-15 minutes per day

-----

## Daily Gameplay Loop

### 1. Pre-Game Phase (2-5 minutes)

- Review today’s randomly-generated opponent team
- Compare team stats and player lineups
- Make roster adjustments:
  - Swap batting order
  - Change active snacks
  - Apply purchased upgrades
- Place bet on yourself or opponent

### 2. Game Simulation (3-8 minutes)

- Watch real-time 2D top-down baseball simulation
- Accelerated gameplay (2-3x speed)
- Live text play-by-play log
- Players can skip to results and review game log afterward
- Pure spectation - no mid-game player input

### 3. Post-Game Phase (1-2 minutes)

- View final score and game results
- Collect winnings/losses from bet
- See itemized snack payouts
- Access shop for upgrades and purchases
- Make roster changes for next day

### Offline/Missed Days

- Games auto-resolve if player doesn’t log in
- Results and passive coin income stored
- Displayed on next login

-----

## Baseball Simulation

### Technical Presentation

**Visual Display:**

- 2D top-down static camera view
- Players represented as circles
- Ball represented as smaller circle
- Simple geometric field representation
- All player positions visible
- Real-time ball movement and trajectories

**Play-by-Play System:**

- Live text log of all game actions
- Scrollable/reviewable after game completion
- Examples:
  - “Johnson steps up to the plate.”
  - “Strike one.”
  - “Swings and hits a grounder to short…”
  - “Martinez throws to first. OUT!”

### Simulation Depth

**Pitch-by-Pitch Resolution:**
Each at-bat simulates individual pitches with full state tracking:

- Ball/strike count
- Pitch selection and location
- Batter swing decision
- Contact result
- Ball trajectory and physics
- Fielding sequence
- Base running decisions
- Outcome resolution

**Real-Time Animation:**

- Ball trajectory interpolation (ground balls, line drives, fly balls, pop-ups)
- Player movement toward intercept points
- Throwing arcs between bases
- Base runner advancement and sliding
- All actions visible on field

-----

## Player Statistics System

### Position Players (Batters/Fielders)

**Batting Stats:**

- **Contact Skill** - Ability to make contact with the ball
- **Power** - Distance/velocity when contact is made
- **Plate Discipline** - Ability to recognize good vs. bad pitches
- **Swing Aggression** - Tendency to swing hard (distinct from power ability)

**Baserunning Stats:**

- **Speed** - Running velocity
- **Stealing Skill** - Ability to successfully steal bases
- **Stealing Tendency** - Likelihood of attempting steals
- **Baserunning Intelligence** - Taking extra bases, tagging up decisions

**Fielding Stats:**

- **Fielding** - Clean catch/pickup without bobbling
- **Throwing Accuracy** - Precision of throws
- **Throwing Power** - Speed of throws
- **Speed** - Movement to ball
- **Reaction Time** - Initial response to ball in play

### Pitchers

- **Velocity** - Pitch speed
- **Control** - Pitch accuracy and location
- **Movement** - Break and deception on pitches
- **Stamina** - Degrades over innings pitched

### Design Philosophy

Stats are separated into **capability** vs. **tendency** where it makes behavioral sense. For example:

- Batters have both power ability and swing aggression tendency
- Runners have both stealing skill and stealing tendency
- Fielders always attempt to field (no “willingness to field” stat needed)

-----

## Team Management

### Roster Structure

- **Pitching:** Bullpen order (all pitchers available each game, one per game)
- **Lineup:** Batting order with field positions
- Players can be reordered but not substituted mid-game

### Position Strategy

- Position placement matters for fielding coverage
- Shortstop with low speed creates coverage gaps
- Outfielders with poor reaction time miss balls
- Players must be strategically positioned

-----

## Economy System

### Earning Coins

**Primary Income Sources:**

1. **Betting** - Bet on yourself or opponent before each game
1. **Snacks** - Passive income from active snacks (see below)
1. **Win Bonus** - Small coin reward for team victories (independent of bet)

**Snack System:**

- Purchasable passive income items
- Unlimited inventory capacity
- Limited number of “Active” snack slots (starts at 4-5)
- Active snacks provide full income
- Inactive snacks provide small fraction of income
- Snacks can be upgraded with coins
- Can activate/deactivate between games

**Snack Types (Income Triggers):**

- Money for wins
- Money for losses
- Money for home runs
- Money for RBIs
- Money for strikeouts
- Money for deaths/incinerations
- Money for stolen bases
- Money for injuries

**Real-Time Feedback:**
Snack payouts appear during game simulation as events occur
(e.g., “Hot Dog Stand: +15 coins” on home run)

### Spending Coins

**Betting:**

- Betting ceiling can be upgraded
- Determines maximum bet size

**Active Snack Slots:**

- Expensive upgrades
- Increase number of simultaneously active snacks
- Critical progression bottleneck

**Team Modifications:**

**Player Stat Modifications:**

- **Random Modifier:** -20% to +40% to all stats on one player
- **Targeted Buff with Tradeoff:** +20% to specific stat, -20% to random other stat on same player
- **Steal and Weaken:** -20% to all stats on one player, +20% to specific stat on another player

**Roster Changes:**

- **Trade Player:** Swap a specific player with specific opponent player
- **Buy New Player:** Purchase randomized new player, then choose who to swap out (or discard, no refunds)
- **Nuclear Option:** For high cost, fire entire roster and acquire opponent’s full roster

**Snack Upgrades:**

- Increase payout amounts
- Possibly unlock new snack types

-----

## Incineration & Death System

### Incineration Mechanics

- **Frequency:** 1% chance on any play
- **Effect:** Player immediately removed from game and roster
- **Replacement:** Instantly replaced by randomly-generated new player
- **Game continues** without pause

### Expected Rate

- ~250-300 plays per game
- 2-3 incinerations per game on average
- High roster churn creates volatility

### Graveyard & Resurrection

- **Graveyard:** Permanent record of all players who died on your team
- **Resurrection:** Pay coins to bring back a dead player
- **Penalty:** Resurrected player has -100% to one random stat
  - Creates meaningful decision: Is star pitcher worth it if they can’t throw strikes?
  - Or star slugger with 0% contact skill?

### Strategic Implications

- Can permanently lose your best players
- Forces adaptation and team rebuilding
- Resurrection provides safety valve but with severe consequences
- Graveyard serves as memorial and strategic resource

-----

## Opponent Generation & Difficulty

### Team Generation

- Teams randomly generated each day
- High variance in player stats
- Wide range of team compositions possible

### Scaling

- Loose scaling with player’s team strength
- Both easy and very hard matchups can occur
- Upsets are common and expected
- No guarantee of consistent difficulty

### Strategic Betting

- Player must evaluate matchup before betting
- Risk management in bet sizing
- Strong teams not guaranteed to win
- Weak teams can pull upsets

-----

## Progression System

### Long-Term Growth

- Team slowly improves permanently through purchases
- Accumulation of coins and snacks
- Upgraded betting ceiling
- Increased active snack slots

### Balancing Forces

- Incineration randomly kills/nerfs players
- Prevents runaway snowballing
- Forces adaptation and roster changes
- Mirrors Blaseball’s chaos philosophy

### Week 1 vs. Week 20

- Early: Scarce resources, fragile roster, low betting ceiling
- Late: Stable coin income, deeper snack portfolio, stronger core roster (despite incinerations)
- Progression feels meaningful but never completely secure

-----

## Technical Approach

### Platform

- Web-based game
- Canvas/WebGL for field rendering
- JavaScript for simulation logic

### Core Systems Needed

**State Machine:**

- At-bat count tracking
- Pitch resolution
- Swing decisions
- Contact calculation
- Ball physics
- Fielding sequences
- Base advancement
- Outcome tracking

**Animation System:**

- Ball trajectory interpolation
- Player movement and pathfinding
- Throw arcs
- Runner advancement
- Smooth real-time playback

**Simulation Logic:**

1. Pitcher throws → velocity/control/movement determine trajectory
1. Batter swing decision → plate discipline vs. pitch quality
1. Contact resolution → contact skill vs. pitch quality
1. Ball trajectory → power + swing aggression + contact quality determines launch
1. Fielders react → speed + reaction time to reach ball
1. Fielding attempt → fielding stat determines clean pickup
1. Throwing decision → which base to throw to
1. Throw execution → accuracy + power stats
1. Baserunner decisions → intelligence + tendency stats
1. Incineration check → 1% per play

-----

## Design Pillars

1. **Baseball Simulation First** - The core engagement is watching a real baseball game unfold
1. **Daily Ritual** - Quick, satisfying sessions that respect player time
1. **Meaningful Chaos** - Incineration creates volatility and adaptation
1. **Strategic Depth** - Roster management, betting, and snack economy provide decision space
1. **Permanent Consequences** - Death and resurrection system creates emotional stakes
1. **Incremental Progression** - Slow but steady team improvement balanced by chaos

-----

## Open Design Questions

1. **Simulation performance optimization** - Balancing detailed simulation with web performance
1. **Exact stat value ranges** - What’s the scale? 0-100? 0-1.0?
1. **Pitcher rotation details** - How many pitchers per team? When do they rotate?
1. **Snack pricing and upgrade curves** - Exact economy tuning needed
1. **Initial roster generation** - How strong is the player’s starting team?
1. **Opponent team naming** - Procedural generation? Theme-based?
1. **Save system details** - Local storage? Account-based?
1. **Mobile responsiveness** - How does the field view adapt to smaller screens?
