import type { AiLevel } from '../engine/ai';

export interface TrainerDef {
  id: string;
  name: string;
  look: string;
  team: { species: string; level: number; moves?: string[] }[];
  ai: AiLevel;
  reward: number; // money per level of the last creature
  intro: string[];
  defeat: string[];
  after?: string[];
  items?: Record<string, number>;
  music?: 'trainer' | 'warden' | 'veil';
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
      team: [{ species: 'fluffinch', level: 9 }, { species: 'bitzel', level: 9 }, { species: 'RIVAL', level: 11 }],
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
      team: [{ species: 'pebblit', level: 12 }, { species: 'lumimoth', level: 12 }, { species: 'bouldrum', level: 14, moves: ['rock_slam', 'harden', 'crystal_beam', 'pebble_toss'] }],
      intro: ['So you made it through Glimmer Cave. Not many do on their first try.', 'I am Corra, Warden of Cindervale. My creatures were forged in that cave\'s heart.', 'Show me the strength of your bonds!'],
      defeat: ['...Well forged. Your bonds burn bright.', 'Take this: the Cinder Sigil. It proves you bested a Warden of Emberwild.'],
    }),
  ].map((tr) => [tr.id, tr]),
);
