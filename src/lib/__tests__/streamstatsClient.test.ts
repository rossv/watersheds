import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWatershed } from '../streamstatsClient';

const originalFetch = global.fetch;

describe('fetchWatershed proxy fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  it('falls back from dev proxy HTML error to AllOrigins and surfaces validation error', async () => {
    const proxyHtml = new Response('<html>proxy down</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' }
    });

    const allOriginsBody = {
      contents: JSON.stringify({ type: 'FeatureCollection', features: { not: 'an array' } })
    };

    const allOriginsResponse = new Response(JSON.stringify(allOriginsBody), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(proxyHtml)
      .mockResolvedValueOnce(allOriginsResponse);

    global.fetch = fetchMock as unknown as typeof fetch;

    const expectation = expect(fetchWatershed({ lat: 40, lon: -75 })).rejects.toThrow(/features array/i);
    await vi.runAllTimersAsync();

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('/streamstats-api/streamstatsservices/watershed.geojson');
    expect(String(fetchMock.mock.calls[1][0])).toContain('api.allorigins.win/get');
  });
});
