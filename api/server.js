const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
});

const PRIORITIES = ['basse', 'moyenne', 'haute'];

// Santé : utilisée par K8s et pour vérifier que la BDD répond
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'down' });
  }
});

app.get('/api/tasks', async (req, res) => {
  const { priority } = req.query;
  if (priority && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: `priority doit valoir : ${PRIORITIES.join(', ')}` });
  }
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.title, t.done, t.priority,
              DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
              (t.due_date < CURDATE() AND t.done = FALSE) AS overdue,
              c.name AS category,
              t.created_at
         FROM tasks t
         LEFT JOIN categories c ON c.id = t.category_id
        ${priority ? 'WHERE t.priority = ?' : ''}
        ORDER BY FIELD(t.priority, 'haute', 'moyenne', 'basse'), t.due_date IS NULL, t.due_date, t.id`,
      priority ? [priority] : []
    );
    res.json(rows.map((t) => ({ ...t, done: Boolean(t.done), overdue: Boolean(t.overdue) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title || title.length > 255) return res.status(400).json({ error: 'Le titre doit contenir entre 1 et 255 caractères.' });
  try {
    const [result] = await pool.execute('INSERT INTO tasks (title) VALUES (?)', [title]);
    const [rows] = await pool.execute('SELECT id, title, done, created_at FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...rows[0], done: Boolean(rows[0].done) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  if (typeof req.body?.done !== 'boolean') return res.status(400).json({ error: 'Le champ done doit être un booléen.' });
  try {
    const [result] = await pool.execute('UPDATE tasks SET done = ? WHERE id = ?', [req.body.done, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Tâche introuvable.' });
    const [rows] = await pool.execute('SELECT id, title, done, created_at FROM tasks WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Tâche introuvable.' });
    res.json({ ...rows[0], done: Boolean(rows[0].done) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Tâche introuvable.' });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});

app.get('/api/info', async (req, res) => {
  res.json({
    msg: "Nouveauté sur le sites",
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`API démarrée sur le port ${PORT}`));
