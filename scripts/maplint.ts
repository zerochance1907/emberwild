import { MAPS } from '../src/data/maps';
for (const m of Object.values(MAPS)) {
  const w = m.rows[0].length;
  m.rows.forEach((r, y) => { if (r.length !== w) console.log(m.id, 'row', y, 'len', r.length, 'expected', w, JSON.stringify(r)); });
}
