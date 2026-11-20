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
const email = `guided-${randomUUID()}@example.com`;
const password = 'StrongPass123!';
const stops = [
  { name: 'Нижегородский кремль', latitude: 56.32694, longitude: 44.00582 },
  { name: 'Чкаловская лестница', latitude: 56.33047, longitude: 44.00944 },
  { name: 'Рождественская улица', latitude: 56.32872, longitude: 43.98975 },
  { name: 'Стрелка', latitude: 56.33451, longitude: 43.97702 },
];
const errors = [];

try {
  const mobile = await browser.newContext({
    ...devices['Pixel 7'], locale: 'ru-RU', permissions: ['geolocation'],
    geolocation: { latitude: stops[0].latitude, longitude: stops[0].longitude, accuracy: 10 },
  });
  const page = await mobile.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.getByRole('heading', { name: /Город ждёт/ }).waitFor();
  await page.getByRole('button', { name: 'Концерты', exact: true }).click();
  await page.getByRole('link', { name: /Концерт на Стрелке/ }).click();
  await page.getByRole('link', { name: 'Открыть афишу' }).waitFor();
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('dialog', { name: 'Меню' }).getByRole('link', { name: 'Создать профиль' }).click();
  await page.getByLabel('Имя', { exact: true }).fill('Guided smoke');
  await page.getByLabel('Электронная почта').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('combobox', { name: 'Город' }).fill('нижний');
  await page.getByRole('option', { name: 'Нижний Новгород', exact: true }).click();
  const registered = page.waitForResponse(r => r.url().endsWith('/auth/register') && r.status() === 201);
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  const { accessToken } = await registered.then(r => r.json());
  const headers = { Authorization: `Bearer ${accessToken}` };
  const request = (path, data) => mobile.request.post(`${base}/guided/ghosts${path}`, { headers, data });
  assert.equal((await mobile.request.get(`${base}/guided`)).status(), 401);
  assert.equal((await mobile.request.post(`${base}/guided/merchants/start`, { headers })).status(), 403);

  await page.getByRole('link', { name: 'Начать квест', exact: true }).click();
  await page.getByRole('button', { name: 'Начать', exact: true }).click();
  await page.getByRole('heading', { name: 'Призраки шепчут' }).waitFor();
  assert.equal(await page.locator('.map-marker').count(), 1);
  const position = { lat: stops[0].latitude, lng: stops[0].longitude, accuracyMeters: 10 };
  assert.equal((await request('/stops/1/collect', position)).status(), 409);
  assert.equal((await request('/stops/0/collect', { ...position, lat: 56.25 })).status(), 403);

  for (const [index, stop] of stops.entries()) {
    await mobile.setGeolocation({ latitude: stop.latitude, longitude: stop.longitude, accuracy: 10 });
    await page.getByRole('button', { name: 'Собрать кристалл' }).click();
    let fact = page.getByRole('dialog', { name: stop.name, exact: true });
    await fact.waitFor();
    if (index === 0) {
      assert.equal((await request('/stops/1/collect', position)).status(), 409);
      await page.reload();
      await page.getByRole('button', { name: 'Открыть факт' }).click();
      fact = page.getByRole('dialog', { name: stop.name, exact: true });
    }
    await fact.getByRole('button', { name: 'Продолжить', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Как вам это место?' });
    const next = modal.getByRole('button', { name: index === 3 ? 'Завершить квест' : 'Следующая точка' });
    assert(await next.isDisabled());
    await modal.getByRole('button', { name: 'Интересно' }).click();
    await next.click();
    await modal.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.map-marker').count(), Math.min(index + 2, stops.length));
  }

  const style = page.waitForResponse(r => r.url().endsWith('/maps/nizhny-rpg.json') && r.ok());
  await page.getByRole('button', { name: 'Улицы' }).click();
  await style;
  await page.locator('.maplibregl-canvas').waitFor();
  await page.getByRole('button', { name: 'Пиксельная' }).click();
  await page.getByRole('link', { name: 'Посмотреть историю' }).click();
  await page.getByText('Призраки шепчут', { exact: true }).click();
  assert.equal(await page.locator('.visited-list article').count(), 4);

  const desktop = await browser.newContext({ viewport: { width: 1320, height: 850 }, locale: 'ru-RU' });
  const other = await desktop.newPage();
  other.on('pageerror', error => errors.push(error.message));
  await other.goto(`${origin}/login`);
  await other.getByLabel('Электронная почта').fill(email);
  await other.locator('input[type="password"]').fill(password);
  await other.getByRole('main').getByRole('button', { name: 'Войти', exact: true }).click();
  await other.getByRole('navigation', { name: 'Разделы сайта' }).getByRole('link', { name: 'Профиль', exact: true }).click();
  await other.getByText('80', { exact: true }).waitFor();
  await other.getByText('Исследователь', { exact: true }).waitFor();
  const snapshot = await mobile.request.get(`${base}/guided`, { headers }).then(r => r.json());
  assert.equal(snapshot.active, null);
  assert.equal(snapshot.routes.ghosts.length, 4);
  assert(snapshot.routes.ghosts.every(visit => visit.reaction === 'interesting'));
  assert.deepEqual(snapshot.coordinates.kremlin, [position.lat, position.lng]);
  assert.deepEqual(errors, []);
  console.log('Guided quest smoke passed (server registration, GPS and ordering, reaction persistence, both maps, mobile and desktop).');
} finally {
  await browser.close();
}
