const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { app, pool } = require('../server');

let server;
let baseUrl;

before(async () => {
  // Never initialize the schema against the deployed database.
  assert.equal(process.env.DB_NAME, 'devops_test', 'DB_NAME doit être devops_test');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });
  try {
    const schema = await readFile(path.join(__dirname, '../../database/init.sql'), 'utf8');
    await connection.query('DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS categories;');
    await connection.query(schema);
  } finally {
    await connection.end();
  }
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  await pool.end();
});

function request(route, method = 'GET', body) {
  return fetch(baseUrl + route, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
}

test('Toutes les routes répondent avec les statuts et données attendus', async () => {
  const health = await request('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok', db: 'up' });
  const info = await request('/api/info');
  assert.equal(info.status, 200);
  assert.equal(typeof (await info.json()).msg, 'string');
  const categories = await request('/api/categories');
  assert.equal(categories.status, 200);
  assert.equal((await categories.json()).length, 3);
  const created = await request('/api/tasks', 'POST', { title: '  Tâche CI  ' });
  assert.equal(created.status, 201);
  const task = await created.json();
  assert.equal(task.title, 'Tâche CI');
  assert.equal(task.done, false);
  const tasks = await request('/api/tasks');
  assert.equal(tasks.status, 200);
  assert.ok((await tasks.json()).some(row => row.id === task.id));
  const updated = await request(`/api/tasks/${task.id}`, 'PATCH', { done: true });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).done, true);
  const deleted = await request(`/api/tasks/${task.id}`, 'DELETE');
  assert.equal(deleted.status, 204);
  const missing = await request(`/api/tasks/${task.id}`, 'DELETE');
  assert.equal(missing.status, 404);
});

test('Un titre vide ou trop long est refusé sans créer de tâche', async () => {
  const initial = await (await request('/api/tasks')).json();
  for (const title of ['   ', 'x'.repeat(256)]) {
    const response = await request('/api/tasks', 'POST', { title });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, 'string');
  }
  assert.deepEqual(await (await request('/api/tasks')).json(), initial);
});

test('Un statut non booléen est refusé sans modifier la tâche', async () => {
  const task = await (await request('/api/tasks', 'POST', { title: 'Validation statut' })).json();
  try {
    const response = await request(`/api/tasks/${task.id}`, 'PATCH', { done: 'true' });
    assert.equal(response.status, 400);
    const tasks = await (await request('/api/tasks')).json();
    assert.equal(tasks.find(row => row.id === task.id).done, false);
  } finally {
    await request(`/api/tasks/${task.id}`, 'DELETE');
  }
});
