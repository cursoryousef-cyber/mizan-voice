const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

async function verifyLive() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  const url = 'https://cursoryousef-cyber.github.io/mizan-voice/evaluation-engine.html?nocache=' + Date.now();
  console.log('Fetching live URL:', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  await new Promise(r => setTimeout(r, 1200));

  const state = await page.evaluate(() => {
    return {
      title: document.title,
      audioCount: document.getElementById('mAudioCount') ? document.getElementById('mAudioCount').textContent : null,
      mWer: document.getElementById('mWer') ? document.getElementById('mWer').textContent : null,
      hasComparisonCard: document.getElementById('modelComparisonCard') ? (document.getElementById('modelComparisonCard').style.display !== 'none') : false,
      rowsCount: document.querySelectorAll('#casesTableWrap tbody tr').length
    };
  });

  console.log('Live Deployed Evaluation Engine State:', state);
  console.log('Errors:', errors);

  await browser.close();
  return state;
}

verifyLive().catch(err => {
  console.error('Live verify error:', err);
  process.exit(1);
});
