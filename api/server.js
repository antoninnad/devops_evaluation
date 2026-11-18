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
  try {
    const [rows] = await pool.query(
      'SELECT id, title, done, created_at FROM tasks ORDER BY id'
    );
    res.json(rows.map((t) => ({ ...t, done: Boolean(t.done) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'database error' });
  }
});



app.get('/api/info', async (req, res) => {
  res.json({

    msg: "Nouveauté sur le sites",
    



  });
})

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log(`API démarrée sur le port ${PORT}`));
