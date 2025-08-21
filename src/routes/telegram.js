const express = require('express');
const bot = require('../bot');
const { logger } = require('../services/monitoring');

const router = express.Router();

router.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body, res).catch((err) => {
    logger.error('Telegram webhook error', { error: err.message });
    res.status(500).send('Internal Server Error');
  });
});

module.exports = router;
