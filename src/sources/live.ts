export type AmbientWeather = {
  temperatureC: number;
  humidityPercent: number;
  observedAt: string;
  status: 'live' | 'cached' | 'sample';
  message?: string;
};

export type RoadRoute = {
  distanceKm: number;
  durationHours: number;
  status: 'live' | 'cached' | 'sample';
  message?: string;
};

type CachedValue<T> = { savedAt: number; value: T };
type WeatherPayload = { current?: { temperature_2m?: unknown; relative_humidity_2m?: unknown; time?: unknown } };
type RoutePayload = { code?: unknown; routes?: Array<{ distance?: unknown; duration?: unknown }> };

const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;
const ROUTE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
let lastRoadRequestAt = 0;
const lastWeatherRequestAt = new Map<string, number>();

function readCache<T>(key: string): CachedValue<T> | undefined {
  try {
    const cached: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null');
    if (cached && typeof cached === 'object' && typeof (cached as CachedValue<T>).savedAt === 'number' && 'value' in cached) {
      return cached as CachedValue<T>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function writeCache<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Live data is still usable when browser storage is unavailable.
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchAmbientWeather(
  latitude: number,
  longitude: number,
  fallback: Pick<AmbientWeather, 'temperatureC' | 'humidityPercent'>,
  forceRefresh = false,
): Promise<AmbientWeather> {
  const cacheKey = `cold-chain-open-meteo:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  const cached = readCache<AmbientWeather>(cacheKey);
  if (cached && !forceRefresh && Date.now() - cached.savedAt < WEATHER_CACHE_TTL_MS) {
    return { ...cached.value, status: 'cached' };
  }
  if (forceRefresh && Date.now() - (lastWeatherRequestAt.get(cacheKey) ?? 0) < 60_000) {
    return cached
      ? { ...cached.value, status: 'cached', message: 'Weather refresh is limited to once per minute for this location.' }
      : { ...fallback, observedAt: new Date().toISOString(), status: 'sample', message: 'Weather refresh is limited to once per minute for this location.' };
  }
  lastWeatherRequestAt.set(cacheKey, Date.now());

  try {
    // Open-Meteo current weather API: https://open-meteo.com/en/docs
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m',
      timezone: 'auto',
    }).toString();
    const payload = await fetchJson<WeatherPayload>(url.toString());
    const temperatureC = payload.current?.temperature_2m;
    const humidityPercent = payload.current?.relative_humidity_2m;
    if (typeof temperatureC !== 'number' || !Number.isFinite(temperatureC)
      || typeof humidityPercent !== 'number' || !Number.isFinite(humidityPercent)) {
      throw new Error('Open-Meteo returned an incomplete current observation.');
    }
    const result: AmbientWeather = {
      temperatureC,
      humidityPercent,
      observedAt: typeof payload.current?.time === 'string' ? payload.current.time : new Date().toISOString(),
      status: 'live',
    };
    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Weather request failed.';
    if (cached) return { ...cached.value, status: 'cached', message };
    return {
      ...fallback,
      observedAt: new Date().toISOString(),
      status: 'sample',
      message: `${message} Showing the lot's existing sample ambient values.`,
    };
  }
}

export async function fetchRoadRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  fallback: Pick<RoadRoute, 'distanceKm' | 'durationHours'>,
): Promise<RoadRoute> {
  const cacheKey = `cold-chain-osrm:${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}:${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
  const cached = readCache<RoadRoute>(cacheKey);
  if (cached && Date.now() - cached.savedAt < ROUTE_CACHE_TTL_MS) {
    return { ...cached.value, status: 'cached' };
  }

  if (Date.now() - lastRoadRequestAt < 60_000) {
    return cached
      ? { ...cached.value, status: 'cached', message: 'Road-route refresh is limited to one request per minute in this browser.' }
      : {
        ...fallback,
        status: 'sample',
        message: 'Road-route refresh is limited to one request per minute in this browser. Showing the existing modeled route estimate.',
      };
  }
  lastRoadRequestAt = Date.now();

  try {
    // OSRM route API on OpenStreetMap road data: https://project-osrm.org/docs/v5.24.0/api/
    const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const payload = await fetchJson<RoutePayload>(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&steps=false`);
    const route = payload.code === 'Ok' ? payload.routes?.[0] : undefined;
    if (typeof route?.distance !== 'number' || !Number.isFinite(route.distance)
      || typeof route.duration !== 'number' || !Number.isFinite(route.duration)) {
      throw new Error('OSRM did not return a road route for these points.');
    }
    const result: RoadRoute = {
      distanceKm: route.distance / 1000,
      durationHours: route.duration / 3600,
      status: 'live',
    };
    writeCache(cacheKey, result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Road-routing request failed.';
    if (cached) return { ...cached.value, status: 'cached', message };
    return {
      ...fallback,
      status: 'sample',
      message: `${message} Showing the existing modeled route estimate.`,
    };
  }
}
