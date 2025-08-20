const express = require('express');
const { getPrometheusMetrics } = require('../services/monitoring');

const router = express.Router();

router.get('/metrics', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getPrometheusMetrics());
});

module.exports = router;
