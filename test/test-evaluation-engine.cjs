const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

async function testEvaluationEngine() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const engineUrl = 'file:///' + path.resolve('evaluation-engine.html').replace(/\\/g, '/');

  console.log('Testing Evaluation Engine on Chrome:', engineUrl);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(engineUrl, { waitUntil: 'domcontentloaded' });

  // Click load benchmark button
  await page.click('#loadBenchmarkBtn');
  await new Promise(r => setTimeout(r, 400));

  const results = await page.evaluate(() => {
    return {
      count: document.getElementById('mCount').textContent,
      accuracy: document.getElementById('mAcc').textContent,
      precision: document.getElementById('mPrec').textContent,
      recall: document.getElementById('mRec').textContent,
      f1: document.getElementById('mF1').textContent,
      avgWer: document.getElementById('mWer').textContent,
      hasMatrixRows: document.querySelectorAll('#matrix table tbody tr').length > 0,
      exportDisabled: document.getElementById('export').disabled
    };
  });

  console.log('Evaluation Engine Benchmark Calculation Results:', results);

  if (pageErrors.length > 0) {
    console.error('Page errors encountered:', pageErrors);
    process.exit(1);
  }

  await browser.close();
  console.log('Evaluation Engine verified successfully!');
}

testEvaluationEngine().catch(err => {
  console.error('Evaluation engine test failed:', err);
  process.exit(1);
});
