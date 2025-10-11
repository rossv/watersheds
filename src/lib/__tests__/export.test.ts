import { describe, expect, it } from 'vitest';
import { formatSwmmInp, type SwmmSubcatchment } from '../export';

describe('formatSwmmInp', () => {
  it('includes an outfall definition and a complete subcatchment row', () => {
    const sub: SwmmSubcatchment = {
      name: 'S1',
      areaAc: 2.5,
      pctImperv: 35.2,
      width: 400,
      slope: 0.015,
      outlet: 'Out1'
    };

    const txt = formatSwmmInp(sub);
    expect(txt).toContain('[OUTFALLS]');

    const lines = txt.split('\n');
    const subcatchmentRow = lines.find((line) => line.startsWith(`${sub.name}\t`));
    expect(subcatchmentRow).toBe(
      `${sub.name}\tRG1\t${sub.outlet}\t${sub.areaAc.toFixed(3)}\t${sub.pctImperv.toFixed(1)}\t${sub.width.toFixed(1)}\t${sub.slope.toFixed(3)}\t0\t0`
    );

    const outfallsIndex = lines.indexOf('[OUTFALLS]');
    expect(outfallsIndex).toBeGreaterThan(-1);
    const outfallRow = lines[outfallsIndex + 2];
    expect(outfallRow).toBe(`${sub.outlet}\t0\tFREE\t\tNO\t`);
  });
});
