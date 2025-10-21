import { execSync } from 'child_process';

const GIT_REMOTE = process.env.GIT_REMOTE!;
const GIT_DEFAULT_BRANCH = process.env.GIT_DEFAULT_BRANCH || 'main';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const VERCEL_ORG_ID = process.env.VERCEL_ORG_ID!;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID!;

async function release() {
  // Git add/commit/push
  execSync('git init', { stdio: 'inherit' });
  execSync(`git checkout -B ${GIT_DEFAULT_BRANCH}`, { stdio: 'inherit' });
  execSync('git add -A', { stdio: 'inherit' });
  execSync('git -c user.name="musewave-bot" -c user.email="bot@local" commit -m "chore(release): ship MuseWave Neo Backend"', { stdio: 'inherit' });
  execSync('git remote remove origin || true', { stdio: 'inherit' });
  execSync(`git remote add origin "${GIT_REMOTE}"`, { stdio: 'inherit' });
  execSync(`git push -u origin "${GIT_DEFAULT_BRANCH}" --force-with-lease`, { stdio: 'inherit' });

  // Vercel deploy
  execSync(`npx vercel link --yes --token=${VERCEL_TOKEN} --project ${VERCEL_PROJECT_ID} --scope ${VERCEL_ORG_ID}`, { stdio: 'inherit' });
  // Set envs
  const envs = ['DATABASE_URL', 'DEFAULT_API_KEY', 'RATE_LIMIT_PER_MIN', 'PROFANITY_DENYLIST', 'GEMINI_API_KEY'];
  for (const key of envs) {
    const value = process.env[key];
    if (value) {
      execSync(`echo "${value}" | npx vercel env add ${key} production --token=${VERCEL_TOKEN}`, { stdio: 'inherit' });
    }
  }
  execSync(`npx vercel deploy --prod --prebuilt --token=${VERCEL_TOKEN}`, { stdio: 'inherit' });

  // Verbal register
  execSync('npm run verbal:register', { stdio: 'inherit' });
}

release().catch(console.error);