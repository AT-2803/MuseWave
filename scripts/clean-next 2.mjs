import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(process.cwd());
const nextDir = path.join(projectRoot, '.next');

try {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.info('[build] Removed existing .next directory');
} catch (error) {
  console.warn('[build] Could not clean .next directory:', error instanceof Error ? error.message : error);
}

