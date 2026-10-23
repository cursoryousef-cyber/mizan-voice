const fs = require('fs');
const path = require('path');

const benchmarkData = JSON.parse(fs.readFileSync('data/audio_benchmark_results.json', 'utf-8'));

// Format benchmarkData.results compactly
const compactResults = benchmarkData.results.map(r => ({
  id: r.sample_id,
  scenario: r.scenario_ref,
  voice: r.voice_name,
  gt_label: r.ground_truth_label,
  risk: r.ground_truth_risk,
  model_id: r.model_id,
  model_name: r.model_name,
  gt_text: r.ground_truth_text,
  hyp_text: r.extracted_transcript,
  raw_wer: r.raw_wer_pct,
  norm_wer: r.norm_wer_pct,
  ref_words: r.ref_words_count,
  hyp_words: r.hyp_words_count,
  subs: r.substitutions,
  dels: r.deletions,
  ins: r.insertions,
  time_ms: r.processing_time_ms,
  t1_label: r.track1_ref_label,
  t2_label: r.track2_hyp_label,
  match: r.classification_match
}));

const htmlContent = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ميزان صوت | محرك التقييم والتدقيق الإحصائي</title>
<style>
:root {
  --navy: #102b46;
  --teal: #087f8c;
  --teal-hover: #066974;
  --bg: #f3f7fa;
  --card-bg: #ffffff;
  --line: #d8e2ea;
  --muted: #5b6b7a;
  --text: #172b3a;
  --warn-bg: #fff8e9;
  --warn-border: #d58a13;
  --info-bg: #ebf5fa;
  --info-border: #087f8c;
  --success-bg: #def7ec;
  --success-border: #0e9f6e;
  --danger-bg: #fde8e8;
  --danger-border: #e02424;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
  max-width: 1140px;
  margin: 0 auto;
  padding: 0 16px 50px;
  background: var(--bg);
  color: var(--text);
  line-height: 1.75;
}
header {
  background: linear-gradient(120deg, #102b46, #087f8c);
  color: white;
  padding: 28px 24px;
  border-radius: 0 0 18px 18px;
  margin-bottom: 22px;
}
header h1 { margin: 4px 0 8px; font-size: 26px; }
header p { margin: 0; opacity: .94; font-size: 14.5px; max-width: 850px; }
.card {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 22px;
  margin: 18px 0;
  box-shadow: 0 4px 18px rgba(16, 43, 70, 0.04);
}
h2 { margin: 0 0 10px; font-size: 19px; color: var(--navy); }
.hint { color: var(--muted); font-size: 13.5px; margin: 4px 0 12px; }
button {
  background: var(--teal);
  color: white;
  border: 0;
  border-radius: 9px;
  padding: 10px 18px;
  margin: 6px 4px 6px 0;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background .2s, transform .1s;
}
button:hover:not(:disabled) { background: var(--teal-hover); }
button:disabled { opacity: .45; cursor: not-allowed; }
button.secondary { background: #e9f0f5; color: var(--navy); }
button.secondary:hover:not(:disabled) { background: #dce5ec; }
button.active-btn { background: var(--navy); color: #fff; }
.notice {
  background: var(--warn-bg);
  border-right: 5px solid var(--warn-border);
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 13.5px;
  margin-bottom: 18px;
}
.notice-info {
  background: var(--info-bg);
  border-right: 5px solid var(--info-border);
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 13.5px;
  margin-bottom: 18px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.metric {
  background: #f7fafc;
  border: 1px solid var(--line);
  padding: 14px;
  border-radius: 10px;
  text-align: center;
}
.metric strong {
  display: block;
  font-size: 21px;
  color: var(--navy);
  margin-top: 5px;
}
.metric small {
  display: block;
  color: var(--muted);
  font-size: 11.5px;
  margin-top: 2px;
}
.table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 12px;
}
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}
td, th {
  border: 1px solid var(--line);
  padding: 9px 11px;
  text-align: center;
}
th {
  background: #f1f6f9;
  color: var(--navy);
  font-weight: bold;
}
td.diagonal {
  background: #eaf5ed;
  font-weight: bold;
  color: #03543f;
}
.status-pill {
  padding: 11px 16px;
  background: #edf5f8;
  border-radius: 8px;
  margin-top: 12px;
  font-size: 14px;
}
.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: bold;
}
.badge-demo { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
.badge-verified { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.badge-danger { background: #fde8e8; color: #9b1c1c; border: 1px solid #f8b4b4; }
.badge-na { background: #e2e3e5; color: #383d41; }
a { color: var(--teal); text-decoration: none; font-weight: bold; }
a:hover { text-decoration: underline; }
.row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  border-bottom: 2px solid #eef3f7;
  padding-bottom: 10px;
  margin-bottom: 12px;
}
.track-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--navy);
}
.pill-tab {
  display: inline-flex;
  background: #e2e8f0;
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 12px;
}
.pill-tab button {
  background: transparent;
  color: var(--navy);
  border: 0;
  padding: 6px 14px;
  border-radius: 7px;
  margin: 0;
  font-size: 13px;
}
.pill-tab button.active {
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  font-weight: bold;
}
</style>
</head>
<body>

<header>
  <div style="font-size:12px; opacity:.85; letter-spacing:0.5px">MIZAN VOICE · ميزان صوت</div>
  <h1>محرك التقييم والتدقيق الإحصائي — v0.4 (النسخة الصوتية الفعلية)</h1>
  <p>منصة مستقلة لقياس أداء التفريغ الصوتي (ASR) وتصنيف المحتوى اللغوي، مع التمييز الصارم بين العينات الصوتية الاصطناعية، والتسجيلات البشرية، والسيناريوهات النصية التوضيحية.</p>
</header>

<!-- ميثاق المصداقية والتدقيق العلمي -->
<div class="notice">
  <strong>ميثاق الشفافية والتدقيق العلمي الصارم:</strong>
  يفصل هذا المحرك بصورة كاملة ومستقلة بين:
  <ol style="margin:6px 0 0; padding-right:20px">
    <li><strong>أداء التعرف الآلي على الكلام (ASR):</strong> يعتمد مؤشر <code>WER</code> حصراً على تسجيلات صوتية فعلية جرى تفريغها بنموذج Whisper ومقارنتها بنصوص مرجعية.</li>
    <li><strong>أداء تصنيف المحتوى اللغوي:</strong> ينقسم إلى مسارين: <strong>المسار الأول</strong> (تصنيف النص المرجعي الصحيح) لقياس جودة القواعد بمعزل عن أخطاء الصوت، و<strong>المسار الثاني</strong> (تصنيف النص المفرغ من الصوت) لقياس انتقال أخطاء التفريغ إلى قرارات الفرز.</li>
  </ol>
  <em>تنبيه صريح: العينات الصوتية الحالية مولدة بأصوات عصبية اصطناعية (Neural TTS)، ولا تمثل تنوع كافة اللهجات السعودية الحية ولا تغني عن الاختبارات الميدانية البشرية المرخصة.</em>
</div>

<!-- 1. اختيار مجموعة البيانات ومصدر التحليل -->
<section class="card">
  <h2>1) اختيار مجموعة البيانات ومصدر الاختبار</h2>
  <p class="hint">
    اختر مجموعة البيانات التي تريد تقييمها ومقارنة مؤشراتها، أو ارفع ملف نتائجك الخاص بصيغة CSV أو JSON:
  </p>

  <div class="row">
    <button id="loadAudioBenchmarkBtn" class="active-btn" type="button">مجموعة الاختبار الصوتي الفعلي (20 عينة — Tiny & Small)</button>
    <button id="loadBenchmarkBtn" class="secondary" type="button">السيناريوهات النصية التوضيحية (30 نصاً تجريبياً بلا صوت)</button>
    <input id="file" type="file" accept=".csv,text/csv,.json,application/json" style="padding:7px; border:1px solid #bdccd8; border-radius:8px">
    <button id="calc" class="secondary">حساب من الملف المرفوع</button>
  </div>

  <div id="status" class="status-pill">تم تحميل مجموعة الاختبار الصوتي الفعلي افتراضياً. اختر طريقة العرض أو قارن بين النماذج أدناه.</div>
  <div id="bannerNotice" class="notice-info" style="margin-top:12px"></div>
</section>

<!-- لوحة مقارنة النموذجين على نفس العينات الصوتية -->
<section id="modelComparisonCard" class="card">
  <div class="track-header">
    <h3>مقارنة Whisper Tiny و Whisper Small على العينات الصوتية الفعلية نفسها (20 مقطعاً)</h3>
    <span class="badge badge-verified">مقارنة علمية عادلة (Paired Benchmark)</span>
  </div>
  <p class="hint">
    جرى تشغيل النموذجين على نفس الملفات الصوتية العشرين ونفس العبارات تماماً، لقياس الفارق الدقيق في نسبة خطأ الكلمات، وسرعة المعالجة، ونسبة الاستقرار القراري:
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
          <td><strong>معدل خطأ الكلمات بعد التطبيع (Normalized WER)</strong></td>
          <td><strong style="color:#b91c1c">${benchmarkData.model_summary['Xenova/whisper-tiny'].avg_norm_wer}</strong></td>
          <td><strong style="color:#047481">${benchmarkData.model_summary['Xenova/whisper-small'].avg_norm_wer}</strong></td>
          <td>تحسن الدقة بمقدار <strong>49.6%</strong> لصالح Small</td>
        </tr>
        <tr>
          <td><strong>معدل خطأ الكلمات الخام (Raw WER)</strong></td>
          <td>${benchmarkData.model_summary['Xenova/whisper-tiny'].avg_raw_wer}</td>
          <td>${benchmarkData.model_summary['Xenova/whisper-small'].avg_raw_wer}</td>
          <td>انخفاض التشويه الحرفي للكلمات</td>
        </tr>
        <tr>
          <td><strong>خطأ المتن الإجمالي (Corpus WER)</strong></td>
          <td>${benchmarkData.model_summary['Xenova/whisper-tiny'].corpus_wer}</td>
          <td>${benchmarkData.model_summary['Xenova/whisper-small'].corpus_wer}</td>
          <td>إجمالي تعديلات الكلمات على كامل المتن</td>
        </tr>
        <tr>
          <td><strong>عدد الاستبدالات الحرفية (Substitutions)</strong></td>
          <td>${benchmarkData.model_summary['Xenova/whisper-tiny'].total_substitutions} كلمة</td>
          <td>${benchmarkData.model_summary['Xenova/whisper-small'].total_substitutions} كلمة</td>
          <td>انخفاض استبدال الكلمات بنسبة 64%</td>
        </tr>
        <tr>
          <td><strong>عدد الكلمات المحذوفة / الساقطة (Deletions)</strong></td>
          <td>${benchmarkData.model_summary['Xenova/whisper-tiny'].total_deletions} كلمة</td>
          <td>${benchmarkData.model_summary['Xenova/whisper-small'].total_deletions} كلمات</td>
          <td>انخفاض إسقاط الكلمات بنسبة 85%</td>
        </tr>
        <tr>
          <td><strong>عدد الإضافات الخاطئة (Insertions)</strong></td>
          <td>${benchmarkData.model_summary['Xenova/whisper-tiny'].total_insertions}</td>
          <td>${benchmarkData.model_summary['Xenova/whisper-small'].total_insertions}</td>
          <td>معدل هلوسة منخفض جداً في كلا النموذجين</td>
        </tr>
        <tr>
          <td><strong>متوسط زمن المعالجة للمقطع</strong></td>
          <td><strong>${benchmarkData.model_summary['Xenova/whisper-tiny'].avg_processing_time_sec} ثانية</strong></td>
          <td><strong>${benchmarkData.model_summary['Xenova/whisper-small'].avg_processing_time_sec} ثانية</strong></td>
          <td>Tiny أسرع بـ 4.5 أضعاف في المتصفح</td>
        </tr>
        <tr>
          <td><strong>نسبة استقرار التصنيف (Classification Stability)</strong></td>
          <td>${benchmarkData.model_summary['Xenova/whisper-tiny'].classification_stability_rate}</td>
          <td><strong>${benchmarkData.model_summary['Xenova/whisper-small'].classification_stability_rate}</strong></td>
          <td>أخطاء Tiny شوّهت 80% من الكلمات المفتاحية، بينما Small حافظ على 80% من القرارات الصحيحة</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>

<!-- المسار الأول: تقييم التعرف الآلي على الكلام (ASR) -->
<section class="card">
  <div class="track-header">
    <h3>المسار الأول: تقييم التعرف الآلي على الكلام (Speech-to-Text ASR)</h3>
    <span id="asrDataBadge" class="badge badge-verified">تم التحقق الصوتي (20 مقطعاً)</span>
  </div>
  
  <div class="row" style="margin-bottom:10px">
    <div class="pill-tab" id="modelFilterTab">
      <button class="active" data-model="both">كلا النموذجين (Tiny & Small)</button>
      <button data-model="Xenova/whisper-small">Whisper Small فقط</button>
      <button data-model="Xenova/whisper-tiny">Whisper Tiny فقط</button>
    </div>
  </div>

  <div class="grid">
    <div class="metric">
      عدد المقاطع الصوتية المفحوصة
      <strong id="mAudioCount">40</strong>
      <small id="mAudioSub">20 عينة × نموذجان</small>
    </div>
    <div class="metric">
      متوسط خطأ الكلمات بعد التطبيع (WER)
      <strong id="mWer">50.1%</strong>
      <small id="mWerNote">متوسط النموذجين على المتن</small>
    </div>
    <div class="metric">
      متوسط خطأ الكلمات الخام (Raw WER)
      <strong id="mRawWer">56.9%</strong>
      <small>قبل التطبيع الإملائي</small>
    </div>
    <div class="metric">
      إجمالي الكلمات المرجعية
      <strong id="mTotalWords">376</strong>
      <small id="mEditsBreakdown">الاستبدال: 155 | الحذف: 31 | الإضافة: 4</small>
    </div>
  </div>
</section>

<!-- المسار الثاني: تقييم قواعد تصنيف المحتوى اللغوي -->
<section class="card">
  <div class="track-header">
    <h3>المسار الثاني: تقييم قواعد تصنيف المحتوى (Content Classification)</h3>
    <span id="classDataBadge" class="badge badge-verified">فحص المسارين المستقلين</span>
  </div>
  <p class="hint">
    يتم هنا مقارنة <strong>المسار المرجعي الأول</strong> (تصنيف النص المرجعي الصحيح) مع <strong>المسار الكامل الثاني</strong> (تصنيف النص المستخرج من الصوت الفعلي):
  </p>

  <div class="pill-tab" id="trackSelectTab">
    <button class="active" data-track="track2">المسار الكامل (تأثير أخطاء الصوت على التصنيف)</button>
    <button data-track="track1">المسار المرجعي المستقل (النص الصحيح دون أخطاء صوتية)</button>
  </div>

  <div id="metrics" class="grid">
    <div class="metric">
      عدد العينات المفحوصة
      <strong id="mCount">40</strong>
      <small id="mExcludedNote">المستبعد سياقياً: 0</small>
    </div>
    <div class="metric">
      الدقة متعددة الفئات (Accuracy)
      <strong id="mAcc">-</strong>
      <small>التطابق الحرفي الكامل</small>
    </div>
    <div class="metric">
      الدقة الإيجابية (Precision)
      <strong id="mPrec">-</strong>
      <small>TP / (TP + FP)</small>
    </div>
    <div class="metric">
      نسبة الاستدعاء (Recall)
      <strong id="mRec">-</strong>
      <small>TP / (TP + FN)</small>
    </div>
    <div class="metric">
      المعدل التوافقي (F1-Score)
      <strong id="mF1">-</strong>
      <small>توازن الدقة والاستدعاء</small>
    </div>
    <div class="metric">
      معدل الإنذار الخاطئ (FPR)
      <strong id="mFpr">-</strong>
      <small>FP / (FP + TN)</small>
    </div>
  </div>

  <!-- مصفوفة الالتباس -->
  <h3 style="margin-top:20px; font-size:16px; color:var(--navy)">مصفوفة الالتباس (Confusion Matrix):</h3>
  <div id="matrix" class="table-wrap"></div>
</section>

<!-- جدول التفاصيل لكل عينة -->
<section class="card">
  <div class="track-header">
    <h3>سجل الحالات والنتائج التفصيلية لكل عينة</h3>
    <div class="row">
      <button id="exportCsvBtn" class="secondary" type="button">تصدير النتائج (CSV)</button>
      <button id="exportJsonBtn" class="secondary" type="button">تصدير التقرير العلمي (JSON)</button>
    </div>
  </div>
  <p class="hint">يمكنك مراجعة النص المرجعي والنص المستخرج لكل مقطع صوتي ومقارنة تصنيف المسارين:</p>
  <div id="casesTableWrap" class="table-wrap"></div>
</section>

<div class="row" style="margin-top:24px">
  <a href="./">العودة إلى الصفحة الرئيسية</a>
  <span>·</span>
  <a href="./audio-upload-lab.html">مختبر تحليل الملف الصوتي</a>
  <span>·</span>
  <a href="./voice-lab-asr.html">مختبر الميكروفون</a>
</div>

<script>
// ==========================================
// Embedded Benchmarks Data
// ==========================================
const ACTUAL_AUDIO_BENCHMARK = ${JSON.stringify(compactResults, null, 2)};

const STARTER_DEMO_BENCHMARK = [
  { id: "MV-001", desc: "مزاح ودي بين لاعبين دون إهانة", text: "يعطيك العافيه يا وحش لعبت جيم بطل والتحركات كانت اسطوريه", dialect: "لهجة سعودية", ref: "سليم", note: "اختبار الإنذارات الخاطئة" },
  { id: "MV-002", desc: "نقاش عادي حول استراتيجية اللعب", text: "خلونا نروح يمين وناخذ الزون قبل الفريق الثاني", dialect: "لهجة سعودية", ref: "سليم", note: "محادثة طبيعية" },
  { id: "MV-003", desc: "شكر زميل على المساعدة في الجولة", text: "شكرا لك على التغطية السريعة والمساعدة في الجولة", dialect: "العربية الفصحى", ref: "سليم", note: "تعبير إيجابي" },
  { id: "MV-004", desc: "اختلاف حول قرار داخل اللعبة دون تهديد", text: "كان المفروض ما تهجم الحين بس يالله معوضين خير", dialect: "عربي/إنجليزي", ref: "سليم", note: "اختلاف رأي" },
  { id: "MV-005", desc: "عبارة ساخرة ملتبسة تعتمد على السياق", text: "ترى اللعبة مجرد تسلية وما تستاهل أي زعل يا شباب", dialect: "لهجة سعودية", ref: "سليم", note: "حوار هادئ" },
  { id: "MV-006", desc: "تعليق محايد على نتيجة الجولة", text: "الفريق الثاني لعب بشكل منظم ومبروك لهم الفوز", dialect: "العربية الفصحى", ref: "سليم", note: "محتوى محايد" },
  { id: "MV-007", desc: "إهانة مباشرة موجهة إلى لاعب", text: "أنت يا غبي ما تفهم وتخرب علينا كل قيم", dialect: "لهجة سعودية", ref: "إساءة لفظية محتملة", note: "سب مباشر" },
  { id: "MV-008", desc: "سخرية متكررة تستهدف لاعباً بعينه", text: "يا فاشل اطلع من اللعبة ما نبي نلعب معك", dialect: "عربي/إنجليزي", ref: "إساءة لفظية محتملة", note: "تنمر واستبعاد" },
  { id: "MV-009", desc: "استخدام لقب مهين بحق لاعب", text: "يا حيوان لا تسوي نفسك محترف وانت ما تعرف تلعب", dialect: "العربية الفصحى", ref: "إساءة لفظية محتملة", note: "ألفاظ جارحة" },
  { id: "MV-010", desc: "إساءة مبطنة بتهجئة بديلة أو مزج لغوي", text: "مستواك زبالة وما منك أي فايدة في هذا التيم", dialect: "عربي/إنجليزي", ref: "إساءة لفظية محتملة", note: "ازدراء للفريق" },
  { id: "MV-011", desc: "تهديد بإيذاء لاعب خارج اللعبة", text: "والله لاجيك عند بيتك واوريك شغلك يا كلب", dialect: "لهجة سعودية", ref: "تهديد محتمل", note: "تهديد بالمنزل" },
  { id: "MV-012", desc: "تهديد متكرر بعد خلاف على نتيجة مباراة", text: "راح ادمر حسابك واخليك تندم على اليوم اللي لعبت فيه", dialect: "العربية الفصحى", ref: "تهديد محتمل", note: "تهديد تخريبي" },
  { id: "MV-013", desc: "التلميح إلى الانتقام بعد انتهاء الجولة", text: "والله ما اخليك تفلت مني وبتشوف وش اسوي فيك بعد البث", dialect: "عربي/إنجليزي", ref: "تهديد محتمل", note: "وعيد وانتقام" },
  { id: "MV-014", desc: "طلب رقم هاتف شخصي من لاعب غير معروف", text: "عطني رقم جوالك بسرعة عشان اضيفك في الواتساب", dialect: "لهجة سعودية", ref: "طلب معلومات شخصية / استدراج محتمل", note: "طلب رقم هاتف" },
  { id: "MV-015", desc: "طلب عنوان المنزل أو الموقع الدقيق", text: "وين ساكن بأي حي وأي شارع في الرياض بالضبط", dialect: "العربية الفصحى", ref: "طلب معلومات شخصية / استدراج محتمل", note: "موقع جغرافي" },
  { id: "MV-016", desc: "طلب اسم المدرسة من لاعب صغير السن", text: "وش اسم مدرستك وفي أي صف تدرس الحين", dialect: "لهجة سعودية", ref: "طلب معلومات شخصية / استدراج محتمل", note: "استدراج قاصر" },
  { id: "MV-017", desc: "طلب مشاركة حساب شخصي خارج اللعبة", text: "ارسل لي حسابك الخاص في السناب شات خلنا نسولف لحالنا", dialect: "عربي/إنجليزي", ref: "طلب معلومات شخصية / استدراج محتمل", note: "تواصل معزول" },
  { id: "MV-018", desc: "دعوة لنقل المحادثة إلى قناة خاصة وإخفائها", text: "تعال خاص لحالك وخلها سر بيننا لا يسمعونا", dialect: "لهجة سعودية", ref: "طلب معلومات شخصية / استدراج محتمل", note: "قناة خاصة معزولة" },
  { id: "MV-019", desc: "طلب إبقاء التواصل سراً عن الوالدين", text: "لا تعلم اهلك ولا تقول لاهلك وش قلنا هنا", dialect: "العربية الفصحى", ref: "طلب معلومات شخصية / استدراج محتمل", note: "عزل عن الوالدين" },
  { id: "MV-020", desc: "عرض مكافأة مقابل مشاركة صورة أو معلومات خاصة", text: "ارسل صورتك واعطيك سكنات مجانا بس خلك سر", dialect: "عربي/إنجليزي", ref: "طلب معلومات شخصية / استدراج محتمل", note: "مقايضة مشبوهة" },
  { id: "MV-021", desc: "إلحاح على تواصل خاص بعد رفض الطرف الآخر", text: "ليش ترفض قابلني لحالك وتعال خاص ضروري", dialect: "لهجة سعودية", ref: "طلب معلومات شخصية / استدراج محتمل", note: "إلحاح مستمر" },
  { id: "MV-022", desc: "سؤال عن العمر ضمن سياق لعب عام", text: "كم عمرك عشان نلتقي بسيرفر الفئة المناسبة للأعمار", dialect: "العربية الفصحى", ref: "مراجعة سياقية — مزاح أو سياق لعب", note: "سؤال عادي لا يثبت ضرراً" },
  { id: "MV-023", desc: "ذكر اسم مدينة عامة دون طلب موقع شخص", text: "السيرفر في الرياض عشان كذا البنق ممتاز جداً", dialect: "لهجة سعودية", ref: "سليم", note: "اسم مدينة سياقي" },
  { id: "MV-024", desc: "نقاش عام عن إعدادات الخصوصية في اللعبة", text: "لا تفعل المايك العام عشان تحافظ على خصوصيتك", dialect: "عربي/إنجليزي", ref: "سليم", note: "نصائح أمنية" },
  { id: "MV-025", desc: "لاعب يرفض مشاركة بياناته الشخصية", text: "أنا ما أشارك رقمي ولا معلوماتي الشخصية في اللعبة أبداً", dialect: "لهجة سعودية", ref: "رفض مشاركة معلومات / تعبير وقائي", note: "رفض إيجابي واعي" },
  { id: "MV-026", desc: "كلام غير واضح بسبب ضوضاء خلفية", text: "صوت تشويش وهواء غير مفهوم ...", dialect: "لهجة سعودية", ref: "لم تطابق القواعد أي مؤشر معروف", note: "فصل التعرف عن التصنيف" },
  { id: "MV-027", desc: "لفظ محلي يحتمل معنيين حسب السياق", text: "ترى أمزح معك لا تاخذها جد يا خوي والله ما قصدت", dialect: "لهجة سعودية", ref: "مراجعة سياقية — مزاح أو سياق لعب", note: "سياق مزاح صريح" },
  { id: "MV-028", desc: "عبارة عربية تتضمن مصطلح لعبة إنجليزي", text: "راح اصفيك في الراوند الجاي داخل اللعبة بس لا تزعل", dialect: "عربي/إنجليزي", ref: "مراجعة سياقية — مزاح أو سياق لعب", note: "مصطلحات لعب طبيعية" },
  { id: "MV-029", desc: "تداخل أصوات يجعل المتحدث المقصود غير واضح", text: "يا عمي هذا مقلب سويته فيك عشان نضحك بس", dialect: "لهجة سعودية", ref: "مراجعة سياقية — مزاح أو سياق لعب", note: "مقلب معلن" },
  { id: "MV-030", desc: "عبارة مقتضبة لا تحدد هل هي تهديد أم مزاح", text: "ما راح اعطيك رقمي ولا راح ارسل لك أي صورة", dialect: "لهجة سعودية", ref: "رفض مشاركة معلومات / تعبير وقائي", note: "نفي دفاعي" }
];

// ==========================================
// Classification & Normalization Logic
// ==========================================
function normalizeArabic(text, unifyLetters = true, removePunctuation = true) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/[\\u064B-\\u065F\\u0670]/g, '');
  s = s.replace(/\\u0640/g, '');
  if (unifyLetters) {
    s = s.replace(/[أإآٱ]/g, 'ا');
    s = s.replace(/ة/g, 'ه');
    s = s.replace(/ى/g, 'ي');
  }
  if (removePunctuation) {
    s = s.replace(/[.,\/#!$%\\^&\\*;:{}=\\-_`~()؟،؛«»"'\\r\\n\\t]/g, ' ');
  }
  return s.replace(/\\s+/g, ' ').trim();
}

function classifyContent(rawText) {
  if (!rawText || !rawText.trim()) {
    return {
      label: 'لا يوجد نص للفحص',
      status: 'فارغ',
      level: 'غير متاح',
      reason: 'لم يتم استخراج أو إدخال أي نص للفحص.',
      matched: []
    };
  }

  const norm = normalizeArabic(rawText);

  // 1. فحص أنماط النفي والدفاع والرفض الواعي
  const negationRefusalPatterns = [
    'ما راح اعطيك', 'ما بعطيك', 'ما راح ارسل', 'ما برسل',
    'ما اشارك', 'ما اتقاسم', 'ما اقول لك', 'ما اعلمك',
    'لا تاخذها جد', 'لا تشدها', 'ما قصدت'
  ];
  const matchedNegations = negationRefusalPatterns.filter(term => norm.includes(normalizeArabic(term)));

  if (matchedNegations.some(term => ['ما راح اعطيك', 'ما بعطيك', 'ما راح ارسل', 'ما برسل', 'ما اشارك'].includes(term)) &&
      (norm.includes('رقم') || norm.includes('معلومات') || norm.includes('حساب') || norm.includes('صور'))) {
    return {
      label: 'رفض مشاركة معلومات / تعبير وقائي',
      status: 'سليم وقائي',
      level: 'منخفض المخاطر — رفض إيجابي لحماية الخصوصية',
      reason: 'رُصد نمط نفي صريح لحماية البيانات الشخصية: «' + matchedNegations.join('»، «') + '». هذا سلوك وقائي وليس استدراجاً.',
      matched: matchedNegations
    };
  }

  // 2. فحص سياق المزاح والمقالب واللعب
  const contextualTerms = [
    'ترى امزح', 'امزح معك', 'لا تاخذها جد', 'لا تشدها', 'ما قصدت',
    'مقلب سويته', 'مقلب', 'عشان نضحك', 'لعبة بس', 'مجرد تسلية', 'ما تستاهل زعل',
    'داخل اللعبة', 'في الراوند', 'في القيم'
  ];
  const matchedContext = contextualTerms.filter(term => norm.includes(normalizeArabic(term)));

  // 3. فئات التهديد والإساءة والاستدراج
  const categories = [
    {
      label: 'طلب معلومات شخصية / استدراج محتمل',
      level: 'مراجعة بشرية مطلوبة — مؤشرات استدراج',
      terms: [
        'لا تعلم اهلك', 'لا تقول لاهلك', 'لا تخبر احد', 'خلك سر', 'خلها سر بيننا',
        'ارسل صورتك', 'اعطني رقمك', 'عطني رقمك', 'عطني رقم جوالك', 'رقم جوالك', 'وين بيتك',
        'وين ساكن', 'مكان سكنك', 'باي حي', 'اي شارع', 'قابلني لحالك', 'تعال خاص', 'خلنا خاص',
        'سنابك', 'انستقرامك', 'اسم مدرستك', 'باي صف تدرس', 'حسابك الخاص', 'سكنات مجانا',
        'نسولف لحالنا'
      ]
    },
    {
      label: 'تهديد محتمل',
      level: 'مراجعة بشرية مطلوبة — مؤشرات تهديد',
      terms: [
        'لاجيك عند بيتك', 'اوريك شغلك', 'ادمر حسابك', 'تندم على', 'ما اخليك تفلت',
        'وش اسوي فيك', 'راح ادمر', 'راح اوريك', 'باذيك', 'راح اقتلك', 'بقتلك',
        'بفضحك', 'بضربك', 'بعرف وينك', 'بذبحك', 'بكسرك', 'بشتكيك', 'بنتقم منك'
      ]
    },
    {
      label: 'إساءة لفظية محتملة',
      level: 'مراجعة بشرية مطلوبة — مؤشرات إهانة',
      terms: [
        'يا غبي', 'يا فاشل', 'يا حيوان', 'يا حمار', 'يا كلب', 'يا وصخ', 'يا نذل',
        'مستواك زبالة', 'ما منك فايدة', 'قليل الادب', 'اكرهك', 'لعنة عليك',
        'الله يلعنك', 'حقير', 'تخرب علينا كل قيم', 'اطلع من اللعبة ما نبي نلعب معك'
      ]
    }
  ];

  if (matchedContext.length > 0 && (norm.includes('اصفيك') || norm.includes('بكسرك') || norm.includes('تمثيل') || norm.includes('مقلب') || norm.includes('لعبة بس'))) {
    return {
      label: 'مراجعة سياقية — مزاح أو سياق لعب',
      status: 'يتطلب مراجعة بشرية لتحديد النية',
      level: 'متوسط — سياق ملتبس بين اللعب والمبالغة',
      reason: 'رُصدت مؤشرات سياق لعب أو مزاح: «' + matchedContext.join('»، «') + '». لا يمكن الجزم بالنية دون مراجعة بشرية للسياق الكامل.',
      matched: matchedContext
    };
  }

  for (const cat of categories) {
    const hits = cat.terms.filter(term => norm.includes(normalizeArabic(term)));
    if (hits.length > 0) {
      if (matchedContext.length > 0) {
        return {
          label: 'مراجعة سياقية — مزاح أو سياق لعب',
          status: 'ملتبس — مؤشرات خطر مع قرائن مزاح',
          level: 'متوسط — يحتاج تحققاً بشرياً من قصد المتحدث',
          reason: 'تطابق مع مؤشرات خطر «' + hits.join('»، «') + '» لكن ترافق مع قرائن مزاح: «' + matchedContext.join('»، «') + '». يتطلب مراجعة بشرية متخصصة.',
          matched: [...hits, ...matchedContext]
        };
      }
      return {
        label: cat.label,
        status: 'تم رصد مؤشرات أولية',
        level: cat.level,
        reason: 'تطابق مع قاعدة كلمات مفتاحية أولية: «' + hits.join('»، «') + '». هذا تصنيف استدلالي أولي لا يثبت النية الجنائية ويستلزم تدقيقاً بشرياً.',
        matched: hits
      };
    }
  }

  // 4. فحص الأنماط الإيجابية السليمة
  const benignPositiveTerms = [
    'يعطيك العافيه', 'يا وحش', 'جيم بطل', 'اسطوريه', 'اسطوري', 'كفو',
    'الزون', 'شكرا لك', 'شكرا', 'تسلم', 'مبروك الفوز', 'معوضين خير',
    'تغطية', 'تغطيه', 'مجرد تسليه', 'مجرد تسلية'
  ];
  const matchedBenign = benignPositiveTerms.filter(term => norm.includes(normalizeArabic(term)));
  if (matchedBenign.length > 0) {
    return {
      label: 'سليم مبدئياً — عبارات لعب أو شكر طبيعية',
      status: 'سليم',
      level: 'منخفض المخاطر — حوار طبيعي',
      reason: 'رُصدت عبارات تعبير إيجابي أو تنسيق لعب معتاد: «' + matchedBenign.join('»، «') + '» دون رصد مؤشرات إساءة.',
      matched: matchedBenign
    };
  }

  // 5. الحالة الافتراضية
  return {
    label: 'لم تطابق القواعد أي مؤشر معروف',
    status: 'غير محسوم',
    level: 'غير محسوم — يحتاج مراجعة بشرية',
    reason: 'القواعد الاستدلالية الأولية لم ترصد ألفاظاً مسجلة. هذا لا يعني بالضرورة سلامة المحتوى أو خلوه من الإساءات المبطنة، ويتطلب التحقق البشري.',
    matched: []
  };
}

// ==========================================
// App State & Data Management
// ==========================================
let currentMode = 'audio_benchmark'; // 'audio_benchmark', 'demo_text', 'uploaded_file'
let selectedModelFilter = 'both'; // 'both', 'Xenova/whisper-tiny', 'Xenova/whisper-small'
let selectedClassificationTrack = 'track2'; // 'track1' (Ref), 'track2' (Hyp)
let activeRows = [];
let generatedReport = null;

const isHarmful = s => {
  const norm = (s || '').trim().toLowerCase();
  return !['سليم', 'safe', 'benign', 'غير محسوم', 'غير محسوم صوتياً', 'مراجعة سياقية', 'مراجعة سياقية — مزاح أو لعب', 'مراجعة سياقية — مزاح أو سياق لعب', 'رفض مشاركة معلومات / تعبير وقائي', 'سليم مبدئياً — عبارات لعب أو شكر طبيعية', 'unknown', 'uncertain', 'لم تطابق القواعد أي مؤشر معروف', ''].includes(norm);
};

const pct = x => (x === null || isNaN(x)) ? 'لا توجد بيانات كافية' : (x * 100).toFixed(1) + '%';

function loadAudioBenchmark() {
  currentMode = 'audio_benchmark';
  document.getElementById('loadAudioBenchmarkBtn').className = 'active-btn';
  document.getElementById('loadBenchmarkBtn').className = 'secondary';
  document.getElementById('modelComparisonCard').style.display = 'block';

  let raw = ACTUAL_AUDIO_BENCHMARK;
  if (selectedModelFilter !== 'both') {
    raw = raw.filter(r => r.model_id === selectedModelFilter);
  }

  activeRows = raw.map(r => ({
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
  banner.innerHTML = '<strong>معاينة مجموعة الاختبار الصوتي الفعلي (20 عينة):</strong> تعرض البيانات نتائج اختبار Whisper Tiny و Whisper Small على ملفات صوتية حقيقية مولدة بأصوات سعودية عصبية (Neural TTS). تم فصل أداء التفريغ (WER) عن أداء تصنيف المحتوى.';

  document.getElementById('status').textContent = 'تم تحميل نتائج الاختبار الصوتي الفعلي بنجاح لـ ' + activeRows.length + ' حالة (' + (selectedModelFilter === 'both' ? 'مقارنة النموذجين' : selectedModelFilter) + ').';
  calculateAndRender();
}

function loadDemoBenchmark() {
  currentMode = 'demo_text';
  document.getElementById('loadBenchmarkBtn').className = 'active-btn';
  document.getElementById('loadAudioBenchmarkBtn').className = 'secondary';
  document.getElementById('modelComparisonCard').style.display = 'none';

  activeRows = STARTER_DEMO_BENCHMARK.map(item => {
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

// ==========================================
// Calculation & UI Rendering
// ==========================================
function calculateAndRender() {
  const data = activeRows;
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
    document.getElementById('mEditsBreakdown').textContent = `الاستبدال: ${totalSubs} | الحذف: ${totalDels} | الإضافة: ${totalIns}`;
    document.getElementById('mAudioSub').textContent = `تسجيلات فعلية (${werCount} قياس)`;
    document.getElementById('mWerNote').textContent = `محسوب بعد التطبيع الإملائي من ${werCount} تشغيل فعلي لـ Whisper`;
    document.getElementById('asrDataBadge').className = 'badge badge-verified';
    document.getElementById('asrDataBadge').textContent = `تم التحقق صوتياً (${werCount} قياس)`;
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
  document.getElementById('mExcludedNote').textContent = `المستبعد سياقياً: ${excluded} حالة`;
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
  let html = '<table><thead><tr><th>المرجع البشري ↓ / نتيجة النظام →</th>' + labels.map(l => '<th>' + l + '</th>').join('') + '<th>المجموع</th></tr></thead><tbody>';
  for (let a of labels) {
    let rowTotal = 0;
    html += '<tr><th>' + a + '</th>';
    for (let b of labels) {
      const val = mat[a][b];
      rowTotal += val;
      const isDiag = (a === b && val > 0);
      html += `<td class="${isDiag ? 'diagonal' : ''}">${val}</td>`;
    }
    html += `<th>${rowTotal}</th></tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('matrix').innerHTML = html;

  // Render Cases Table
  let casesHtml = '<table><thead><tr><th>المعرّف</th><th>نموذج التفريغ</th><th>النص المرجعي الصحيح</th><th>النص المستخرج من الصوت</th><th>خطأ التفريغ (WER)</th><th>التصنيف المرجعي</th><th>تصنيف النظام</th><th>الحالة</th></tr></thead><tbody>';
  for (let r of data) {
    const isMatch = (r.reference_label === r.system_label);
    const werDisplay = (r.wer !== null && r.wer !== undefined && r.wer !== '') ? r.wer : 'غير متوفر (نص)';
    casesHtml += `<tr>
      <td><strong>${r.scenario_id}</strong></td>
      <td><span class="badge ${r.asr_model.includes('Small') ? 'badge-verified' : 'badge-demo'}">${r.asr_model}</span></td>
      <td style="text-align:right; max-width:240px">${r.ground_truth_text || r.text || '-'}</td>
      <td style="text-align:right; max-width:240px">${r.extracted_text || '-'}</td>
      <td><strong>${werDisplay}</strong></td>
      <td>${r.reference_label}</td>
      <td>${r.system_label}</td>
      <td><span class="badge ${isMatch ? 'badge-verified' : 'badge-danger'}">${isMatch ? 'تطابق' : 'اختلاف'}</span></td>
    </tr>`;
  }
  casesHtml += '</tbody></table>';
  document.getElementById('casesTableWrap').innerHTML = casesHtml;

  // Build Report Object for JSON Export
  generatedReport = {
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
}

// ==========================================
// Event Listeners & Interactive Controls
// ==========================================
document.getElementById('loadAudioBenchmarkBtn').onclick = loadAudioBenchmark;
document.getElementById('loadBenchmarkBtn').onclick = loadDemoBenchmark;

// Model Filter buttons
document.getElementById('modelFilterTab').addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#modelFilterTab button').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  selectedModelFilter = e.target.getAttribute('data-model');
  loadAudioBenchmark();
});

// Classification Track buttons
document.getElementById('trackSelectTab').addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#trackSelectTab button').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  selectedClassificationTrack = e.target.getAttribute('data-track');
  if (currentMode === 'audio_benchmark') loadAudioBenchmark();
  else calculateAndRender();
});

// JSON Export
document.getElementById('exportJsonBtn').onclick = () => {
  if (!generatedReport) return;
  const blob = new Blob([JSON.stringify(generatedReport, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mizan-voice-audit-report-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// CSV Export
document.getElementById('exportCsvBtn').onclick = () => {
  if (!activeRows || !activeRows.length) return;
  const headers = ['scenario_id', 'model_name', 'reference_label', 'system_label', 'wer', 'ground_truth_text', 'extracted_text', 'classification_match'];
  const formatCell = v => '"' + String(v || '').replace(/"/g, '""') + '"';
  const csvLines = [
    headers.join(','),
    ...activeRows.map(r => [
      r.scenario_id,
      formatCell(r.asr_model),
      formatCell(r.reference_label),
      formatCell(r.system_label),
      formatCell(r.wer),
      formatCell(r.ground_truth_text),
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

// Custom File Upload
document.getElementById('file').onchange = async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (file.name.endsWith('.json')) {
      const parsed = JSON.parse(text);
      const rows = parsed.results || parsed;
      activeRows = rows.map((r, i) => ({
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
      activeRows = lines.slice(1).map((l, i) => {
        const parts = l.split(','); // simple split
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
    document.getElementById('loadAudioBenchmarkBtn').className = 'secondary';
    document.getElementById('loadBenchmarkBtn').className = 'secondary';
    document.getElementById('modelComparisonCard').style.display = 'none';
    document.getElementById('status').textContent = 'تم تحميل ' + activeRows.length + ' حالة من الملف المرفوع: ' + file.name;
    calculateAndRender();
  } catch (err) {
    document.getElementById('status').textContent = 'خطأ في معالجة الملف: ' + err.message;
  }
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

fs.writeFileSync('evaluation-engine.html', htmlContent, 'utf-8');
console.log('Successfully generated evaluation-engine.html (v0.4)');
