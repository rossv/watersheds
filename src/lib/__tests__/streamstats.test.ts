import { describe, expect, it, vi } from 'vitest';
import { fetchWatershed } from '../services/streamstats';

const htmlError = new Response('<html>Proxy error</html>', {
  status: 502,
  headers: { 'content-type': 'text/html' }
});

const wrappedGeoJson = {
  contents: JSON.stringify({
    type: 'FeatureCollection',
    features: 'not-an-array'
  })
};

const wrappedResponse = new Response(JSON.stringify(wrappedGeoJson), {
  status: 200,
  headers: { 'content-type': 'application/json' }
});

describe('fetchWatershed', () => {
  it('falls back when the dev proxy returns HTML and surfaces a helpful error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(htmlError)
      .mockResolvedValueOnce(wrappedResponse);

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWatershed({ lat: 1, lon: 2 })).rejects.toThrow(
      /features array/i
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });
});
