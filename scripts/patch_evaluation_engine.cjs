const fs = require('fs');

let html = fs.readFileSync('evaluation-engine.html', 'utf-8');
const compactJson = fs.readFileSync('data/compact_benchmark_for_ui.json', 'utf-8');

// 1. Update Header version & description
html = html.replace(
  '<h1>محرك التقييم والتدقيق الإحصائي — v0.3</h1>',
  '<h1>محرك التقييم والتدقيق الإحصائي — v0.4 (التقييم الصوتي والفرز المستقل)</h1>'
);

// 2. Add button in section 1
const oldBtnRow = `<div class="row">
    <input id="file" type="file" accept=".csv,text/csv" style="padding:8px; border:1px solid #bdccd8; border-radius:8px">
    <button id="calc">حساب المؤشرات من الملف</button>
    <button id="loadBenchmarkBtn" class="secondary" type="button">تحميل مجموعة الـ 30 سيناريو التوضيحية (نصوص مسودة)</button>
    <a href="./evaluation-results-template.csv" style="font-size:13.5px; margin:0 8px">تنزيل قالب CSV الفارغ</a>
  </div>`;

const newBtnRow = `<div class="row">
    <button id="loadAudioBenchmarkBtn" class="active-btn" type="button" style="background:var(--navy); color:white">مجموعة الاختبار الصوتي الفعلي (20 عينة — Tiny & Small)</button>
    <button id="loadBenchmarkBtn" class="secondary" type="button">السيناريوهات النصية التوضيحية (30 نصاً بلا صوت)</button>
    <input id="file" type="file" accept=".csv,text/csv,.json" style="padding:7px; border:1px solid #bdccd8; border-radius:8px">
    <button id="calc" class="secondary">حساب من الملف المرفوع</button>
    <a href="./data/audio_benchmark_results.csv" download style="font-size:13px; margin:0 8px">تنزيل نتائج الاختبار الصوتي (CSV)</a>
  </div>`;

html = html.replace(oldBtnRow, newBtnRow);

// 3. Add Comparison Table and Filter Tabs before Track 1
const modelCompSection = `
<!-- لوحة مقارنة النموذجين على نفس العينات الصوتية الفعلية -->
<section id="modelComparisonCard" class="card">
  <div class="track-header">
    <h3>مقارنة Whisper Tiny و Whisper Small على العينات الصوتية الفعلية نفسها (20 مقطعاً)</h3>
    <span class="badge badge-verified">مقارنة علمية عادلة ومزدوجة</span>
  </div>
  <p class="hint">
    تم تشغيل النموذجين محلياً على نفس العينات الصوتية الاصطناعية (Neural TTS ar-SA) لقياس الفارق الدقيق في دقة التفريغ وسرعة الأداء واستقرار التصنيف:
  </p>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>المؤشر الإحصائي</th>
          <th>Whisper Tiny (~40 MB)</th>
          <th>Whisper Small (~480 MB)</th>
          <th>الفارق والدلالة العلمية</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>معدل خطأ الكلمات بعد التطبيع (WER)</strong></td>
          <td><strong style="color:#b91c1c">74.87%</strong></td>
          <td><strong style="color:#047481">25.28%</strong></td>
          <td>تحسن الدقة الصامتة بمقدار <strong>49.6%</strong> لصالح Small</td>
        </tr>
        <tr>
          <td><strong>معدل خطأ الكلمات الخام (Raw WER)</strong></td>
          <td>77.57%</td>
          <td>36.30%</td>
          <td>انخفاض التشويه الإملائي بنسبة كبيرة</td>
        </tr>
        <tr>
          <td><strong>خطأ المتن الإجمالي (Corpus WER)</strong></td>
          <td>75.53%</td>
          <td>25.53%</td>
          <td>إجمالي تعديلات الكلمات على كامل المتن</td>
        </tr>
        <tr>
          <td><strong>عدد الاستبدالات الحرفية (Substitutions)</strong></td>
          <td>114 كلمة</td>
          <td>41 كلمة</td>
          <td>انخفاض استبدال الكلمات بنسبة 64%</td>
        </tr>
        <tr>
          <td><strong>عدد الكلمات المحذوفة (Deletions)</strong></td>
          <td>27 كلمة</td>
          <td>4 كلمات</td>
          <td>انخفاض إسقاط الكلمات بنسبة 85%</td>
        </tr>
        <tr>
          <td><strong>عدد الإضافات الخاطئة (Insertions)</strong></td>
          <td>1</td>
          <td>3</td>
          <td>معدل هلوسة منخفض جداً في كلا النموذجين</td>
        </tr>
        <tr>
          <td><strong>متوسط سرعة المعالجة للمقطع</strong></td>
          <td><strong>3.52 ثانية</strong></td>
          <td><strong>15.82 ثانية</strong></td>
          <td>Tiny أسرع بـ 4.5 أضعاف في بيئة المتصفح</td>
        </tr>
        <tr>
          <td><strong>نسبة استقرار تصنيف المحتوى</strong></td>
          <td>20.0%</td>
          <td><strong>80.0%</strong></td>
          <td>أخطاء Tiny شوّهت 80% من الكلمات، بينما Small حافظ على 80% من القرارات السليمة</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
`;

html = html.replace('<!-- المسار الأول: تقييم التعرف الآلي على الكلام (ASR) -->', modelCompSection + '\n<!-- المسار الأول: تقييم التعرف الآلي على الكلام (ASR) -->');

// 4. In Track 1 ASR section, add model filter buttons and raw wer metric
const oldTrack1Grid = `<div class="grid">
    <div class="metric">
      عدد المقاطع الصوتية المفحوصة
      <strong id="mAudioCount">0</strong>
      <small>تسجيلات فعلية</small>
    </div>
    <div class="metric" style="grid-column: span 2">
      متوسط معدل خطأ الكلمات (Average WER)
      <strong id="mWer" style="font-size:18px">لا توجد قياسات صوتية كافية بعد</strong>
      <small id="mWerNote">يتطلب تسجيلات صوتية فعلية مفرغة ونصوصاً مرجعية</small>
    </div>
  </div>`;

const newTrack1Grid = `
  <div class="row" style="margin-bottom:12px">
    <div class="pill-tab" id="modelFilterTab" style="display:inline-flex; background:#e2e8f0; border-radius:10px; padding:4px; gap:4px">
      <button class="active" data-model="both" style="background:white; color:var(--navy); padding:6px 14px; border-radius:7px; border:0; font-size:13px; font-weight:bold; cursor:pointer">كلا النموذجين (Tiny & Small)</button>
      <button data-model="Xenova/whisper-small" style="background:transparent; color:var(--navy); padding:6px 14px; border-radius:7px; border:0; font-size:13px; cursor:pointer">Whisper Small فقط</button>
      <button data-model="Xenova/whisper-tiny" style="background:transparent; color:var(--navy); padding:6px 14px; border-radius:7px; border:0; font-size:13px; cursor:pointer">Whisper Tiny فقط</button>
    </div>
  </div>

  <div class="grid">
    <div class="metric">
      عدد العينات المفحوصة
      <strong id="mAudioCount">0</strong>
      <small id="mAudioSub">تسجيلات فعلية</small>
    </div>
    <div class="metric">
      متوسط خطأ الكلمات المطبّع (WER)
      <strong id="mWer">لا توجد بيانات كافية</strong>
      <small id="mWerNote">يتطلب تسجيلات صوتية مفرغة ونصوصاً مرجعية</small>
    </div>
    <div class="metric">
      متوسط خطأ الكلمات الخام (Raw WER)
      <strong id="mRawWer">لا توجد بيانات كافية</strong>
      <small>قبل التطبيع الإملائي</small>
    </div>
    <div class="metric">
      إجمالي الكلمات والتعديلات
      <strong id="mTotalWords">0</strong>
      <small id="mEditsBreakdown">-</small>
    </div>
  </div>`;

html = html.replace(oldTrack1Grid, newTrack1Grid);

// 5. In Track 2, add track switch buttons (Track 1: Reference Text vs Track 2: Extracted Transcript)
const oldTrack2Header = `<p class="hint">
    يتم حساب هذه المؤشرات بتشغيل محرك القواعد الفعلي على نصوص الإدخال ومقارنتها بالتصنيف المرجعي البشري المستقل.
  </p>`;

const newTrack2Header = `<p class="hint">
    يتم هنا مقارنة <strong>المسار المرجعي الأول</strong> (تصنيف النص المرجعي الصحيح) مع <strong>المسار الكامل الثاني</strong> (تصنيف النص المستخرج من الصوت الفعلي):
  </p>
  <div class="row" style="margin-bottom:12px">
    <div class="pill-tab" id="trackSelectTab" style="display:inline-flex; background:#e2e8f0; border-radius:10px; padding:4px; gap:4px">
      <button class="active" data-track="track2" style="background:white; color:var(--navy); padding:6px 14px; border-radius:7px; border:0; font-size:13px; font-weight:bold; cursor:pointer">المسار الكامل (تأثير أخطاء الصوت على التصنيف)</button>
      <button data-track="track1" style="background:transparent; color:var(--navy); padding:6px 14px; border-radius:7px; border:0; font-size:13px; cursor:pointer">المسار المرجعي المستقل (النص الصحيح دون تشويه صوتي)</button>
    </div>
  </div>`;

html = html.replace(oldTrack2Header, newTrack2Header);

// 6. In Cases section, add CSV Export button
const oldCasesHeader = `<div class="track-header">
    <h3>سجل الحالات وتطابق التصنيف التفصيلي</h3>
    <button id="export" disabled>تصدير تقرير التدقيق الشامل (JSON)</button>
  </div>`;

const newCasesHeader = `<div class="track-header">
    <h3>سجل الحالات وتطابق التصنيف التفصيلي</h3>
    <div class="row">
      <button id="exportCsvBtn" class="secondary" type="button">تصدير النتائج التفصيلية (CSV)</button>
      <button id="export" disabled>تصدير تقرير التدقيق الشامل (JSON)</button>
    </div>
  </div>`;

html = html.replace(oldCasesHeader, newCasesHeader);

// 7. Inject ACTUAL_AUDIO_BENCHMARK above STARTER_DEMO_BENCHMARK
const benchmarkInject = `// ==========================================
// Embedded Real Audio Benchmark (20 Samples × 2 Models = 40 Executions)
// ==========================================
const ACTUAL_AUDIO_BENCHMARK = ${compactJson};

`;

html = html.replace('const STARTER_DEMO_BENCHMARK = [', benchmarkInject + 'const STARTER_DEMO_BENCHMARK = [');

// 8. Replace Script handlers from lines after STARTER_DEMO_BENCHMARK to end of file with rich logic
const scriptReplacementStart = html.indexOf('// ========================================== \n// 4. CSV Parser & Normalizer') !== -1 ?
  html.indexOf('// ========================================== \n// 4. CSV Parser & Normalizer') :
  html.indexOf('// ==========================================\n// 4. CSV Parser & Normalizer');

const scriptTail = `// ==========================================
// 4. App State & Mode Management
// ==========================================
let currentMode = 'audio_benchmark'; // 'audio_benchmark', 'demo_text', 'uploaded_file'
let selectedModelFilter = 'both'; // 'both', 'Xenova/whisper-tiny', 'Xenova/whisper-small'
let selectedClassificationTrack = 'track2'; // 'track1' (Ref text), 'track2' (Hyp text)
let rows = [];
let report = null;

function loadAudioBenchmark() {
  currentMode = 'audio_benchmark';
  document.getElementById('loadAudioBenchmarkBtn').style.background = 'var(--navy)';
  document.getElementById('loadAudioBenchmarkBtn').style.color = '#fff';
  document.getElementById('loadBenchmarkBtn').className = 'secondary';
  document.getElementById('loadBenchmarkBtn').style.background = '#e9f0f5';
  document.getElementById('loadBenchmarkBtn').style.color = 'var(--navy)';
  document.getElementById('modelComparisonCard').style.display = 'block';

  let raw = ACTUAL_AUDIO_BENCHMARK;
  if (selectedModelFilter !== 'both') {
    raw = raw.filter(r => r.model_id === selectedModelFilter);
  }

  rows = raw.map(r => ({
    scenario_id: r.id,
    file_name: r.id + '.mp3',
    asr_model: r.model_name,
    model_id: r.model_id,
    voice_name: r.voice,
    reference_label: r.gt_label,
    system_label: selectedClassificationTrack === 'track1' ? r.t1_label : r.t2_label,
    ground_truth_text: r.gt_text,
    extracted_text: r.hyp_text,
    text: selectedClassificationTrack === 'track1' ? r.gt_text : r.hyp_text,
    wer: r.norm_wer,
    raw_wer: r.raw_wer,
    ref_words: r.ref_words,
    subs: r.subs,
    dels: r.dels,
    ins: r.ins,
    time_ms: r.time_ms,
    classification_match: r.match
  }));

  const banner = document.getElementById('bannerNotice');
  banner.style.display = 'block';
  banner.className = 'notice-info';
  banner.innerHTML = '<strong>معاينة مجموعة الاختبار الصوتي الفعلي (20 عينة):</strong> تعرض البيانات أدناه نتائج تشغيل Whisper Tiny و Whisper Small على تسجيلات صوتية فعلية مولدة بأصوات سعودية عصبية (Neural TTS). تم فصل أداء التفريغ (WER) تماماً عن أداء تصنيف المحتوى.';

  document.getElementById('status').textContent = 'تم تحميل نتائج الاختبار الصوتي الفعلي بنجاح لـ ' + rows.length + ' حالة (' + (selectedModelFilter === 'both' ? 'مقارنة النموذجين' : selectedModelFilter) + ').';
  calculateAndRender();
}

function loadDemoBenchmark() {
  currentMode = 'demo_text';
  document.getElementById('loadBenchmarkBtn').style.background = 'var(--navy)';
  document.getElementById('loadBenchmarkBtn').style.color = '#fff';
  document.getElementById('loadAudioBenchmarkBtn').className = 'secondary';
  document.getElementById('loadAudioBenchmarkBtn').style.background = '#e9f0f5';
  document.getElementById('loadAudioBenchmarkBtn').style.color = 'var(--navy)';
  document.getElementById('modelComparisonCard').style.display = 'none';

  rows = STARTER_DEMO_BENCHMARK.map(item => {
    const runResult = classifyContent(item.text);
    return {
      scenario_id: item.id,
      file_name: 'نص تجريبي بلا ملف صوتي',
      asr_model: 'غير متوفر (نص فقط)',
      model_id: 'none',
      voice_name: 'غير متوفر',
      reference_label: item.ref,
      system_label: runResult.label,
      ground_truth_text: item.text,
      extracted_text: 'غير متوفر',
      text: item.text,
      wer: null, // Strictly null: no audio recording
      raw_wer: null,
      ref_words: null,
      subs: 0,
      dels: 0,
      ins: 0,
      time_ms: null,
      classification_match: (item.ref === runResult.label)
    };
  });

  const banner = document.getElementById('bannerNotice');
  banner.style.display = 'block';
  banner.className = 'notice';
  banner.innerHTML = '<strong>⚠️ تنبيه تدقيق علمي:</strong> تم تحميل مجموعة الـ 30 سيناريو التوضيحية (نصوص مصطنعة وليست تسجيلات صوتية). جرى تشغيل محرك قواعد التصنيف ديناميكياً على هذه النصوص في الوقت الحقيقي. لا يتوفر معدل خطأ الكلمات (WER) لهذه المجموعة لعدم وجود تسجيلات صوتية لها.';

  document.getElementById('status').textContent = 'تم تشغيل محرك قواعد التصنيف ديناميكياً على نصوص مجموعة الـ 30 سيناريو التوضيحية.';
  calculateAndRender();
}

// Helper functions
const isHarmful = s => {
  const norm = (s || '').trim().toLowerCase();
  return !['سليم', 'safe', 'benign', 'غير محسوم', 'غير محسوم صوتياً', 'مراجعة سياقية', 'مراجعة سياقية — مزاح أو لعب', 'مراجعة سياقية — مزاح أو سياق لعب', 'رفض مشاركة معلومات / تعبير وقائي', 'سليم مبدئياً — عبارات لعب أو شكر طبيعية', 'unknown', 'uncertain', 'لم تطابق القواعد أي مؤشر معروف', ''].includes(norm);
};

const pct = x => (x === null || isNaN(x)) ? 'لا توجد بيانات كافية' : (x * 100).toFixed(1) + '%';

// ==========================================
// 5. Calculations & Rendering
// ==========================================
function calculateAndRender() {
  const data = rows;
  if (!data || !data.length) {
    document.getElementById('status').textContent = 'لا توجد بيانات صالحة للحساب.';
    return;
  }

  const labels = [...new Set(data.flatMap(r => [r.reference_label, r.system_label]))].sort();
  const mat = Object.fromEntries(labels.map(a => [a, Object.fromEntries(labels.map(b => [b, 0]))]));

  let tp = 0, fp = 0, tn = 0, fn = 0, correct = 0, excluded = 0;
  let totalWer = 0, totalRawWer = 0, werCount = 0;
  let totalWords = 0, totalSubs = 0, totalDels = 0, totalIns = 0;

  for (let r of data) {
    mat[r.reference_label][r.system_label]++;
    if (r.reference_label === r.system_label) correct++;

    // Track 1 ASR stats
    if (r.wer !== null && r.wer !== undefined && r.wer !== '') {
      const num = parseFloat(String(r.wer).replace('%', ''));
      if (!isNaN(num)) {
        totalWer += num;
        werCount++;
      }
    }
    if (r.raw_wer !== null && r.raw_wer !== undefined && r.raw_wer !== '') {
      const numRaw = parseFloat(String(r.raw_wer).replace('%', ''));
      if (!isNaN(numRaw)) totalRawWer += numRaw;
    }
    if (r.ref_words) totalWords += r.ref_words;
    totalSubs += (r.subs || 0);
    totalDels += (r.dels || 0);
    totalIns += (r.ins || 0);

    // Track 2 Classification stats
    const a = (r.reference_label || '').trim();
    const b = (r.system_label || '').trim();

    if (['غير محسوم', 'غير محسوم صوتياً', 'مراجعة سياقية', 'مراجعة سياقية — مزاح أو لعب', 'مراجعة سياقية — مزاح أو سياق لعب'].includes(a)) {
      excluded++;
      continue;
    }

    const harmA = isHarmful(a);
    const harmB = isHarmful(b);

    if (harmA && harmB) tp++;
    else if (!harmA && harmB) fp++;
    else if (!harmA && !harmB) tn++;
    else fn++;
  }

  // Multi-class Accuracy
  const accuracy = data.length ? correct / data.length : null;

  // Binary Metrics
  const precision = (tp + fp) ? tp / (tp + fp) : null;
  const recall = (tp + fn) ? tp / (tp + fn) : null;
  const f1 = (precision !== null && recall !== null && (precision + recall)) ? (2 * precision * recall) / (precision + recall) : null;
  const fpr = (fp + tn) ? fp / (fp + tn) : null;

  // Track 1 UI
  document.getElementById('mAudioCount').textContent = werCount;
  if (werCount > 0) {
    document.getElementById('mWer').textContent = (totalWer / werCount).toFixed(1) + '%';
    document.getElementById('mRawWer').textContent = (totalRawWer / werCount).toFixed(1) + '%';
    document.getElementById('mTotalWords').textContent = totalWords;
    document.getElementById('mEditsBreakdown').textContent = 'الاستبدال: ' + totalSubs + ' | الحذف: ' + totalDels + ' | الإضافة: ' + totalIns;
    document.getElementById('mAudioSub').textContent = 'تسجيلات فعلية (' + werCount + ' قياس)';
    document.getElementById('mWerNote').textContent = 'محسوب بعد التطبيع الإملائي من ' + werCount + ' تشغيل فعلي لـ Whisper';
    document.getElementById('asrDataBadge').className = 'badge badge-verified';
    document.getElementById('asrDataBadge').textContent = 'تم التحقق صوتياً (' + werCount + ' قياس)';
  } else {
    document.getElementById('mWer').textContent = 'لا توجد بيانات كافية';
    document.getElementById('mRawWer').textContent = 'لا توجد بيانات كافية';
    document.getElementById('mTotalWords').textContent = 'غير متوفر';
    document.getElementById('mEditsBreakdown').textContent = 'لا توجد تسجيلات صوتية لهذه المجموعة';
    document.getElementById('mAudioSub').textContent = 'بيانات نصية فقط';
    document.getElementById('mWerNote').textContent = 'يتطلب تشغيل ملفات صوتية لحساب WER';
    document.getElementById('asrDataBadge').className = 'badge badge-na';
    document.getElementById('asrDataBadge').textContent = 'بيانات نصية فقط (لا يوجد WER)';
  }

  // Track 2 UI
  document.getElementById('mCount').textContent = data.length;
  document.getElementById('mAcc').textContent = pct(accuracy);
  document.getElementById('mPrec').textContent = pct(precision);
  document.getElementById('mRec').textContent = pct(recall);
  document.getElementById('mF1').textContent = pct(f1);
  document.getElementById('mFpr').textContent = pct(fpr);

  const classBadge = document.getElementById('classDataBadge');
  if (currentMode === 'demo_text') {
    classBadge.className = 'badge badge-demo';
    classBadge.textContent = 'نتائج مجموعة العرض التوضيحية (نصوص مصطنعة بلا صوت)';
  } else {
    classBadge.className = 'badge badge-verified';
    classBadge.textContent = selectedClassificationTrack === 'track1' ? 'المسار الأول: النص المرجعي المستقل' : 'المسار الثاني: النص المستخرج من الصوت';
  }

  // Render Confusion Matrix
  let htmlMat = '<table><thead><tr><th>المرجع البشري ↓ / نتيجة النظام →</th>' + labels.map(l => '<th>' + l + '</th>').join('') + '<th>المجموع</th></tr></thead><tbody>';
  for (let a of labels) {
    let rowTotal = 0;
    htmlMat += '<tr><th>' + a + '</th>';
    for (let b of labels) {
      const val = mat[a][b];
      rowTotal += val;
      const isDiag = (a === b && val > 0);
      htmlMat += '<td class="' + (isDiag ? 'diagonal' : '') + '">' + val + '</td>';
    }
    htmlMat += '<th>' + rowTotal + '</th></tr>';
  }
  htmlMat += '</tbody></table>';
  document.getElementById('matrix').innerHTML = htmlMat;

  // Render Cases Table
  let casesHtml = '<table><thead><tr><th>المعرّف</th><th>نموذج التفريغ</th><th>النص المرجعي الصحيح</th><th>النص المستخرج من الصوت</th><th>خطأ التفريغ (WER)</th><th>التصنيف المرجعي</th><th>تصنيف النظام</th><th>الحالة</th></tr></thead><tbody>';
  for (let r of data) {
    const isMatch = (r.reference_label === r.system_label);
    const werDisplay = (r.wer !== null && r.wer !== undefined && r.wer !== '') ? r.wer : 'غير متوفر (نص)';
    casesHtml += '<tr>' +
      '<td><strong>' + r.scenario_id + '</strong></td>' +
      '<td><span class="badge ' + (r.asr_model.includes('Small') ? 'badge-verified' : 'badge-demo') + '">' + r.asr_model + '</span></td>' +
      '<td style="text-align:right; max-width:240px">' + (r.ground_truth_text || r.text || '-') + '</td>' +
      '<td style="text-align:right; max-width:240px">' + (r.extracted_text || '-') + '</td>' +
      '<td><strong>' + werDisplay + '</strong></td>' +
      '<td>' + r.reference_label + '</td>' +
      '<td>' + r.system_label + '</td>' +
      '<td><span class="badge ' + (isMatch ? 'badge-verified' : 'badge-demo') + '">' + (isMatch ? 'تطابق' : 'اختلاف') + '</span></td>' +
    '</tr>';
  }
  casesHtml += '</tbody></table>';
  document.getElementById('casesTableWrap').innerHTML = casesHtml;

  // Build Report Object for JSON Export
  report = {
    project: 'Mizan Voice',
    engine_version: '0.4 - Audited with Real Audio & Two-Track Classification',
    timestamp: new Date().toISOString(),
    dataset_metadata: {
      mode: currentMode,
      selected_model_filter: selectedModelFilter,
      selected_classification_track: selectedClassificationTrack,
      total_cases: data.length,
      sample_nature: currentMode === 'audio_benchmark' ? 'synthetic_arabic_neural_voices (ar-SA)' : 'text_only_draft_scenarios',
      synthetic_notice: 'العينات الصوتية اصطناعية عصبية ولا تغني عن الاختبارات الميدانية البشرية.'
    },
    track_1_asr: {
      status: werCount > 0 ? 'measured_from_audio' : 'no_audio_measurements_yet',
      samples_tested: werCount,
      average_normalized_wer: werCount > 0 ? (totalWer / werCount).toFixed(2) + '%' : null,
      average_raw_wer: werCount > 0 ? (totalRawWer / werCount).toFixed(2) + '%' : null,
      total_reference_words: totalWords,
      total_substitutions: totalSubs,
      total_deletions: totalDels,
      total_insertions: totalIns
    },
    track_2_classification: {
      track_evaluated: selectedClassificationTrack,
      accuracy: accuracy,
      precision: precision,
      recall: recall,
      f1_score: f1,
      false_positive_rate: fpr,
      cases_count: {
        total: data.length,
        true_positives: tp,
        false_positives: fp,
        true_negatives: tn,
        false_negatives: fn,
        excluded_contextual: excluded
      },
      confusion_matrix: mat
    }
  };

  document.getElementById('export').disabled = false;
  document.getElementById('status').textContent = 'تم الحساب والتدقيق بنجاح لـ ' + data.length + ' حالة.';
}

// ==========================================
// 6. Interactive Event Handlers
// ==========================================
document.getElementById('loadAudioBenchmarkBtn').onclick = loadAudioBenchmark;
document.getElementById('loadBenchmarkBtn').onclick = loadDemoBenchmark;

// Model filter tabs
document.getElementById('modelFilterTab').addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#modelFilterTab button').forEach(b => {
    b.style.background = 'transparent';
    b.style.fontWeight = 'normal';
  });
  e.target.style.background = 'white';
  e.target.style.fontWeight = 'bold';
  selectedModelFilter = e.target.getAttribute('data-model');
  loadAudioBenchmark();
});

// Classification track tabs
document.getElementById('trackSelectTab').addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#trackSelectTab button').forEach(b => {
    b.style.background = 'transparent';
    b.style.fontWeight = 'normal';
  });
  e.target.style.background = 'white';
  e.target.style.fontWeight = 'bold';
  selectedClassificationTrack = e.target.getAttribute('data-track');
  if (currentMode === 'audio_benchmark') loadAudioBenchmark();
  else calculateAndRender();
});

// JSON Export
document.getElementById('export').onclick = () => {
  if (!report) return;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mizan-voice-scientific-audit-report-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// CSV Export
document.getElementById('exportCsvBtn').onclick = () => {
  if (!rows || !rows.length) return;
  const headers = ['scenario_id', 'model_name', 'reference_label', 'system_label', 'wer', 'ground_truth_text', 'extracted_text', 'classification_match'];
  const formatCell = v => '"' + String(v || '').replace(/"/g, '""') + '"';
  const csvLines = [
    headers.join(','),
    ...rows.map(r => [
      r.scenario_id,
      formatCell(r.asr_model),
      formatCell(r.reference_label),
      formatCell(r.system_label),
      formatCell(r.wer),
      formatCell(r.ground_truth_text || r.text),
      formatCell(r.extracted_text),
      r.classification_match
    ].join(','))
  ];
  const blob = new Blob(['\\uFEFF' + csvLines.join('\\r\\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mizan-voice-evaluation-results-' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// File Upload Handler
document.getElementById('file').onchange = async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      const parsed = JSON.parse(text);
      const rawRows = parsed.results || parsed;
      rows = rawRows.map((r, i) => ({
        scenario_id: r.sample_id || r.id || ('ID-' + (i + 1)),
        file_name: r.file_name || file.name,
        asr_model: r.model_name || r.asr_model || 'غير محدد',
        model_id: r.model_id || 'unknown',
        voice_name: r.voice_name || 'غير محدد',
        reference_label: r.ground_truth_label || r.reference_label || '',
        system_label: r.system_label || (r.extracted_transcript ? classifyContent(r.extracted_transcript).label : classifyContent(r.ground_truth_text || '').label),
        ground_truth_text: r.ground_truth_text || r.text || '',
        extracted_text: r.extracted_transcript || r.transcript || '',
        text: r.extracted_transcript || r.ground_truth_text || r.text || '',
        wer: r.norm_wer_pct || r.wer || null,
        raw_wer: r.raw_wer_pct || r.raw_wer || null,
        ref_words: r.ref_words_count || null,
        subs: r.substitutions || 0,
        dels: r.deletions || 0,
        ins: r.insertions || 0,
        time_ms: r.processing_time_ms || null,
        classification_match: (r.ground_truth_label === (r.system_label || (r.extracted_transcript ? classifyContent(r.extracted_transcript).label : '')))
      }));
    } else {
      // Basic CSV parser
      const lines = text.split(/\\r?\\n/).filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      rows = lines.slice(1).map((l, i) => {
        const parts = l.split(',');
        const row = Object.fromEntries(headers.map((h, idx) => [h, (parts[idx] || '').trim().replace(/^"|"$/g, '')]));
        const ref = row.ground_truth_label || row.reference_label || row.reference || '';
        const t = row.extracted_transcript || row.transcript || row.ground_truth_text || row.text || '';
        const sys = row.system_label || (t ? classifyContent(t).label : '');
        return {
          scenario_id: row.sample_id || row.scenario_id || ('ID-' + (i + 1)),
          file_name: file.name,
          asr_model: row.model_name || row.asr_model || 'ملف مرفوع',
          model_id: row.model_id || 'custom',
          voice_name: row.voice_name || 'غير محدد',
          reference_label: ref,
          system_label: sys,
          ground_truth_text: row.ground_truth_text || t,
          extracted_text: row.extracted_transcript || t,
          text: t,
          wer: row.norm_wer_pct || row.wer || null,
          raw_wer: row.raw_wer_pct || null,
          ref_words: parseInt(row.ref_words_count) || null,
          subs: parseInt(row.substitutions) || 0,
          dels: parseInt(row.deletions) || 0,
          ins: parseInt(row.insertions) || 0,
          time_ms: parseInt(row.processing_time_ms) || null,
          classification_match: (ref === sys)
        };
      });
    }

    currentMode = 'uploaded_file';
    document.getElementById('loadAudioBenchmarkBtn').style.background = '#e9f0f5';
    document.getElementById('loadAudioBenchmarkBtn').style.color = 'var(--navy)';
    document.getElementById('loadBenchmarkBtn').style.background = '#e9f0f5';
    document.getElementById('loadBenchmarkBtn').style.color = 'var(--navy)';
    document.getElementById('modelComparisonCard').style.display = 'none';
    document.getElementById('status').textContent = 'تم تحميل ' + rows.length + ' حالة من الملف المرفوع: ' + file.name;
    calculateAndRender();
  } catch (err) {
    document.getElementById('status').textContent = 'خطأ في معالجة الملف: ' + err.message;
  }
};

document.getElementById('calc').onclick = () => {
  if (!rows.length) {
    document.getElementById('status').textContent = 'يرجى اختيار مجموعة بيانات أو رفع ملف أولاً.';
    return;
  }
  calculateAndRender();
};

// Initial Load
loadAudioBenchmark();

// Expose for testing
window.MizanVoiceEngine = {
  classifyContent,
  normalizeArabic,
  ACTUAL_AUDIO_BENCHMARK,
  STARTER_DEMO_BENCHMARK,
  calculateAndRender
};
</script>
</body>
</html>`;

const newHtml = html.slice(0, scriptReplacementStart) + scriptTail;
fs.writeFileSync('evaluation-engine.html', newHtml, 'utf-8');
console.log('Successfully patched evaluation-engine.html!');
