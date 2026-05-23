const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');
const setupSwagger = require('./config/swagger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  setupSwagger(app);

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
