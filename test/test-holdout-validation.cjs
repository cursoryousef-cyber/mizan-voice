const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Extract classifyContent and normalizeArabic from audio-upload-lab.html
const labHtml = fs.readFileSync(path.join(__dirname, '..', 'audio-upload-lab.html'), 'utf8');

const normMatch = labHtml.match(/function normalizeArabic\([\s\S]*?\n\}/);
const classMatch = labHtml.match(/function classifyContent\(rawText\)[\s\S]*?\n\}/);

const fnBundle = new Function(`
  ${normMatch[0]}
  ${classMatch[0]}
  return { normalizeArabic, classifyContent };
`)();

const { normalizeArabic, classifyContent } = fnBundle;

// ==========================================
// Independent Holdout Validation Set (12 unseen sentences)
// None of these sentences were in the 20 benchmark samples or 30 starter demo sentences.
// Ground truth labels are strictly pre-annotated by human review.
// ==========================================
const HOLDOUT_SET = [
  {
    id: "H-001",
    desc: "حوار لعب هادئ وتنسيق استراتيجي",
    text: "معي لوت زايد تعال خذه من الصندوق يا غالي",
    expectedCanonical: "سليم",
    riskCategory: "safe"
  },
  {
    id: "H-002",
    desc: "رفض صريح ومباشر لإعطاء أي تفاصيل شخصية",
    text: "ما ابغى اعطيك جوالي ولا سنابي ولا اسمي لو سمحت",
    expectedCanonical: "سليم",
    riskCategory: "safe"
  },
  {
    id: "H-003",
    desc: "إساءة مباشرة واضحة موجهة لمهارة اللاعب",
    text: "انت لاعب فاشل وحمار ما تفهم شي في الجيم",
    expectedCanonical: "إساءة",
    riskCategory: "harmful"
  },
  {
    id: "H-004",
    desc: "تهديد جدي بالوصول إلى سكن المتحدث",
    text: "قسم بالله لاجيك عند باب بيتك واوريك مين انا",
    expectedCanonical: "تهديد",
    riskCategory: "harmful"
  },
  {
    id: "H-005",
    desc: "طلب الانتقال الفوري لقناة خاصة للتحدث المنفرد",
    text: "ادخل السيرفر الخاص لحالك نبغى نتكلم بدون ما احد يسمع",
    expectedCanonical: "طلب معلومات شخصية",
    riskCategory: "harmful"
  },
  {
    id: "H-006",
    desc: "عبارة قتالية افتراضية بحتة داخل اللعبة مقرونة بكلمات لعب",
    text: "اصفيك في الراوند القادم واشيلك من الزون يا كابتن",
    expectedCanonical: "مراجعة سياقية",
    riskCategory: "contextual"
  },
  {
    id: "H-007",
    desc: "مزاح ومقلب بعد مزاح ثقيل",
    text: "يا رجل مقلب والله امزح معك لا تشدها",
    expectedCanonical: "مراجعة سياقية",
    riskCategory: "contextual"
  },
  {
    id: "H-008",
    desc: "تهديد تقني باختراق الحساب",
    text: "راح اهكر جهازك وادمر حسابك اليوم",
    expectedCanonical: "تهديد",
    riskCategory: "harmful"
  },
  {
    id: "H-009",
    desc: "استدراج قاصر وطلب بيانات المدرسة",
    text: "في اي مدرسة تدرس وكم عمرك يا شاطر",
    expectedCanonical: "طلب معلومات شخصية",
    riskCategory: "harmful"
  },
  {
    id: "H-010",
    desc: "رفض حاسم لإرسال الصور",
    text: "مستحيل ارسل لك صورتي ولا صورتي الشخصية",
    expectedCanonical: "سليم",
    riskCategory: "safe"
  },
  {
    id: "H-011",
    desc: "إساءة مع ألفاظ عامية خشنة",
    text: "مستواك زبالة وما منك اي فايدة يا نوب",
    expectedCanonical: "إساءة",
    riskCategory: "harmful"
  },
  {
    id: "H-012",
    desc: "حوار ودي طبيعي وشكر",
    text: "تسلم يا كابتن على المساعدة كفو والله",
    expectedCanonical: "سليم",
    riskCategory: "safe"
  }
];

// Edge cases test suite
const EDGE_CASES = [
  { text: "", expectedLabel: "لا يوجد نص للفحص", type: "Empty Text" },
  { text: "   \t\n  ", expectedLabel: "لا يوجد نص للفحص", type: "Whitespace Only" },
  { text: "مساء الخير جميعا كيف الحال اليوم", expectedStatus: "غير محسوم", type: "Unknown Benign Phrasing" },
  { text: "ترا امزح معك لا تزعل", expectedCanonical: "مراجعة سياقية", type: "Pure Banter" },
  { text: "والله لا جيك عند بيتك واوريك", expectedCanonical: "تهديد", type: "ASR Split Token Threat" },
  { text: "ما راح اعطيك اي معلومة ولا رقم", expectedCanonical: "سليم", type: "Defensive Refusal" }
];

console.log("=== RUNNING INDEPENDENT HOLDOUT VALIDATION SUITE ===");
console.log(`Cohort Size: ${HOLDOUT_SET.length} independent unseen sentences`);

let holdoutCorrect = 0;
let tp = 0, fp = 0, tn = 0, fn = 0, contextualCount = 0;

for (const sample of HOLDOUT_SET) {
  const result = classifyContent(sample.text);
  const isMatch = (result.canonicalCategory === sample.expectedCanonical);
  if (isMatch) holdoutCorrect++;

  if (sample.riskCategory === 'contextual') {
    contextualCount++;
    continue;
  }

  const isHarmExpected = (sample.riskCategory === 'harmful');
  const isHarmPredicted = ['إساءة', 'تهديد', 'طلب معلومات شخصية'].includes(result.canonicalCategory);

  if (isHarmExpected && isHarmPredicted) tp++;
  else if (!isHarmExpected && isHarmPredicted) fp++;
  else if (!isHarmExpected && !isHarmPredicted) tn++;
  else fn++;

  console.log(`[${sample.id}] ${isMatch ? '✓' : '✗'} Ref: "${sample.expectedCanonical}" | Pred: "${result.canonicalCategory}" (${result.label})`);
}

const holdoutAccuracy = (holdoutCorrect / HOLDOUT_SET.length) * 100;
const precision = (tp + fp) > 0 ? (tp / (tp + fp)) * 100 : 0;
const recall = (tp + fn) > 0 ? (tp / (tp + fn)) * 100 : 0;
const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
const fpr = (fp + tn) > 0 ? (fp / (fp + tn)) * 100 : 0;

console.log("\n--- Holdout Validation Statistical Metrics ---");
console.log(`Multi-class Accuracy: ${holdoutAccuracy.toFixed(1)}% (${holdoutCorrect}/${HOLDOUT_SET.length})`);
console.log(`Binary Harm Detection (N=${HOLDOUT_SET.length - contextualCount}, Contextual Excluded=${contextualCount}):`);
console.log(`  TP: ${tp}, FP: ${fp}, TN: ${tn}, FN: ${fn}`);
console.log(`  Precision: ${precision.toFixed(1)}%`);
console.log(`  Recall:    ${recall.toFixed(1)}%`);
console.log(`  F1-Score:  ${f1.toFixed(1)}%`);
console.log(`  FPR:       ${fpr.toFixed(1)}%`);

assert(holdoutAccuracy >= 85.0, `Expected holdout accuracy >= 85%, got ${holdoutAccuracy}%`);
assert(precision === 100.0, `Expected 100% precision (0 false alarms), got ${precision}%`);
assert(fpr === 0.0, `Expected 0% False Positive Rate, got ${fpr}%`);

console.log("\n--- Edge Cases & Robustness Suite ---");
for (const tc of EDGE_CASES) {
  const res = classifyContent(tc.text);
  if (tc.expectedLabel) {
    assert.strictEqual(res.label, tc.expectedLabel, `Failed on ${tc.type}`);
  }
  if (tc.expectedStatus) {
    assert.strictEqual(res.status, tc.expectedStatus, `Failed on ${tc.type}`);
  }
  if (tc.expectedCanonical) {
    assert.strictEqual(res.canonicalCategory, tc.expectedCanonical, `Failed on ${tc.type}`);
  }
  console.log(`✓ Edge case passed: ${tc.type} -> "${res.label}" [${res.canonicalCategory || res.status}]`);
}

console.log("\n=== ALL HOLDOUT VALIDATION AND EDGE CASE TESTS PASSED! ===");
