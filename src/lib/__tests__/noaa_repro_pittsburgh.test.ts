
import { describe, it } from 'vitest';
import { parseRainfallCSV } from '../services/noaa';

describe('NOAA Pittsburgh Repro', () => {
    it('fetches and parses Pittsburgh data', async () => {
        const lat = 40.44;
        const lon = -79.99;

        const urls = [
            `https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/fe_text_read.p?lat=${lat}&lon=${lon}&data=depth&units=english&series=pds`,
            `https://hdsc.nws.noaa.gov/cgi-bin/new/fe_text_read.p?lat=${lat}&lon=${lon}&data=depth&units=english&series=pds`,
            `https://hdsc.nws.noaa.gov/hdsc/new/fe_text_read.p?lat=${lat}&lon=${lon}&data=depth&units=english&series=pds`,
            // Try via proxy service directly as fallback
            `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://hdsc.nws.noaa.gov/cgi-bin/hdsc/new/fe_text_read.p?lat=${lat}&lon=${lon}&data=depth&units=english&series=pds`)}`
        ];

        for (const url of urls) {
            console.log('Trying URL:', url);
            try {
                const res = await fetch(url, {
                    headers: {
                        'Accept': 'text/plain, text/csv, text/html;q=0.8, */*;q=0.5',
                        'Origin': 'https://example.org', // Mock origin
                        'X-Requested-With': 'fetch',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                if (!res.ok) {
                    console.log(`Failed with status ${res.status}`);
                    continue;
                }
                const text = await res.text();
                console.log('--- RAW RESPONSE START ---');
                console.log(text.slice(0, 500)); // Log start
                console.log('--- RAW RESPONSE END ---');

                if (text.includes('404 Not Found') || text.includes('<title>404')) {
                    console.log('Response contains 404 text');
                    continue;
                }

                const parsed = parseRainfallCSV(text);
                console.log('--- PARSED DATA ---');
                console.log(JSON.stringify(parsed, null, 2));

                if (parsed) {
                    const row24h = parsed.rows.find(r => r.label === '24-hr');
                    if (row24h) {
                        console.log('24-hr row:', row24h);
                        console.log('10-year 24-hr value:', row24h.values['10']);
                    } else {
                        console.log('24-hr row NOT FOUND');
                    }
                    // If we found data, stop trying URLs
                    return;
                } else {
                    console.log('Parsed result is NULL');
                }
            } catch (e) {
                console.error('Fetch error:', e);
            }
        }
    }, 60000);
});
