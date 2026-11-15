import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Event } from '../models/event.model.js';
import { Booking } from '../models/booking.model.js';
import { Conversation } from '../models/conversation.model.js';
import { Message } from '../models/message.model.js';
import { Block } from '../models/block.model.js';
import { Match } from '../models/match.model.js';
import { MixerTag } from '../models/mixer-tag.model.js';
import { OrganizerApplication } from '../models/organizer-application.model.js';
import { Report } from '../models/report.model.js';
import { Notification } from '../models/notification.model.js';
import { ModerationLog } from '../models/moderation-log.model.js';

const MODELS = [
  { name: 'User', model: User },
  { name: 'Event', model: Event },
  { name: 'Booking', model: Booking },
  { name: 'Conversation', model: Conversation },
  { name: 'Message', model: Message },
  { name: 'Block', model: Block },
  { name: 'Match', model: Match },
  { name: 'MixerTag', model: MixerTag },
  { name: 'OrganizerApplication', model: OrganizerApplication },
  { name: 'Report', model: Report },
  { name: 'Notification', model: Notification },
  { name: 'ModerationLog', model: ModerationLog },
];

/**
 * Controlled index migration script.
 * Uses createIndexes() to add missing schema indexes without destructively dropping existing production indexes.
 */
export async function createProductionIndexes() {
  console.log('[IndexMigration] Starting controlled production index creation...');

  const results = [];
  for (const { name, model } of MODELS) {
    try {
      console.log(`[IndexMigration] Ensuring indexes for ${name}...`);
      await model.createIndexes();
      const existingIndexes = await model.collection.indexes();
      const indexNames = existingIndexes.map((idx) => idx.name).join(', ');
      console.log(`[IndexMigration] ✓ ${name} indexes verified: [${indexNames}]`);
      results.push({ name, success: true, count: existingIndexes.length });
    } catch (err) {
      console.error(`[IndexMigration] ✗ Failed to ensure indexes for ${name}:`, err.message);
      results.push({ name, success: false, error: err.message });
    }
  }

  return results;
}

// Allow standalone execution via CLI (node src/scripts/create-indexes.js)
if (process.argv[1]?.endsWith('create-indexes.js')) {
  try {
    await connectDatabase();
    const results = await createProductionIndexes();
    const hasFailures = results.some((r) => !r.success);

    await disconnectDatabase();
    if (hasFailures) {
      console.error('[IndexMigration] Migration completed with errors.');
      process.exit(1);
    } else {
      console.log('[IndexMigration] All schema indexes successfully ensured.');
      process.exit(0);
    }
  } catch (err) {
    console.error('[IndexMigration] Fatal index migration error:', err);
    process.exit(1);
  }
}
