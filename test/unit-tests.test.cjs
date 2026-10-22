// Unit tests for Mizan Voice core logic: WER, Normalization, Classification, CSV formatting
const assert = require('assert');

// 1. Text Normalization
function normalizeArabic(text, { removePunctuation = true, unifyLetters = true } = {}) {
  if (!text) return '';
  let s = String(text);
  // Remove diacritics (Harakat / Tashkeel)
  s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  // Remove Tatweel (Kashida)
  s = s.replace(/\u0640/g, '');
  if (unifyLetters) {
    // Unify Alef forms
    s = s.replace(/[أإآٱ]/g, 'ا');
    // Unify Taa Marbuta to Haa
    s = s.replace(/ة/g, 'ه');
    // Unify Yaa / Alef Maksura
    s = s.replace(/ى/g, 'ي');
  }
  if (removePunctuation) {
    // Remove Arabic and Latin punctuation
    s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟،؛«»"'\r\n\t]/g, ' ');
  }
  // Remove duplicate whitespaces
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// 2. Word Error Rate (WER) Calculation using Levenshtein distance on words
function calculateWER(refText, hypText, normalize = true) {
  const r = normalize ? normalizeArabic(refText) : String(refText).trim();
  const h = normalize ? normalizeArabic(hypText) : String(hypText).trim();

  const refWords = r ? r.split(/\s+/).filter(Boolean) : [];
  const hypWords = h ? h.split(/\s+/).filter(Boolean) : [];

  if (refWords.length === 0) {
    return {
      wer: hypWords.length === 0 ? 0 : 1.0,
      substitutions: 0,
      deletions: 0,
      insertions: hypWords.length,
      refWordCount: 0,
      hypWordCount: hypWords.length
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
        const substitution = d[i - 1][j - 1] + 1;
        const insertion = d[i][j - 1] + 1;
        const deletion = d[i - 1][j] + 1;
        d[i][j] = Math.min(substitution, insertion, deletion);
      }
    }
  }

  const editDistance = d[refWords.length][hypWords.length];
  const wer = editDistance / refWords.length;

  return {
    wer: Math.round(wer * 1000) / 1000,
    werPercentage: (wer * 100).toFixed(1) + '%',
    editDistance,
    refWordCount: refWords.length,
    hypWordCount: hypWords.length
  };
}

// 3. Rule-based Content Classifier
function classifyContent(rawText) {
  if (!rawText || !rawText.trim()) {
    return {
      label: 'لا يوجد نص للفحص',
      status: 'فارغ',
      level: 'غير متاح',
      reason: 'لم يتم استخراج أو إدخال أي نص.',
      matched: []
    };
  }

  const norm = normalizeArabic(rawText);

  const categories = [
    {
      label: 'طلب معلومات شخصية / استدراج محتمل',
      level: 'مراجعة بشرية مطلوبة',
      terms: [
        'لا تعلم اهلك', 'لا تقول لاهلك', 'لا تخبر احد', 'خلك سر', 'خلها سر بيننا',
        'ارسل صورتك', 'اعطني رقمك', 'عطني رقمك', 'رقم جوالك', 'وين بيتك', 'وين ساكن',
        'مكان سكنك', 'قابلني لحالك', 'تعال خاص', 'سنابك', 'انستقرامك', 'اسم مدرستك'
      ]
    },
    {
      label: 'تهديد محتمل',
      level: 'مراجعة بشرية مطلوبة',
      terms: [
        'باذيك', 'راح اقتلك', 'بقتلك', 'بفضحك', 'بضربك', 'بعرف وينك',
        'بذبحك', 'بكسرك', 'راح اوريك', 'بشتكيك', 'بنتقم منك'
      ]
    },
    {
      label: 'إساءة لفظية محتملة',
      level: 'مراجعة بشرية مطلوبة',
      terms: [
        'يا غبي', 'يا حمار', 'يا كلب', 'يا وصخ', 'يا نذل', 'قليل الادب',
        'اكرهك', 'لعنة عليك', 'الله يلعنك', 'حقير'
      ]
    },
    {
      label: 'مراجعة سياقية — مزاح أو لعب',
      level: 'مراجعة بشرية مطلوبة',
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
    return {
      label: foundCategory.label,
      status: 'تم رصد مؤشرات أولية',
      level: foundCategory.level,
      reason: 'تطابق مع قاعدة كلمات أولية: «' + matchedTerms.join('»، «') + '». هذا فحص أولي يحتاج تحقق بشري.',
      matched: matchedTerms
    };
  }

  return {
    label: 'لم تطابق القواعد أي مؤشر معروف',
    status: 'غير محسوم',
    level: 'غير محسوم — يحتاج مراجعة بشرية',
    reason: 'القواعد الأولية المحدودة لم ترصد ألفاظاً محظورة مسجلة، لكن هذا لا يضمن بأي حال سلامة المحتوى أو خلوه من الإساءة المبطنة أو السياقية.',
    matched: []
  };
}

// 4. CSV Cell Sanitization
function formatCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Run Tests
console.log('--- Running Unit Tests ---');

// Test 1: Arabic Normalization
const normSample = normalizeArabic('أَهْلاً وَسَهْلاً بِكُمْ فِي مِيزَانِ صَوْت...!');
assert.strictEqual(normSample, 'اهلا وسهلا بكم في ميزان صوت');
console.log('✓ Test 1: Arabic Normalization passed');

// Test 2: Exact Match WER = 0
const werZero = calculateWER('السلام عليكم ورحمة الله', 'السلام عليكم ورحمة الله');
assert.strictEqual(werZero.wer, 0);
assert.strictEqual(werZero.werPercentage, '0.0%');
console.log('✓ Test 2: Zero WER exact match passed');

// Test 3: WER with substitution
const werSub = calculateWER('السلام عليكم ورحمة الله', 'السلام عليكم وبركات الله');
assert.strictEqual(werSub.refWordCount, 4);
assert.strictEqual(werSub.editDistance, 1);
assert.strictEqual(werSub.werPercentage, '25.0%');
console.log('✓ Test 3: WER with substitution passed');

// Test 4: Classification with threatening term
const threatRes = classifyContent('والله راح اقتلك اليوم');
assert.strictEqual(threatRes.label, 'تهديد محتمل');
assert.ok(threatRes.matched.includes('راح اقتلك'));
console.log('✓ Test 4: Threat classification passed');

// Test 5: Classification with personal info solicitation (Saudi dialect)
const saudiInfoRes = classifyContent('عطني رقمك ولا تقول لاهلك');
assert.strictEqual(saudiInfoRes.label, 'طلب معلومات شخصية / استدراج محتمل');
assert.ok(saudiInfoRes.matched.includes('عطني رقمك'));
assert.ok(saudiInfoRes.matched.includes('لا تقول لاهلك'));
console.log('✓ Test 5: Saudi dialect personal info classification passed');

// Test 6: Safe / Unmatched phrase
const safeRes = classifyContent('يعطيك العافية لعبك ممتاز وفزنا بالمباراة');
assert.strictEqual(safeRes.label, 'لم تطابق القواعد أي مؤشر معروف');
assert.ok(safeRes.level.includes('غير محسوم'));
console.log('✓ Test 6: Unmatched / Indeterminate classification passed');

// Test 7: Empty transcript classification
const emptyRes = classifyContent('');
assert.strictEqual(emptyRes.status, 'فارغ');
console.log('✓ Test 7: Empty transcript handled gracefully');

// Test 8: CSV Cell formatting with quotes and special characters
const csvCellFormatted = formatCsvCell('نص "يحتوي" فواصل, واقتباس');
assert.strictEqual(csvCellFormatted, '"نص ""يحتوي"" فواصل, واقتباس"');
console.log('✓ Test 8: CSV Cell formatting passed');

console.log('All Unit Tests Passed Successfully!');
