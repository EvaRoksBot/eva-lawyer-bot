const express = require('express');

const router = express.Router();

router.get('/health', (_, res) => {
  const memoryUsage = process.memoryUsage();
  const healthData = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
    },
    version: process.env.npm_package_version || 'unknown'
  };

  res.json(healthData);
});

router.get('/healthz', (_, res) => res.status(200).send('ok'));

module.exports = router;
