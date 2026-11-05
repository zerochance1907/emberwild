# Credits

Emberwild uses **no third-party art, audio or font files**.

- **Art:** all creature sprites, characters, tiles, UI and effects are generated from code in `src/art/` at startup. They are original to this project. This includes the 18 Brinemark Coast creatures of Chapter Two (`src/art/creatureArt2.ts`), the coast, marsh, ruin, ridge, gust, current and tide tiles, and the Driftboard, bobber, valve and lens sprites.
- **Story, characters and places:** Emberwild, the Hollow Veil, the Pale Regent, every Warden, rival and trainer, and every town, route and dungeon (including Gullhaven, Mirefen Marsh, the Starfall Observatory, Stormcrest Ridge, Tidewrack Grotto and Tidewater Hall) were written for this project.
- **Music and sound:** composed for this project and synthesized at runtime with the Web Audio API (`src/audio/`). Chapter Two's eight tracks (Saltwind Road, Gullhaven, Mirefen, Starfall, Stormcrest, Tidewrack, Tidewatch Spire and Admin Vesper's theme) were written note by note in `src/audio/tracks.ts`, as were the gust, splash, valve and thunder effects.
- **Fonts:** the game uses the player's system fonts (Trebuchet MS, Segoe UI, Helvetica or Arial), so no font files are bundled.

## Libraries

| Library | License |
|---|---|
| [Phaser 3](https://phaser.io) | MIT |
| [Vite](https://vitejs.dev) | MIT |
| [TypeScript](https://www.typescriptlang.org) | Apache-2.0 |
| [Vitest](https://vitest.dev) | MIT |
| [Playwright](https://playwright.dev) | Apache-2.0 |
