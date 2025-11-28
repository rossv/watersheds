import { describe, it, expect } from 'vitest';
import { fetchWatershed } from '../services/streamstats';

describe('StreamStats Manual Test', () => {
    it('should fetch a watershed for a known location', async () => {
        // Pittsburgh, PA
        const lat = 40.4406;
        const lon = -79.9959;

        try {
            console.log(`Fetching watershed for ${lat}, ${lon}...`);
            const watershed = await fetchWatershed({ lat, lon, rcode: "PA" });
            console.log('Watershed fetched successfully!');
            console.log('Feature count:', watershed.features.length);
            expect(watershed).toBeDefined();
            expect(watershed.type).toBe('FeatureCollection');
            expect(watershed.features.length).toBeGreaterThan(0);
        } catch (err) {
            console.error('Failed to fetch watershed:', err);
            throw err;
        }
    }, 60000); // Long timeout for network request
});
