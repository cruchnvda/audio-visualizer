const puppeteer = require('puppeteer');
const { execSync, spawn } = require('child_process');
const path = require('path');

(async () => {
  // Kill any existing server on 8000
  try { execSync('fuser -k 8000/tcp 2>/dev/null'); } catch(e) {}
  
  // Start server
  const server = spawn('python3', ['serve.py'], {
    cwd: '/home/horde/.openclaw/workspace/audio-visualizer',
    detached: true,
    stdio: 'ignore'
  });
  server.unref();
  
  await new Promise(r => setTimeout(r, 2000));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
  
  // Wait for tracks to load, select one and play
  await new Promise(r => setTimeout(r, 1000));
  
  // Inject audio directly into the app's AudioContext pipeline
  await page.evaluate(() => {
    // Select the track if available
    const sel = document.getElementById('track-select');
    if (sel && sel.options.length > 1) {
      sel.selectedIndex = 1;
      sel.dispatchEvent(new Event('change'));
    }
    
    // Click play
    const btn = document.getElementById('play-pause');
    if (btn) btn.click();
  });
  
  // Wait for audio to start and visualization to render
  await new Promise(r => setTimeout(r, 4000));
  
  await page.screenshot({ path: '/home/horde/.openclaw/workspace/audio-visualizer/screenshot-viz.png' });
  console.log('Screenshot saved');
  
  await browser.close();
  try { execSync('fuser -k 8000/tcp 2>/dev/null'); } catch(e) {}
})();
