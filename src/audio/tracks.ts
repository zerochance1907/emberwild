/**
 * Original chiptune tracks for Emberwild, written for the tiny sequencer in audio.ts.
 * Lead: "note.len" tokens (len in 16th notes, "r" = rest). Chords: one per bar.
 */
export type TrackId = 'title' | 'town' | 'route' | 'forest' | 'cave' | 'hearth' | 'battle' | 'trainer' | 'warden' | 'victory' | 'veil' | 'ending';

export interface Track {
  bpm: number;
  chords: string[];
  lead: string;
  drums?: string; // 16 chars per bar, repeated: k kick, s snare, h hat
  bass: 'pulse' | 'walk' | 'gallop' | 'drone' | 'none';
  arp?: boolean;
  transpose?: number;
  leadWave?: OscillatorType;
  loop?: boolean;
}

const battleLead =
  'e5.2 e5.2 g5.2 e5.2 b5.4 a5.2 g5.2 e5.2 e5.2 g5.2 e5.2 c6.4 b5.2 a5.2 f#5.2 f#5.2 a5.2 f#5.2 d6.4 c6.2 a5.2 b5.6 a5.2 f#5.4 d#5.4 ' +
  'e5.2 g5.2 b5.2 e6.2 d6.2 b5.2 g5.2 b5.2 c6.4 b5.4 g5.4 e5.4 a5.2 c6.2 e6.4 d6.2 c6.2 a5.4 b5.4 d#6.4 f#6.4 b5.4';

export const TRACKS: Record<TrackId, Track> = {
  title: {
    bpm: 96, chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], bass: 'walk', arp: true, drums: 'k.......s.......',
    lead: 'f#5.4 a5.4 d6.8 c#6.4 a5.4 e5.8 d5.4 f#5.4 b5.6 a5.2 g5.12 r.4 f#5.4 a5.4 d6.4 f#6.4 e6.6 c#6.2 a5.8 b5.4 a5.4 g5.4 b5.4 a5.16',
  },
  town: {
    bpm: 104, chords: ['F', 'C', 'Dm', 'A#', 'F', 'C', 'A#', 'C'], bass: 'walk', arp: true, drums: 'k...h...s...h...',
    lead: 'a4.4 c5.4 f5.6 e5.2 g5.4 e5.4 c5.8 d5.4 f5.4 a5.4 g5.2 f5.2 f5.6 d5.2 a#4.8 a4.4 c5.4 f5.4 a5.4 g5.6 e5.2 g5.4 c6.4 a#5.4 a5.4 g5.4 f5.4 e5.4 g5.4 c5.8',
  },
  route: {
    bpm: 132, chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], bass: 'pulse', arp: true, drums: 'k.h.s.h.k.k.s.h.',
    lead: 'g4.2 b4.2 d5.4 g5.4 f#5.2 e5.2 d5.6 a4.2 d5.4 f#5.4 e5.4 g5.4 b5.4 a5.2 g5.2 e5.8 c5.4 e5.4 g5.2 f#5.2 g5.4 b5.4 d6.4 a5.6 f#5.2 d5.8 e5.4 g5.4 c6.4 b5.2 a5.2 a5.8 f#5.4 d5.4',
  },
  forest: {
    bpm: 92, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E'], bass: 'walk', arp: true, drums: 'k.......s.......', leadWave: 'triangle',
    lead: 'e5.6 a4.2 c5.4 e5.4 f5.8 e5.4 c5.4 g5.6 e5.2 c5.8 d5.4 b4.4 g4.8 a4.4 c5.4 e5.4 a5.4 g5.4 f5.4 e5.4 c5.4 b4.6 d5.2 g#5.8 e5.12 r.4',
  },
  cave: {
    bpm: 84, chords: ['Dm', 'Dm', 'A#', 'A', 'Dm', 'Gm', 'A', 'A'], bass: 'drone', arp: true, drums: 'k...............', leadWave: 'triangle',
    lead: 'd5.8 a4.8 f5.6 e5.2 d5.8 f5.8 d5.4 a#4.4 c#5.12 e5.4 d5.4 f5.4 a5.8 g5.6 f5.2 d5.8 e5.4 c#5.4 a4.8 r.16',
  },
  hearth: {
    bpm: 88, chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'], bass: 'walk', arp: true, leadWave: 'triangle',
    lead: 'e5.4 g5.4 c6.8 a5.4 g5.4 e5.8 f5.4 a5.4 c6.4 a5.4 g5.12 r.4 e5.4 g5.4 c6.6 d6.2 e6.4 c6.4 a5.8 f5.4 a5.4 d6.4 c6.4 b5.8 g5.8',
  },
  battle: { bpm: 150, chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'], bass: 'gallop', arp: true, drums: 'k.hkskh.k.hkskhs', lead: battleLead },
  trainer: { bpm: 156, chords: ['Em', 'C', 'D', 'B', 'Em', 'C', 'Am', 'B'], bass: 'gallop', arp: true, drums: 'k.hkskh.kkhkskhs', lead: battleLead, transpose: 2 },
  warden: {
    bpm: 160, chords: ['Cm', 'G#', 'A#', 'G', 'Cm', 'G#', 'Fm', 'G'], bass: 'gallop', arp: true, drums: 'kkhkskhkkkhksksk',
    lead: 'c5.2 d#5.2 g5.4 c6.4 a#5.2 g5.2 g#5.4 g5.2 d#5.2 c5.8 a#5.2 a#5.2 d6.4 f6.4 d6.2 a#5.2 b5.8 d6.4 g6.4 c6.2 g5.2 d#5.2 c5.2 d#5.2 g5.2 c6.4 c6.4 g#5.4 d#5.4 c5.4 f5.2 g#5.2 c6.4 d#6.4 c6.2 g#5.2 g5.4 b5.4 d6.4 f6.4',
  },
  veil: {
    bpm: 140, chords: ['Bm', 'G', 'A', 'F#'], bass: 'gallop', arp: true, drums: 'k.hsk.hsk.hsk.ss',
    lead: 'b4.2 d5.2 f#5.2 b5.2 a#5.4 f#5.4 g5.4 f#5.2 d5.2 b4.8 c#5.2 e5.2 a5.4 g5.2 f#5.2 e5.4 f#5.8 a#5.8',
  },
  victory: {
    bpm: 140, chords: ['C', 'G', 'F', 'G'], bass: 'pulse', arp: true, drums: 'k.h.s.h.k.h.s.h.',
    lead: 'c5.2 e5.2 g5.2 c6.6 g5.2 c6.2 d6.4 e6.4 g6.8 f6.4 e6.4 d6.4 c6.4 d6.8 g5.8',
  },
  ending: {
    bpm: 84, chords: ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], bass: 'walk', arp: true, leadWave: 'triangle',
    lead: 'f#5.4 a5.4 d6.8 c#6.4 a5.4 e5.8 d5.4 f#5.4 b5.6 a5.2 g5.12 r.4 f#5.4 a5.4 d6.4 f#6.4 e6.6 c#6.2 a5.8 b5.4 a5.4 g5.4 b5.4 a5.16',
  },
};

const NOTE: Record<string, number> = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6, g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };

/** "f#5" -> MIDI number. */
export function noteToMidi(n: string): number {
  const m = /^([a-g]#?)(\d)$/.exec(n.toLowerCase());
  if (!m) throw new Error(`Bad note ${n}`);
  return 12 * (Number(m[2]) + 1) + NOTE[m[1]];
}

export interface NoteEvent { step: number; midi: number; len: number }

export function parseLead(lead: string): { notes: NoteEvent[]; steps: number } {
  let step = 0;
  const notes: NoteEvent[] = [];
  for (const tok of lead.trim().split(/\s+/)) {
    const [n, l] = tok.split('.');
    const len = Number(l);
    if (n !== 'r') notes.push({ step, midi: noteToMidi(n), len });
    step += len;
  }
  return { notes, steps: step };
}

/** Chord name -> MIDI notes of a root-position triad around octave 3. */
export function chordNotes(name: string): number[] {
  const m = /^([A-G]#?)(m?)$/.exec(name);
  if (!m) throw new Error(`Bad chord ${name}`);
  const root = 48 + NOTE[m[1].toLowerCase()];
  return [root, root + (m[2] ? 3 : 4), root + 7];
}
