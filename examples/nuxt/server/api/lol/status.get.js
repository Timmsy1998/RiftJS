import { getRiot } from '../../utils/riot.js';

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store');
  try {
    return await getRiot(event).getPlatformStatus({ signal: AbortSignal.timeout(15_000) });
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'League status is temporarily unavailable' });
  }
});
