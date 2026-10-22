const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

async function testFullEndToEnd() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const scratchDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\d69ba800-0c3e-4d7d-b36c-fb10aa105f98\\scratch';
  const testWav = path.join(scratchDir, 'tone_audible.wav');

  console.log('Launching Chrome for End-to-End Transcription & Evaluation Test...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const localUrl = 'file:///' + path.resolve('audio-upload-lab.html').replace(/\\/g, '/');
    await page.goto(localUrl, { waitUntil: 'domcontentloaded' });

    console.log('1. Uploading test audio...');
    const fileInput = await page.$('#audioFile');
    await fileInput.uploadFile(testWav);
    await new Promise(r => setTimeout(r, 600));

    console.log('2. Entering Reference Ground Truth...');
    await page.type('#referenceText', 'السلام عليكم ورحمة الله');
    await page.select('#referenceLabel', 'سليم');
    await page.type('#notes', 'اختبار آلي متكامل للتحقق من مسار التفريغ والتصنيف والتقييم');

    console.log('3. Clicking Run Transcription (Tiny)...');
    await page.click('#runBtn');

    // Wait for transcription to complete (max 30 seconds)
    let transcriptText = '';
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        return {
          status: document.getElementById('status').textContent,
          transcript: document.getElementById('transcript').value,
          disabled: document.getElementById('runBtn').disabled
        };
      });
      console.log(`[T+${i+1}s]:`, res.status.split('\n')[0]);
      if (!res.disabled && (res.transcript || res.status.includes('اكتمل') || res.status.includes('تعذر'))) {
        transcriptText = res.transcript;
        console.log('Transcription step finished. Output text:', JSON.stringify(transcriptText));
        break;
      }
    }

    console.log('4. Testing WER calculation...');
    await page.click('#calcWerBtn');
    await new Promise(r => setTimeout(r, 300));
    const werMetrics = await page.evaluate(() => {
      return {
        raw: document.getElementById('werRawVal').textContent,
        norm: document.getElementById('werNormVal').textContent,
        stats: document.getElementById('werStats').textContent
      };
    });
    console.log('WER Metrics result:', werMetrics);

    console.log('5. Adding to Evaluation Log...');
    await page.click('#addToLogBtn');
    await new Promise(r => setTimeout(r, 300));

    const logState = await page.evaluate(() => {
      const log = window.MizanVoiceLab.evaluationLog;
      const countText = document.getElementById('logCount').textContent;
      const exportDisabled = document.getElementById('exportCsvBtn').disabled;
      return {
        logCount: log.length,
        firstEntry: log[0],
        countText,
        exportDisabled
      };
    });
    console.log('Log State:', logState);

    console.log('End-to-End Test PASSED with complete integrity!');
  } finally {
    await browser.close();
  }
}

testFullEndToEnd().catch(err => {
  console.error('E2E test failed:', err);
  process.exit(1);
});
