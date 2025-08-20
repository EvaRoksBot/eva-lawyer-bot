const Redis = require('ioredis');
const { logger } = require('./monitoring');

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

const SESSION_TTL = 24 * 60 * 60;

async function getUserSession(userId) {
  try {
    const data = await redisClient.get(`user:${userId}`);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    logger.error(`Error getting session for user ${userId}:`, error);
    return {};
  }
}

async function saveUserSession(userId, data) {
  try {
    await redisClient.setex(
      `user:${userId}`,
      SESSION_TTL,
      JSON.stringify(data)
    );
    return true;
  } catch (error) {
    logger.error(`Error saving session for user ${userId}:`, error);
    return false;
  }
}

async function deleteUserSession(userId) {
  try {
    await redisClient.del(`user:${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error deleting session for user ${userId}:`, error);
    return false;
  }
}

module.exports = {
  getUserSession,
  saveUserSession,
  deleteUserSession,
};
