import type { AiLevel } from '../engine/ai';

export interface TrainerDef {
  id: string;
  name: string;
  look: string;
  team: { species: string; level: number; moves?: string[]; held?: string }[];
  ai: AiLevel;
  reward: number; // money per level of the last creature
  intro: string[];
  defeat: string[];
  after?: string[];
  items?: Record<string, number>;
  music?: 'trainer' | 'warden' | 'veil' | 'admin' | 'spire';
}

const t = (d: TrainerDef) => d;

/** Rival teams are filled in at runtime based on the starter they picked. */
export const RIVAL_COUNTER: Record<string, string> = { kindlet: 'puddlop', puddlop: 'sprigling', sprigling: 'kindlet' };

export const TRAINERS: Record<string, TrainerDef> = Object.fromEntries(
  [
    t({
      id: 'kip1', name: 'Kip', look: 'kip', ai: 1, reward: 20, team: [{ species: 'RIVAL', level: 5 }],
      intro: ['Let\'s see whose partner is stronger. No holding back!'], defeat: ['What?! I picked the one with the type advantage, too...'],
    }),
    t({
      id: 'kip2', name: 'Kip', look: 'kip', ai: 2, reward: 30, music: 'trainer',
      team: [{ species: 'fluffinch', level: 9 }, { species: 'bitzel', level: 9 }, { species: 'RIVAL', level: 10 }],
      intro: ['I\'ve been training non-stop since Hollowbrook. Ready?'], defeat: ['Grr... You\'re getting really good.'],
    }),
    t({
      id: 'scout_tomas', name: 'Scout Tomas', look: 'scout', ai: 1, reward: 16, team: [{ species: 'fluffinch', level: 4 }, { species: 'bitzel', level: 4 }],
      intro: ['Hey! Our eyes met! That means we battle!'], defeat: ['Aw, I need to scout out better creatures.'], after: ['Fluffinch flocks get bigger near the forest.'],
    }),
    t({
      id: 'picnicker_ada', name: 'Picnicker Ada', look: 'girl', ai: 1, reward: 16, team: [{ species: 'mossgrub', level: 5 }, { species: 'fluffinch', level: 5 }],
      intro: ['You walked right through my picnic! Battle me!'], defeat: ['My sandwiches are all squashed now...'], after: ['Mossgrub turns into Budwing pretty quickly, you know.'],
    }),
    t({
      id: 'forager_lia', name: 'Forager Lia', look: 'forager', ai: 1, reward: 20, team: [{ species: 'shroomp', level: 7 }, { species: 'mossgrub', level: 7 }],
      intro: ['Shh! You\'ll scare the mushrooms!'], defeat: ['Fine, fine. You may pick a mushroom.'], after: ['Rain makes the Shroomp come out to dance.'],
    }),
    t({
      id: 'scout_rhea', name: 'Scout Rhea', look: 'scout', ai: 1, reward: 18, team: [{ species: 'gloomling', level: 7 }, { species: 'fluffinch', level: 7 }],
      intro: ['The forest wisps told me you were coming.'], defeat: ['The wisps did not tell me THAT.'], after: ['Gloomlings are shy. They hate Gale moves!'],
    }),
    t({
      id: 'veil_grunt_1', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 24, music: 'veil', team: [{ species: 'gloomling', level: 8 }, { species: 'bitzel', level: 8 }],
      intro: ['Halt! The Hollow Veil has business in these woods.', 'The wisps\' light belongs to the Pale Regent now!'],
      defeat: ['Tch! The Regent will hear about this...'], after: ['Laugh while you can. Our thorns will keep this path sealed.'],
    }),
    t({
      id: 'hiker_doran', name: 'Hiker Doran', look: 'hiker', ai: 1, reward: 22, team: [{ species: 'pebblit', level: 9 }, { species: 'pebblit', level: 10 }],
      intro: ['Ho there! My rocks have been itching for a scrap!'], defeat: ['Rock solid effort, kid!'], after: ['Pebblit hate getting wet. Remember that in the cave.'],
    }),
    t({
      id: 'birder_sol', name: 'Birdkeeper Sol', look: 'birder', ai: 1, reward: 22, team: [{ species: 'fluffinch', level: 9 }, { species: 'fluffinch', level: 10 }],
      intro: ['My flock will blow you away!'], defeat: ['Ruffled feathers all round...'], after: ['Fluffinch become Galecrest at level 12. So majestic!'],
    }),
    t({
      id: 'veil_grunt_2', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 26, music: 'veil', team: [{ species: 'gloomling', level: 10 }, { species: 'pebblit', level: 10 }],
      intro: ['Another meddler? These crystals are Veil property!'], defeat: ['The crystals... Agent Nyx won\'t be pleased.'],
    }),
    t({
      id: 'veil_grunt_3', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 26, music: 'veil', team: [{ species: 'bitzel', level: 10 }, { species: 'lumimoth', level: 10 }],
      intro: ['You\'re the kid from Whisperwood! Not this time!'], defeat: ['Ugh. Lights out for me...'],
    }),
    t({
      id: 'agent_nyx', name: 'Veil Agent Nyx', look: 'agent', ai: 2, reward: 40, music: 'veil', items: { honey_tonic: 1 },
      team: [{ species: 'gloomling', level: 11 }, { species: 'lumimoth', level: 11 }, { species: 'bitzel', level: 12 }],
      intro: ['So you\'re the one scattering my grunts.', 'The glimmer crystals hold the old ember-light of Emberwild.', 'The Pale Regent will gather every spark of it. Starting with yours.'],
      defeat: ['...Impressive. Keep your little spark, then. For now.'],
    }),
    t({
      id: 'apprentice_flint', name: 'Apprentice Flint', look: 'apprentice', ai: 1, reward: 28, team: [{ species: 'pebblit', level: 11 }, { species: 'lumimoth', level: 11 }],
      intro: ['To reach Warden Corra, you go through me!'], defeat: ['Hot stuff! The Warden is waiting for you.'], after: ['Corra\'s Bouldrum has never been knocked down by an Ember move.'],
    }),
    t({
      id: 'warden_corra', name: 'Warden Corra', look: 'warden', ai: 2, reward: 100, music: 'warden', items: { honey_tonic: 1 },
      team: [{ species: 'pebblit', level: 13 }, { species: 'lumimoth', level: 13 }, { species: 'bouldrum', level: 15, moves: ['rock_slam', 'harden', 'crystal_beam', 'pebble_toss'] }],
      intro: ['So you made it through Glimmer Cave. Not many do on their first try.', 'I am Corra, Warden of Cindervale. My creatures were forged in that cave\'s heart.', 'Show me the strength of your bonds!'],
      defeat: ['...Well forged. Your bonds burn bright.', 'Take this: the Cinder Sigil. It proves you bested a Warden of Emberwild.'],
    }),
    // ---------------- Chapter Two ----------------
    t({
      id: 'sailor_brann', name: 'Sailor Brann', look: 'sailor', ai: 1, reward: 24, team: [{ species: 'shellstack', level: 15 }, { species: 'pipwhisk', level: 15 }],
      intro: ['Ahoy! A landlubber on Saltwind Road? Let\'s see your sea legs!'], defeat: ['Blown clean off course!'], after: ['Shellstack keep adding shells. Mine is taller than me now.'],
    }),
    t({
      id: 'birder_isa', name: 'Birdkeeper Isa', look: 'birder', ai: 1, reward: 24, team: [{ species: 'galecrest', level: 16 }, { species: 'pipwhisk', level: 16 }],
      intro: ['The coast winds make my birds fly twice as fast!'], defeat: ['Grounded...'], after: ['Pipwhisk grow into Wadewing, and then into the great Galeheron. Patience!'],
    }),
    t({
      id: 'hiker_moss', name: 'Hiker Moss', look: 'hiker', ai: 1, reward: 24, team: [{ species: 'bouldrum', level: 16 }, { species: 'flintle', level: 16 }],
      intro: ['I walked here all the way from Cindervale. My legs are sore but my creatures are fresh!'], defeat: ['Time for a sit-down.'], after: ['Flintle love warm rocks. You\'ll find more up on the ridges.'],
    }),
    t({
      id: 'kip3', name: 'Kip', look: 'kip', ai: 2, reward: 36, music: 'trainer', items: { honey_tonic: 1 },
      team: [{ species: 'galecrest', level: 18 }, { species: 'fizzkid', level: 17 }, { species: 'voltail', level: 18 }, { species: 'RIVAL', level: 20 }],
      intro: ['I got a Warden\'s Sigil too, you know. Corra said I was "reckless but brave"!', 'Gullhaven\'s Warden is next. And I\'m beating you there!'], defeat: ['No way... AGAIN?!'],
    }),
    t({
      id: 'veil_grunt_4', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 28, music: 'veil', team: [{ species: 'bogbloop', level: 17 }, { species: 'gloomling', level: 17 }],
      intro: ['These docks are closed by order of the Hollow Veil!'], defeat: ['The docks are... open again, I guess.'], after: ['Admin Vesper will sort you out.'],
    }),
    t({
      id: 'veil_grunt_5', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 28, music: 'veil', team: [{ species: 'fizzkid', level: 17 }, { species: 'duskwraith', level: 18 }],
      intro: ['No boats leave Gullhaven while the storm-lens is working!'], defeat: ['Tch. Fine. The storm stays anyway.'], after: ['The lens is out at the old observatory. Not that you can get there.'],
    }),
    t({
      id: 'angler_pim', name: 'Angler Pim', look: 'fisher', ai: 1, reward: 26, team: [{ species: 'glimmerfin', level: 18 }, { species: 'glimmerfin', level: 19 }, { species: 'shellstack', level: 18 }],
      intro: ['You scared off my bite! Now you owe me a battle.'], defeat: ['Reeled in and thrown back...'], after: ['Cast your Lure Reed and wait for the "!". Press Confirm right away!'],
    }),
    t({
      id: 'forager_tansy', name: 'Forager Tansy', look: 'forager', ai: 1, reward: 26, team: [{ species: 'reedkin', level: 19 }, { species: 'shroomp', level: 19 }],
      intro: ['The reeds told me someone was sneaking up!'], defeat: ['The reeds were wrong about you.'], after: ['Reedkin hide by swaying with the cattails. Look for blinking eyes.'],
    }),
    t({
      id: 'swimmer_coral', name: 'Swimmer Coral', look: 'swimmer', ai: 1, reward: 26, team: [{ species: 'drowsea', level: 20 }, { species: 'glimmerfin', level: 19 }],
      intro: ['Paddling out on a Driftboard? Race you! Well, battle you.'], defeat: ['Glub... I lost.'], after: ['Drowsea float about humming. Their songs make you sleepy.'],
    }),
    t({
      id: 'swimmer_jun', name: 'Swimmer Jun', look: 'swimmer', ai: 1, reward: 26, team: [{ species: 'wadewing', level: 20 }, { species: 'bogbloop', level: 20 }],
      intro: ['The observatory? It\'s been lit up every night. Something\'s wrong in there.'], defeat: ['You\'re strong. Maybe you can find out what\'s going on.'], after: ['Veil grunts row out there every evening.'],
    }),
    t({
      id: 'veil_grunt_6', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 30, music: 'veil', team: [{ species: 'owlune', level: 20 }, { species: 'duskwraith', level: 20 }],
      intro: ['How did a kid get across the marsh?!'], defeat: ['Admin Vesper is going to be furious...'],
    }),
    t({
      id: 'veil_grunt_7', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 30, music: 'veil', team: [{ species: 'lumimoth', level: 21 }, { species: 'bogbloop', level: 21 }],
      intro: ['The lens is filling the Regent\'s vessels! You won\'t stop it!'], defeat: ['The vessels... hardly full...'],
    }),
    t({
      id: 'admin_vesper', name: 'Veil Admin Vesper', look: 'vesper', ai: 2, reward: 44, music: 'admin', items: { kelp_tonic: 1 },
      team: [{ species: 'duskwraith', level: 22 }, { species: 'owlune', level: 22 }, { species: 'fenwraith', level: 24, moves: ['dusk_sip', 'bog_curse', 'riptide', 'shadow_nip'] }],
      intro: ['So you\'re the spark that put out Nyx\'s little crystal scheme.', 'I am Vesper, Tempest Admin of the Hollow Veil.', 'This lens pulls the lightning out of the sky, every last spark, and pours it into the Pale Regent\'s vessels.', 'And you, little spark, are about to be poured in too.'],
      defeat: ['...You\'re worse than a thunderstorm.'],
    }),
    t({
      id: 'hiker_tor', name: 'Hiker Tor', look: 'hiker', ai: 1, reward: 28, team: [{ species: 'ramblast', level: 22 }, { species: 'flintle', level: 22 }],
      intro: ['Nothing like a ridge walk in a gale! Let\'s battle!'], defeat: ['Blown away!'], after: ['Fizzkid herds love the storms. They grow up into Ramblast up here.'],
    }),
    t({
      id: 'scout_kesh', name: 'Scout Kesh', look: 'scout', ai: 1, reward: 28, team: [{ species: 'ramblast', level: 23 }, { species: 'voltail', level: 23 }],
      intro: ['I\'m scouting the gale lanes. You look like good practice!'], defeat: ['Note to self: you are not practice.'], after: ['Gale lanes always carry you to a resting stone. Plan your hops!'],
    }),
    t({
      id: 'birder_vale', name: 'Birdkeeper Vale', look: 'birder', ai: 1, reward: 28, team: [{ species: 'wadewing', level: 23 }, { species: 'galecrest', level: 23 }],
      intro: ['You made it up the gale lanes? Impressive. My birds don\'t even need them.'], defeat: ['Feathers everywhere...'], after: ['A storm-steed thunders across the coast now. Have you seen it?'],
    }),
    t({
      id: 'agent_nyx2', name: 'Veil Agent Nyx', look: 'agent', ai: 2, reward: 46, music: 'veil', items: { kelp_tonic: 1 },
      team: [{ species: 'duskwraith', level: 24 }, { species: 'lumimoth', level: 24 }, { species: 'ramblast', level: 24 }, { species: 'fenwraith', level: 25 }],
      intro: ['You again. Of course it\'s you.', 'Vesper\'s lens was only half the plan. The other half is down in that grotto: a Warden\'s bond.', 'Do you know how bright a Warden\'s spark burns? Brighter than any storm.', 'I\'m not letting you take that away from the Regent.'],
      defeat: ['...Twice now. Fine. Go and see what Vesper has done to your precious Warden.'],
    }),
    t({
      id: 'veil_grunt_8', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 32, music: 'veil', team: [{ species: 'fenwraith', level: 24 }, { species: 'shellstack', level: 24 }],
      intro: ['The tide is ours to command in here!'], defeat: ['The tide... went out on me.'], after: ['Turn the valves and the whole grotto floods or drains. Fun, right?'],
    }),
    t({
      id: 'veil_grunt_9', name: 'Veil Grunt', look: 'veil', ai: 1, reward: 32, music: 'veil', team: [{ species: 'ribboneel', level: 25 }, { species: 'duskwraith', level: 25 }],
      intro: ['Admin Vesper is busy. Busy with a Warden!'], defeat: ['I really should have stayed in Gullhaven.'],
    }),
    t({
      id: 'admin_vesper2', name: 'Veil Admin Vesper', look: 'vesper', ai: 2, reward: 50, music: 'admin', items: { kelp_tonic: 2 },
      team: [{ species: 'fenwraith', level: 26 }, { species: 'nocturnelle', level: 26 }, { species: 'duskwraith', level: 26 }, { species: 'ribboneel', level: 27, moves: ['undertow_bite', 'ion_pulse', 'arc_bolt', 'riptide'] }],
      intro: ['Persistent little spark, aren\'t you?', 'Warden Maren\'s bond with her creatures is the brightest I have ever measured.', 'One more hour and it would have filled every vessel the Regent owns.', 'You will not have that hour.'],
      defeat: ['Impossible... The Regent will hear of this. And the Regent does not forgive.'],
    }),
    t({
      id: 'apprentice_nell', name: 'Apprentice Nell', look: 'swimmer', ai: 1, reward: 32, team: [{ species: 'torrentoad', level: 26 }, { species: 'drowsea', level: 26 }],
      intro: ['Welcome to Tidewater Hall! First, the current. Then, me!'], defeat: ['Swept away!'], after: ['Watch where each current ends. Only one path reaches the Warden.'],
    }),
    t({
      id: 'apprentice_ottar', name: 'Apprentice Ottar', look: 'sailor', ai: 1, reward: 32, team: [{ species: 'shellstack', level: 27 }, { species: 'ribboneel', level: 27 }],
      intro: ['You found the right current! But the last wave is me.'], defeat: ['Well sailed. The Warden awaits.'], after: ['Maren\'s Galeheron is fast. Spark and Stone moves are your friends.'],
    }),
    t({
      id: 'warden_maren', name: 'Warden Maren', look: 'maren', ai: 2, reward: 120, music: 'warden', items: { kelp_tonic: 2 },
      team: [
        { species: 'drowsea', level: 28 },
        { species: 'shellstack', level: 28 },
        { species: 'ribboneel', level: 29, moves: ['undertow_bite', 'ion_pulse', 'arc_bolt', 'riptide'] },
        { species: 'galeheron', level: 30, moves: ['squall', 'brine_spray', 'dive_bomb', 'wing_cut'] },
      ],
      intro: ['So. The trainer who pulled me out of that grotto now wants to knock me down.', 'Good! A Warden should be tested by the bravest trainer she knows.', 'I am Maren, Warden of Gullhaven. My creatures move like the tide: patient, then all at once.', 'Show me how your bonds hold against the current!'],
      defeat: ['...The tide has turned. And it turned your way.', 'Take the Tide Sigil. You have more than earned it.'],
    }),
    // Tidewatch Spire challengers (their teams are generated, see engine/tower.ts)
    t({ id: 'spire_sailor', name: 'Spire Sailor', look: 'sailor', ai: 2, reward: 12, music: 'spire', team: [{ species: 'SPIRE', level: 30 }], intro: ['The Spire tests every bond. Ready?'], defeat: ['A worthy win!'] }),
    t({ id: 'spire_scout', name: 'Spire Scout', look: 'scout', ai: 2, reward: 12, music: 'spire', team: [{ species: 'SPIRE', level: 30 }], intro: ['I\'ve studied every creature on the coast!'], defeat: ['Back to the books...'] }),
    t({ id: 'spire_birder', name: 'Spire Birdkeeper', look: 'birder', ai: 2, reward: 12, music: 'spire', team: [{ species: 'SPIRE', level: 30 }], intro: ['My flock has never left this tower. They\'re hungry for a win!'], defeat: ['Ruffled again!'] }),
    t({ id: 'spire_swimmer', name: 'Spire Swimmer', look: 'swimmer', ai: 2, reward: 12, music: 'spire', team: [{ species: 'SPIRE', level: 30 }], intro: ['Swim with the strongest!'], defeat: ['Sunk!'] }),
    t({ id: 'spire_veteran', name: 'Spire Veteran', look: 'oldman', ai: 2, reward: 14, music: 'spire', team: [{ species: 'SPIRE', level: 30 }], intro: ['I have climbed this Spire for forty years. Let us see how you climb.'], defeat: ['Ho ho! Splendid.'] }),
  ].map((tr) => [tr.id, tr]),
);

export const SPIRE_TRAINERS = ['spire_sailor', 'spire_scout', 'spire_birder', 'spire_swimmer', 'spire_veteran'];
