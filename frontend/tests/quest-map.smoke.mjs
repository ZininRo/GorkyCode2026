import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { chromium, devices } from 'playwright';

const origin = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const base = `${origin}/api/v1`;
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  proxy: process.env.BROWSER_PROXY ? { server: process.env.BROWSER_PROXY, bypass: 'localhost,127.0.0.1' } : undefined,
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const errors = [];
const ignoreHTTPSErrors = process.env.BROWSER_IGNORE_HTTPS_ERRORS === '1';
const check = async (response, expected) => {
  assert.equal(response.status(), expected, (await response.text()).slice(0, 500));
  return response.json();
};

try {
  const mobile = await browser.newContext({
    ...devices['Pixel 7'],
    ignoreHTTPSErrors,
    geolocation: { latitude: 56.32370, longitude: 44.00200, accuracy: 10 },
    permissions: ['geolocation'],
  });
  const auth = await check(await mobile.request.post(`${base}/auth/register`, {
    headers: { Origin: origin },
    data: {
      displayName: 'Map smoke', cityId: await mobile.request.get(`${base}/cities?query=Нижний`)
        .then(r => check(r, 200)).then(r => r.items.find(x => x.name === 'Нижний Новгород')?.id),
      email: `map-${randomUUID()}@example.com`, password: 'StrongPass123!',
    },
  }), 201);
  assert((await mobile.cookies()).some(cookie => cookie.name === 'refresh_token' && cookie.httpOnly));
  const apiHeaders = { Authorization: `Bearer ${auth.accessToken}` };
  const mapPath = `${base}/checkpoints?bbox=43.98,56.31,44.02,56.35`;
  await check(await mobile.request.get(mapPath), 401);
  await check(await mobile.request.get(`${base}/checkpoints?bbox=0,0,NaN,1`, { headers: apiHeaders }), 400);
  const initial = await check(await mobile.request.get(mapPath, { headers: apiHeaders }), 200);
  assert(initial.items.some(cp => cp.status === 'AVAILABLE'));
  assert(initial.items.some(cp => cp.status === 'LOCKED'));
  assert.equal(initial.truncated, false);
  const legacy = await check(await mobile.request.get(`${base}/checkpoints`, { headers: apiHeaders }), 200);
  assert(legacy.items.every(cp => cp.routeId === 'main'));
  const locked = await check(await mobile.request.get(`${base}/checkpoints/cp_g02`, { headers: apiHeaders }), 200);
  assert.equal(locked.checkpoint.status, 'LOCKED');
  assert.equal(locked.hint, null);
  assert.equal(locked.placeCard, null);
  const summary = await check(await mobile.request.get(`${base}/game?includeCheckpoints=false`, { headers: apiHeaders }), 200);
  assert.equal(summary.demoMode, false, 'Run this smoke test using the normal non-demo deployment');
  assert.deepEqual(summary.checkpoints, []);
  const claim = data => mobile.request.post(`${base}/checkpoints/cp_y01/collect`, { headers: apiHeaders, data });
  assert.equal((await check(await claim({ lat: 56.28, lng: 44, accuracyMeters: 10 }), 403)).error.code, 'TOO_FAR');
  assert.equal((await check(await claim({ lat: 56.3237, lng: 44.002, accuracyMeters: 999 }), 422)).error.code, 'GPS_INACCURATE');

  const page = await mobile.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const mapData = page.waitForResponse(r => r.url().includes('/checkpoints?bbox=') && r.status() === 200);
  const firstTile = process.env.CHECK_BASEMAP !== '0'
    ? page.waitForResponse(r => r.url().includes('tiles.openfreemap.org/planet/') && r.url().endsWith('.pbf') && r.ok())
    : null;
  await page.goto(`${origin}/game`);
  await mapData;
  await page.locator('.maplibregl-canvas').waitFor();
  if (firstTile) {
    await firstTile;
    await page.getByRole('link', { name: 'OpenStreetMap', exact: true }).waitFor();
  }
  const zoomed = page.waitForResponse(r => r.url().includes('/checkpoints?bbox=') && r.ok());
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await zoomed;
  const centered = page.waitForResponse(r => {
    if (!r.url().includes('/checkpoints?bbox=') || !r.ok()) return false;
    const [west, south, east, north] = new URL(r.url()).searchParams.get('bbox').split(',').map(Number);
    return Math.abs((west + east) / 2 - 44.002) < 0.0002
      && Math.abs((south + north) / 2 - 56.32370) < 0.0002;
  });
  await page.getByRole('button', { name: /Моё местоположение|My location/ }).click();
  await page.getByText(/Ближайшие доступные точки|Nearest available points/).waitFor();
  await centered;
  const canvas = page.locator('.maplibregl-canvas');
  const { width, height } = await canvas.boundingBox();
  const heading = page.getByRole('heading', { name: /Большая Покровская|Bolshaya Pokrovskaya/ });
  for (let attempt = 0; attempt < 4 && !await heading.isVisible(); attempt++) {
    await canvas.click({ position: { x: width / 2, y: height / 2 } });
    await heading.waitFor({ timeout: 800 }).catch(() => {});
  }
  await heading.waitFor({ timeout: 3000 });
  const candidate = page.getByRole('region', { name: /Точки в области карты|Points in the map area/ })
    .getByRole('button', { name: /Большая Покровская|Bolshaya Pokrovskaya/ });
  await candidate.click();
  await page.getByRole('article').getByText(/Прогуляйтесь по пешеходной|Visit the pedestrian street/).waitFor();
  await page.getByRole('link', { name: /Детали квеста|Quest details/ }).click();
  assert.match(page.url(), /\/game\/cp_y01$/);
  await page.reload();
  await page.getByRole('heading', { name: /Большая Покровская|Bolshaya Pokrovskaya/ }).waitFor();
  await page.getByRole('button', { name: /^(Собрать|Collect)$/ }).click();
  await page.getByRole('dialog').waitFor();
  const duplicate = await check(await claim({ lat: 56.3237, lng: 44.002, accuracyMeters: 10 }), 200);
  assert.equal(duplicate.alreadyCollected, true);
  assert.equal(duplicate.pointsAwarded, 0);
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('article').getByText(/^(Собран|Collected)$/).waitFor();
  await mobile.setGeolocation({ latitude: 56.32370, longitude: 44.00200, accuracy: 300 });
  await page.getByRole('button', { name: /Моё местоположение|My location/ }).click();
  await page.getByText(/Точность GPS около 300|GPS accuracy is about 300/).waitFor();

  const denied = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors });
  await denied.addCookies(await mobile.cookies());
  await denied.addInitScript(() => {
    let calls = 0;
    Object.defineProperty(window, 'gpsSmokeCalls', { get: () => calls });
    navigator.geolocation.getCurrentPosition = (_success, fail) => {
      calls++;
      fail({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3 });
    };
  });
  const desktop = await denied.newPage();
  desktop.on('pageerror', error => errors.push(error.message));
  await desktop.route('**/api/v1/checkpoints?bbox=*', route => route.fulfill({ status: 503, json: {} }));
  await desktop.goto(`${origin}/game`);
  await desktop.getByRole('button', { name: /Моё местоположение|My location/ }).waitFor();
  assert.equal(await desktop.evaluate(() => window.gpsSmokeCalls), 0);
  await desktop.getByRole('button', { name: /Моё местоположение|My location/ }).click();
  await desktop.getByRole('alert').getByText(/Разрешите геолокацию|Please allow location access/).waitFor();
  const retry = desktop.getByRole('button', { name: /Повторить|Retry/ });
  await retry.waitFor();
  await desktop.unroute('**/api/v1/checkpoints?bbox=*');
  await retry.click();
  await desktop.getByRole('region', { name: /Точки в области карты|Points in the map area/ })
    .getByRole('button', { name: /Большая Покровская|Bolshaya Pokrovskaya/ }).waitFor();
  const map = desktop.locator('.maplibregl-canvas');
  await map.waitFor();
  assert((await map.boundingBox()).width > 600, 'Desktop map uses the wide layout');
  assert.deepEqual(errors, []);
  console.log('Quest map smoke passed (mobile and desktop, authenticated API, GPS, API failure and rewards)');
} finally {
  await browser.close();
}
