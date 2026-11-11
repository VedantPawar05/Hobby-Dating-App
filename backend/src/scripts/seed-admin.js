import { fileURLToPath } from 'url';
import path from 'path';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedAdminAccount, getAdminSeedConfig } from '../services/admin-seed.service.js';

export async function runSeedAdmin(rawEnv = process.env) {
  let connected = false;
  try {
    await connectDatabase();
    connected = true;

    const result = await seedAdminAccount(getAdminSeedConfig(rawEnv));
    if (result.created) {
      console.log(`[Seed:Admin] Created admin account for ${result.user.email} (role: ${result.user.role})`);
    } else {
      console.log(`[Seed:Admin] Admin account ${result.user.email} already exists (idempotent no-op)`);
    }
    return result;
  } catch (error) {
    console.error('[Seed:Admin] Failed:', error.message);
    process.exitCode = 1;
    throw error;
  } finally {
    if (connected) {
      await disconnectDatabase();
    }
  }
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
const isDirectExecution =
  process.platform === 'win32'
    ? invokedFile.toLowerCase() === currentFile.toLowerCase()
    : invokedFile === currentFile;

if (isDirectExecution) {
  runSeedAdmin().catch(() => {
    process.exitCode = 1;
  });
}
