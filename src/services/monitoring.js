const winston = require('winston');
const { createLogger, format, transports } = winston;
const os = require('os');

// Настройка форматирования для структурированных логов
const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  format.json()
);

// Для локальной разработки - более читаемый формат
const devFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(info => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`)
);

// Создаем логгер
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? jsonFormat : devFormat,
  defaultMeta: {
    service: 'eva-lawyer-bot',
    host: os.hostname(),
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new transports.Console()
  ]
});

// Метрики запросов для Prometheus
let metrics = {
  totalRequests: 0,
  activeUsers: new Set(),
  requestsByType: {},
  errors: 0,
  apiLatency: []
};

// Экспорт метрик в Prometheus формате
function getPrometheusMetrics() {
  const timestamp = Math.floor(Date.now() / 1000);

  let result = '';
  result += `# HELP eva_lawyer_bot_requests_total Общее количество запросов\n`;
  result += `# TYPE eva_lawyer_bot_requests_total counter\n`;
  result += `eva_lawyer_bot_requests_total ${metrics.totalRequests} ${timestamp}000\n\n`;

  result += `# HELP eva_lawyer_bot_active_users Количество активных пользователей\n`;
  result += `# TYPE eva_lawyer_bot_active_users gauge\n`;
  result += `eva_lawyer_bot_active_users ${metrics.activeUsers.size} ${timestamp}000\n\n`;

  result += `# HELP eva_lawyer_bot_errors_total Общее количество ошибок\n`;
  result += `# TYPE eva_lawyer_bot_errors_total counter\n`;
  result += `eva_lawyer_bot_errors_total ${metrics.errors} ${timestamp}000\n\n`;

  // Метрики по типам запросов
  result += `# HELP eva_lawyer_bot_requests_by_type Количество запросов по типам\n`;
  result += `# TYPE eva_lawyer_bot_requests_by_type counter\n`;
  Object.entries(metrics.requestsByType).forEach(([type, count]) => {
    result += `eva_lawyer_bot_requests_by_type{type="${type}"} ${count} ${timestamp}000\n`;
  });

  // Рассчитываем латенси API (p50, p95, p99)
  if (metrics.apiLatency.length > 0) {
    metrics.apiLatency.sort((a, b) => a - b);
    const p50 = metrics.apiLatency[Math.floor(metrics.apiLatency.length * 0.5)];
    const p95 = metrics.apiLatency[Math.floor(metrics.apiLatency.length * 0.95)];
    const p99 = metrics.apiLatency[Math.floor(metrics.apiLatency.length * 0.99)];

    result += `\n# HELP eva_lawyer_bot_api_latency_p50 Латенси API (p50)\n`;
    result += `# TYPE eva_lawyer_bot_api_latency_p50 gauge\n`;
    result += `eva_lawyer_bot_api_latency_p50 ${p50} ${timestamp}000\n\n`;

    result += `# HELP eva_lawyer_bot_api_latency_p95 Латенси API (p95)\n`;
    result += `# TYPE eva_lawyer_bot_api_latency_p95 gauge\n`;
    result += `eva_lawyer_bot_api_latency_p95 ${p95} ${timestamp}000\n\n`;

    result += `# HELP eva_lawyer_bot_api_latency_p99 Латенси API (p99)\n`;
    result += `# TYPE eva_lawyer_bot_api_latency_p99 gauge\n`;
    result += `eva_lawyer_bot_api_latency_p99 ${p99} ${timestamp}000\n`;

    // Сбрасываем измерения латенси после экспорта (чтобы не росли бесконечно)
    if (metrics.apiLatency.length > 1000) {
      metrics.apiLatency = [];
    }
  }

  return result;
}

// Функция для трекинга API запросов с измерением времени
async function trackApiRequest(type, userId, fn) {
  metrics.totalRequests++;
  metrics.activeUsers.add(userId);
  metrics.requestsByType[type] = (metrics.requestsByType[type] || 0) + 1;

  const startTime = Date.now();
  try {
    const result = await fn();
    const latency = Date.now() - startTime;
    metrics.apiLatency.push(latency);
    return result;
  } catch (error) {
    metrics.errors++;
    logger.error(`API Error in ${type}`, {
      error: error.message,
      userId,
      stack: error.stack
    });
    throw error;
  }
}

module.exports = {
  logger,
  getPrometheusMetrics,
  trackApiRequest
};

