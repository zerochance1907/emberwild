import { describe, expect, it } from 'vitest';
import { TRACKS, chordNotes, noteToMidi, parseLead } from '../src/audio/tracks';

describe('music data', () => {
  it('parses notes', () => {
    expect(noteToMidi('a4')).toBe(69);
    expect(noteToMidi('c#5')).toBe(73);
    expect(chordNotes('Am')).toEqual([57, 60, 64]);
  });
  for (const [id, t] of Object.entries(TRACKS)) {
    it(`${id}: melody length matches its chord progression`, () => {
      const { steps } = parseLead(t.lead);
      expect(steps).toBe(t.chords.length * 16);
      for (const c of t.chords) expect(chordNotes(c)).toHaveLength(3);
      if (t.drums) expect(t.drums.length).toBe(16);
    });
  }
});
