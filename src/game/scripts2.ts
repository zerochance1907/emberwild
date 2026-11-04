import { audio } from '../audio/audio';
import { getSpecies, ROAMER } from '../data/creatures';
import { getItem } from '../data/items';
import { getMap } from '../data/maps';
import { SPIRE_TRAINERS, TRAINERS } from '../data/trainers';
import { displayName, type Creature } from '../engine/creature';
import { compatible, DAYCARE_SLOTS } from '../engine/daycare';
import { TOWER_ROUND, towerLevel, towerPrize, towerTeam } from '../engine/tower';
import type { NpcRt, OverworldScene } from '../scenes/OverworldScene';
import { ListMenu, toast } from '../ui/kit';
import { partyMenu } from '../ui/menus';
import { approach, emote, give, heal, trainerBattle } from './scripts';
import { session } from './session';

const MAX_EGGS = 3;

/** Chapter Two scripts. Returns false if the id isn't one of ours. */
export async function runChapterTwo(w: OverworldScene, id: string, npc?: NpcRt): Promise<boolean> {
  const st = session.state;
  const say = (lines: string | string[], name?: string) => w.ui.dialog.say(lines, name);
  const ask = (q: string, opts: string[], name?: string) => w.ui.ask(q, opts, name);
  const name = st.playerName;
  const beaten = (npcId: string) => st.defeatedTrainers.includes(npcId);

  switch (id) {
    // ---------------- Cindervale -> Saltwind Road ----------------
    case 'roadWorker':
      await say(['Sorry, kid. A rockslide came down on the road to the coast.', 'Warden Corra\'s orders: we only let Sigil holders through while we clear it.', 'Beat the Warden and the road east is yours!'], 'Road Worker');
      return true;

    case 'kipRoute3': {
      if (session.flag('beatKip3')) return true;
      const kip = w.npc('r3_kip');
      if (!kip) return true;
      await emote(w, kip);
      await approach(w, kip);
      await say([`${name}! You came through the rockslide too?`, ...TRAINERS.kip3.intro], 'Kip');
      const won = await trainerBattle(w, 'kip3', 'r3_kip');
      if (!won) return true;
      session.setFlag('beatKip3');
      await say(['Okay. Okay! I\'ll catch up. I always do.', 'Hey, listen. When I got to Gullhaven, there were Veil goons all over the docks.', 'And nobody\'s seen Warden Maren in days. Something big is going on.', 'I\'m going to go train on the marsh. See you there... maybe!'], 'Kip');
      w.refreshNpcs();
      return true;
    }

    // ---------------- Gullhaven ----------------
    case 'tideHallGuard': {
      const hint = !session.flag('docksCleared')
        ? 'Veil folk have taken over the docks, too. Nobody can get a boat out.'
        : !session.flag('lensOff')
          ? 'The shipwright says you have a Driftboard now. The observatory is across the water, south through Mirefen Marsh.'
          : 'The storm is clearing! The ferry can take you to Stormcrest Ridge. Please find her!';
      await say(['Tidewater Hall is closed. Warden Maren went to the Starfall Observatory to look into this endless storm...', '...and she never came back.', hint], 'Hall Apprentice');
      return true;
    }
    case 'spireGuard':
      await say(['This is the Tidewatch Spire, where the coast\'s strongest trainers battle in a streak.', 'Only trainers carrying two Warden Sigils may climb it. Come back once you\'ve earned the Tide Sigil!'], 'Spire Attendant');
      return true;

    case 'wade': {
      if (!(st.bag.lure_reed ?? 0)) {
        await say(['Ahh, nothing like the sound of the tide. You fish, young one?', 'No? Then take my spare Lure Reed!'], 'Fisher Wade');
        await give(w, 'lure_reed');
        await say(['Face any water and press Confirm to cast. Wait for the "!" and then press Confirm, quick as you can!', 'Different waters hold different creatures. And if you ever bond with a Ribboneel, come show me. I\'ve never seen one up close.'], 'Fisher Wade');
        session.setFlag('quest_wade_started');
        return true;
      }
      if (session.flag('quest_wade_done')) {
        await say('The tide comes in, the tide goes out. Good fishing to you!', 'Fisher Wade');
        return true;
      }
      const eel = st.party.find((c) => c.species === 'ribboneel');
      if (eel) {
        await say([`Is that... a Ribboneel? And it's called ${displayName(eel)}?`, 'Look at those fins glow! Forty years of fishing and I finally get to see one.', 'Here. You\'ve made an old man very happy.'], 'Fisher Wade');
        await give(w, 'sea_glass');
        await give(w, 'storm_stone', 3);
        session.setFlag('quest_wade_done');
        return true;
      }
      await say(['No Ribboneel yet? They lurk in the deep channels of Mirefen Marsh.', 'Or raise a Glimmerfin until it grows! Bring one in your team and I\'ll reward you.'], 'Fisher Wade');
      return true;
    }

    case 'hale': {
      if (session.flag('docksCleared')) {
        await say(['How\'s the Driftboard treating you? Face deep water and press Confirm to paddle out.', 'The observatory is south of Mirefen, out on the water.'], 'Shipwright Hale');
        return true;
      }
      if (beaten('gh_veil1') && beaten('gh_veil2')) {
        await say(['You chased those Veil louts off my docks! Thank you!', 'They wanted every boat in the harbour kept on shore. Said the storm-lens needed "no interruptions".', 'The ferry can\'t sail through that storm, but a Driftboard can slip through the marsh channels.', 'Here, take the one I just finished.'], 'Shipwright Hale');
        await give(w, 'driftboard');
        await say(['Face deep water and press Confirm to paddle out. Step onto land to hop off.', 'The old Starfall Observatory is south of Mirefen Marsh. If the storm started anywhere, it started there.'], 'Shipwright Hale');
        session.setFlag('docksCleared');
        await w.ui.flash(0x000000, 300);
        w.refreshNpcs();
        return true;
      }
      await say(['I\'m Hale, the shipwright. Or I would be, if those cloaked folk would let me near my boats!', 'Two of them are blocking the docks. Could you... persuade them to leave?'], 'Shipwright Hale');
      return true;
    }

    case 'ferry': {
      if (!session.flag('lensOff')) {
        await say(['No ship can sail through that storm, I\'m afraid. It just sits over the bay and spins.', 'Captain Ottilie has sailed these waters for thirty years and she\'s never seen the like.'], 'Captain Ottilie');
        return true;
      }
      if (!(st.bag.ferry_pass ?? 0)) {
        await say(['The storm\'s breaking up! Was that your doing?', 'Then you ride free on my ferry, always. Here\'s a pass.'], 'Captain Ottilie');
        await give(w, 'ferry_pass');
      }
      const c = await ask('Where shall we sail?', ['Stormcrest Ridge', 'Stay in Gullhaven'], 'Captain Ottilie');
      if (c !== 0) return true;
      await say('All aboard! Hold on to your hat.', 'Captain Ottilie');
      audio.sfx('splash');
      w.changeMap('stormridge', 18, 23, 'up', true);
      return true;
    }
    case 'ferryBack': {
      const c = await ask('Sail back to Gullhaven?', ['Yes, please', 'Not yet'], 'Captain Ottilie');
      if (c !== 0) return true;
      audio.sfx('splash');
      w.changeMap('gullhaven', 32, 19, 'up', true);
      return true;
    }

    case 'daycare': return daycare(w, say, ask);

    case 'keeper': {
      const pages = st.bag.star_page ?? 0;
      if (session.flag('quest_pages_done')) {
        const r = st.roamer;
        if (r.caught) await say('You bonded with the storm-steed itself? The sky will be quieter now... and a little lonelier.', 'Keeper Ysolde');
        else if (r.active) await say([`My charts say the storm-steed is racing around ${getMap(r.map).name} tonight.`, 'It moves every time you do, so be quick!'], 'Keeper Ysolde');
        else await say('The sky is quiet tonight. Lovely for stargazing.', 'Keeper Ysolde');
        return true;
      }
      if (pages >= 3) {
        await say(['My star log pages! All three! Oh, you wonderful child.', 'With these I can chart the storm-steed\'s path across the coast. Ask me any time where it is.', 'And please, take this. It brought me luck once.'], 'Keeper Ysolde');
        session.takeItem('star_page', 3);
        await give(w, 'lucky_scale');
        await give(w, 'ember_tea');
        session.setFlag('quest_pages_done');
        return true;
      }
      session.setFlag('quest_pages_started');
      await say(['I was the keeper of the Starfall Observatory, until those cloaked people threw me out.', 'In the rush I lost three pages of my star log. One fell into the reeds of Mirefen Marsh...', '...one is still inside the observatory, and the wind carried the last one up to Stormcrest Ridge.', `You have ${pages} of 3. Would you bring them back to me?`], 'Keeper Ysolde');
      return true;
    }

    case 'spire': return spire(w, say, ask);

    // ---------------- Starfall Observatory ----------------
    case 'vesper': {
      if (session.flag('beatVesper')) return true;
      const v = npc ?? w.npc('ob_vesper');
      if (v) { await emote(w, v); await approach(w, v); }
      const tr = TRAINERS.admin_vesper;
      await say(tr.intro, tr.name);
      const won = await trainerBattle(w, 'admin_vesper', 'ob_vesper');
      if (!won) return true;
      session.setFlag('beatVesper');
      await say(['Hmph. The vessels are nearly full anyway.'], tr.name);
      await say(['Vesper. You\'re making a mess.'], 'Veil Agent Nyx');
      await say(['Nyx. Come to watch me finish what you started?'], tr.name);
      await say(['Come to tell you the Regent wants the Warden moved. Now. Before this one finds her too.'], 'Veil Agent Nyx');
      await say(['Fine. Little spark: your Warden Maren is somewhere you\'ll never reach. Under the storm, beneath Stormcrest Ridge.', 'Shut the lens off if you like. Without a ferry, it\'s a long swim.'], tr.name);
      await w.ui.flash(0x000000, 500);
      w.refreshNpcs();
      await say('Vesper and Nyx vanished in a swirl of grey cloaks...');
      await say('The great lens still crackles with stolen lightning.');
      return true;
    }
    case 'lens': {
      if (session.flag('lensOff')) return say('The great lens is dark and still.').then(() => true);
      if (!session.flag('beatVesper')) return say('A huge lens crackles with lightning pulled out of the storm. Someone is standing guard over it.').then(() => true);
      const c = await ask('The storm-lens hums with stolen lightning. Shut it down?', ['Shut it down', 'Leave it']);
      if (c !== 0) return true;
      session.setFlag('lensOff');
      audio.sfx('thunder');
      await w.ui.flash(0xe8f0ff, 700);
      w.refreshObjects();
      await say(['The lens flickers... and goes dark.', 'A crackling shape bursts out of the last flash of light!']);
      audio.cry(ROAMER);
      await w.ui.flash(0xffe14a, 400);
      st.roamer.active = true;
      st.roamer.map = 'mirefen';
      session.markSeen(ROAMER);
      await say([`It was a ${getSpecies(ROAMER).name}! It galloped off across the marsh in a rumble of thunder.`, 'Outside, the clouds over the bay are breaking apart. The ferry should be able to sail again!']);
      session.autosave();
      return true;
    }

    // ---------------- Stormcrest Ridge / Tidewrack Grotto ----------------
    case 'nyx2': {
      if (session.flag('beatNyx2')) return true;
      const n = npc ?? w.npc('sr_nyx');
      if (n) { await emote(w, n); await approach(w, n); }
      const tr = TRAINERS.agent_nyx2;
      await say(tr.intro, tr.name);
      const won = await trainerBattle(w, 'agent_nyx2', 'sr_nyx');
      if (!won) return true;
      session.setFlag('beatNyx2');
      await say(['The Regent is patient. The Veil will grow long again.'], tr.name);
      await w.ui.flash(0x000000, 500);
      w.refreshNpcs();
      await say('Agent Nyx stepped into the storm and was gone.');
      return true;
    }
    case 'valve': {
      const flag = `lowtide_${w.map.id}`;
      const low = session.flag(flag);
      const here = w.tileAt(w.px, w.py);
      if (here === '%' && low) return say('If you turn it now, the tide will rush in right where you\'re standing! Step onto dry ground first.').then(() => true);
      if (here === '&' && !low) return say('If you turn it now, the water will flood the ground under your feet! Step onto dry ground first.').then(() => true);
      const c = await ask('A rusty tide valve. Turn it?', ['Turn it', 'Leave it']);
      if (c !== 0) return true;
      session.setFlag(flag, !low);
      audio.sfx('valve');
      await w.ui.flash(0x3a82c8, 500);
      w.refreshTide();
      w.refreshObjects();
      await say(low ? 'Seawater comes rushing back in! The tide is high.' : 'With a deep gurgle, the water drains away. The tide is low.');
      return true;
    }
    case 'vesper2': {
      if (session.flag('beatVesper2')) return true;
      const v = npc ?? w.npc('gr_vesper');
      if (v) { await emote(w, v); await approach(w, v); }
      const tr = TRAINERS.admin_vesper2;
      await say(tr.intro, tr.name);
      const won = await trainerBattle(w, 'admin_vesper2', 'gr_vesper');
      if (!won) return true;
      session.setFlag('beatVesper2');
      await say(['Keep her, then. The Regent has other Wardens to choose from.'], tr.name);
      await w.ui.flash(0x000000, 500);
      w.refreshNpcs();
      await say('Admin Vesper fled into the dark tunnels of the grotto.');
      return runChapterTwo(w, 'marenRescue');
    }
    case 'marenRescue': {
      if (session.flag('marenBack')) return true;
      if (!session.flag('beatVesper2')) return say('Warden Maren is held behind a crackling barrier.').then(() => true);
      await say([`You came all this way? For me? Thank you, ${name}.`, 'Vesper kept me here and drew on my bond with my creatures. Every hour I felt it fade a little more.', 'But it\'s still there. It\'s stronger, actually, now that I know a trainer like you is out there.', 'Come. Captain Ottilie owes me a favour. Let\'s go home.'], 'Warden Maren');
      await w.ui.flash(0xffffff, 600);
      await heal(w);
      session.setFlag('marenBack');
      st.lastHearth = { map: 'hearth_gh', x: 6, y: 3 };
      await say('Warden Maren and the ferry brought you safely back to Gullhaven.');
      w.changeMap('gullhaven', 17, 7, 'up', true);
      return true;
    }

    // ---------------- Tidewater Hall ----------------
    case 'warden2': {
      const tr = TRAINERS.warden_maren;
      if (session.flag('beatMaren')) {
        await say(['The Tide Sigil suits you. The Tidewatch Spire is open to you now, and the coast holds plenty more creatures to meet.', 'As for the Pale Regent... the Wardens will be ready next time. Thanks to you.'], tr.name);
        return true;
      }
      await say(tr.intro, tr.name);
      const won = await trainerBattle(w, 'warden_maren', 'th_maren');
      if (!won) return true;
      session.setFlag('beatMaren');
      audio.sfx('levelup');
      await say(`${name} received the Tide Sigil!`);
      await say(['The Veil stole lightning from the sky and tried to steal a Warden\'s bond. Both times, you stopped them.', 'Whatever the Pale Regent is filling those vessels for, it is something enormous.', 'I will send word to every Warden in Emberwild. And you, rest a while. You\'ve earned it.'], tr.name);
      session.autosave();
      await w.ui.endChapter(2);
      return true;
    }
  }
  return false;
}

type Say = (lines: string | string[], name?: string) => Promise<void>;
type Ask = (q: string, opts: string[], name?: string) => Promise<number>;

async function daycare(w: OverworldScene, say: Say, ask: Ask): Promise<boolean> {
  const st = session.state;
  const dc = st.daycare;
  const who = 'Nestkeeper Pell';
  if (dc.egg) {
    await say(['Oh, there you are! Your two have been nesting together, and... look! An egg!'], who);
    if (st.eggs.length >= MAX_EGGS) await say(`You're already carrying ${MAX_EGGS} eggs! Hatch some first, dear.`, who);
    else {
      st.eggs.push(dc.egg);
      dc.egg = null;
      audio.sfx('item');
      await say([`${st.playerName} received an Egg!`, 'Keep it with you and walk around. It will hatch when it\'s ready.']);
    }
  }
  if (!dc.mons.length) await say(['Welcome to my nest! I\'m Pell. I look after creatures while their trainers travel.', 'They\'ll learn a thing or two while they\'re here. And if two of them share a type, they might even make a nest of their own!'], who);
  for (;;) {
    const opts = [
      { label: 'Leave a creature', ok: dc.mons.length < DAYCARE_SLOTS && st.party.length > 1 },
      { label: 'Take one back', ok: dc.mons.length > 0 && st.party.length < 6 },
      { label: 'How are they doing?', ok: dc.mons.length > 0 },
      { label: 'Goodbye', ok: true },
    ].filter((o) => o.ok);
    const c = await ask('How can I help?', opts.map((o) => o.label), who);
    const pick = opts[c]?.label ?? 'Goodbye';
    if (pick === 'Goodbye') return say('Come back soon! Mind the eggs.', who).then(() => true);
    if (pick === 'Leave a creature') {
      const i = await partyMenu(w.ui, { mode: 'target', title: 'Leave which creature?', valid: (c2: Creature) => st.party.filter((p) => p !== c2 && p.hp > 0).length > 0 });
      if (i < 0) continue;
      const mon = st.party.splice(i, 1)[0];
      dc.mons.push(mon);
      audio.sfx('confirm');
      await say(`I'll take good care of ${displayName(mon)}!`, who);
      session.autosave();
    }
    if (pick === 'Take one back') {
      const menu = new ListMenu(w.ui, 300, 140, 360, dc.mons.map((m) => ({ label: displayName(m), right: `Lv ${m.level}`, icon: `ci_${m.species}` })), { title: 'Take back...', rowH: 56, depth: 1300 });
      menu.root.setScrollFactor(0);
      const k = await menu.open();
      menu.destroy();
      if (k < 0) continue;
      const mon = dc.mons.splice(k, 1)[0];
      st.party.push(mon);
      const evo = getSpecies(mon.species).evolves;
      if (evo && mon.level >= evo.level) mon.pendingEvolution = evo.to;
      audio.sfx('confirm');
      await say(`${displayName(mon)} is so happy to see you!`, who);
      if (mon.pendingEvolution) await w.ui.runEvolutions();
      session.autosave();
    }
    if (pick === 'How are they doing?') {
      const lines = dc.mons.map((m) => `${displayName(m)} is level ${m.level} now.`);
      if (dc.mons.length === 2) lines.push(compatible(dc.mons[0], dc.mons[1]) ? 'The two of them get along wonderfully. They share a nest!' : 'They don\'t share a type, so they mostly ignore each other.');
      await say(lines, who);
    }
  }
}

async function spire(w: OverworldScene, say: Say, ask: Ask): Promise<boolean> {
  const st = session.state;
  const t = st.tower;
  const who = 'Spire Master';
  if (!session.flag('beatMaren')) return say('The Spire is not open to you yet.', who).then(() => true);
  await say(['Welcome to the Tidewatch Spire. Here you battle trainer after trainer, with no break but a quick rest.', `Your best streak so far: ${t.best}.`], who);
  const c = await ask('Take the Spire challenge?', ['Challenge!', 'Explain the rules', 'Not now'], who);
  if (c === 1) {
    await say(['Your creatures are fully healed before every battle, but you can\'t use items from your bag.', `Opponents use strong creatures at level ${towerLevel(0, 0)} or your own top level, whichever is higher. Every ${TOWER_ROUND} wins they get stronger.`, 'Every third win in a row earns a prize. Lose, or stop to rest, and your streak ends.'], who);
    return true;
  }
  if (c !== 0) return true;
  if (!st.party.some((p) => p.hp > 0)) return true;
  t.streak = 0;
  for (;;) {
    session.healParty();
    const trId = session.rng.pick(SPIRE_TRAINERS);
    const tr = TRAINERS[trId];
    const top = Math.max(...st.party.map((p) => p.level));
    const lvl = towerLevel(top, t.streak);
    await say(`Battle ${t.streak + 1}! ${tr.name} steps up.`, who);
    await say(tr.intro, tr.name);
    const result = await w.battle({ kind: 'trainer', enemy: towerTeam(lvl, t.streak, session.rng), trainerId: trId, music: 'spire', canLose: true, noItems: true });
    if (result !== 'win') {
      await say([`Your streak ends at ${t.streak}.`, `Best streak: ${t.best}. Come back any time!`], who);
      t.streak = 0;
      break;
    }
    t.streak++;
    t.best = Math.max(t.best, t.streak);
    const prize = towerPrize(t.streak);
    if (prize) {
      session.giveItem(prize);
      audio.sfx('item');
      await say(`For ${t.streak} wins in a row, you receive a ${getItem(prize).name}!`, who);
    }
    const next = await ask(`${t.streak} win${t.streak > 1 ? 's' : ''} in a row! Keep going?`, ['Next battle', 'Rest (ends the streak)'], who);
    if (next !== 0) {
      await say([`Well fought! You finished with ${t.streak} straight wins.`, `Best streak: ${t.best}.`], who);
      t.streak = 0;
      break;
    }
  }
  session.healParty();
  session.autosave();
  if (t.best >= 10 && !session.flag('spire10')) {
    session.setFlag('spire10');
    toast(w.ui, 'Spire legend: 10 wins in a row!');
  }
  return true;
}
