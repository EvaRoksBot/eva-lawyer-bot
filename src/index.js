const express = require('express');
const dotenv = require('dotenv');
const { logger } = require('./services/monitoring');

dotenv.config();

const telegramRoutes = require('./routes/telegram');
const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');

const app = express();
app.use(express.json());

app.use('/telegram', telegramRoutes);
app.use('/', healthRoutes);
app.use('/', metricsRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
