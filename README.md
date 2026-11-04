# Emberwild

**An original creature-bonding RPG that runs in your browser.** Pick a partner, explore a rain-soaked forest and a pitch-black crystal cave, bond with wild creatures, outwit the mysterious Hollow Veil and take on Warden Corra for the Cinder Sigil.

▶ **Play it: https://zerochance1907.github.io/emberwild/**

![Emberwild title screen](docs/screenshots/title.png)

| | |
|---|---|
| ![Overworld](docs/screenshots/village.png) | ![Battle](docs/screenshots/battle.png) |
| ![Whisperwood in the rain](docs/screenshots/forest.png) | ![Glimmer Cave](docs/screenshots/cave.png) |

Chapter One is a complete adventure of about 1–2 hours: a village, two routes, a forest with a light puzzle and hidden items, a dark cave dungeon and a town with the first Warden.

## Controls

| Action | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Move | Arrow keys / WASD | D-pad / left stick | On-screen D-pad |
| Confirm / talk | Z, Space, Enter | A | A button, or tap |
| Back | X, Backspace | B | B button |
| Run (hold) | Shift | X / RB | RUN button |
| Menu | Esc, M | Start | MENU button |

Every key can be remapped under **Settings → Remap keys**. Hold *Back* to fast-forward text.

## Features

- **18 original creatures** across 8 types (Ember, Tide, Sprout, Gale, Stone, Spark, Shade, Fae), each with stats, a learnset, a Wildlog entry and evolution lines. All sprites (front, back and icon) are drawn in code.
- **50 moves** (physical, special and status) and **5 status conditions**: burned, blighted, jolted, drowsy and dazed.
- **Turn-based battles** with speed order and priority, accuracy, critical hits, same-type bonus, stat stages, switching, items, fleeing and catching with Bond Stones (with shake animation). There's also XP, level-ups, move learning with a replace prompt, and an evolution scene.
- **Trainer AI** that scores moves by damage, KO potential, type matchups and status value, heals when in danger and switches out of bad matchups.
- **A short story** with a rival (Kip), the Hollow Veil and their Agent Nyx, a side quest (Old Bram's lost lantern), ten trainers with line-of-sight challenges and a chapter-end stats screen.
- **Systems:** starter choice, a team of 6 plus storage, bag, shop, Hearth healing, Wildlog (seen/bonded), and autosave plus 3 manual slots with export/import save codes.
- **Modern feel:** smooth tile movement and running, camera easing, a day/night cycle, rain in Whisperwood, a lantern-lit dark cave, and animated water, grass and crystals. Battles have hit flashes, screen shake, eased HP bars, damage numbers and particles for each type.
- **Accessibility and quality of life:** reduced-motion mode, text speed, battle speed, volume, remappable keys, touch controls and gamepad support.
- **Audio:** an original chiptune soundtrack (title, town, route, forest, cave, Hearth, battle, trainer, Veil, Warden, victory and ending), synthesized live with WebAudio by a tiny step sequencer, plus code-generated sound effects and a unique cry for every creature. There are no audio files.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # Vitest unit tests (battle engine, saves, maps, music data)
npm run e2e        # Playwright smoke test (builds first with `npm run build`)
npm run build      # typecheck + production build into dist/
```

Built with TypeScript, Vite and Phaser 3 (exact versions pinned in `package.json`). CI runs the typecheck, tests, build and smoke test on every PR. Pushing to `main` deploys `dist/` to GitHub Pages.

### Project layout

```
src/engine/   pure game logic (battle, AI, creatures, saves) — no Phaser, fully unit tested
src/data/     creatures, moves, types, items, trainers, maps
src/art/      sprite rasterizer, tile painter, character generator, creature designs
src/audio/    WebAudio sequencer + tracks
src/scenes/   Phaser scenes (title, overworld, UI overlay, battle, evolution, ending, touch)
src/game/     input, settings, session state and story scripts
src/ui/       dialog box, menus and widgets
tests/        Vitest suites        e2e/   Playwright smoke test
```

### Adding a creature

1. Add a `Species` entry in `src/data/creatures.ts` (types, base stats, learnset, optional `evolves`, Wildlog text).
2. Draw it in `src/art/creatureArt.ts`: a list of layered shapes on a 64×64 grid, facing left. `E` is an ellipse, `P` a polygon, `L` a thick line and `EYE` a glossy eye. Shading, contour lines and outlines are added automatically, and the back sprite and icon are generated from the same shapes.
3. Preview your art with `npx vite-node scripts/preview-creatures.ts out.png`.
4. Add it to an encounter table in `src/data/maps.ts` or to a trainer team in `src/data/trainers.ts`. The unit tests check that every reference is valid.

### Adding a map

Maps are ASCII grids in `src/data/maps.ts`. The legend is in `src/art/tiles.ts` (`LEGEND`): for example `.` grass, `,` tall grass, `:` path, `T` tree, `~` water, `v` ledge, `D` door. Add `warps` for doors, `connections` for map edges, plus `npcs`, `signs`, `items` (optionally `hidden`) and an `encounters` table. Run `npm test` to validate sizes, warps and edge connections, and `npx vite-node scripts/preview-maps.ts outdir` to render PNG previews.

## Originality

Emberwild is an original work. All creatures, characters, places, story, pixel art and music were made for this project; nothing is taken from any existing game. The art is generated from code at startup and the music is synthesized in the browser. See [CREDITS.md](CREDITS.md).

## License

MIT. See [LICENSE](LICENSE).
