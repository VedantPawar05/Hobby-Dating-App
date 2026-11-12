import mongoose from 'mongoose';
import { Event } from '../models/event.model.js';
import { EVENT_STATUSES } from '../constants/event.constants.js';

const DEFAULT_INTERVAL_MS = 60 * 1000;
let lifecycleTimer = null;

/**
 * Transitions published events whose endDateTime has elapsed to 'completed'.
 * Cancelled, rejected, draft, pending, and active/upcoming events are untouched.
 *
 * @param {Date} [now=new Date()]
 */
export async function syncCompletedEvents(now = new Date()) {
  const result = await Event.updateMany(
    {
      status: EVENT_STATUSES.PUBLISHED,
      endDateTime: { $lte: now },
    },
    {
      $set: { status: EVENT_STATUSES.COMPLETED },
    }
  );

  return {
    matchedCount: result?.matchedCount ?? 0,
    modifiedCount: result?.modifiedCount ?? 0,
    checkedAt: now,
  };
}

/**
 * Runs lifecycle sync on demand only when Mongoose has an active database connection.
 * Prevents unmocked database calls from hanging isolated unit tests.
 */
export async function syncCompletedEventsIfConnected(now = new Date()) {
  if (mongoose.connection.readyState !== 1) {
    return null;
  }
  return syncCompletedEvents(now);
}

/**
 * Starts the periodic background event lifecycle scheduler.
 * @param {number} [intervalMs=60000]
 */
export function startEventLifecycleScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  if (lifecycleTimer) {
    return lifecycleTimer;
  }

  const runSync = async () => {
    try {
      const outcome = await syncCompletedEventsIfConnected(new Date());
      if (outcome && outcome.modifiedCount > 0) {
        console.log(
          `[Lifecycle] Marked ${outcome.modifiedCount} ended event(s) as completed`
        );
      }
    } catch (error) {
      console.error('[Lifecycle] Failed to sync completed events:', error.message);
    }
  };

  // Run an initial sweep right after server startup, then repeat on interval
  void runSync();

  lifecycleTimer = setInterval(runSync, intervalMs);
  if (typeof lifecycleTimer.unref === 'function') {
    lifecycleTimer.unref();
  }

  return lifecycleTimer;
}

/**
 * Stops the background event lifecycle scheduler cleanly during shutdown.
 */
export function stopEventLifecycleScheduler() {
  if (lifecycleTimer) {
    clearInterval(lifecycleTimer);
    lifecycleTimer = null;
  }
}
