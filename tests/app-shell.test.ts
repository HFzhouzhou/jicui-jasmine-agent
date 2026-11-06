import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp, type AppOptions } from '../server/index.js';
import { loadConfig } from '../server/config.js';

async function setup(t: TestContext, config: AppOptions['config'] = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'jasmine-app-'));
  const app = createApp({databasePath: join(dir, 'test.sqlite'), config: {apiKey: '', adminToken: '', rateLimit: 100, staticDir: join(dir, 'missing'), ...config}});
  const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {const listener = app.listen(0, '127.0.0.1', () => resolve(listener));});
  t.after(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); app.locals.close(); rmSync(dir, {recursive: true, force: true}); });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

test('native app origins get CORS on the API; other origins and non-API paths do not', async t => {
  const origin = await setup(t);
  const preflight = await fetch(`${origin}/api/orders/quote`, {method: 'OPTIONS', headers: {Origin: 'https://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-customer-id'}});
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://localhost');
  assert.match(preflight.headers.get('access-control-allow-headers') || '', /X-Customer-Id/);
  const ios = await fetch(`${origin}/api/menu`, {headers: {Origin: 'capacitor://localhost'}});
  assert.equal(ios.headers.get('access-control-allow-origin'), 'capacitor://localhost');
  const stranger = await fetch(`${origin}/api/menu`, {headers: {Origin: 'https://evil.example'}});
  assert.equal(stranger.status, 200); assert.equal(stranger.headers.get('access-control-allow-origin'), null);
  const same = await fetch(`${origin}/api/menu`);
  assert.equal(same.headers.get('access-control-allow-origin'), null, 'same-origin web requests are unchanged');
});

test('app version endpoint reports the configured release', async t => {
  const origin = await setup(t, {appRelease: {latest: '0.3.0', minimum: '0.2.0', downloadUrl: 'https://example.com/app'}});
  assert.deepEqual(await (await fetch(`${origin}/api/app/version`)).json(), {latest: '0.3.0', minimum: '0.2.0', downloadUrl: 'https://example.com/app'});
  const empty = await setup(t);
  assert.deepEqual(await (await fetch(`${empty}/api/app/version`)).json(), {latest: null, minimum: null, downloadUrl: null});
});

test('app settings are validated at startup', () => {
  assert.deepEqual(loadConfig({APP_ORIGINS: 'https://localhost'}).appOrigins, ['https://localhost']);
  assert.throws(() => loadConfig({APP_ORIGINS: '*'}), /APP_ORIGINS/);
  assert.throws(() => loadConfig({APP_LATEST_VERSION: 'v2'}), /APP_LATEST_VERSION/);
  assert.throws(() => loadConfig({APP_DOWNLOAD_URL: 'http://example.com'}), /HTTPS/);
});
