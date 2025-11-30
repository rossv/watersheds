
import { describe, it, expect } from 'vitest';
import { parseRainfallCSV } from '../services/noaa';

describe('NOAA Parsing', () => {
    it('parses clean header correctly', () => {
        const csv = `
    Average recurrence interval (ARI) (years): 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000
    24-hr: 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0
    `;
        const parsed = parseRainfallCSV(csv);
        expect(parsed).not.toBeNull();
        expect(parsed?.aris).toEqual(['1', '2', '5', '10', '25', '50', '100', '200', '500', '1000']);
        const row = parsed?.rows.find(r => r.label === '24-hr');
        expect(row?.values['10']).toBe(3.5);
    });

    it('parses header with extra numbers correctly', () => {
        const csv = `
    Average recurrence interval (ARI) with 90% confidence intervals (years): 1, 2, 5, 10, 25, 50, 100
    24-hr: 2.0, 2.5, 3.0, 3.5, 4.0, 5.0, 6.0
    `;
        const parsed = parseRainfallCSV(csv);

        expect(parsed?.aris).not.toContain('90');
        expect(parsed?.aris).toEqual(['1', '2', '5', '10', '25', '50', '100']);
        const row = parsed?.rows.find(r => r.label === '24-hr');
        expect(row?.values['10']).toBe(3.5);
    });

    it('parses header with many extra numbers (Pittsburgh simulation)', () => {
        // Simulated header with dates, times, and other numbers that could be mistaken for ARIs
        const csv = `
    POINT PRECIPITATION FREQUENCY ESTIMATES
    Sanja Perica, Sarah Dietz, Sarah Heim, Lillian Hiner, Kazungu Maitaria, Deborah Martin, Sandra Pavlovic, Ishani Roy, Carl Trypaluk, Dale Unruh, Fenglin Yan, Michael Yekta, Tan Zhao, Geoffrey Bonnin, Daniel Brewer, Li-Chuan Chen, Tye Parzybok, John Yarchoan
    NOAA, National Weather Service, Silver Spring, Maryland
    PF tabular | PF graphical | Maps & aerials
    PF tabular
    PDS-based depth-duration-frequency (DDF) curves
    Latitude: 40.4400°, Longitude: -79.9900°
    Datum: NAD 83
    Date/Time (UTC): 27-Nov-2025 20:00:00
    
    Average recurrence interval (ARI) (years): 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000
    5-min: 0.35, 0.42, 0.50, 0.57, 0.66, 0.73, 0.81, 0.89, 0.99, 1.07
    10-min: 0.54, 0.64, 0.76, 0.86, 0.99, 1.10, 1.21, 1.33, 1.48, 1.60
    24-hr: 2.0, 2.5, 3.3, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0
    `;
        const parsed = parseRainfallCSV(csv);

        expect(parsed?.aris).toEqual(['1', '2', '5', '10', '25', '50', '100', '200', '500', '1000']);
        const row = parsed?.rows.find(r => r.label === '24-hr');
        expect(row?.values['10']).toBe(4.0);
    });

    it('parses header with dates', () => {
        const csv = `
    POINT PRECIPITATION FREQUENCY ESTIMATES
    Date/Time (UTC): 27-Nov-2025 20:00:00
    Average recurrence interval (ARI) (years): 1, 2, 5, 10, 25, 50, 100, 200, 500, 1000
    24-hr: 2.83, 3.53, 4.59, 5.48, 6.81, 7.96, 9.22, 10.61, 12.64, 14.34
    `;
        const parsed = parseRainfallCSV(csv);
        const row = parsed?.rows.find(r => r.label === '24-hr');
        expect(row?.values['10']).toBe(5.48);
    });
});
