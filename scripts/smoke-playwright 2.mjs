import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 4173;
const distDir = path.resolve(process.cwd(), 'dist');

// Simple static server for the dist folder
const server = http.createServer((req, res) => {
  let filePath = path.join(distDir, req.url === '/' ? '/index.html' : req.url);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  // Basic content type handling for module scripts/styles
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
  };
  const ct = map[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct });
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

(async () => {
  const srv = server.listen(PORT);
  console.log('Static server listening on', PORT);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    console.log('PAGE LOG:', msg.type(), msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('PAGE ERROR:', err);
  });

  try {
    const resp = await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    console.log('status:', resp.status());
    const html = await page.content();
    console.log('page HTML length:', html.length);

    // Fill prompt and set duration to 30s by clicking the slider, then submit the form
    try {
      await page.fill('textarea#music-prompt', 'A short energetic electronic track with driving bass and airy pads');

      // Find the label for Duration and the following slider element
      const durationLabel = await page.$('//label[contains(text(), "Duration")]', { strict: false });
      if (durationLabel) {
        const slider = await durationLabel.evaluateHandle((el) => {
          // slider is the next sibling that contains the custom slider div
          let node = el.nextElementSibling;
          while (node) {
            if (node.querySelector && node.querySelector('.relative')) return node.querySelector('.relative');
            node = node.nextElementSibling;
          }
          return null;
        });
        if (slider) {
          const box = await slider.asElement().boundingBox();
          if (box) {
            // Slider min 15, max 300. Target 30 => percentage = (30-15)/(300-15)
            const pct = (30 - 15) / (300 - 15);
            const x = box.x + Math.max(2, Math.min(box.width - 2, box.width * pct));
            const y = box.y + box.height / 2;
            await page.mouse.click(x, y);
            console.log('Clicked slider at', x, y, 'to set ~30s');
          }
        }
      }

      await page.click('button[type="submit"]');
    } catch (e) {
      console.warn('Could not fill form or click submit', e);
    }

    // Wait for completion heading which indicates job finished
    try {
      await page.waitForSelector('h2:text("Your masterpiece is ready!")', { timeout: 20000 });
    } catch (e) {
      console.log('Completion heading not found within timeout, continuing to check for player');
      await page.waitForSelector('audio', { timeout: 20000 }).catch(() => {});
    }

    // Attempt to read the displayed durations in the player (current and total)
    const current = await page.$eval('.font-mono.w-10.text-center:first-of-type', el => el.textContent).catch(() => null);
    const total = await page.$eval('.font-mono.w-10.text-center:last-of-type', el => el.textContent).catch(() => null);
    console.log('Displayed player times -> current:', current, ' total:', total);

    await page.screenshot({ path: 'smoke.png', fullPage: true });
    console.log('screenshot saved to smoke.png');
  } catch (err) {
    console.error('Error during page load', err);
  } finally {
    await browser.close();
    srv.close();
  }
})();
