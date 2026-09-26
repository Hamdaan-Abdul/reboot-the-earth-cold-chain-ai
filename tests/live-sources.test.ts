import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAmbientWeather, fetchRoadRoute } from '../src/sources/live';

const stored = new Map<string, string>();

describe('external live data sources', () => {
  beforeEach(() => {
    stored.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uses a live Open-Meteo observation and caches it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      current: { temperature_2m: 38.2, relative_humidity_2m: 42, time: '2026-09-26T10:00' },
    }), { status: 200 })));

    const result = await fetchAmbientWeather(25.3, 51.5, { temperatureC: 39, humidityPercent: 40 });

    expect(result).toMatchObject({ temperatureC: 38.2, humidityPercent: 42, status: 'live' });
    expect(stored.size).toBe(1);
  });

  it('returns the explicit sample fallback when weather is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await fetchAmbientWeather(25.3, 51.5, { temperatureC: 39, humidityPercent: 40 });

    expect(result).toMatchObject({ temperatureC: 39, humidityPercent: 40, status: 'sample' });
    expect(result.message).toContain('offline');
  });

  it('uses the OSRM road route response and caches it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'Ok',
      routes: [{ distance: 12500, duration: 1800 }],
    }), { status: 200 })));

    const result = await fetchRoadRoute(
      { latitude: 25.3, longitude: 51.5 },
      { latitude: 25.4, longitude: 51.6 },
      { distanceKm: 10, durationHours: 1 },
    );

    expect(result).toMatchObject({ distanceKm: 12.5, durationHours: 0.5, status: 'live' });
  });
});
