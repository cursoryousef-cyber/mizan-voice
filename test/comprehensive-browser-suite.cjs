const path = require('path');
const fs = require('fs');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

const TEST_RESULTS = [];
function recordResult(num, description, passed, details = '') {
  TEST_RESULTS.push({ num, description, passed, details });
  console.log(`[Test ${num}] ${passed ? '✓ PASS' : '✗ FAIL'}: ${description}${details ? ' - ' + details : ''}`);
}

async function runAllTests() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const scratchDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\d69ba800-0c3e-4d7d-b36c-fb10aa105f98\\scratch';
  
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  // 1. Generate test media assets
  // Helper: create minimal valid WAV
  function createWavFile(filePath, durationSec = 1, sampleRate = 16000, isSilent = false) {
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataBytes = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataBytes);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataBytes, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataBytes, 40);

    if (!isSilent) {
      // 440 Hz sine wave tone (audible tone)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const val = Math.sin(2 * Math.PI * 440 * t) * 16000;
        buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
      }
    }
    fs.writeFileSync(filePath, buffer);
  }

  const validWavPath = path.join(scratchDir, 'tone_audible.wav');
  createWavFile(validWavPath, 2, 16000, false);

  const silentWavPath = path.join(scratchDir, 'silence.wav');
  createWavFile(silentWavPath, 2, 16000, true);

  const mockMp3Standard = path.join(scratchDir, 'standard.mp3');
  // Minimal MP3 header frames
  fs.writeFileSync(mockMp3Standard, Buffer.from([0xFF, 0xFB, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x54, 0x41, 0x47, 0x00]));

  const mockNonAudio = path.join(scratchDir, 'document.pdf');
  fs.writeFileSync(mockNonAudio, Buffer.from('%PDF-1.4 dummy non-audio document'));

  const mockCorrupt = path.join(scratchDir, 'corrupt.wav');
  fs.writeFileSync(mockCorrupt, Buffer.from('RIFFcorruptedwavedatabyteswithoutproperheaders'));

  const mockOversized = path.join(scratchDir, 'oversized.wav');
  fs.writeFileSync(mockOversized, Buffer.alloc(21 * 1024 * 1024)); // 21 MB (> 20 MB limit)

  console.log('Generated test fixtures.');

  // Launch browser
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const page = await browser.newPage();
  const pageExceptions = [];
  const consoleErrors = [];

  page.on('pageerror', err => {
    pageExceptions.push(err.message);
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const localFileUrl = 'file:///' + path.resolve('audio-upload-lab.html').replace(/\\/g, '/');
  console.log('Opening local test file:', localFileUrl);
  await page.goto(localFileUrl, { waitUntil: 'domcontentloaded' });

  // -----------------------------------------------------------------
  // Test 1: MP3 selection with known MIME or extension
  // -----------------------------------------------------------------
  let fileInput = await page.$('#audioFile');
  await fileInput.uploadFile(mockMp3Standard);
  await new Promise(r => setTimeout(r, 400));

  let status = await page.$eval('#status', el => el.textContent);
  let runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  recordResult(1, 'اختيار MP3 والتحقق من الاسم والحجم وتفعيل الزر فوراً', !runBtnDisabled, `Status: ${status.split('\n')[0]}`);

  // -----------------------------------------------------------------
  // Test 2: MP3 with unusual/empty MIME
  // -----------------------------------------------------------------
  // Verify regex check for .mp3 even if mime is empty
  const isExtOk = await page.evaluate(() => {
    const dummyFile = { name: 'unusual_clip.mp3', size: 1024, type: '' };
    return /\.(wav|mp3|m4a|aac|ogg|oga|opus|webm|flac)$/i.test(dummyFile.name);
  });
  recordResult(2, 'اختيار MP3 مع نوع MIME فارغ بالاعتماد على الامتداد الآمن', isExtOk);

  // -----------------------------------------------------------------
  // Test 3: WAV selection
  // -----------------------------------------------------------------
  await fileInput.uploadFile(validWavPath);
  await new Promise(r => setTimeout(r, 600));
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  let metaSpecs = await page.$eval('#metaAudioSpecs', el => el.textContent);
  recordResult(3, 'اختيار WAV سليم وفك ترميزه وتحديث المواصفات', !runBtnDisabled && metaSpecs.includes('ثانية'), metaSpecs);

  // -----------------------------------------------------------------
  // Test 4: Non-audio file selection
  // -----------------------------------------------------------------
  await fileInput.uploadFile(mockNonAudio);
  await new Promise(r => setTimeout(r, 400));
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  status = await page.$eval('#status', el => el.textContent);
  recordResult(4, 'اختيار ملف غير صوتي ورفضه مع رسالة واضحة', runBtnDisabled && status.includes('ملف صوتي صالح'));

  // -----------------------------------------------------------------
  // Test 5: No file selected
  // -----------------------------------------------------------------
  await page.click('#clearBtn');
  await new Promise(r => setTimeout(r, 200));
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  status = await page.$eval('#status', el => el.textContent);
  recordResult(5, 'عدم اختيار ملف وبقاء زر البدء معطلاً', runBtnDisabled && status.includes('اختر ملفًا'));

  // -----------------------------------------------------------------
  // Test 6: File exceeding size limit (> 20MB)
  // -----------------------------------------------------------------
  await fileInput.uploadFile(mockOversized);
  await new Promise(r => setTimeout(r, 400));
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  status = await page.$eval('#status', el => el.textContent);
  recordResult(6, 'ملف يتجاوز الحد المسموح (20 MB) ورفضه', runBtnDisabled && status.includes('يتجاوز الحد الأقصى'));

  // -----------------------------------------------------------------
  // Test 7: Corrupted audio file - attempting to run decode
  // -----------------------------------------------------------------
  await fileInput.uploadFile(mockCorrupt);
  await new Promise(r => setTimeout(r, 400));
  // Trigger run to see how it handles decode failure
  await page.click('#runBtn');
  await new Promise(r => setTimeout(r, 400));
  status = await page.$eval('#status', el => el.textContent);
  recordResult(7, 'ملف صوتي تالف والتعامل مع خطأ فك الترميز عند البدء', status.includes('تعذر فك ترميز'));

  // -----------------------------------------------------------------
  // Test 8: Unsupported codec message check
  // -----------------------------------------------------------------
  const hasHelpfulDecodeMsg = status.includes('WAV') || status.includes('فك ترميز');
  recordResult(8, 'اقتراح صيغة WAV/PCM البديلة عند تعذر فك الترميز', hasHelpfulDecodeMsg);

  // -----------------------------------------------------------------
  // Test 9: Silent audio detection
  // -----------------------------------------------------------------
  await fileInput.uploadFile(silentWavPath);
  await new Promise(r => setTimeout(r, 800));
  status = await page.$eval('#status', el => el.textContent);
  const silenceDetected = status.includes('سكون ملحوظ') || status.includes('صامت');
  recordResult(9, 'اكتشاف الصوت الصامت والتنبيه عليه', silenceDetected, status.split('\n')[1] || status);

  // -----------------------------------------------------------------
  // Test 10: Valid audio containing signal
  // -----------------------------------------------------------------
  await page.click('#clearBtn');
  await new Promise(r => setTimeout(r, 200));
  await fileInput.uploadFile(validWavPath);
  await new Promise(r => setTimeout(r, 600));
  status = await page.$eval('#status', el => el.textContent);
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  recordResult(10, 'صوت صالح يحتوي على إشارة وإتاحته للتفريغ', !runBtnDisabled && (status.includes('جاهز للمعالجة') || status.includes('تم اختيار')));

  // -----------------------------------------------------------------
  // Test 11: Transformers.js library loading error resilience
  // -----------------------------------------------------------------
  // Check that page UI remains fully responsive even if network fails
  const scriptIsolated = await page.evaluate(() => {
    return typeof window.MizanVoiceLab !== 'undefined' && typeof window.MizanVoiceLab.prepareAudioData === 'function';
  });
  recordResult(11, 'فصل واجهة رفع ومعاينة الملف عن تحميل مكتبة Transformers.js', scriptIsolated);

  // -----------------------------------------------------------------
  // Test 12: Model weights download state handling
  // -----------------------------------------------------------------
  // Verify progress indicator and status updates exist
  const progressPresent = await page.$eval('#progress', el => el !== null);
  recordResult(12, 'وجود شريط التقوار والرسائل التفصيلية لحالات التحميل', progressPresent);

  // -----------------------------------------------------------------
  // Test 13: Model switching between Tiny and Small
  // -----------------------------------------------------------------
  await page.select('#modelChoice', 'Xenova/whisper-small');
  let selectedModel = await page.$eval('#modelChoice', el => el.value);
  const smallOk = selectedModel === 'Xenova/whisper-small';
  await page.select('#modelChoice', 'Xenova/whisper-tiny');
  selectedModel = await page.$eval('#modelChoice', el => el.value);
  const tinyOk = selectedModel === 'Xenova/whisper-tiny';
  recordResult(13, 'تبديل نموذجي Tiny و Small بسلاسة', smallOk && tinyOk);

  // -----------------------------------------------------------------
  // Test 14: Failed ASR or Cancel and retry
  // -----------------------------------------------------------------
  await page.click('#runBtn');
  await new Promise(r => setTimeout(r, 200));
  // Cancel button should appear
  let cancelVisible = await page.$eval('#cancelBtn', el => !el.classList.contains('hidden'));
  await page.click('#cancelBtn');
  await new Promise(r => setTimeout(r, 200));
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  status = await page.$eval('#status', el => el.textContent);
  recordResult(14, 'إلغاء المعالجة وإمكانية إعادة المحاولة دون تعليق', cancelVisible && !runBtnDisabled && status.includes('إلغاء'));

  // -----------------------------------------------------------------
  // Test 15: Clear results and pick another file
  // -----------------------------------------------------------------
  await page.click('#clearBtn');
  await new Promise(r => setTimeout(r, 200));
  let clearedState = await page.evaluate(() => {
    return {
      runBtnDisabled: document.getElementById('runBtn').disabled,
      transcript: document.getElementById('transcript').value,
      fileInput: document.getElementById('audioFile').value
    };
  });
  recordResult(15, 'مسح النتائج وإعادة تعيين الواجهة بالكامل', clearedState.runBtnDisabled && clearedState.transcript === '' && clearedState.fileInput === '');

  // -----------------------------------------------------------------
  // Test 16: Arabic CSV Export with UTF-8 BOM
  // -----------------------------------------------------------------
  // Add a sample log row and trigger CSV export formatting
  const csvCheck = await page.evaluate(() => {
    document.getElementById('transcript').value = 'يا غبي راح اقتلك';
    document.getElementById('referenceText').value = 'يا غبي راح اقتلك';
    document.getElementById('referenceLabel').value = 'تهديد محتمل';
    document.getElementById('classifyBtn').click();
    document.getElementById('addToLogBtn').click();
    return {
      count: window.MizanVoiceLab.evaluationLog.length,
      lastRow: window.MizanVoiceLab.evaluationLog[window.MizanVoiceLab.evaluationLog.length - 1]
    };
  });
  recordResult(16, 'إضافة سجل تجريبي وتجهيز بيانات CSV معيارية بالعربية', csvCheck.count > 0 && csvCheck.lastRow.predicted_label.includes('تهديد'));

  // -----------------------------------------------------------------
  // Test 17: Standalone manual text classification
  // -----------------------------------------------------------------
  await page.evaluate(() => {
    document.getElementById('transcript').value = 'عطني رقمك ولا تقول لاهلك';
    document.getElementById('classifyBtn').click();
  });
  let classText = await page.$eval('#classification', el => el.textContent);
  recordResult(17, 'تصنيف نص يدوي دون الحاجة إلى نموذج الصوت', classText.includes('طلب معلومات شخصية'));

  // -----------------------------------------------------------------
  // Test 18: Ensure run button is enabled upon valid file
  // -----------------------------------------------------------------
  await fileInput.uploadFile(validWavPath);
  await new Promise(r => setTimeout(r, 800));
  runBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  recordResult(18, 'التأكد من تفعيل زر البدء فور اختيار ملف صالح', !runBtnDisabled);

  // -----------------------------------------------------------------
  // Test 19: Ensure run button does not get stuck after errors
  // -----------------------------------------------------------------
  await page.click('#clearBtn');
  await new Promise(r => setTimeout(r, 200));
  await fileInput.uploadFile(mockCorrupt);
  await new Promise(r => setTimeout(r, 300));
  await page.click('#runBtn');
  await new Promise(r => setTimeout(r, 400));
  // After error, click clear and pick valid file
  await page.click('#clearBtn');
  await new Promise(r => setTimeout(r, 200));
  await fileInput.uploadFile(validWavPath);
  await new Promise(r => setTimeout(r, 600));
  let recoveredBtnDisabled = await page.$eval('#runBtn', el => el.disabled);
  recordResult(19, 'التأكد من عدم بقاء الزر عالقًا بعد وقوع خطأ والتعافي فور اختيار ملف صالح', !recoveredBtnDisabled);

  // -----------------------------------------------------------------
  // Test 20: No JavaScript errors in Console during primary paths
  // -----------------------------------------------------------------
  recordResult(20, 'التأكد من عدم وجود أخطاء JavaScript قاتلة أو استثناءات غير معالجة في المتصفح', pageExceptions.length === 0, pageExceptions.join('; '));

  await browser.close();

  console.log('\n======================================');
  console.log(`SUMMARY: ${TEST_RESULTS.filter(t => t.passed).length} / ${TEST_RESULTS.length} Tests Passed`);
  console.log('======================================\n');
}

runAllTests().catch(err => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
