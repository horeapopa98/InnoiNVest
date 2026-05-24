require('dotenv').config();

const createApp = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    if (process.env.DB_SYNC === 'true') {
      // sync() without alter — creates tables that don't exist, never ALTERs existing ones.
      // Use `npm run db:sync` explicitly when you need to apply schema changes.
      await db.sequelize.sync();
      console.log('Database schema synced from models.');
    }

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
}

startServer();
