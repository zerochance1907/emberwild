import { audio } from '../audio/audio';
import { charFrame } from '../art/characters';
import { getSpecies } from '../data/creatures';
import { getItem } from '../data/items';
import { RIVAL_COUNTER, TRAINERS } from '../data/trainers';
import { createCreature, speciesForLevel, slot } from '../engine/creature';
import type { Dir } from '../engine/save';
import type { NpcRt, OverworldScene } from '../scenes/OverworldScene';
import { session } from './session';

const DX: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function dirTo(fx: number, fy: number, tx: number, ty: number): Dir {
  if (Math.abs(tx - fx) > Math.abs(ty - fy)) return tx > fx ? 'right' : 'left';
  return ty > fy ? 'down' : 'up';
}

async function emote(w: OverworldScene, n: NpcRt) {
  audio.sfx('exclaim');
  const e = w.add.image(n.sprite.x + 8, n.sprite.y - 4, 'emote').setOrigin(0.5, 1).setDepth(9999);
  w.tweens.add({ targets: e, y: e.y - 4, duration: 120, yoyo: true });
  await new Promise((r) => w.time.delayedCall(650, r));
  e.destroy();
}

/** Walk an NPC until it stands next to the player. */
async function approach(w: OverworldScene, n: NpcRt) {
  for (let guard = 0; guard < 12; guard++) {
    const dist = Math.abs(n.x - w.px) + Math.abs(n.y - w.py);
    if (dist <= 1) break;
    const d = dirTo(n.x, n.y, w.px, w.py);
    const [dx, dy] = DX[d];
    if (w.isBlocked(n.x + dx, n.y + dy, true)) break;
    await w.walkNpc(n, d, 200);
  }
  n.dir = dirTo(n.x, n.y, w.px, w.py);
  n.sprite.setFrame(charFrame(n.dir, 0));
  w.setPlayerFacing(OPP[n.dir]);
}

export function buildTrainerTeam(trainerId: string) {
  const tr = TRAINERS[trainerId];
  return tr.team.map((m) => {
    const base = m.species === 'RIVAL' ? session.state.rivalStarter ?? 'puddlop' : m.species;
    const c = createCreature(speciesForLevel(base, m.level), m.level, session.rng, { hp: 8, atk: 8, def: 8, spa: 8, spd: 8, spe: 8 });
    if (m.moves) c.moves = m.moves.map(slot);
    return c;
  });
}

export async function trainerBattle(w: OverworldScene, trainerId: string, npcId: string): Promise<boolean> {
  const tr = TRAINERS[trainerId];
  const result = await w.battle({ kind: 'trainer', enemy: buildTrainerTeam(trainerId), trainerId, music: tr.music });
  if (result === 'win') {
    if (!session.state.defeatedTrainers.includes(npcId)) session.state.defeatedTrainers.push(npcId);
    return true;
  }
  return false;
}

export async function trainerEncounter(w: OverworldScene, n: NpcRt, trainerId: string) {
  const tr = TRAINERS[trainerId];
  await emote(w, n);
  await approach(w, n);
  await w.ui.dialog.say(tr.intro, tr.name);
  const won = await trainerBattle(w, trainerId, n.def.id);
  if (won && tr.after) await w.ui.dialog.say(tr.after, tr.name);
}

async function give(w: OverworldScene, item: string, qty = 1) {
  session.giveItem(item, qty);
  audio.sfx('item');
  const name = getItem(item).name;
  await w.ui.dialog.say(`${session.state.playerName} received ${qty > 1 ? `${qty} ${name}s` : `the ${name}`}!`);
}

async function heal(w: OverworldScene) {
  session.healParty();
  audio.sfx('heal');
  await w.ui.flash(0xffe0b0, 600);
}

function allLanternsLit() {
  return ['ww_l1', 'ww_l2', 'ww_l3'].every((id) => session.flag(`lit_${id}`));
}

/** Story and NPC scripts. */
export async function runScript(w: OverworldScene, id: string, npc?: NpcRt): Promise<void> {
  const st = session.state;
  const say = (lines: string | string[], name?: string) => w.ui.dialog.say(lines, name);
  const ask = (q: string, opts: string[], name?: string) => w.ui.ask(q, opts, name);
  const name = st.playerName;

  if (id.startsWith('lantern:')) {
    const lid = id.slice(8);
    if (session.flag(`lit_${lid}`)) return say('The lantern glows with a gentle, sleepy light.');
    const c = await ask('An old forest lantern. A tiny wisp is curled up inside, fast asleep. Light it?', ['Light it', 'Leave it']);
    if (c !== 0) return;
    session.setFlag(`lit_${lid}`);
    audio.sfx('lantern');
    w.refreshObjects();
    await say('The wisp wakes up and the lantern flickers to life!');
    if (allLanternsLit() && !session.flag('ww_thorns_gone')) {
      session.setFlag('ww_thorns_gone');
      audio.sfx('thorns');
      await w.ui.flash(0xc0a0ff, 500);
      w.refreshObjects();
      await say(['All three lanterns are glowing!', 'Somewhere to the east, thorns crackle and wither away...']);
    } else {
      const lit = ['ww_l1', 'ww_l2', 'ww_l3'].filter((l) => session.flag(`lit_${l}`)).length;
      await say(`${lit} of 3 forest lanterns are lit.`);
    }
    return;
  }

  switch (id) {
    case 'intro': {
      session.setFlag('introDone');
      await new Promise((r) => w.time.delayedCall(400, r));
      const mom = w.npc('mom');
      if (mom) { mom.dir = 'down'; mom.sprite.setFrame(charFrame('down', 0)); }
      await say([`Good morning, ${name}! Up at last.`, 'Mentor Rowan stopped by. She said today is the day you get your very first partner creature!', 'Her lab is the big building with the blue roof. Go on, don\'t keep her waiting!'], 'Mom');
      return;
    }
    case 'mom': {
      if (!session.flag('gotStarter')) return say(['Mentor Rowan\'s lab is just across the path, sweetie.', 'Press the menu button any time to check your things.'], 'Mom');
      await say(['You look worn out! Let me look after your team.'], 'Mom');
      await heal(w);
      st.lastHearth = { map: 'home', x: 3, y: 3 };
      await say(['There! All better. I\'m so proud of you.', 'Remember: you can always come home.'], 'Mom');
      return;
    }
    case 'kipVillage':
      return say([`Hey, ${name}! Took you long enough.`, 'Mentor Rowan has three partner creatures at the lab. I\'m gonna pick the toughest one!'], 'Kip');
    case 'noStarterBlock': {
      if (session.flag('gotStarter')) return;
      await say(['Wait up! Tall grass is full of wild creatures.', 'You can\'t go out there without a partner! Go see Mentor Rowan first.'], 'Kip');
      w.setPlayerFacing('down');
      return movePlayer(w, 'down');
    }
    case 'mentor': {
      if (!session.flag('gotStarter')) {
        await say([`Ah, ${name}! Right on time.`, 'I study the bonds between people and creatures. They\'re what keep Emberwild\'s spark alive.', 'Every trainer\'s journey starts with a single partner. These three are waiting to meet you.'], 'Mentor Rowan');
        const starter = await w.ui.pickStarter();
        session.setFlag('gotStarter');
        st.starter = starter;
        const c = createCreature(starter, 5, session.rng, { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 });
        session.addCreature(c);
        audio.cry(starter);
        await say(`${name} bonded with ${getSpecies(starter).name}!`);
        st.rivalStarter = RIVAL_COUNTER[starter];
        session.markSeen(st.rivalStarter);
        w.refreshNpcs();
        const kip = w.npc('lab_kip');
        if (kip) {
          kip.x = 6; kip.y = 9; kip.dir = 'up'; w.placeNpc(kip);
          for (let i = 0; i < 4; i++) await w.walkNpc(kip, 'up', 200);
          await w.walkNpc(kip, 'right', 200);
          kip.dir = 'left'; kip.sprite.setFrame(charFrame('left', 0));
          w.setPlayerFacing(w.px < kip.x ? 'right' : 'down');
        }
        await say(['Did I miss it?! Aw, you picked first!', `Then I\'ll take ${getSpecies(st.rivalStarter).name}. It\'s strong against yours!`], 'Kip');
        await say(`Kip received ${getSpecies(st.rivalStarter).name} from Mentor Rowan!`);
        await say(['Hey, let\'s battle right now! Partners need practice, right?'], 'Kip');
        const won = await trainerBattle(w, 'kip1', 'lab_kip');
        session.setFlag('beatKip1', won);
        await heal(w);
        if (won) await say(['Hmph. Beginner\'s luck!'], 'Kip');
        else await say(['Ha! Told you mine was tougher. Don\'t worry, you\'ll get the hang of it.'], 'Kip');
        await say(['What a battle! Your creatures are all healed now.', 'Take these, both of you. This is a Wildlog: it records every creature you see and bond with.', 'And these are Bond Stones. Weaken a wild creature, then throw one to invite it to join you.'], 'Mentor Rowan');
        await give(w, 'wildlog');
        await give(w, 'bond_stone', 5);
        await give(w, 'berry_tonic', 3);
        await say(['Lately, cloaked people calling themselves the Hollow Veil have been sighted near Whisperwood.', 'If you\'re headed north, keep your eyes open. Cindervale\'s Warden would want to know.'], 'Mentor Rowan');
        await say(['A Warden, huh? Bet I beat one before you do! See you on the road!'], 'Kip');
        if (kip) {
          await w.walkNpc(kip, 'down', 180);
          await w.walkNpc(kip, 'left', 180);
          for (let i = 0; i < 3; i++) await w.walkNpc(kip, 'down', 160);
          session.setFlag('kipLeftLab');
          w.refreshNpcs();
          audio.sfx('door');
        }
        st.lastHearth = { map: 'home', x: 3, y: 3 };
        session.autosave();
        return;
      }
      if (session.flag('beatWarden')) return say(['The Cinder Sigil! I knew you had it in you.', 'The Hollow Veil is still out there... but that\'s a story for the next chapter.'], 'Mentor Rowan');
      return say([`You've seen ${st.seen.length} kinds of creatures and bonded with ${st.caught.length}. Splendid!`, 'Head north through Route 1 and Whisperwood. Cindervale lies beyond Glimmer Cave.'], 'Mentor Rowan');
    }
    case 'kipLab':
      return say(['Next time, I\'m winning!'], 'Kip');
    case 'nurse': {
      const c = await ask('Welcome to the Hearth! Rest your creatures by the fire?', ['Yes, please', 'No thanks'], 'Hearthkeeper');
      if (c !== 0) return say('Come back any time. The fire never goes out!', 'Hearthkeeper');
      await say('Let them rest by the fire for a moment...', 'Hearthkeeper');
      await heal(w);
      st.lastHearth = { map: w.map.id, x: 6, y: 3 };
      session.autosave();
      return say('Your creatures are fully rested! Safe travels.', 'Hearthkeeper');
    }
    case 'shop':
      await say('Welcome to the Trading Post! Take a look.', 'Clerk');
      await w.ui.shopMenu(w.map.id === 'shop_cv' ? 'cindervale' : 'hollowbrook');
      return say('Thanks for stopping by!', 'Clerk');
    case 'bram': {
      if (session.flag('quest_lantern_done')) return say(['Keep that lantern shining, young one. Glimmer Cave is just ahead.'], 'Old Bram');
      if ((st.bag.glow_lantern ?? 0) > 0) {
        await say(['Why... that\'s my Glowmoth Lantern! You found it in Whisperwood?', 'Bless you. You know what? Keep it. You\'ll need it far more than I will in that cave.', 'And take these for your trouble.'], 'Old Bram');
        await give(w, 'honey_tonic', 2);
        await give(w, 'kin_stone', 2);
        session.setFlag('quest_lantern_done');
        return say('With the lantern lit, you\'ll see much farther in the dark.', 'Old Bram');
      }
      session.setFlag('quest_lantern_started');
      return say(['Oh, dear. I was gathering mushrooms in Whisperwood and dropped my Glowmoth Lantern.', 'Glimmer Cave is pitch-black without it. Hardly anyone sees more than a step ahead in there.', 'If you find it, would you bring it back? I think I lost it near the eastern pond.'], 'Old Bram');
    }
    case 'kipRoute2': {
      if (session.flag('beatKip2')) return;
      const kip = w.npc('r2_kip');
      if (!kip) return;
      await emote(w, kip);
      await approach(w, kip);
      await say([`${name}! I knew you'd come this way.`, ...TRAINERS.kip2.intro], 'Kip');
      const won = await trainerBattle(w, 'kip2', 'r2_kip');
      if (!won) return;
      session.setFlag('beatKip2');
      await say(['Alright, alright. You\'re the real deal.', 'Heads up: I saw Veil goons going into Glimmer Cave. Their boss looked scary.', 'I\'m heading back to train. Don\'t lose to anyone but me!'], 'Kip');
      for (let i = 0; i < 2; i++) if (!w.isBlocked(kip.x - 1, kip.y, true)) await w.walkNpc(kip, 'left', 160);
      w.refreshNpcs();
      return;
    }
    case 'nyx': {
      if (session.flag('beatNyx')) return;
      const n = npc ?? w.npc('gc_nyx');
      if (n) { await emote(w, n); await approach(w, n); }
      const tr = TRAINERS.agent_nyx;
      await say(tr.intro, tr.name);
      const won = await trainerBattle(w, 'agent_nyx', 'gc_nyx');
      if (!won) return;
      session.setFlag('beatNyx');
      await say(['Grunts! Pack up the crystals. We\'re leaving.', 'Remember this, child: the Veil only grows longer as the light fades.'], tr.name);
      await w.ui.flash(0x000000, 500);
      w.refreshNpcs();
      return say('Agent Nyx vanished into the darkness...');
    }
    case 'hallGuard': {
      await say(['This is the Warden Hall of Cindervale.', 'Warden Corra accepts any challenger who made it through Glimmer Cave. Heal up first if you need to!'], 'Hall Apprentice');
      const g = npc ?? w.npc('cv_guard');
      if (g && !w.isBlocked(g.x + 1, g.y, true)) await w.walkNpc(g, 'right', 200);
      session.setFlag('hallOpen');
      if (g) { g.dir = 'left'; w.placeNpc(g); }
      return;
    }
    case 'smith': {
      if (!session.flag('smithGift')) {
        await say(['A traveller from Hollowbrook? Through the cave, no less!', 'Here. Forge-ash from my furnace. It can rekindle a fainted creature\'s spark.'], 'Smith Garro');
        await give(w, 'rekindle', 2);
        session.setFlag('smithGift');
      }
      return say(['The old stories say Emberwild\'s first fire was split into a thousand sparks...', '...one for every creature. Folk who would gather them all again? Nothing good comes of that.'], 'Smith Garro');
    }
    case 'warden': {
      const tr = TRAINERS.warden_corra;
      if (session.flag('beatWarden')) return say(['Carry the Cinder Sigil with pride. The other Wardens will hear of you.'], tr.name);
      await say(tr.intro, tr.name);
      const won = await trainerBattle(w, 'warden_corra', 'wh_corra');
      if (!won) return;
      session.setFlag('beatWarden');
      audio.sfx('levelup');
      await say(`${name} received the Cinder Sigil!`);
      await say(['The Hollow Veil\'s "Pale Regent" has been gathering sparks across the region.', 'Glimmer crystals, forest wisps... and soon, perhaps, the bonds between trainers and creatures.', 'The other Wardens must be warned. But that journey is for another day.'], tr.name);
      session.autosave();
      await w.ui.endChapter();
      return;
    }
  }
}

async function movePlayer(w: OverworldScene, d: Dir) {
  const [dx, dy] = DX[d];
  if (w.isBlocked(w.px + dx, w.py + dy)) return;
  w.px += dx;
  w.py += dy;
  session.state.x = w.px;
  session.state.y = w.py;
  await new Promise<void>((r) => w.tweens.add({ targets: w.player, x: w.px * 16, y: w.py * 16 - 4, duration: 220, onComplete: () => r() }));
}
