require('dotenv').config();

const createApp = require('./app');
const db = require('./models');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    if (process.env.DB_SYNC === 'true') {
      await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
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
