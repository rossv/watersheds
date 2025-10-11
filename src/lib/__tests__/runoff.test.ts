import { describe, expect, it } from 'vitest';
import {
  computeRationalPeak,
  computeRunoff,
  computeRunoffDepthCN,
  computeRunoffVolume
} from '../runoff';

describe('runoff computations', () => {
  it('computes runoff depth using the NRCS curve number method', () => {
    const depth = computeRunoffDepthCN(5, 75);
    const S = 1000 / 75 - 10;
    const Ia = 0.2 * S;
    const expected = ((5 - Ia) * (5 - Ia)) / (5 - Ia + S);
    expect(depth).toBeCloseTo(expected, 6);
  });

  it('returns zero runoff for invalid curve numbers or rainfall below abstraction', () => {
    expect(computeRunoffDepthCN(0.5, 75)).toBe(0);
    expect(computeRunoffDepthCN(5, 0)).toBe(0);
    expect(computeRunoffDepthCN(5, 150)).toBe(0);
    expect(computeRunoffDepthCN(-1, 80)).toBe(0);
    expect(computeRunoffDepthCN(Number.NaN, 80)).toBe(0);
  });

  it('returns full runoff when curve number is 100', () => {
    expect(computeRunoffDepthCN(2, 100)).toBe(2);
    expect(computeRunoffDepthCN(10, 100)).toBe(10);
  });

  it('computes runoff volume in acre-feet', () => {
    const volume = computeRunoffVolume(12, 1.5);
    expect(volume).toBeCloseTo(12 * (1.5 / 12));
  });

  it('computes rational peak discharge with unit conversion', () => {
    const peak = computeRationalPeak(3, 0.5, 2);
    expect(peak).toBeCloseTo(3 * 0.5 * 2 * 1.008);
  });

  it('returns zero peak discharge when inputs are not finite numbers', () => {
    expect(computeRationalPeak(Number.NaN, 0.5, 2)).toBe(0);
    expect(computeRationalPeak(2, Number.POSITIVE_INFINITY, 1)).toBe(0);
  });

  it('performs a complete runoff computation including derived coefficient', () => {
    const result = computeRunoff(4, 1.2, 80, 15);
    const expectedDepth = computeRunoffDepthCN(4, 80);
    const expectedVolume = computeRunoffVolume(15, expectedDepth);
    const expectedCoeff = expectedDepth / 4;

    expect(result).toEqual({
      runoffDepthIn: expectedDepth,
      runoffVolumeAcFt: expectedVolume,
      runoffCoefficient: expectedCoeff
    });
    expect(result.runoffVolumeAcFt).toBeGreaterThan(0);
    expect(result.runoffCoefficient).toBeGreaterThan(0);
  });

  it('handles missing intensity by omitting rational peak from computation', () => {
    const result = computeRunoff(3, null, 70, 5);
    expect(result.runoffDepthIn).toBeGreaterThan(0);
    expect(result.runoffVolumeAcFt).toBeGreaterThan(0);
    expect(result.runoffCoefficient).toBeGreaterThan(0);
  });
});
