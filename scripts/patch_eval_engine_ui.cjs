const fs = require('fs');
const path = require('path');

const evalHtmlPath = path.join(__dirname, '..', 'evaluation-engine.html');
let html = fs.readFileSync(evalHtmlPath, 'utf8');

// 1. Update Comparison Table
const oldTableRegex = /<div class="table-wrap">\s*<table>\s*<thead>\s*<tr>\s*<th>المؤشر الإحصائي<\/th>[\s\S]*?<\/tbody>\s*<\/table>\s*<\/div>/;

const newTableHtml = `<div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>المؤشر الإحصائي والمنهجي</th>
          <th>Whisper Tiny (~40 MB)</th>
          <th>Whisper Small (~480 MB)</th>
          <th>الفارق والدلالة العلمية والميدانية</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>معدل خطأ الكلمات المطبّع (Normalized WER)</strong></td>
          <td><strong style="color:#b91c1c">74.87%</strong></td>
          <td><strong style="color:#047481">25.27%</strong></td>
          <td>تحسن الدقة الصامتة بمقدار <strong>49.6%</strong> لصالح Small</td>
        </tr>
        <tr>
          <td><strong>معدل خطأ الكلمات الخام (Raw WER)</strong></td>
          <td>77.57%</td>
          <td>36.30%</td>
          <td>انخفاض التشويه الإملائي بنسبة كبيرة جداً</td>
        </tr>
        <tr>
          <td><strong>خطأ المتن الإجمالي (Corpus WER)</strong></td>
          <td>75.53%</td>
          <td>25.53%</td>
          <td>إجمالي تعديلات الكلمات على كامل المتن الصوتي</td>
        </tr>
        <tr>
          <td><strong>متوسط سرعة المعالجة للمقطع</strong></td>
          <td><strong>3.52 ثانية</strong></td>
          <td><strong>15.82 ثانية</strong></td>
          <td>Tiny أسرع بـ 4.5 أضعاف في بيئة المتصفح الخفيفة</td>
        </tr>
        <tr>
          <td><strong>التطابق متعدد الفئات بعد التفريغ (Accuracy)</strong></td>
          <td><strong style="color:#b91c1c">35.0%</strong> (7/20)</td>
          <td><strong style="color:#047481">90.0%</strong> (18/20)</td>
          <td>Small يحقق استقراراً عالياً في التصنيف المتعدد (18 من أصل 20 حالة)</td>
        </tr>
        <tr>
          <td><strong>حالات اكتشاف الخطر المفوتة (Missed Harm - FN)</strong></td>
          <td><strong style="color:#b91c1c">9 حالات</strong> (81.8% تفويت)</td>
          <td><strong style="color:#047481">0 حالات</strong> (0.0% تفويت - تغطية 100%)</td>
          <td>أخطاء Tiny الصوتية حجبت 9 حالات إساءة وتهديد؛ بينما التقط Small كل الحالات الضارة</td>
        </tr>
        <tr>
          <td><strong>الإنذارات الخاطئة لمحتوى سليم (False Positives - FPR)</strong></td>
          <td><strong>0 حالات (0.0%)</strong></td>
          <td><strong>0 حالات (0.0%)</strong></td>
          <td>صفر إنذارات خاطئة في كلا النموذجين بفضل قواعد استبعاد المزاح ورفض مشاركة البيانات</td>
        </tr>
        <tr>
          <td><strong>الحالات المحالة للمراجعة البشرية / سياقية</strong></td>
          <td>13 حالة (65.0%)</td>
          <td>4 حالات (20.0%)</td>
          <td>Tiny يعجز عن الحسم في أغلب المقاطع المشوهة، بينما Small يحسم 80% منها بثقة</td>
        </tr>
      </tbody>
    </table>
  </div>`;

html = html.replace(oldTableRegex, newTableHtml);

// 2. Add Section 5 (Error Root Cause Analysis) right after Section 4
const section4End = `</section>\n\n<div class="row" style="margin:24px 4px">`;

const section5Html = `<!-- 5. سجل تحليل الأخطاء والإنذارات الخاطئة -->
<section class="card" id="errorAnalysisSection">
  <div class="track-header">
    <h2>5) سجل تحليل الأخطاء والإنذارات الخاطئة وأسبابها الجذرية (Root Cause Error Analysis)</h2>
    <span id="errorReportBadge" class="badge badge-verified">تشخيص علمي معتمد</span>
  </div>
  <p class="hint">
    يوثق هذا الجدول أسباب الاختلافات والإنذارات الخاطئة والحالات المحالة للمراجعة البشرية، مبيناً ما إذا كان السبب يعود إلى تشويه التفريغ الصوتي (ASR)، أم قصور القواعد، أم غموض وسياق مزدوج، مع الإجراء المقترح لمعالجة كل حالة.
  </p>
  <div class="row" style="margin-bottom:12px">
    <button id="showErrorsOnlyBtn" class="active-btn" type="button" style="background:var(--navy); color:white; padding:6px 14px; border-radius:7px; border:0; font-size:13px; font-weight:bold; cursor:pointer">عرض حالات الاختلاف والتحويل للمراجعة فقط</button>
    <button id="showAllAnalysisBtn" class="secondary" type="button" style="padding:6px 14px; border-radius:7px; border:1px solid #cbd5e1; font-size:13px; cursor:pointer">عرض تشخيص جميع العينات</button>
    <a href="./data/mizan_voice_error_analysis_report.json" download style="font-size:13px; margin:0 8px">تنزيل تقرير الأخطاء الشامل (JSON)</a>
    <a href="./data/model_comparison_tiny_vs_small.csv" download style="font-size:13px; margin:0 8px">مقارنة النموذجين (CSV)</a>
  </div>
  <div id="errorAnalysisTableWrap" class="table-wrap">
    <div style="text-align:center; padding:20px; color:var(--muted)">جارٍ تحميل سجل الأخطاء...</div>
  </div>
</section>

` + section4End;

if (!html.includes('id="errorAnalysisSection"')) {
  html = html.replace(section4End, section5Html);
}

// 3. Update calculateAndRender and helper functions
// Replace toCanonicalCategory and matrix calculations
const calcLogicOldRegex = /function calculateAndRender\(\)[\s\S]*?document\.getElementById\('status'\)\.textContent = 'تم الحساب والتدقيق بنجاح لـ ' \+ data\.length \+ ' حالة\x2E';\s*\}/;

const newCalcLogic = `const CANONICAL_CLASSES = ['سليم', 'إساءة', 'تهديد', 'طلب معلومات شخصية', 'مراجعة سياقية'];

function toCanonicalCategory(label) {
  if (!label) return 'مراجعة سياقية';
  const str = String(label).trim();
  if (str === 'سليم' || str.includes('سليم') || str.includes('رفض مشاركة معلومات')) return 'سليم';
  if (str === 'إساءة' || str.includes('إساءة')) return 'إساءة';
  if (str === 'تهديد' || str.includes('تهديد')) return 'تهديد';
  if (str === 'طلب معلومات شخصية' || str.includes('استدراج') || str.includes('طلب معلومات')) return 'طلب معلومات شخصية';
  if (str === 'مراجعة سياقية' || str.includes('مراجعة سياقية') || str.includes('سياق لعب') || str.includes('مزاح') || str.includes('لم تطابق') || str.includes('غير محسوم')) return 'مراجعة سياقية';
  return 'مراجعة سياقية';
}

let showOnlyErrorsInAnalysis = true;

function calculateAndRender() {
  const data = rows;
  if (!data || !data.length) {
    document.getElementById('status').textContent = 'لا توجد بيانات صالحة للحساب.';
    return;
  }

  // Canonical 5x5 Confusion Matrix
  const mat = Object.fromEntries(CANONICAL_CLASSES.map(a => [a, Object.fromEntries(CANONICAL_CLASSES.map(b => [b, 0]))]));

  let tp = 0, fp = 0, tn = 0, fn = 0, correctCanonical = 0, excludedContextual = 0;
  let totalWer = 0, totalRawWer = 0, werCount = 0;
  let totalWords = 0, totalSubs = 0, totalDels = 0, totalIns = 0;

  for (let r of data) {
    const refCanon = toCanonicalCategory(r.reference_label);
    const sysCanon = toCanonicalCategory(r.system_label);

    mat[refCanon][sysCanon]++;
    if (refCanon === sysCanon) {
      correctCanonical++;
    }

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

    // Track 2 Binary Harm Detection:
    // Harmful: ['إساءة', 'تهديد', 'طلب معلومات شخصية']
    // Safe: ['سليم'] (including protective refusals)
    // Contextual / Ambiguous / Review: ['مراجعة سياقية'] (excluded from binary denominator)
    if (refCanon === 'مراجعة سياقية') {
      excludedContextual++;
      continue;
    }

    const harmRef = ['إساءة', 'تهديد', 'طلب معلومات شخصية'].includes(refCanon);
    const harmSys = ['إساءة', 'تهديد', 'طلب معلومات شخصية'].includes(sysCanon);

    if (harmRef && harmSys) tp++;
    else if (!harmRef && harmSys) fp++;
    else if (!harmRef && !harmSys) tn++;
    else fn++;
  }

  // Multi-class Accuracy
  const accuracy = data.length ? correctCanonical / data.length : null;

  // Binary Metrics
  const precision = (tp + fp) ? tp / (tp + fp) : ((tp + fn > 0) ? 0 : 1.0);
  const recall = (tp + fn) ? tp / (tp + fn) : null;
  const f1 = (precision !== null && recall !== null && (precision + recall)) ? (2 * precision * recall) / (precision + recall) : ((tp === 0) ? 0 : null);
  const fpr = (fp + tn) ? fp / (fp + tn) : 0;

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
    document.getElementById('mWer').textContent = 'لا توجد بيانات كافية (لا توجد قياسات صوتية كافية بعد)';
    document.getElementById('mRawWer').textContent = 'لا توجد بيانات كافية (لا توجد قياسات صوتية كافية بعد)';
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

  // Render Canonical Confusion Matrix
  let htmlMat = '<table><thead><tr><th>الفئة المرجعية (Ground Truth) ↓ / نتيجة النظام →</th>' +
    CANONICAL_CLASSES.map(l => '<th>' + l + '</th>').join('') +
    '<th>المجموع</th></tr></thead><tbody>';

  for (let a of CANONICAL_CLASSES) {
    let rowTotal = 0;
    htmlMat += '<tr><th>' + a + '</th>';
    for (let b of CANONICAL_CLASSES) {
      const val = mat[a][b];
      rowTotal += val;
      const isDiag = (a === b && val > 0);
      htmlMat += '<td class="' + (isDiag ? 'diagonal' : '') + '">' + val + '</td>';
    }
    htmlMat += '<th>' + rowTotal + '</th></tr>';
  }
  htmlMat += '</tbody></table>';

  // Add Binary Harm detection explanation under matrix
  htmlMat += '<div class="notice-info" style="margin-top:12px; font-size:13px">' +
    '<strong>إحصائيات اكتشاف المحتوى الضار (Binary Harm Detection):</strong> ' +
    'حجم العينة الداخلة في القياس الثنائي الصارم: <strong>' + (tp + fp + tn + fn) + ' حالة</strong> ' +
    '(الحالات الضارة: ' + (tp + fn) + ' | الحالات السليمة: ' + (tn + fp) + ')، ' +
    'مع استبعاد <strong>' + excludedContextual + ' حالات</strong> مراجعة سياقية أو ملتبسة لتجنب التحيز. ' +
    '<br><strong>التوزيع الثنائي:</strong> TP: ' + tp + ' | FP: ' + fp + ' | TN: ' + tn + ' | FN: ' + fn + ' ' +
    '· الدقة (Precision): ' + pct(precision) + ' · الاستدعاء (Recall): ' + pct(recall) + ' · المقياس المتوازن (F1): ' + pct(f1) + ' · الإنذارات الخاطئة (FPR): ' + pct(fpr) +
    '</div>';

  document.getElementById('matrix').innerHTML = htmlMat;

  // Render Cases Table
  let casesHtml = '<table><thead><tr><th>المعرّف</th><th>نموذج التفريغ</th><th>النص المرجعي الصحيح</th><th>النص المستخرج من الصوت</th><th>خطأ التفريغ (WER)</th><th>التصنيف المرجعي</th><th>تصنيف النظام</th><th>الحالة</th></tr></thead><tbody>';
  for (let r of data) {
    const refC = toCanonicalCategory(r.reference_label);
    const sysC = toCanonicalCategory(r.system_label);
    const isMatch = (refC === sysC);
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

  // Render Section 5: Error Root Cause Analysis Table
  renderErrorAnalysisTable();

  // Build Report Object for JSON Export
  report = {
    project: 'Mizan Voice',
    engine_version: '0.5 - Canonical Multi-Class & Error Root Cause Analysis',
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
      multi_class_accuracy: accuracy,
      binary_harm_metrics: {
        precision: precision,
        recall: recall,
        f1_score: f1,
        false_positive_rate: fpr,
        cohort_counts: {
          total: data.length,
          evaluated_binary: (tp + fp + tn + fn),
          true_positives: tp,
          false_positives: fp,
          true_negatives: tn,
          false_negatives: fn,
          excluded_contextual: excludedContextual
        }
      },
      confusion_matrix: mat
    }
  };

  document.getElementById('export').disabled = false;
  document.getElementById('status').textContent = 'تم الحساب والتدقيق بنجاح لـ ' + data.length + ' حالة.';
}

function renderErrorAnalysisTable() {
  const tableWrap = document.getElementById('errorAnalysisTableWrap');
  if (!tableWrap) return;

  let benchmarkData = ACTUAL_AUDIO_BENCHMARK;
  if (selectedModelFilter !== 'both') {
    benchmarkData = benchmarkData.filter(r => r.model_id === selectedModelFilter);
  }

  let filtered = benchmarkData;
  if (showOnlyErrorsInAnalysis) {
    filtered = benchmarkData.filter(r => !r.match || r.gt_canonical !== r.t2_canonical);
  }

  if (filtered.length === 0) {
    tableWrap.innerHTML = '<div style="text-align:center; padding:20px; color:#155724; background:#d4edda; border-radius:8px"><strong>ممتاز! لا توجد حالات أخطاء أو اختلافات في الفلتر الحالي.</strong></div>';
    return;
  }

  let html = '<table><thead><tr>' +
    '<th>المعرّف</th>' +
    '<th>النموذج</th>' +
    '<th>النص المنطوق المرجعي</th>' +
    '<th>النص المستخرج من Whisper</th>' +
    '<th>التصنيف المرجعي</th>' +
    '<th>تصنيف النظام</th>' +
    '<th>السبب الجذري للاختلاف</th>' +
    '<th>الإجراء المقترح للمعالجة</th>' +
    '</tr></thead><tbody>';

  for (let item of filtered) {
    const isError = !item.match || (item.gt_canonical !== item.t2_canonical);
    const rootCause = item.error_root_cause || (isError ? 'اختلاف في التفريغ أو القواعد' : 'مطابقة تامة');
    const remediation = item.proposed_remediation || 'مراجعة نموذج التفريغ أو القواعد.';

    html += '<tr>' +
      '<td><strong>' + item.id + '</strong></td>' +
      '<td><span class="badge ' + (item.model_name.includes('Small') ? 'badge-verified' : 'badge-demo') + '">' + item.model_name + '</span></td>' +
      '<td style="text-align:right; max-width:200px">' + item.gt_text + '</td>' +
      '<td style="text-align:right; max-width:200px">' + item.hyp_text + '</td>' +
      '<td><span class="pill">' + item.gt_canonical + '</span></td>' +
      '<td><span class="pill" style="' + (isError ? 'background:#fee2e2; color:#991b1b' : '') + '">' + item.t2_canonical + '</span></td>' +
      '<td><strong>' + rootCause + '</strong></td>' +
      '<td style="font-size:12px; color:var(--muted)">' + remediation + '</td>' +
    '</tr>';
  }

  html += '</tbody></table>';
  tableWrap.innerHTML = html;
}

// Error analysis filter listeners
document.addEventListener('DOMContentLoaded', () => {
  const errBtn = document.getElementById('showErrorsOnlyBtn');
  const allBtn = document.getElementById('showAllAnalysisBtn');
  if (errBtn && allBtn) {
    errBtn.onclick = () => {
      showOnlyErrorsInAnalysis = true;
      errBtn.style.background = 'var(--navy)';
      errBtn.style.color = 'white';
      allBtn.style.background = 'transparent';
      allBtn.style.color = 'var(--navy)';
      renderErrorAnalysisTable();
    };
    allBtn.onclick = () => {
      showOnlyErrorsInAnalysis = false;
      allBtn.style.background = 'var(--navy)';
      allBtn.style.color = 'white';
      errBtn.style.background = 'transparent';
      errBtn.style.color = 'var(--navy)';
      renderErrorAnalysisTable();
    };
  }
});`;

html = html.replace(calcLogicOldRegex, newCalcLogic);

fs.writeFileSync(evalHtmlPath, html, 'utf8');
console.log('Successfully patched evaluation-engine.html with Canonical Confusion Matrix and Section 5 Error Analysis!');
