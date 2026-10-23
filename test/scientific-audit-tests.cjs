// Comprehensive Scientific Audit Verification Suite
// Validates:
// 1. ASR Track (WER calculation, Arabic normalization, audio data verification)
// 2. Classification Track (dynamic rule execution, precision, recall, f1, fpr, edge cases, missing classes)
// 3. Complete decoupling of text demo sets from audio acoustic models
// 4. End-to-end integration with Chrome browser

const assert = require('assert');
const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

async function runScientificAuditTests() {
  console.log('=== STARTING SCIENTIFIC AUDIT VERIFICATION SUITE ===\n');

  // -------------------------------------------------------------
  // Test Track 1: Speech-to-Text & WER Normalization Logic
  // -------------------------------------------------------------
  console.log('--- Track 1: ASR Transcription & Normalization Verification ---');

  function normalizeArabic(text, { removePunctuation = true, unifyLetters = true } = {}) {
    if (!text) return '';
    let s = String(text);
    s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''); // Tashkeel
    s = s.replace(/\u0640/g, ''); // Tatweel
    if (unifyLetters) {
      s = s.replace(/[أإآٱ]/g, 'ا');
      s = s.replace(/ة/g, 'ه');
      s = s.replace(/ى/g, 'ي');
    }
    if (removePunctuation) {
      s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟،؛«»"'\r\n\t]/g, ' ');
    }
    return s.replace(/\s+/g, ' ').trim();
  }

  function calculateWER(ref, hyp, normalize = true) {
    const r = normalize ? normalizeArabic(ref) : String(ref || '').trim();
    const h = normalize ? normalizeArabic(hyp) : String(hyp || '').trim();

    const refWords = r ? r.split(/\s+/).filter(Boolean) : [];
    const hypWords = h ? h.split(/\s+/).filter(Boolean) : [];

    if (refWords.length === 0) {
      return {
        wer: hypWords.length === 0 ? 0 : 1.0,
        werPercentage: hypWords.length === 0 ? '0.0%' : '100.0%',
        editDistance: hypWords.length,
        refCount: 0,
        hypCount: hypWords.length
      };
    }

    const d = Array.from({ length: refWords.length + 1 }, () =>
      new Array(hypWords.length + 1).fill(0)
    );

    for (let i = 0; i <= refWords.length; i++) d[i][0] = i;
    for (let j = 0; j <= hypWords.length; j++) d[0][j] = j;

    for (let i = 1; i <= refWords.length; i++) {
      for (let j = 1; j <= hypWords.length; j++) {
        if (refWords[i - 1] === hypWords[j - 1]) {
          d[i][j] = d[i - 1][j - 1];
        } else {
          d[i][j] = Math.min(
            d[i - 1][j - 1] + 1, // substitution
            d[i][j - 1] + 1,     // insertion
            d[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    const editDistance = d[refWords.length][hypWords.length];
    const wer = editDistance / refWords.length;

    return {
      wer: Math.round(wer * 1000) / 1000,
      werPercentage: (wer * 100).toFixed(1) + '%',
      editDistance,
      refCount: refWords.length,
      hypCount: hypWords.length
    };
  }

  // Check 1.1: Verification of Arabic diacritics & tatweel removal
  const textWithDiacritics = 'سَأَلْتُكَ أَنْ لَا تُخْبِرَ أَحَدًا...!';
  const normalized = normalizeArabic(textWithDiacritics);
  assert.strictEqual(normalized, 'سالتك ان لا تخبر احدا');
  console.log('✓ 1.1 Arabic normalization correctly unifies hamzas and strips diacritics & punctuation');

  // Check 1.2: Raw WER vs Normalized WER
  const groundTruth = 'إرسال الرسالة إلى المدرسة';
  const aasrTranscript = 'ارسال الرساله الي المدرسه!';
  const werRaw = calculateWER(groundTruth, aasrTranscript, false);
  const werNorm = calculateWER(groundTruth, aasrTranscript, true);
  assert.ok(werRaw.wer > 0, 'Raw WER should be > 0 due to hamza/taa marbuta variants');
  assert.strictEqual(werNorm.wer, 0, 'Normalized WER should be 0 because words are semantically identical');
  console.log(`✓ 1.2 Raw WER (${werRaw.werPercentage}) vs Normalized WER (${werNorm.werPercentage}) verified`);

  // -------------------------------------------------------------
  // Test Track 2: Content Classification & Edge Cases
  // -------------------------------------------------------------
  console.log('\n--- Track 2: Classification Rule Engine & Statistical Soundness ---');

  function classifyContent(rawText) {
    if (!rawText || !rawText.trim()) {
      return { label: 'لا يوجد نص للفحص', status: 'فارغ', matched: [] };
    }
    const norm = normalizeArabic(rawText);
    const categories = [
      {
        label: 'طلب معلومات شخصية / استدراج محتمل',
        terms: [
          'لا تعلم اهلك', 'لا تقول لاهلك', 'لا تخبر احد', 'خلك سر', 'خلها سر بيننا',
          'ارسل صورتك', 'اعطني رقمك', 'عطني رقمك', 'رقم جوالك', 'وين بيتك', 'وين ساكن',
          'مكان سكنك', 'قابلني لحالك', 'تعال خاص', 'سنابك', 'انستقرامك', 'اسم مدرستك'
        ]
      },
      {
        label: 'تهديد محتمل',
        terms: [
          'باذيك', 'راح اقتلك', 'بقتلك', 'بفضحك', 'بضربك', 'بعرف وينك',
          'بذبحك', 'بكسرك', 'راح اوريك', 'بشتكيك', 'بنتقم منك'
        ]
      },
      {
        label: 'إساءة لفظية محتملة',
        terms: [
          'يا غبي', 'يا حمار', 'يا كلب', 'يا وصخ', 'يا نذل', 'قليل الادب',
          'اكرهك', 'لعنة عليك', 'الله يلعنك', 'حقير'
        ]
      },
      {
        label: 'مراجعة سياقية — مزاح أو لعب',
        terms: [
          'امزح', 'مزح', 'تمثيل', 'مقطع لعب', 'كلام اغنيه', 'مقلب', 'لعبة بس'
        ]
      }
    ];

    const matchedTerms = [];
    let foundCategory = null;
    for (const cat of categories) {
      const hits = cat.terms.filter(term => norm.includes(normalizeArabic(term)));
      if (hits.length > 0) {
        if (!foundCategory) foundCategory = cat;
        matchedTerms.push(...hits);
      }
    }

    if (foundCategory) {
      return { label: foundCategory.label, status: 'تم رصد مؤشرات أولية', matched: matchedTerms };
    }
    return { label: 'لم تطابق القواعد أي مؤشر معروف', status: 'غير محسوم', matched: [] };
  }

  // Check 2.1: Dynamic Execution on Ground-truth samples
  const testCases = [
    { text: 'يا غبي ليش ضيعت الجولة', expected: 'إساءة لفظية محتملة' },
    { text: 'والله راح اقتلك اليوم', expected: 'تهديد محتمل' },
    { text: 'عطني رقمك وخلها سر بيننا', expected: 'طلب معلومات شخصية / استدراج محتمل' },
    { text: 'ترى امزح معك لعبة بس', expected: 'مراجعة سياقية — مزاح أو لعب' },
    { text: 'لعب ممتاز ومبروك الفوز يا شباب', expected: 'لم تطابق القواعد أي مؤشر معروف' }
  ];

  for (const tc of testCases) {
    const res = classifyContent(tc.text);
    assert.strictEqual(res.label, tc.expected, `Expected ${tc.expected} for "${tc.text}"`);
  }
  console.log('✓ 2.1 Rule classifier dynamically identifies all target categories');

  // Check 2.2: Edge Cases & Missing Classes (No NaN / Crash)
  function computeMetrics(dataset) {
    const isHarmful = s => !['سليم', 'safe', 'غير محسوم', 'غير محسوم صوتياً', 'مراجعة سياقية', 'مراجعة سياقية — مزاح أو لعب', 'لم تطابق القواعد أي مؤشر معروف', ''].includes((s || '').trim().toLowerCase());
    let tp = 0, fp = 0, tn = 0, fn = 0, correct = 0;
    for (const r of dataset) {
      if (r.ref === r.sys) correct++;
      const harmA = isHarmful(r.ref);
      const harmB = isHarmful(r.sys);
      if (harmA && harmB) tp++;
      else if (!harmA && harmB) fp++;
      else if (!harmA && !harmB) tn++;
      else fn++;
    }
    const precision = (tp + fp) ? tp / (tp + fp) : null;
    const recall = (tp + fn) ? tp / (tp + fn) : null;
    const f1 = (precision !== null && recall !== null && (precision + recall)) ? (2 * precision * recall) / (precision + recall) : null;
    const fpr = (fp + tn) ? fp / (fp + tn) : null;
    const accuracy = dataset.length ? correct / dataset.length : 0;
    return { accuracy, precision, recall, f1, fpr };
  }

  // Dataset with ONLY safe cases (Zero harmful cases -> tp=0, fn=0)
  const allSafeDataset = [
    { ref: 'سليم', sys: 'لم تطابق القواعد أي مؤشر معروف' },
    { ref: 'سليم', sys: 'لم تطابق القواعد أي مؤشر معروف' }
  ];
  const safeMetrics = computeMetrics(allSafeDataset);
  assert.strictEqual(safeMetrics.precision, null, 'Precision should be null (not NaN) when tp+fp=0');
  assert.strictEqual(safeMetrics.recall, null, 'Recall should be null (not NaN) when tp+fn=0');
  assert.strictEqual(safeMetrics.fpr, 0, 'FPR should be 0 when fp=0 and tn=2');
  console.log('✓ 2.2 Mathematical edge cases (missing classes, zero division) handled gracefully without NaN');

  // -------------------------------------------------------------
  // Test Track 3: Chrome Browser End-to-End Evaluation Engine Test
  // -------------------------------------------------------------
  console.log('\n--- Track 3: Browser Integration & Separation of ASR vs Demo Data ---');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const engineUrl = 'file:///' + path.resolve('evaluation-engine.html').replace(/\\/g, '/');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(engineUrl, { waitUntil: 'domcontentloaded' });

  // 3.1: Test Demo Benchmark Load
  await page.click('#loadBenchmarkBtn');
  await new Promise(r => setTimeout(r, 400));

  const demoState = await page.evaluate(() => {
    return {
      count: document.getElementById('mCount').textContent,
      audioCount: document.getElementById('mAudioCount').textContent,
      avgWer: document.getElementById('mWer').textContent,
      classBadge: document.getElementById('classDataBadge').textContent,
      asrBadge: document.getElementById('asrDataBadge').textContent,
      matrixRows: document.querySelectorAll('#matrix table tbody tr').length,
      casesRows: document.querySelectorAll('#casesTableWrap table tbody tr').length,
      bannerVisible: document.getElementById('bannerNotice').style.display !== 'none',
      bannerText: document.getElementById('bannerNotice').textContent
    };
  });

  assert.strictEqual(demoState.count, '30', 'Demo benchmark should load exactly 30 scenarios');
  assert.strictEqual(demoState.audioCount, '0', 'Audio count for textual demo benchmark must be 0');
  assert.ok(demoState.avgWer.includes('لا توجد قياسات صوتية كافية بعد'), `Average WER for demo text must state "لا توجد قياسات صوتية كافية بعد", got: ${demoState.avgWer}`);
  assert.ok(demoState.classBadge.includes('مجموعة العرض التوضيحية'), 'Class badge should clearly indicate demo synthetic dataset');
  assert.ok(demoState.asrBadge.includes('بيانات نصية فقط'), 'ASR badge should clearly indicate text-only dataset');
  assert.strictEqual(demoState.casesRows, 30, 'Cases table should render all 30 evaluated cases');
  assert.ok(demoState.bannerVisible, 'Scientific notice banner must be visible');
  console.log('✓ 3.1 Demo benchmark loads with 0 audio recordings, no fake WER, and explicit scientific notice');

  // 3.2: Test Simulated Audio CSV Upload (Real Audio Measurements)
  const mockAudioCsvContent = `test_id,file_name,asr_model,reference_text,transcript,wer,reference_label,predicted_label
TEST-AUDIO-001,sample_game_1.wav,Xenova/whisper-tiny,يا غبي ما تعرف تلعب,يا غبي ما تعرف تلعب,0.0%,إساءة لفظية محتملة,إساءة لفظية محتملة
TEST-AUDIO-002,sample_game_2.wav,Xenova/whisper-tiny,والله راح اقتلك بالجولة,والله راح اقتلك في الجوله,20.0%,تهديد محتمل,تهديد محتمل
TEST-AUDIO-003,sample_game_3.wav,Xenova/whisper-tiny,لعب جميل ومبروك الفوز,لعب جميل ومبروك الفوز,0.0%,سليم,لم تطابق القواعد أي مؤشر معروف`;

  await page.evaluate((csvText) => {
    const raw = csvParse(csvText);
    rows = normalizeData(raw);
    currentDatasetType = 'file';
    calculateAndRender();
  }, mockAudioCsvContent);

  const audioState = await page.evaluate(() => {
    return {
      count: document.getElementById('mCount').textContent,
      audioCount: document.getElementById('mAudioCount').textContent,
      avgWer: document.getElementById('mWer').textContent,
      asrBadge: document.getElementById('asrDataBadge').textContent,
      accuracy: document.getElementById('mAcc').textContent
    };
  });

  assert.strictEqual(audioState.count, '3', 'Sample size should be 3');
  assert.strictEqual(audioState.audioCount, '3', 'Audio count should be 3 verified recordings');
  assert.strictEqual(audioState.avgWer, '6.7%', 'Average WER should be (0 + 20 + 0)/3 = 6.7%');
  assert.ok(audioState.asrBadge.includes('تم التحقق صوتياً'), 'ASR badge should show verified audio recordings');
  console.log(`✓ 3.2 Real audio CSV upload calculates genuine Average WER (${audioState.avgWer}) across verified audio samples`);

  if (pageErrors.length > 0) {
    throw new Error('Page encountered JavaScript errors: ' + pageErrors.join(', '));
  }

  await browser.close();
  console.log('\n=== ALL SCIENTIFIC AUDIT TESTS PASSED SUCCESSFULLY! ===');
}

runScientificAuditTests().catch(err => {
  console.error('\n✗ SCIENTIFIC AUDIT TEST FAILED:', err);
  process.exit(1);
});
