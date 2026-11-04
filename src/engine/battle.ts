import { getSpecies } from '../data/creatures';
import { getItem } from '../data/items';
import { getMove, STATUS_INFO, type MoveDef, type StatKey, type StatusId } from '../data/moves';
import { effectiveness, type MoveType } from '../data/types';
import { chooseEnemyAction, type AiLevel } from './ai';
import { displayName, gainXp, maxHp, stats, xpYield, type Creature } from './creature';
import type { Rng } from './rng';

export type Side = 0 | 1; // 0 = player, 1 = opponent
export type Stages = Record<StatKey, number>;
export const emptyStages = (): Stages => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0 });

export type PlayerAction =
  | { kind: 'move'; index: number }
  | { kind: 'switch'; index: number }
  | { kind: 'item'; item: string; target?: number }
  | { kind: 'run' };

export type EnemyAction = { kind: 'move'; index: number } | { kind: 'switch'; index: number } | { kind: 'item'; item: string };

export type BattleEvent =
  | { t: 'text'; text: string }
  | { t: 'move'; side: Side; move: string; moveType: MoveType; category: MoveDef['category'] }
  | { t: 'damage'; side: Side; amount: number; hp: number; max: number; eff: number; crit: boolean; self?: boolean }
  | { t: 'heal'; side: Side; amount: number; hp: number; max: number }
  | { t: 'miss'; side: Side }
  | { t: 'status'; side: Side; status: StatusId | null }
  | { t: 'stat'; side: Side; stat: StatKey; delta: number }
  | { t: 'faint'; side: Side }
  | { t: 'switchIn'; side: Side; index: number }
  | { t: 'recall'; side: Side }
  | { t: 'throw'; item: string }
  | { t: 'capture'; shakes: number; success: boolean }
  | { t: 'xp'; index: number; amount: number; xp: number }
  | { t: 'levelUp'; index: number; level: number }
  | { t: 'learned'; index: number; move: string }
  | { t: 'learnPrompt'; index: number; move: string }
  | { t: 'needSwitch' }
  | { t: 'end'; result: BattleResult };

export type BattleResult = 'win' | 'lose' | 'fled' | 'caught';

export interface BattleOptions {
  kind: 'wild' | 'trainer';
  player: Creature[];
  enemy: Creature[];
  rng: Rng;
  bag?: Record<string, number>;
  ai?: AiLevel;
  trainerName?: string;
  enemyItems?: Record<string, number>;
}

const STAT_LABEL: Record<StatKey, string> = { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy' };

export function stageMultiplier(stage: number, isAcc = false): number {
  const base = isAcc ? 3 : 2;
  return stage >= 0 ? (base + stage) / base : base / (base - stage);
}

export interface DamageInput {
  level: number;
  power: number;
  attack: number;
  defense: number;
  stab: boolean;
  eff: number;
  crit: boolean;
  random: number; // 0.85..1
  burned?: boolean;
}

/** Core damage formula. */
export function calcDamage(d: DamageInput): number {
  if (d.power <= 0 || d.eff === 0) return 0;
  const base = Math.floor((Math.floor((2 * d.level) / 5 + 2) * d.power * d.attack) / d.defense / 50) + 2;
  let mod = d.random * d.eff;
  if (d.stab) mod *= 1.5;
  if (d.crit) mod *= 1.5;
  if (d.burned) mod *= 0.5;
  return Math.max(1, Math.floor(base * mod));
}

export function isStab(c: Creature, type: MoveType): boolean {
  return type !== 'plain' && getSpecies(c.species).types.includes(type);
}

/** Expected (non-crit, mean roll) damage of a move, used by the AI. */
export function expectedDamage(user: Creature, us: Stages, target: Creature, ts: Stages, move: MoveDef): number {
  if (move.category === 'status') return 0;
  const phys = move.category === 'physical';
  const a = stats(user)[phys ? 'atk' : 'spa'] * stageMultiplier(us[phys ? 'atk' : 'spa']);
  const d = stats(target)[phys ? 'def' : 'spd'] * stageMultiplier(ts[phys ? 'def' : 'spd']);
  return calcDamage({
    level: user.level, power: move.power, attack: a, defense: d,
    stab: isStab(user, move.type), eff: effectiveness(move.type, getSpecies(target.species).types),
    crit: false, random: 0.925, burned: phys && user.status === 'burn',
  });
}

export function captureValue(target: Creature, bonus: number): number {
  const max = maxHp(target);
  const rate = getSpecies(target.species).catchRate;
  const statusMult = target.status === 'drowsy' ? 2 : target.status ? 1.5 : 1;
  return (((3 * max - 2 * target.hp) * rate * bonus) / (3 * max)) * statusMult;
}

/** Probability (0..1) that a Bond Stone succeeds. */
export function captureChance(target: Creature, bonus: number): number {
  return Math.min(1, captureValue(target, bonus) / 255);
}

/** Rolls up to four shake checks. Success when all four pass. */
export function rollCapture(target: Creature, bonus: number, rng: Rng): { shakes: number; success: boolean } {
  const p = captureChance(target, bonus);
  if (p >= 1) return { shakes: 3, success: true };
  const shakeP = Math.pow(p, 0.25);
  let passed = 0;
  while (passed < 4 && rng.next() < shakeP) passed++;
  return { shakes: Math.min(3, passed), success: passed === 4 };
}

export class Battle {
  readonly kind: 'wild' | 'trainer';
  readonly party: [Creature[], Creature[]];
  active: [number, number] = [0, 0];
  stages: [Stages, Stages] = [emptyStages(), emptyStages()];
  readonly rng: Rng;
  readonly bag: Record<string, number>;
  readonly ai: AiLevel;
  readonly trainerName: string;
  enemyItems: Record<string, number>;
  runAttempts = 0;
  over: BattleResult | null = null;
  awaitingSwitch = false;
  turnCount = 0;
  caught: Creature | null = null;
  private participants = new Set<number>();
  private lastEnemySwitchTurn = -9;
  private ev: BattleEvent[] = [];

  constructor(o: BattleOptions) {
    this.kind = o.kind;
    this.party = [o.player, o.enemy];
    this.rng = o.rng;
    this.bag = o.bag ?? {};
    this.ai = o.ai ?? (o.kind === 'wild' ? 0 : 1);
    this.trainerName = o.trainerName ?? 'Trainer';
    this.enemyItems = { ...(o.enemyItems ?? {}) };
    const first = o.player.findIndex((c) => c.hp > 0);
    this.active[0] = Math.max(0, first);
    this.participants.add(this.active[0]);
  }

  mon(side: Side): Creature {
    return this.party[side][this.active[side]];
  }

  private name(side: Side): string {
    const n = displayName(this.mon(side));
    if (side === 0) return n;
    return this.kind === 'wild' ? `The wild ${n}` : `The foe's ${n}`;
  }

  private say(text: string) {
    this.ev.push({ t: 'text', text });
  }

  private flush(): BattleEvent[] {
    const out = this.ev;
    this.ev = [];
    return out;
  }

  start(): BattleEvent[] {
    const e = this.mon(1);
    if (this.kind === 'wild') this.say(`A wild ${displayName(e)} appeared!`);
    else {
      this.say(`${this.trainerName} wants to battle!`);
      this.say(`${this.trainerName} sent out ${displayName(e)}!`);
    }
    this.ev.push({ t: 'switchIn', side: 1, index: this.active[1] });
    this.say(`Go, ${displayName(this.mon(0))}!`);
    this.ev.push({ t: 'switchIn', side: 0, index: this.active[0] });
    return this.flush();
  }

  canSwitchTo(index: number): boolean {
    const c = this.party[0][index];
    return !!c && c.hp > 0 && index !== this.active[0];
  }

  /** Resolve one full turn. */
  turn(action: PlayerAction): BattleEvent[] {
    if (this.over || this.awaitingSwitch) return [];
    this.turnCount++;
    const enemyAction = chooseEnemyAction(this, this.ai, this.rng, this.lastEnemySwitchTurn === this.turnCount - 1);

    // Non-move actions resolve first.
    if (action.kind === 'run') {
      if (this.kind === 'trainer') {
        this.say('You can\'t run from a trainer battle!');
        this.turnCount--;
        return this.flush();
      }
      this.runAttempts++;
      const ps = stats(this.mon(0)).spe;
      const es = stats(this.mon(1)).spe;
      const chance = ps >= es ? 100 : Math.min(100, 40 + 25 * this.runAttempts + Math.floor((ps / es) * 30));
      if (this.rng.chance(chance)) {
        this.say('Got away safely!');
        return this.finish('fled');
      }
      this.say('Couldn\'t get away!');
    } else if (action.kind === 'switch') {
      if (!this.canSwitchTo(action.index)) {
        this.turnCount--;
        return [];
      }
      this.say(`Come back, ${displayName(this.mon(0))}!`);
      this.ev.push({ t: 'recall', side: 0 });
      this.switchIn(0, action.index);
    } else if (action.kind === 'item') {
      const done = this.useItem(action.item, action.target ?? this.active[0]);
      if (done === 'invalid') {
        this.turnCount--;
        return this.flush();
      }
      if (this.over) return this.flush();
    }

    if (enemyAction.kind === 'switch') {
      this.say(`${this.trainerName} withdrew ${displayName(this.mon(1))}!`);
      this.ev.push({ t: 'recall', side: 1 });
      this.lastEnemySwitchTurn = this.turnCount;
      this.switchIn(1, enemyAction.index);
    } else if (enemyAction.kind === 'item') {
      this.enemyItems[enemyAction.item]--;
      const it = getItem(enemyAction.item);
      const e = this.mon(1);
      const before = e.hp;
      e.hp = Math.min(maxHp(e), e.hp + (it.heal ?? 0));
      this.say(`${this.trainerName} used a ${it.name}!`);
      this.ev.push({ t: 'heal', side: 1, amount: e.hp - before, hp: e.hp, max: maxHp(e) });
    }

    const moves: { side: Side; index: number }[] = [];
    if (action.kind === 'move') moves.push({ side: 0, index: action.index });
    if (enemyAction.kind === 'move') moves.push({ side: 1, index: enemyAction.index });
    if (moves.length === 2) {
      const [a, b] = moves;
      const pa = this.movePriority(a.side, a.index);
      const pb = this.movePriority(b.side, b.index);
      let enemyFirst = pb > pa;
      if (pa === pb) {
        const sa = this.speed(0);
        const sb = this.speed(1);
        enemyFirst = sb > sa || (sb === sa && this.rng.next() < 0.5);
      }
      if (enemyFirst) moves.reverse();
    }

    for (const mv of moves) {
      if (this.over) break;
      if (this.mon(mv.side).hp <= 0) continue;
      // A side that just had to replace a fainted creature loses its queued move.
      if (mv.side === 1 && this.enemyReplacedThisTurn) continue;
      this.useMove(mv.side, mv.index);
      this.checkFaints();
    }
    if (!this.over) this.endOfTurn();
    this.enemyReplacedThisTurn = false;
    return this.flush();
  }

  private enemyReplacedThisTurn = false;

  /** Called by the UI after the player's active creature faints. */
  forceSwitch(index: number): BattleEvent[] {
    if (!this.awaitingSwitch || !this.canSwitchTo(index)) return [];
    this.awaitingSwitch = false;
    this.switchIn(0, index);
    return this.flush();
  }

  private movePriority(side: Side, index: number): number {
    const slot = this.mon(side).moves[index];
    return slot ? getMove(slot.id).priority ?? 0 : 0;
  }

  speed(side: Side): number {
    const c = this.mon(side);
    let s = stats(c).spe * stageMultiplier(this.stages[side].spe);
    if (c.status === 'jolt') s *= 0.5;
    return s;
  }

  private switchIn(side: Side, index: number) {
    this.active[side] = index;
    this.stages[side] = emptyStages();
    if (side === 0) this.participants.add(index);
    else this.participants = new Set([this.active[0]]);
    if (side === 0) this.say(`Go, ${displayName(this.mon(0))}!`);
    else this.say(`${this.trainerName} sent out ${displayName(this.mon(1))}!`);
    this.ev.push({ t: 'switchIn', side, index });
  }

  private useItem(itemId: string, target: number): 'ok' | 'invalid' {
    const it = getItem(itemId);
    if ((this.bag[itemId] ?? 0) <= 0) {
      this.say(`You don't have any ${it.name}.`);
      return 'invalid';
    }
    if (it.kind === 'stone') {
      if (this.kind === 'trainer') {
        this.say('You can\'t bond with another trainer\'s creature!');
        return 'invalid';
      }
      this.bag[itemId]--;
      this.say(`You threw a ${it.name}!`);
      this.ev.push({ t: 'throw', item: itemId });
      const res = rollCapture(this.mon(1), it.catchBonus ?? 1, this.rng);
      this.ev.push({ t: 'capture', ...res });
      if (res.success) {
        const e = this.mon(1);
        this.say(`Bonded with ${displayName(e)}!`);
        this.caught = e;
        this.finish('caught');
      } else {
        this.say(['Oh no! It broke free!', 'Argh! So close!', 'It almost bonded!', 'Almost! Just a little more!'][res.shakes]);
      }
      return 'ok';
    }
    const c = this.party[0][target];
    if (!c) return 'invalid';
    const max = maxHp(c);
    if (it.kind === 'revive') {
      if (c.hp > 0) {
        this.say('It won\'t have any effect.');
        return 'invalid';
      }
      c.hp = Math.floor((max * (it.heal ?? 50)) / 100);
      c.status = null;
      this.bag[itemId]--;
      this.say(`${displayName(c)} was revived!`);
      return 'ok';
    }
    if (c.hp <= 0) {
      this.say('It won\'t have any effect.');
      return 'invalid';
    }
    if (it.kind === 'heal') {
      if (c.hp >= max) {
        this.say('It won\'t have any effect.');
        return 'invalid';
      }
      const before = c.hp;
      c.hp = Math.min(max, c.hp + (it.heal ?? 0));
      this.bag[itemId]--;
      this.say(`${displayName(c)} recovered ${c.hp - before} HP!`);
      if (target === this.active[0]) this.ev.push({ t: 'heal', side: 0, amount: c.hp - before, hp: c.hp, max });
      return 'ok';
    }
    if (it.kind === 'status') {
      if (!c.status) {
        this.say('It won\'t have any effect.');
        return 'invalid';
      }
      c.status = null;
      c.statusTurns = 0;
      this.bag[itemId]--;
      this.say(`${displayName(c)} feels much better!`);
      if (target === this.active[0]) this.ev.push({ t: 'status', side: 0, status: null });
      return 'ok';
    }
    if (it.kind === 'pp') {
      for (const m of c.moves) m.pp = Math.min(m.maxPp, m.pp + 10);
      this.bag[itemId]--;
      this.say(`${displayName(c)}'s moves were refreshed!`);
      return 'ok';
    }
    this.say('That can\'t be used here.');
    return 'invalid';
  }

  /** Status checks before acting. Returns false if the creature can't move. */
  private canAct(side: Side): boolean {
    const c = this.mon(side);
    if (c.status === 'drowsy') {
      c.statusTurns--;
      if (c.statusTurns > 0) {
        this.say(`${this.name(side)} is fast asleep.`);
        return false;
      }
      c.status = null;
      this.say(`${this.name(side)} woke up!`);
      this.ev.push({ t: 'status', side, status: null });
    } else if (c.status === 'jolt' && this.rng.chance(25)) {
      this.say(`${this.name(side)} is jolted! It can't move!`);
      return false;
    } else if (c.status === 'dazed') {
      c.statusTurns--;
      if (c.statusTurns <= 0) {
        c.status = null;
        this.say(`${this.name(side)} snapped out of its daze!`);
        this.ev.push({ t: 'status', side, status: null });
      } else if (this.rng.chance(33)) {
        this.say(`${this.name(side)} is dazed... It hurt itself!`);
        const st = stats(c);
        const dmg = calcDamage({ level: c.level, power: 40, attack: st.atk, defense: st.def, stab: false, eff: 1, crit: false, random: 1 });
        c.hp = Math.max(0, c.hp - dmg);
        this.ev.push({ t: 'damage', side, amount: dmg, hp: c.hp, max: st.hp, eff: 1, crit: false, self: true });
        return false;
      }
    }
    return true;
  }

  private useMove(side: Side, index: number) {
    const user = this.mon(side);
    const foe: Side = side === 0 ? 1 : 0;
    const target = this.mon(foe);
    const slotRef = user.moves[index];
    const move = slotRef && slotRef.pp > 0 ? getMove(slotRef.id) : getMove('bump');
    if (!this.canAct(side)) return;
    if (slotRef && slotRef.pp > 0) slotRef.pp--;
    else this.say(`${this.name(side)} has no energy left for its moves!`);
    this.say(`${this.name(side)} used ${move.name}!`);
    this.ev.push({ t: 'move', side, move: move.id, moveType: move.type, category: move.category });

    const fx = move.effect ?? {};
    const targetsFoe = move.category !== 'status' || !!fx.status || !!fx.target;
    if (move.accuracy > 0 && targetsFoe) {
      const hit = move.accuracy * stageMultiplier(this.stages[side].acc, true);
      if (!this.rng.chance(hit)) {
        this.ev.push({ t: 'miss', side });
        this.say(`${this.name(side)}'s attack missed!`);
        return;
      }
    }

    let dealt = 0;
    if (move.category !== 'status') {
      const eff = effectiveness(move.type, getSpecies(target.species).types);
      if (eff === 0) {
        this.say(`It doesn't affect ${this.name(foe).replace(/^The /, 'the ')}...`);
        return;
      }
      const crit = this.rng.chance(fx.highCrit ? 25 : 6.25);
      const phys = move.category === 'physical';
      const aKey = phys ? 'atk' : 'spa';
      const dKey = phys ? 'def' : 'spd';
      const aStage = crit ? Math.max(0, this.stages[side][aKey]) : this.stages[side][aKey];
      const dStage = crit ? Math.min(0, this.stages[foe][dKey]) : this.stages[foe][dKey];
      const dmg = calcDamage({
        level: user.level, power: move.power,
        attack: stats(user)[aKey] * stageMultiplier(aStage),
        defense: stats(target)[dKey] * stageMultiplier(dStage),
        stab: isStab(user, move.type), eff, crit,
        random: 0.85 + this.rng.next() * 0.15,
        burned: phys && user.status === 'burn',
      });
      dealt = Math.min(dmg, target.hp);
      target.hp -= dealt;
      this.ev.push({ t: 'damage', side: foe, amount: dealt, hp: target.hp, max: maxHp(target), eff, crit });
      if (crit) this.say('A critical hit!');
      if (eff > 1) this.say('It\'s super effective!');
      else if (eff < 1) this.say('It\'s not very effective...');
      if (fx.drainPct && dealt > 0) this.healSide(side, Math.max(1, Math.floor((dealt * fx.drainPct) / 100)), `${this.name(foe)} had its energy drained!`);
      if (fx.recoilPct && dealt > 0) {
        const r = Math.max(1, Math.floor((dealt * fx.recoilPct) / 100));
        user.hp = Math.max(0, user.hp - r);
        this.ev.push({ t: 'damage', side, amount: r, hp: user.hp, max: maxHp(user), eff: 1, crit: false, self: true });
        this.say(`${this.name(side)} is hit with recoil!`);
      }
    }

    if (fx.healPct) {
      const max = maxHp(user);
      if (user.hp >= max) this.say('But its HP is already full!');
      else this.healSide(side, Math.floor((max * fx.healPct) / 100), `${this.name(side)} restored its HP!`);
    }
    if (fx.status && target.hp > 0) {
      const chance = fx.statusChance ?? 100;
      if (this.rng.chance(chance)) this.inflict(foe, fx.status, move.category === 'status');
    }
    const statOk = fx.statChance === undefined || this.rng.chance(fx.statChance);
    if (statOk && fx.target && target.hp > 0) for (const [k, v] of Object.entries(fx.target)) this.changeStage(foe, k as StatKey, v);
    if (statOk && fx.self) for (const [k, v] of Object.entries(fx.self)) this.changeStage(side, k as StatKey, v);
  }

  private healSide(side: Side, amount: number, text: string) {
    const c = this.mon(side);
    const max = maxHp(c);
    const before = c.hp;
    c.hp = Math.min(max, c.hp + amount);
    if (c.hp > before) {
      this.ev.push({ t: 'heal', side, amount: c.hp - before, hp: c.hp, max });
      this.say(text);
    }
  }

  inflict(side: Side, status: StatusId, announceFail: boolean) {
    const c = this.mon(side);
    const types = getSpecies(c.species).types;
    const immune = (status === 'burn' && types.includes('ember')) || (status === 'jolt' && types.includes('spark')) || (status === 'blight' && types.includes('shade'));
    if (c.status || immune) {
      if (announceFail) this.say('But it failed!');
      return;
    }
    c.status = status;
    c.statusTurns = status === 'drowsy' ? this.rng.int(2, 4) : status === 'dazed' ? this.rng.int(2, 5) : 0;
    this.ev.push({ t: 'status', side, status });
    this.say(`${this.name(side)} is ${STATUS_INFO[status].name}!`);
  }

  private changeStage(side: Side, stat: StatKey, delta: number) {
    const cur = this.stages[side][stat];
    const next = Math.max(-6, Math.min(6, cur + delta));
    const label = STAT_LABEL[stat];
    if (next === cur) {
      this.say(`${this.name(side)}'s ${label} won't go any ${delta > 0 ? 'higher' : 'lower'}!`);
      return;
    }
    this.stages[side][stat] = next;
    this.ev.push({ t: 'stat', side, stat, delta: next - cur });
    const mag = Math.abs(next - cur) >= 2 ? (delta > 0 ? 'rose sharply' : 'harshly fell') : delta > 0 ? 'rose' : 'fell';
    this.say(`${this.name(side)}'s ${label} ${mag}!`);
  }

  private endOfTurn() {
    for (const side of [0, 1] as Side[]) {
      if (this.over) return;
      const c = this.mon(side);
      if (c.hp <= 0) continue;
      if (c.status === 'burn' || c.status === 'blight') {
        const max = maxHp(c);
        const dmg = Math.max(1, Math.floor(max / (c.status === 'burn' ? 16 : 8)));
        c.hp = Math.max(0, c.hp - dmg);
        this.ev.push({ t: 'damage', side, amount: dmg, hp: c.hp, max, eff: 1, crit: false, self: true });
        this.say(`${this.name(side)} is hurt by its ${c.status === 'burn' ? 'burn' : 'blight'}!`);
        this.checkFaints();
      }
    }
  }

  private checkFaints() {
    // Enemy first so the player gets XP even on a double KO.
    if (this.mon(1).hp <= 0 && !this.over) {
      this.ev.push({ t: 'faint', side: 1 });
      this.say(`${this.name(1)} fainted!`);
      this.awardXp();
      const next = this.party[1].findIndex((c) => c.hp > 0);
      if (next < 0) {
        if (this.mon(0).hp <= 0) this.playerFaint();
        if (!this.over) {
          if (this.kind === 'trainer') this.say(`You defeated ${this.trainerName}!`);
          this.finish('win');
        }
        return;
      }
      if (this.mon(0).hp > 0 || this.party[0].some((c) => c.hp > 0)) {
        const pick = chooseReplacement(this, this.rng);
        this.enemyReplacedThisTurn = true;
        this.switchIn(1, pick);
      }
    }
    if (this.mon(0).hp <= 0 && !this.over && !this.awaitingSwitch) this.playerFaint();
  }

  private playerFaint() {
    this.ev.push({ t: 'faint', side: 0 });
    this.say(`${displayName(this.mon(0))} fainted!`);
    if (this.party[0].some((c) => c.hp > 0)) {
      this.awaitingSwitch = true;
      this.ev.push({ t: 'needSwitch' });
    } else {
      this.say('You have no creatures left to battle...');
      this.finish('lose');
    }
  }

  private awardXp() {
    const defeated = this.mon(1);
    const total = xpYield(defeated, this.kind === 'trainer');
    const parts = [...this.participants].filter((i) => this.party[0][i]?.hp > 0);
    const share = parts.length ? Math.max(1, Math.floor(total / parts.length)) : 0;
    this.party[0].forEach((c, i) => {
      if (c.hp <= 0) return;
      const amount = parts.includes(i) ? share : Math.floor(total * 0.3);
      if (amount <= 0) return;
      const results = gainXp(c, amount);
      this.say(`${displayName(c)} gained ${amount} XP!`);
      this.ev.push({ t: 'xp', index: i, amount, xp: c.xp });
      for (const r of results) {
        this.ev.push({ t: 'levelUp', index: i, level: r.level });
        this.say(`${displayName(c)} grew to level ${r.level}!`);
        for (const mv of r.learned) {
          this.ev.push({ t: 'learned', index: i, move: mv });
          this.say(`${displayName(c)} learned ${getMove(mv).name}!`);
        }
        for (const mv of r.wantsToLearn) this.ev.push({ t: 'learnPrompt', index: i, move: mv });
      }
    });
  }

  private finish(result: BattleResult): BattleEvent[] {
    this.over = result;
    this.ev.push({ t: 'end', result });
    return this.ev;
  }
}

/** Picks the best remaining creature for the AI to send in. */
export function chooseReplacement(b: Battle, rng: Rng): number {
  const foe = b.mon(0);
  let best = -1;
  let bestScore = -Infinity;
  b.party[1].forEach((c, i) => {
    if (c.hp <= 0) return;
    let score = 0;
    for (const s of c.moves) {
      const mv = getMove(s.id);
      score = Math.max(score, expectedDamage(c, emptyStages(), foe, b.stages[0], mv) / Math.max(1, foe.hp));
    }
    const threat = Math.max(...getSpecies(foe.species).types.map((t) => effectiveness(t, getSpecies(c.species).types)));
    score -= threat * 0.3;
    score += rng.next() * 0.05;
    if (b.ai === 0) score = rng.next();
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
