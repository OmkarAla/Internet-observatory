import Website from '../models/Website.js';
import Api from '../models/Api.js';
import { checkWebsite } from '../routes/checks.js';
import { checkApi } from '../routes/apis.js';
import { broadcastCheckResult } from './socketService.js';

const timers = new Map();

const createCheckFunction = (type) => {
  return async (id) => {
    if (type === 'website') {
      const result = await checkWebsite(id);
      broadcastCheckResult(id, 'website', result);
      return result;
    } else {
      const result = await checkApi(id);
      broadcastCheckResult(id, 'api', result);
      return result;
    }
  };
};

export const startTimer = (id, type, intervalMs) => {
  const key = `${type}:${id}`;
  clearTimer(key);

  const checkFn = createCheckFunction(type);
  const timeout = setInterval(() => {
    checkFn(id).catch(err => console.error(`Check failed for ${key}:`, err));
  }, intervalMs);

  timers.set(key, { intervalMs, timeout, type, id });
  console.log(`Timer started for ${key}: ${intervalMs}ms`);
};

export const clearTimer = (key) => {
  if (timers.has(key)) {
    clearInterval(timers.get(key).timeout);
    timers.delete(key);
    console.log(`Timer cleared for ${key}`);
  }
};

export const getTimerStatus = (id, type) => {
  const key = `${type}:${id}`;
  return timers.has(key) ? timers.get(key) : null;
};

export const loadTimersFromDB = async () => {
  try {
    const websites = await Website.find({ checkInterval: { $ne: null } });
    const apis = await Api.find({ checkInterval: { $ne: null } });

    websites.forEach(w => startTimer(w._id, 'website', w.checkInterval));
    apis.forEach(a => startTimer(a._id, 'api', a.checkInterval));

    console.log(`Loaded ${websites.length + apis.length} timers from DB`);
  } catch (error) {
    console.error('Failed to load timers from DB:', error);
  }
};
