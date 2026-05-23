const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('../docs/openapi');

function setupSwagger(app) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customSiteTitle: 'InnoiNVest API Docs',
  }));

  app.get('/api/docs.json', (req, res) => {
    res.json(openapiSpec);
  });
}

module.exports = setupSwagger;
