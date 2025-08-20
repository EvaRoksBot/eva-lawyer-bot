const prom = require('prom-client');

const register = new prom.Registry();
prom.collectDefaultMetrics({ register });

const telegramRequests = new prom.Counter({
  name: 'telegram_requests_total',
  help: 'Total number of requests from Telegram',
  labelNames: ['type', 'command'],
  registers: [register],
});

const openaiRequests = new prom.Counter({
  name: 'openai_requests_total',
  help: 'Total number of requests to OpenAI API',
  labelNames: ['model', 'status'],
  registers: [register],
});

const openaiLatency = new prom.Histogram({
  name: 'openai_request_duration_seconds',
  help: 'OpenAI API request duration in seconds',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

const fileProcessing = new prom.Histogram({
  name: 'file_processing_duration_seconds',
  help: 'File processing duration in seconds',
  labelNames: ['fileType'],
  buckets: [0.1, 0.5, 1, 3, 5, 10],
  registers: [register],
});

const measureTime = async (metricFn, labels, fn, ...args) => {
  const end = metricFn.startTimer(labels);
  try {
    return await fn(...args);
  } finally {
    end();
  }
};

module.exports = {
  register,
  telegramRequests,
  openaiRequests,
  openaiLatency,
  fileProcessing,
  measureTime,
};
