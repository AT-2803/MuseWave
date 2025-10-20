#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const run = (cmd: string) => {
  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
};

const main = () => {
  try {
    // Check if there are changes
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    if (!status.trim()) {
      console.log('No changes to commit.');
      return;
    }

    // Add all changes
    run('git add .');

    // Generate commit message
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const version = packageJson.version;
    const commitMessage = `Release ${version} - Auto commit`;

    // Commit
    run(`git commit -m "${commitMessage}"`);

    // Push
    run('git push origin main');

    console.log('Successfully committed and pushed to git.');
  } catch (error) {
    console.error('Error during release:', error);
    process.exit(1);
  }
};

main();
