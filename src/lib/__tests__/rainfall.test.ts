import { describe, expect, it } from 'vitest';
import { parseRainfallCSV } from '../rainfall';

describe('parseRainfallCSV', () => {
  it('parses NOAA rainfall CSV data into a structured table', () => {
    const csv = `
    Some Header,ARI (years) 2 10 100
    5 min: 1.10 1.45 1.95
    1 hr: 2.51 3.12 3.95
    24 hr: 5.30 6.42 7.88
    `;

    const table = parseRainfallCSV(csv);
    expect(table).not.toBeNull();
    expect(table?.aris).toEqual(['2', '10', '100']);
    expect(table?.rows).toHaveLength(3);
    expect(table?.rows[1]).toEqual({
      label: '1 hr',
      values: {
        '2': 2.51,
        '10': 3.12,
        '100': 3.95
      }
    });
  });

  it('ignores rows without valid durations and preserves NaN placeholders', () => {
    const csv = `
    Header,ARI (years) 5 25
    Notes: dataset information
    30 min: 1.25 1.75
    weird row without delimiter
    1 day: 3.5
    `;

    const table = parseRainfallCSV(csv);
    expect(table).not.toBeNull();
    expect(table?.rows).toHaveLength(2);
    const dayRow = table?.rows.find((row) => row.label === '1 day');
    expect(dayRow).toBeDefined();
    expect(dayRow?.values['5']).toBe(3.5);
    expect(Number.isNaN(dayRow?.values['25'] ?? NaN)).toBe(true);
  });

  it('returns null for CSV content without ARI header or duration rows', () => {
    const noHeader = 'Duration,Depth';
    const noRows = `
    Something,ARI (years) 2 5
    foo,bar
    `;

    expect(parseRainfallCSV(noHeader)).toBeNull();
    expect(parseRainfallCSV(noRows)).toBeNull();
  });
});
