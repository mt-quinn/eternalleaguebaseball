# Eternal League Baseball

A daily single-player baseball simulation game inspired by Blaseball. Watch pitch-by-pitch action unfold in real-time, manage your roster, place bets, and survive the chaos of random incinerations.

## Features

### Core Gameplay
- **Pitch-by-pitch baseball simulation** with realistic probability models based on MLB statistics
- **Real-time 2D visualization** using Canvas API
- **Complete play-by-play commentary** for every action
- **Daily matchups** against procedurally-generated opponents

### Team Management
- **9-player lineup** with customizable batting order
- **Comprehensive player stats** (1-100 scale):
  - Batting: Contact, Power, Discipline, Aggression
  - Baserunning: Speed, Stealing Skill, Stealing Tendency, Intelligence
  - Fielding: Fielding, Throwing Accuracy, Throwing Power, Speed, Reaction Time
  - Pitching: Velocity, Control, Movement, Stamina

### Economy System
- **Betting system** - Bet on yourself or your opponent
- **Snack system** - Passive income items that trigger on game events
  - Active slots (limited, upgradeable)
  - Inactive snacks provide 10% earnings
- **Shop** - Purchase upgrades, snacks, and roster modifications

### Chaos Mechanics
- **1% incineration chance per play** - Players can be instantly removed and replaced
- **Graveyard** - Track all fallen players
- **Resurrection** - Bring back dead players (with -100% penalty to a random stat)

### Progression
- **localStorage persistence** - Your progress is automatically saved
- **Daily ritual** - Quick 5-15 minute sessions
- **Missed day handling** - Games auto-resolve with passive income
- **Long-term progression** - Upgrade betting limits, snack slots, and team stats

## How to Play

1. **Pre-Game Phase**
   - Review your team vs. today's opponent
   - Place a bet (optional)
   - Manage your active snacks
   - Adjust your lineup (coming soon)

2. **Game Phase**
   - Watch the game unfold in real-time (2x speed default)
   - Pause, change speed, or skip to end
   - See every pitch, swing, hit, and out
   - Watch for incinerations!

3. **Post-Game Phase**
   - Collect bet winnings/losses
   - Earn snack payouts based on game events
   - Visit the shop to spend coins
   - Check the graveyard for fallen heroes
   - Move to the next day

## Tech Stack

- **Pure vanilla JavaScript** - No frameworks
- **Canvas 2D API** - Real-time field rendering
- **localStorage** - Client-side persistence
- **Vercel** - Deployment platform

## Development

To run locally:

1. Clone the repository
2. Open `index.html` in a web browser
3. No build step required!

## Game Design

See [Eternal League Baseball.md](./Eternal%20League%20Baseball.md) for the complete design document.

## Roadmap

### Completed
- ✅ Core baseball simulation engine
- ✅ 2D field visualization
- ✅ Player and team systems
- ✅ Economy and snack systems
- ✅ Incineration mechanics
- ✅ Shop and graveyard
- ✅ Save/load functionality
- ✅ Daily scheduling

### Coming Soon
- 🔄 Drag-and-drop lineup reordering
- 🔄 Advanced roster modifications (trades, stat transfers)
- 🔄 Stolen base mechanics
- 🔄 Double plays and advanced fielding
- 🔄 Enhanced ball animations
- 🔄 Sound effects
- 🔄 Mobile-responsive design improvements
- 🔄 Team customization (names, colors)
- 🔄 Statistics tracking and history

## License

MIT

## Credits

Created with Claude Code. Inspired by Blaseball.
