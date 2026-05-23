const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await db.sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

async function start() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    if (process.env.DB_SYNC === 'true') {
      await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
      console.log('Database schema synced from models.');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1);
  }
}

start();
