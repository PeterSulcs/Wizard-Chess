# Gruesome Wizard's Chess

**[Play Now](https://petersulcs.github.io/Wizard-Chess/)**

A dark, atmospheric chess game inspired by the wizard's chess scene from Harry Potter — but considerably more violent. Play as White against a cunning AI automaton that controls the Black pieces. Captures leave blood stains, bone fragments, and particle explosions across the board.

## How to Play

- **Click** a white piece to select it, then click a highlighted square to move
- **Drag and drop** white pieces directly to their destination
- **Long-press** (hold ~0.5s) one of your pieces to activate the **Blood Meteor** spell — a one-time-use ability that instantly destroys an adjacent enemy piece without moving

Standard chess rules apply, including castling, en passant, and pawn promotion.

## Features

- Full chess engine with legal move validation, check/checkmate/stalemate detection
- Castling (kingside and queenside) and en passant
- AI opponent using minimax search with alpha-beta pruning and piece-square tables
- Blood Meteor spell — each side gets one per game, usable via long-press
- Procedural sound effects synthesized with the Web Audio API
- Canvas particle system for blood splatter, bone fragments, and meteor explosions
- Slide animations for piece movement
- Drag-and-drop and click-to-move input
- Captured pieces tray
- Game-over overlay with themed victory/defeat/stalemate screens
- Necromancer's Commentary log narrating each move in gruesome detail

## Development

Built with TypeScript and Vite. No external runtime dependencies.

```bash
npm install
npm run dev
```

## License

MIT
