import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { getSpecies, SPECIES_LIST, STARTERS } from '../data/creatures';
import { getItem, ITEMS, SHOP_STOCK } from '../data/items';
import { getMove, STATUS_INFO } from '../data/moves';
import { TYPE_INFO, type MoveType } from '../data/types';
import { displayName, maxHp, stats, xpForLevel, type Creature } from '../engine/creature';
import { exportSave, SLOT_KEYS, readSlot } from '../engine/save';
import { getMap } from '../data/maps';
import { input } from '../game/input';
import { formatTime, session } from '../game/session';
import { C, DialogBox, H, hpColor, ListMenu, panel, text, toast, W, ask, wait, type MenuItem } from './kit';

type Obj = Phaser.GameObjects.GameObject & { destroy(): void };

/** A full-screen backdrop plus a bag of objects destroyed together. */
class Layer {
  objs: Obj[] = [];
  constructor(public scene: Phaser.Scene, public depth = 1100) {
    this.add(scene.add.rectangle(0, 0, W, H, 0x0c0a14, 0.82).setOrigin(0).setInteractive());
  }
  add<T extends Obj>(o: T): T {
    (o as unknown as Phaser.GameObjects.Components.Depth).setDepth?.(this.depth);
    (o as unknown as Phaser.GameObjects.Components.ScrollFactor).setScrollFactor?.(0);
    this.objs.push(o);
    return o;
  }
  clear(keep = 1) {
    while (this.objs.length > keep) this.objs.pop()!.destroy();
  }
  destroy() {
    this.objs.forEach((o) => o.destroy());
    this.objs = [];
  }
}

export function typeBadge(scene: Phaser.Scene, x: number, y: number, t: MoveType, w = 76) {
  const g = scene.add.graphics();
  g.fillStyle(TYPE_INFO[t].dark, 1);
  g.fillRoundedRect(x, y, w, 24, 8);
  g.fillStyle(TYPE_INFO[t].color, 1);
  g.fillRoundedRect(x + 2, y + 2, w - 4, 20, 7);
  const tx = text(scene, x + w / 2, y + 12, TYPE_INFO[t].name.toUpperCase(), 14, '#1a1424', { shadow: undefined }).setOrigin(0.5);
  return [g, tx] as const;
}

export function hpBar(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, frac: number, h = 10) {
  g.fillStyle(0x0a0812, 1);
  g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 5);
  g.fillStyle(0x3a3050, 1);
  g.fillRoundedRect(x, y, w, h, 4);
  if (frac > 0) {
    g.fillStyle(hpColor(frac), 1);
    g.fillRoundedRect(x, y, Math.max(4, w * frac), h, 4);
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(x + 2, y + 1, Math.max(0, w * frac - 4), 2);
  }
}

function statusTag(c: Creature): string {
  if (c.hp <= 0) return 'FNT';
  return c.status ? STATUS_INFO[c.status].short : '';
}

/** Detailed card for one creature (used by the team screen and storage). */
function drawSummary(L: Layer, c: Creature, x: number, y: number) {
  const s = L.scene;
  const sp = getSpecies(c.species);
  L.add(panel(s, x, y, 420, 470));
  L.add(s.add.image(x + 90, y + 100, `cf_${c.species}`).setScale(2.2));
  L.add(text(s, x + 180, y + 24, displayName(c), 28));
  L.add(text(s, x + 180, y + 60, `Lv ${c.level}  ·  ${sp.kind}`, 18, C.dim));
  sp.types.forEach((t, i) => typeBadge(s, x + 180 + i * 84, y + 90, t).forEach((o) => L.add(o)));
  const st = stats(c);
  const g = L.add(s.add.graphics());
  L.add(text(s, x + 180, y + 126, `HP ${c.hp}/${st.hp}`, 18));
  hpBar(g, x + 180, y + 152, 210, c.hp / st.hp);
  const next = xpForLevel(c.level + 1), cur = xpForLevel(c.level);
  g.fillStyle(0x3a3050, 1).fillRect(x + 180, y + 170, 210, 5);
  g.fillStyle(0x6ac8ff, 1).fillRect(x + 180, y + 170, 210 * Math.min(1, (c.xp - cur) / Math.max(1, next - cur)), 5);
  const labels: [string, number][] = [['Attack', st.atk], ['Defense', st.def], ['Sp. Atk', st.spa], ['Sp. Def', st.spd], ['Speed', st.spe]];
  labels.forEach(([l, v], i) => {
    L.add(text(s, x + 24 + (i % 2) * 200, y + 196 + Math.floor(i / 2) * 28, l, 17, C.dim));
    L.add(text(s, x + 170 + (i % 2) * 200, y + 196 + Math.floor(i / 2) * 28, String(v), 17).setOrigin(1, 0));
  });
  c.moves.forEach((m, i) => {
    const mv = getMove(m.id);
    const yy = y + 290 + i * 42;
    typeBadge(s, x + 20, yy, mv.type, 72).forEach((o) => L.add(o));
    L.add(text(s, x + 104, yy + 1, mv.name, 19));
    L.add(text(s, x + 400, yy + 2, `${m.pp}/${m.maxPp}`, 17, C.dim).setOrigin(1, 0));
  });
  if (c.status) L.add(text(s, x + 300, y + 24, STATUS_INFO[c.status].short, 18, C.bad));
}

export interface PartyOpts {
  mode: 'view' | 'switch' | 'force' | 'target';
  title?: string;
  activeIndex?: number;
  /** For 'target' mode: whether a creature is a valid target. */
  valid?: (c: Creature) => boolean;
}

/** Team screen. Returns the chosen index, or -1 if cancelled. */
export async function partyMenu(scene: Phaser.Scene, opts: PartyOpts): Promise<number> {
  const L = new Layer(scene);
  const party = session.state.party;
  let sel = 0;
  const redraw = () => {
    L.clear();
    if (party[sel]) drawSummary(L, party[sel], 510, 40);
  };
  for (;;) {
    redraw();
    const items: MenuItem[] = party.map((c, i) => ({
      label: `${displayName(c)}${i === opts.activeIndex ? ' ★' : ''}`,
      right: `${statusTag(c)}  Lv${c.level}  ${c.hp}/${maxHp(c)}`,
      icon: `ci_${c.species}`,
      enabled: opts.mode === 'target' ? opts.valid?.(c) ?? true : opts.mode === 'view' ? true : c.hp > 0 && i !== opts.activeIndex,
      color: c.hp <= 0 ? C.bad : undefined,
    }));
    const menu = new ListMenu(scene, 30, 40, 450, items, {
      title: opts.title ?? 'Team', rows: 6, rowH: 62, depth: 1101, start: sel, cancelable: opts.mode !== 'force',
      onMove: (i) => { sel = i; redraw(); },
    });
    menu.root.setScrollFactor(0);
    const i = await menu.open();
    menu.destroy();
    if (i < 0) { L.destroy(); return -1; }
    sel = i;
    if (opts.mode !== 'view') { L.destroy(); return i; }
    // view mode: offer reordering
    const box = new DialogBox(scene, 1150);
    const c = await ask(scene, box, `What would you like to do with ${displayName(party[i])}?`, ['Move', 'Cancel'], undefined, 1200);
    box.destroy();
    if (c !== 0) continue;
    const menu2 = new ListMenu(scene, 30, 40, 450, party.map((p) => ({ label: displayName(p), icon: `ci_${p.species}`, right: `Lv${p.level}` })), { title: 'Swap with...', rows: 6, rowH: 62, depth: 1101, start: i });
    menu2.root.setScrollFactor(0);
    const j = await menu2.open();
    menu2.destroy();
    if (j >= 0 && j !== i) {
      [party[i], party[j]] = [party[j], party[i]];
      audio.sfx('confirm');
      sel = j;
    }
  }
}

/** Bag. In battle, returns {item, target}; in the field items are used directly. */
export async function bagMenu(scene: Phaser.Scene, ctx: 'field' | 'battle', battleKind?: 'wild' | 'trainer', activeIndex = 0): Promise<{ item: string; target: number } | null> {
  const L = new Layer(scene);
  const descBg = L.add(panel(scene, 30, H - 130, W - 60, 100));
  void descBg;
  const desc = L.add(text(scene, 54, H - 112, '', 20, C.text, { wordWrap: { width: W - 120 } }));
  let start = 0;
  for (;;) {
    const bag = session.state.bag;
    const ids = Object.keys(bag).filter((k) => bag[k] > 0).sort((a, b) => Object.keys(ITEMS).indexOf(a) - Object.keys(ITEMS).indexOf(b));
    if (!ids.length) {
      desc.setText('Your bag is empty.');
      await wait(scene, 900);
      L.destroy();
      return null;
    }
    const items: MenuItem[] = ids.map((id) => {
      const it = getItem(id);
      const usable = ctx === 'battle' ? it.kind !== 'key' && (it.kind !== 'stone' || battleKind === 'wild') : it.kind !== 'stone';
      return { label: it.name, right: it.kind === 'key' ? '' : `×${bag[id]}`, enabled: usable, icon: it.kind === 'stone' ? id : undefined };
    });
    const show = (i: number) => desc.setText(getItem(ids[i]).desc);
    show(Math.min(start, ids.length - 1));
    const menu = new ListMenu(scene, 30, 30, W - 60, items, { title: `Bag  ·  ${session.state.money} embers`, rows: 7, rowH: 44, depth: 1101, start, onMove: show });
    menu.root.setScrollFactor(0);
    const i = await menu.open();
    menu.destroy();
    if (i < 0) { L.destroy(); return null; }
    start = i;
    const id = ids[i];
    const it = getItem(id);
    if (it.kind === 'stone') { L.destroy(); return { item: id, target: activeIndex }; }
    if (it.id === 'wildlog') { await wildlogMenu(scene); continue; }
    if (it.kind === 'key') { toast(scene, 'That can\'t be used right now.'); continue; }
    const valid = (c: Creature) => (it.kind === 'revive' ? c.hp <= 0 : c.hp > 0 && (it.kind === 'heal' ? c.hp < maxHp(c) : it.kind === 'status' ? !!c.status : true));
    const target = await partyMenu(scene, { mode: 'target', title: `Use ${it.name} on...`, valid });
    if (target < 0) continue;
    if (ctx === 'battle') { L.destroy(); return { item: id, target }; }
    // field use
    const c = session.state.party[target];
    const max = maxHp(c);
    if (it.kind === 'heal') c.hp = Math.min(max, c.hp + (it.heal ?? 0));
    if (it.kind === 'revive') c.hp = Math.floor((max * (it.heal ?? 50)) / 100);
    if (it.kind === 'status' || it.kind === 'revive') { c.status = null; c.statusTurns = 0; }
    if (it.kind === 'pp') for (const m of c.moves) m.pp = Math.min(m.maxPp, m.pp + 10);
    session.takeItem(id);
    audio.sfx('heal');
    toast(scene, `Used ${it.name} on ${displayName(c)}.`);
  }
}

export async function wildlogMenu(scene: Phaser.Scene) {
  const L = new Layer(scene, 1200);
  const st = session.state;
  let sel = 0;
  const draw = (i: number) => {
    L.clear();
    const sp = SPECIES_LIST[i];
    const seen = st.seen.includes(sp.id), caught = st.caught.includes(sp.id);
    L.add(panel(scene, 470, 30, 460, 480));
    if (seen) {
      L.add(scene.add.image(700, 170, `cf_${sp.id}`).setScale(3));
      L.add(text(scene, 500, 290, `#${String(sp.num).padStart(2, '0')}  ${sp.name}`, 28));
      L.add(text(scene, 500, 326, `The ${sp.kind} creature`, 18, C.dim));
      sp.types.forEach((t, k) => typeBadge(scene, 760 + k * 84, 296, t).forEach((o) => L.add(o)));
      L.add(text(scene, 500, 364, caught ? sp.entry : 'Bond with one to learn more about it.', 19, caught ? C.text : C.dim, { wordWrap: { width: 400 }, lineSpacing: 6 }));
    } else {
      L.add(scene.add.image(700, 170, `cf_${sp.id}`).setScale(3).setTintFill(0x2a2440));
      L.add(text(scene, 500, 290, `#${String(sp.num).padStart(2, '0')}  ???`, 28, C.dim));
    }
  };
  const items: MenuItem[] = SPECIES_LIST.map((sp) => {
    const seen = st.seen.includes(sp.id), caught = st.caught.includes(sp.id);
    return { label: `${String(sp.num).padStart(2, '0')}  ${seen ? sp.name : '-----'}`, right: caught ? '◆' : seen ? '◇' : '', icon: seen ? `ci_${sp.id}` : undefined };
  });
  draw(0);
  const menu = new ListMenu(scene, 30, 30, 420, items, { title: `Wildlog  ·  Seen ${st.seen.length}  Bonded ${st.caught.length}`, rows: 10, rowH: 44, depth: 1201, onMove: (i) => { sel = i; draw(i); } });
  menu.root.setScrollFactor(0);
  void sel;
  await menu.open();
  menu.destroy();
  L.destroy();
}

export async function saveMenu(scene: Phaser.Scene) {
  const labels = ['Slot 1', 'Slot 2', 'Slot 3'];
  const items = (): MenuItem[] => [
    ...SLOT_KEYS.slice(1).map((k, i) => {
      const s = readSlot(localStorage, k);
      return { label: labels[i], right: s ? `${s.playerName} · ${getMap(s.map).name} · ${formatTime(s.playTimeMs)}` : 'empty' };
    }),
    { label: 'Export save code', right: 'copy to clipboard' },
  ];
  const menu = new ListMenu(scene, W / 2 - 320, 120, 640, items(), { title: 'Save game (autosave is always on)', depth: 1300 });
  menu.root.setScrollFactor(0);
  const i = await menu.open();
  menu.destroy();
  if (i < 0) return;
  if (i === 3) {
    const code = exportSave(session.state);
    try {
      await navigator.clipboard.writeText(code);
      toast(scene, 'Save code copied to clipboard!');
    } catch {
      window.prompt('Copy your save code:', code);
    }
    return;
  }
  session.autosave();
  if (session.save(SLOT_KEYS[i + 1])) {
    audio.sfx('save');
    toast(scene, `Saved to ${labels[i]}.`);
  } else toast(scene, 'Could not save (storage unavailable).');
}

export async function storageMenu(scene: Phaser.Scene) {
  const st = session.state;
  for (;;) {
    const menu = new ListMenu(scene, W / 2 - 220, 120, 440, [
      { label: 'Withdraw a creature', enabled: st.storage.length > 0 && st.party.length < 6 },
      { label: 'Deposit a creature', enabled: st.party.length > 1 },
      { label: 'Close' },
    ], { title: `Storage terminal  ·  ${st.storage.length} stored`, depth: 1300 });
    menu.root.setScrollFactor(0);
    const i = await menu.open();
    menu.destroy();
    if (i < 0 || i === 2) return;
    const list = i === 0 ? st.storage : st.party;
    const L = new Layer(scene, 1310);
    let sel = 0;
    const draw = () => { L.clear(); if (list[sel]) drawSummary(L, list[sel], 510, 40); };
    draw();
    const pick = new ListMenu(scene, 30, 40, 450, list.map((c) => ({ label: displayName(c), icon: `ci_${c.species}`, right: `Lv${c.level}` })), {
      title: i === 0 ? 'Withdraw' : 'Deposit', rows: 7, rowH: 58, depth: 1311, onMove: (k) => { sel = k; draw(); },
    });
    pick.root.setScrollFactor(0);
    const k = await pick.open();
    pick.destroy();
    L.destroy();
    if (k < 0) continue;
    if (i === 0) st.party.push(...st.storage.splice(k, 1));
    else {
      if (st.party.filter((c, idx) => idx !== k && c.hp > 0).length === 0) { toast(scene, 'You need at least one healthy creature!'); continue; }
      st.storage.push(...st.party.splice(k, 1));
    }
    audio.sfx('confirm');
  }
}

export async function shopMenu(scene: Phaser.Scene, stockId: string) {
  const stock = SHOP_STOCK[stockId];
  const L = new Layer(scene, 1300);
  L.add(panel(scene, 30, H - 130, W - 60, 100));
  const desc = L.add(text(scene, 54, H - 112, '', 20, C.text, { wordWrap: { width: W - 120 } }));
  let start = 0;
  for (;;) {
    const st = session.state;
    const items: MenuItem[] = stock.map((id) => ({ label: getItem(id).name, right: `${getItem(id).price}  (own ${st.bag[id] ?? 0})`, icon: getItem(id).kind === 'stone' ? id : undefined }));
    const show = (i: number) => desc.setText(getItem(stock[i]).desc);
    show(start);
    const menu = new ListMenu(scene, 30, 30, W - 60, items, { title: `Trading Post  ·  ${st.money} embers`, rows: 6, rowH: 46, depth: 1301, start, onMove: show });
    menu.root.setScrollFactor(0);
    const i = await menu.open();
    menu.destroy();
    if (i < 0) break;
    start = i;
    const it = getItem(stock[i]);
    let qty = 1;
    const maxQty = Math.max(1, Math.min(99, Math.floor(st.money / it.price)));
    const qItems = (): MenuItem[] => [{ label: `Quantity: ◀ ${qty} ▶`, right: `${qty * it.price} embers` }, { label: 'Buy' }, { label: 'Cancel' }];
    const qm: ListMenu = new ListMenu(scene, W / 2 - 230, 160, 460, qItems(), {
      title: it.name, depth: 1320, start: 1,
      onKey: (_k, key) => { qty = Phaser.Math.Clamp(qty + (key === 'left' ? -1 : 1), 1, maxQty); qm.setItems(qItems()); },
    });
    qm.root.setScrollFactor(0);
    let r: number;
    while ((r = await qm.open()) === 0) { qty = qty >= maxQty ? 1 : qty + 1; qm.setItems(qItems()); }
    qm.destroy();
    if (r !== 1) continue;
    const cost = qty * it.price;
    if (cost > st.money) { audio.sfx('error'); toast(scene, 'You don\'t have enough embers.'); continue; }
    st.money -= cost;
    session.giveItem(it.id, qty);
    if (it.id === 'bond_stone' && qty >= 10) { session.giveItem('kin_stone', 1); toast(scene, 'Bulk bonus: a free Kin Stone!'); }
    audio.sfx('buy');
    toast(scene, `Bought ${qty} × ${it.name}.`);
  }
  L.destroy();
}

/** Starter selection: three cards. */
export async function pickStarter(scene: Phaser.Scene): Promise<string> {
  const L = new Layer(scene, 1300);
  L.add(text(scene, W / 2, 40, 'Choose your partner', 34, C.accent).setOrigin(0.5));
  const cards = STARTERS.map((id, i) => {
    const x = 90 + i * 270, y = 90;
    const sp = getSpecies(id);
    const g = L.add(scene.add.graphics());
    const img = L.add(scene.add.image(x + 120, y + 120, `cf_${id}`).setScale(3));
    L.add(text(scene, x + 120, y + 220, sp.name, 28).setOrigin(0.5));
    typeBadge(scene, x + 82, y + 252, sp.types[0]).forEach((o) => L.add(o));
    L.add(text(scene, x + 20, y + 290, sp.entry, 16, C.dim, { wordWrap: { width: 200 }, lineSpacing: 4 }));
    const zone = L.add(scene.add.zone(x, y, 240, 380).setOrigin(0).setInteractive({ useHandCursor: true }));
    return { g, img, x, y, zone };
  });
  let sel = 0;
  let picked = -1;
  const draw = () => cards.forEach((c, i) => {
    c.g.clear();
    c.g.fillStyle(i === sel ? 0x3d325f : 0x1d1830, 0.96).fillRoundedRect(c.x, c.y, 240, 380, 16);
    c.g.lineStyle(3, i === sel ? 0xffa25a : 0x5a4a7a, 1).strokeRoundedRect(c.x, c.y, 240, 380, 16);
    c.img.setScale(i === sel ? 3.3 : 3);
  });
  cards.forEach((c, i) => c.zone.on('pointerdown', () => { if (sel === i) picked = i; else { sel = i; draw(); audio.sfx('select'); } }));
  draw();
  const box = new DialogBox(scene, 1350);
  for (;;) {
    input.clear();
    picked = -1;
    await new Promise<void>((resolve) => {
      const tick = () => {
        if (input.pressed('left')) { sel = (sel + 2) % 3; draw(); audio.sfx('select'); }
        if (input.pressed('right')) { sel = (sel + 1) % 3; draw(); audio.sfx('select'); }
        if (input.pressed('a')) { input.consume('a'); picked = sel; }
        if (picked >= 0) { scene.events.off('update', tick); resolve(); }
      };
      scene.events.on('update', tick);
    });
    sel = picked;
    draw();
    audio.cry(STARTERS[sel]);
    const c = await ask(scene, box, `Choose ${getSpecies(STARTERS[sel]).name} as your partner?`, ['Yes!', 'Let me think'], undefined, 1400);
    if (c === 0) break;
  }
  box.destroy();
  L.destroy();
  return STARTERS[sel];
}
