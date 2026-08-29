import { Request, Response, Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Logger } from '../../utils/logger';

export interface RealtimeEvent {
  type: string;
  entity?: string;
  groupId?: string;
  payload?: any;
}

const sseClients = new Map<string, Set<Response>>();

export class RealtimeSyncService {
  /**
   * Broadcast a data invalidation event to specific user(s) or all members of a group
   */
  public static notifyUsers(userIds: string | string[], event: RealtimeEvent): void {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const dataString = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;

    for (const id of ids) {
      const clientResponses = sseClients.get(id);
      if (clientResponses && clientResponses.size > 0) {
        clientResponses.forEach((res) => {
          try {
            res.write(dataString);
          } catch (err) {
            Logger.warn(`Failed to write SSE event to user ${id}`, { error: err });
          }
        });
      }
    }
  }

  /**
   * Broadcast event to all connected clients
   */
  public static broadcast(event: { type: string; payload?: any }): void {
    const dataString = `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;
    sseClients.forEach((responses) => {
      responses.forEach((res) => {
        try {
          res.write(dataString);
        } catch {}
      });
    });
  }
}

export const realtimeRoutes = Router();

realtimeRoutes.get('/events', authenticate, (req: Request, res: Response) => {
  const userId = req.user!.id;

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable buffering for NGINX/reverse proxies
  });

  // Initial connection heartbeat
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', userId, timestamp: Date.now() })}\n\n`);

  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId)!.add(res);

  // Keep-alive heartbeat ping every 25 seconds to keep connection hot
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatTimer);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    const set = sseClients.get(userId);
    if (set) {
      set.delete(res);
      if (set.size === 0) {
        sseClients.delete(userId);
      }
    }
  });
});
