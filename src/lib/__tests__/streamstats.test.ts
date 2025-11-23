import { describe, expect, it } from 'vitest';
import { bufferPointSquare, computeAreaSqMeters } from '../utils/geometry';

describe('geometry helpers', () => {
  it('computes area for simple polygons and multipolygons', () => {
    const square = bufferPointSquare(40, -80, 500);
    const area = computeAreaSqMeters(square);
    expect(area).toBeGreaterThan(0);
    expect(area).toBeLessThan(5_000_000);
  });

  it('ignores invalid geometries safely', () => {
    const broken = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: null, properties: {} }] } as any;
    const area = computeAreaSqMeters(broken);
    expect(area).toBe(0);
  });
});
