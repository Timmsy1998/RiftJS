import { getRiot } from '../../../../lib/riot.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const data = await getRiot().getPlatformStatus({ signal: request.signal });
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'League status is temporarily unavailable' }, { status: 503 });
  }
}
