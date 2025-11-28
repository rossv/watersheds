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
      outlet: 'Out1',
      cn: 70
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

    // Check OPTIONS
    expect(txt).toContain('[OPTIONS]');
    expect(txt).toContain('INFILTRATION\tCURVE_NUMBER');
    expect(txt).toContain('FLOW_UNITS\tCFS');

    // Check SUBAREAS
    expect(txt).toContain('[SUBAREAS]');
    const subareasIndex = lines.indexOf('[SUBAREAS]');
    const subareasLine = lines[subareasIndex + 2]; // Skip header
    expect(subareasLine).toBeDefined();
    const parts = subareasLine.split(/\s+/);
    // Expecting at least 7 parts (Sub, N-Imp, N-Perv, S-Imp, S-Perv, PctZero, RouteTo)
    expect(parts.length).toBeGreaterThanOrEqual(7);
    expect(parts[6]).toBe('OUTLET'); // RouteTo

    // Check INFILTRATION
    expect(txt).toContain('[INFILTRATION]');
    const infiltrationIndex = lines.indexOf('[INFILTRATION]');
    const infiltrationLine = lines[infiltrationIndex + 2]; // Skip header
    expect(infiltrationLine).toBeDefined();
    expect(infiltrationLine).toContain('70'); // CN
  });
});
