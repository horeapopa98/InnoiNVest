require('dotenv').config();

const createApp = require('./app');
const db = require('./models');
const connectorRegistry = require('./repositories/connectors/registry');

const PORT = process.env.PORT || 3001;

async function prewarmSources() {
  connectorRegistry.initConnectors();
  const inno = connectorRegistry.getConnector('inno-proprietati');
  const proinfra = connectorRegistry.getConnector('proinfrastructura');

  // Both run in parallel; failures are logged inside each prewarm() and never
  // propagate — a broken upstream must not prevent the server from starting.
  await Promise.allSettled([inno.prewarm(), proinfra.prewarm()]);
}

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
      // Fire prewarm after the server is already accepting requests so startup
      // latency is unaffected. Errors are caught inside prewarmSources().
      prewarmSources().catch((err) =>
        console.warn('Prewarm unexpected error:', err.message)
      );
    });
  } catch (error) {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
}

startServer();
