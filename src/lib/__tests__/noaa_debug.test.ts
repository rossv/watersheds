
import { describe, it, expect } from 'vitest';
import { fetchTextThroughProxy, parseRainfallCSV } from '../services/noaa';

describe('NOAA Debug', () => {
    it('fetches and parses NOAA data correctly', async () => {
        // Central Park, NY
        const lat = 40.78;
        const lon = -73.97;

        const url = `https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/fe_text_read.p?lat=${lat}&lon=${lon}&data=depth&units=english&series=pds`;
        console.log('Fetching URL:', url);

        try {
            const text = await fetchTextThroughProxy(url);
            console.log('--- RAW RESPONSE START ---');
            console.log(text.slice(0, 2000)); // Log first 2000 chars
            console.log('--- RAW RESPONSE END ---');

            const parsed = parseRainfallCSV(text);
            console.log('--- PARSED DATA ---');
            console.log(JSON.stringify(parsed, null, 2));

            if (parsed) {
                const row24h = parsed.rows.find(r => r.label.includes('24-hr'));
                if (row24h) {
                    console.log('24-hr row:', row24h);
                    // Check 10-year value
                    const val10yr = row24h.values['10'];
                    console.log('10-year 24-hr value:', val10yr);
                }
            }
        } catch (e) {
            console.error('Fetch failed:', e);
        }
    }, 30000); // 30s timeout
});
