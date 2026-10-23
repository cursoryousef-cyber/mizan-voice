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
      rowsCount: document.querySelectorAll('#casesTableWrap tbody tr').length,
      hasErrorSection: !!document.getElementById('errorAnalysisSection'),
      matrixRows: document.querySelectorAll('#matrix tr').length,
      accuracy: document.getElementById('mAcc') ? document.getElementById('mAcc').textContent : null,
      precision: document.getElementById('mPrec') ? document.getElementById('mPrec').textContent : null
    };
  });

  console.log('Live Deployed Evaluation Engine Initial State:', state);
  console.log('Errors:', errors);

  console.log('Testing Small Model filter on live site...');
  await page.click('button[data-model="Xenova/whisper-small"]');
  await new Promise(r => setTimeout(r, 600));

  const smallState = await page.evaluate(() => ({
    audioCount: document.getElementById('mAudioCount').textContent,
    normWer: document.getElementById('mWer').textContent,
    accuracy: document.getElementById('mAcc').textContent,
    precision: document.getElementById('mPrec').textContent,
    recall: document.getElementById('mRec').textContent,
    f1: document.getElementById('mF1').textContent,
    fpr: document.getElementById('mFpr').textContent
  }));
  console.log('Live Small Model Filter State:', smallState);

  await browser.close();
  return { state, smallState };
}

verifyLive().catch(err => {
  console.error('Live verify error:', err);
  process.exit(1);
});
