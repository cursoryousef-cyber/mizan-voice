const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

async function testEvaluationEngineUI() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  try {
    const url = 'file:///' + path.resolve('evaluation-engine.html').replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));

    console.log('1. Checking Initial Load (Default: Real Audio Benchmark)...');
    const initial = await page.evaluate(() => ({
      status: document.getElementById('status').textContent,
      audioCount: document.getElementById('mAudioCount').textContent,
      normWer: document.getElementById('mWer').textContent,
      rawWer: document.getElementById('mRawWer').textContent,
      totalWords: document.getElementById('mTotalWords').textContent,
      casesCount: document.getElementById('mCount').textContent,
      accuracy: document.getElementById('mAcc').textContent,
      f1: document.getElementById('mF1').textContent,
      rowsCount: document.querySelectorAll('#casesTableWrap tbody tr').length,
      hasComparisonCard: document.getElementById('modelComparisonCard').style.display !== 'none'
    }));
    console.log('Initial State:', initial);
    if (initial.audioCount !== '40' || initial.rowsCount !== 40) {
      throw new Error(`Expected 40 audio benchmark rows, got audioCount=${initial.audioCount}, rows=${initial.rowsCount}`);
    }

    console.log('2. Testing Model Filter: Whisper Small only...');
    await page.click('button[data-model="Xenova/whisper-small"]');
    await new Promise(r => setTimeout(r, 400));
    const smallState = await page.evaluate(() => ({
      audioCount: document.getElementById('mAudioCount').textContent,
      normWer: document.getElementById('mWer').textContent,
      rowsCount: document.querySelectorAll('#casesTableWrap tbody tr').length
    }));
    console.log('Small Model State:', smallState);
    if (smallState.audioCount !== '20' || smallState.rowsCount !== 20 || !smallState.normWer.includes('25.')) {
      throw new Error(`Small model filter failed: expected 20 rows and ~25.3% WER, got ${JSON.stringify(smallState)}`);
    }

    console.log('3. Testing Model Filter: Whisper Tiny only...');
    await page.click('button[data-model="Xenova/whisper-tiny"]');
    await new Promise(r => setTimeout(r, 400));
    const tinyState = await page.evaluate(() => ({
      audioCount: document.getElementById('mAudioCount').textContent,
      normWer: document.getElementById('mWer').textContent,
      rowsCount: document.querySelectorAll('#casesTableWrap tbody tr').length
    }));
    console.log('Tiny Model State:', tinyState);
    if (tinyState.audioCount !== '20' || tinyState.rowsCount !== 20 || !tinyState.normWer.includes('74.')) {
      throw new Error(`Tiny model filter failed: expected 20 rows and ~74.9% WER, got ${JSON.stringify(tinyState)}`);
    }

    console.log('4. Testing Two-Track Classification Toggle (Track 1: Reference vs Track 2: Extracted)...');
    // Switch to Track 1 (Reference text)
    await page.click('button[data-track="track1"]');
    await new Promise(r => setTimeout(r, 400));
    const track1State = await page.evaluate(() => ({
      trackBadge: document.getElementById('classDataBadge').textContent,
      f1: document.getElementById('mF1').textContent,
      acc: document.getElementById('mAcc').textContent
    }));
    console.log('Track 1 State (Ground Truth):', track1State);

    // Switch to Track 2 (Extracted transcript)
    await page.click('button[data-track="track2"]');
    await new Promise(r => setTimeout(r, 400));
    const track2State = await page.evaluate(() => ({
      trackBadge: document.getElementById('classDataBadge').textContent,
      f1: document.getElementById('mF1').textContent,
      acc: document.getElementById('mAcc').textContent
    }));
    console.log('Track 2 State (Whisper Output):', track2State);

    console.log('5. Testing Switch to Text Demo Scenarios (30 Texts, No Audio)...');
    await page.click('#loadBenchmarkBtn');
    await new Promise(r => setTimeout(r, 400));
    const demoState = await page.evaluate(() => ({
      status: document.getElementById('status').textContent,
      audioCount: document.getElementById('mAudioCount').textContent,
      normWer: document.getElementById('mWer').textContent,
      rawWer: document.getElementById('mRawWer').textContent,
      casesCount: document.getElementById('mCount').textContent,
      bannerNotice: document.getElementById('bannerNotice').textContent,
      hasComparisonCard: document.getElementById('modelComparisonCard').style.display === 'none'
    }));
    console.log('Demo Text State:', demoState);
    if (demoState.casesCount !== '30' || demoState.audioCount !== '0' || !demoState.normWer.includes('لا توجد بيانات كافية')) {
      throw new Error(`Demo text state failed: expected 0 audio count and 'لا توجد بيانات كافية', got ${JSON.stringify(demoState)}`);
    }

    console.log('6. Testing Return to Real Audio Benchmark...');
    await page.click('#loadAudioBenchmarkBtn');
    await new Promise(r => setTimeout(r, 400));

    if (consoleErrors.length > 0) {
      throw new Error('Console errors occurred during UI test: ' + consoleErrors.join(' | '));
    }

    console.log('ALL Evaluation Engine UI Tests PASSED with 100% integrity!');
  } finally {
    await browser.close();
  }
}

testEvaluationEngineUI().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
