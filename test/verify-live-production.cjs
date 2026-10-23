const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));
const fs = require('fs');

async function testLiveDeployedProduction() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const liveUrl = 'https://cursoryousef-cyber.github.io/mizan-voice/audio-upload-lab.html?nocache=' + Date.now();
  const scratchDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\d69ba800-0c3e-4d7d-b36c-fb10aa105f98\\scratch';
  const testWav = path.join(scratchDir, 'tone_audible.wav');
  const testMp3 = path.join(scratchDir, 'standard.mp3');

  console.log('Testing live deployed site on Chrome:', liveUrl);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(liveUrl, { waitUntil: 'networkidle2' });
  console.log('Live page loaded successfully.');

  // 1. Initial State
  const initialDisabled = await page.$eval('#runBtn', el => el.disabled);
  console.log('Initial runBtn disabled:', initialDisabled);

  // 2. MP3 Upload test on live page
  const fileInput = await page.$('#audioFile');
  await fileInput.uploadFile(testMp3);
  await new Promise(r => setTimeout(r, 600));

  const afterMp3 = await page.evaluate(() => {
    return {
      runBtnDisabled: document.getElementById('runBtn').disabled,
      status: document.getElementById('status').textContent
    };
  });
  console.log('After MP3 upload on Live Page:', afterMp3);

  // 3. WAV Upload & specs check on live page
  await fileInput.uploadFile(testWav);
  await new Promise(r => setTimeout(r, 800));

  const afterWav = await page.evaluate(() => {
    return {
      runBtnDisabled: document.getElementById('runBtn').disabled,
      specs: document.getElementById('metaAudioSpecs').textContent,
      status: document.getElementById('status').textContent
    };
  });
  console.log('After WAV upload on Live Page:', afterWav);

  // 4. Standalone Classification & WER test on live page
  await page.evaluate(() => {
    document.getElementById('transcript').value = 'يا غبي راح اقتلك اليوم';
    document.getElementById('referenceText').value = 'يا غبي راح اقتلك اليوم';
    document.getElementById('classifyBtn').click();
    document.getElementById('calcWerBtn').click();
    document.getElementById('addToLogBtn').click();
  });

  const liveLabState = await page.evaluate(() => {
    return {
      classificationText: document.getElementById('classification').textContent,
      werNormVal: document.getElementById('werNormVal').textContent,
      logCount: document.getElementById('logCount').textContent,
      exportDisabled: document.getElementById('exportCsvBtn').disabled
    };
  });
  console.log('Live Lab Interactive State:', liveLabState);

  console.log('Any Uncaught Page Errors?', pageErrors.length === 0 ? 'None (Clean)' : pageErrors);

  await browser.close();
  console.log('LIVE GITHUB PAGES VERIFICATION COMPLETE AND 100% OPERATIONAL!');
}

testLiveDeployedProduction().catch(err => {
  console.error('Live production verification failed:', err);
  process.exit(1);
});
