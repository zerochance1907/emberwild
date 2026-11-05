import type Phaser from 'phaser';
import type { OverworldScene } from '../scenes/OverworldScene';
import { session } from './session';

/**
 * A small test/debug hook on window.__ew, used by the Playwright smoke test.
 * It only reads state or starts things a player could also reach in-game.
 */
export function installDebug(game: Phaser.Game) {
  const api = {
    game,
    scenes: () => game.scene.getScenes(true).map((s) => s.scene.key),
    state: () => session.state,
    player: () => {
      const w = game.scene.getScene('Overworld') as OverworldScene | null;
      return w && w.scene.isActive() ? { x: w.px, y: w.py, map: w.map.id, busy: w.busy, moving: w.isMoving } : null;
    },
    /** Gives the player a starter if they have none (skips the lab cutscene). */
    giveStarter: (species = 'kindlet', level = 5) => {
      if (session.state.party.length) return;
      session.setFlag('gotStarter');
      session.setFlag('introDone');
      session.addCreature(session.makeCreature(species, level));
    },
    /** Take one step in a direction using the normal movement rules. */
    step: (dir: 'up' | 'down' | 'left' | 'right') => {
      const w = game.scene.getScene('Overworld') as OverworldScene;
      return w.debugStep(dir);
    },
    setFlag: (name: string, v = true) => session.setFlag(name, v),
    give: (item: string, qty = 1) => session.giveItem(item, qty),
    /** Starts riding the Driftboard if the player is facing water (same rule as in-game). */
    surfing: () => session.state.surfing,
    warp: (map: string, x: number, y: number) => {
      const w = game.scene.getScene('Overworld') as OverworldScene;
      w.changeMap(map, x, y, 'down', false);
    },
    wildBattle: (species: string, level: number) => {
      const w = game.scene.getScene('Overworld') as OverworldScene;
      return w.withBusy(() => w.wildBattle(species, level));
    },
  };
  (window as unknown as { __ew: typeof api }).__ew = api;
}
