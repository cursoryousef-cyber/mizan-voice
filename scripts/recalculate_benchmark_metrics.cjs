const fs = require('fs');
const path = require('path');

function normalizeArabic(text, { removePunctuation = true, unifyLetters = true } = {}) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
  s = s.replace(/\u0640/g, '');
  if (unifyLetters) {
    s = s.replace(/[أإآٱ]/g, 'ا');
    s = s.replace(/ة/g, 'ه');
    s = s.replace(/[ىي]/g, 'ي');
    s = s.replace(/ؤ/g, 'و');
    s = s.replace(/ئ/g, 'ي');
  }
  if (removePunctuation) {
    s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()؟،؛«»"'\\[\]<>?]/g, ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function classifyContent(rawText) {
  if (!rawText || !rawText.trim()) {
    return {
      canonicalCategory: 'مراجعة سياقية / غير محسوم',
      label: 'لا يوجد نص للفحص',
      status: 'فارغ',
      level: 'غير متاح',
      reason: 'لم يتم استخراج أو إدخال أي نص للفحص.',
      matched: []
    };
  }

  const norm = normalizeArabic(rawText);

  // 1. فحص أنماط النفي والدفاع والرفض الواعي لحماية الخصوصية
  const negationRefusalPatterns = [
    'ما راح اعطيك', 'ما بعطيك', 'ما راح ارسل', 'ما برسل',
    'ما اشارك', 'ما اتقاسم', 'ما اقول لك', 'ما اعلمك',
    'لا تاخذها جد', 'لا تشدها', 'ما قصدت'
  ];
  const matchedNegations = negationRefusalPatterns.filter(term => norm.includes(normalizeArabic(term)));

  if (matchedNegations.some(term => ['ما راح اعطيك', 'ما بعطيك', 'ما راح ارسل', 'ما برسل', 'ما اشارك'].includes(term)) &&
      (norm.includes('رقم') || norm.includes('معلومات') || norm.includes('حساب') || norm.includes('صور') || norm.includes('صوره'))) {
    return {
      canonicalCategory: 'سليم',
      label: 'رفض مشاركة معلومات / تعبير وقائي',
      status: 'سليم وقائي',
      level: 'منخفض المخاطر — رفض إيجابي لحماية الخصوصية',
      reason: 'رُصد نمط نفي صريح لحماية البيانات الشخصية: «' + matchedNegations.join('»، «') + '». هذا سلوك وقائي حميد وليس استدراجاً.',
      matched: matchedNegations
    };
  }

  // 2. فحص سياق المزاح والمقالب واللعب
  const contextualTerms = [
    'ترى امزح', 'امزح معك', 'لا تاخذها جد', 'لا تشدها', 'ما قصدت',
    'مقلب سويته', 'مقلب', 'عشان نضحك', 'لعبة بس', 'مجرد تسلية', 'مجرد تسليه', 'مجرد تسليات',
    'ما تستاهل زعل', 'ما يستاهل زعل', 'تسلية بس', 'تسليه بس',
    'داخل اللعبة', 'في الراوند', 'في القيم'
  ];
  const matchedContext = contextualTerms.filter(term => norm.includes(normalizeArabic(term)));

  // 3. فئات الخطر مع أولوية التهديد أولاً
  const threatTerms = [
    'لاجيك عند بيتك', 'لا جيك عند بيتك', 'اجيك عند بيتك', 'اجيك لبيتك', 'اجيك لين بيتك', 'باب بيتك',
    'اوريك شغلك', 'ادمر حسابك', 'تندم على', 'ما اخليك تفلت', 'ما اخليك تفلط',
    'وش اسوي فيك', 'وشاسوي فيك', 'راح ادمر', 'راح اوريك', 'باذيك', 'راح اقتلك', 'بقتلك',
    'بفضحك', 'بضربك', 'بعرف وينك', 'بذبحك', 'اذبحك', 'راح اذبحك', 'بكسرك', 'بشتكيك', 'بنتقم منك',
    'اهكر جهازك', 'اهكر حسابك', 'يا ويلك'
  ];

  const solicitationTerms = [
    'لا تعلم اهلك', 'لا تقول لاهلك', 'لا تخبر احد', 'خلك سر', 'خلها سر بيننا',
    'ارسل صورتك', 'اعطني رقمك', 'عطني رقمك', 'عطني رقم جوالك', 'رقم جوالك', 'وين بيتك',
    'وين ساكن', 'وينساكن', 'مكان سكنك', 'باي حي', 'اي شارع', 'قابلني لحالك', 'تعال خاص', 'خلنا خاص',
    'سنابك', 'انستقرامك', 'اسم مدرستك', 'اي مدرسة', 'في اي مدرسة', 'باي مدرسة', 'باي صف تدرس', 'حسابك الخاص', 'سكنات مجانا',
    'نسولف لحالنا', 'سيرفر خاص', 'السيرفر الخاص'
  ];

  const abuseTerms = [
    'يا غبي', 'يا فاشل', 'يا حيوان', 'يا حمار', 'يا كلب', 'يا وصخ', 'يا نذل',
    'مستواك زبالة', 'مستوى كزبالة', 'كزبالة', 'لعبك زبالة', 'ما منك فايدة', 'ما منك اي فايدة',
    'قليل الادب', 'اكرهك', 'لعنة عليك', 'الله يلعنك', 'حقير', 'تخرب علينا كل قيم',
    'اطلع من اللعبة ما نبي نلعب معك', 'نوب', 'noob'
  ];

  const matchedThreats = threatTerms.filter(term => norm.includes(normalizeArabic(term)));
  const matchedSolicitations = solicitationTerms.filter(term => norm.includes(normalizeArabic(term)));
  const matchedAbuse = abuseTerms.filter(term => norm.includes(normalizeArabic(term)));

  if (matchedContext.length > 0 && (norm.includes('اصفيك') || norm.includes('بكسرك') || norm.includes('تمثيل') || norm.includes('مقلب') || norm.includes('لعبة بس') || norm.includes('داخل اللعبة'))) {
    return {
      canonicalCategory: 'مراجعة سياقية',
      label: 'مراجعة سياقية — مزاح أو سياق لعب',
      status: 'يتطلب مراجعة بشرية لتحديد النية',
      level: 'متوسط — سياق ملتبس بين اللعب والمبالغة',
      reason: 'رُصدت مؤشرات سياق لعب أو مزاح: «' + matchedContext.join('»، «') + '» مقترنة بعبارات قتالية داخل اللعبة. لا يمكن الجزم بالنية دون مراجعة بشرية.',
      matched: matchedContext
    };
  }

  // التهديد أولاً
  if (matchedThreats.length > 0) {
    if (matchedContext.length > 0) {
      return {
        canonicalCategory: 'مراجعة سياقية',
        label: 'مراجعة سياقية — مزاح أو سياق لعب',
        status: 'ملتبس — مؤشرات تهديد مع قرائن مزاح',
        level: 'متوسط — يحتاج تحققاً بشرياً من قصد المتحدث',
        reason: 'تطابق مع مؤشرات تهديد «' + matchedThreats.join('»، «') + '» لكن ترافق مع قرائن مزاح: «' + matchedContext.join('»، «') + '». يتطلب مراجعة بشرية.',
        matched: [...matchedThreats, ...matchedContext]
      };
    }
    return {
      canonicalCategory: 'تهديد',
      label: 'تهديد محتمل',
      status: 'تم رصد مؤشرات أولية',
      level: 'مرتفع — مراجعة بشرية مطلوبة لمؤشرات تهديد',
      reason: 'تطابق مع قاعدة مؤشرات التهديد: «' + matchedThreats.join('»، «') + '». هذا تصنيف أولي يستلزم التدقيق البشري.',
      matched: matchedThreats
    };
  }

  // الاستدراج ثانياً
  if (matchedSolicitations.length > 0) {
    if (matchedContext.length > 0) {
      return {
        canonicalCategory: 'مراجعة سياقية',
        label: 'مراجعة سياقية — مزاح أو سياق لعب',
        status: 'ملتبس — مؤشرات طلب معلومات مع قرائن مزاح',
        level: 'متوسط — يحتاج تحققاً بشرياً',
        reason: 'تطابق مع مؤشرات طلب معلومات «' + matchedSolicitations.join('»، «') + '» ترافق مع قرائن مزاح.',
        matched: [...matchedSolicitations, ...matchedContext]
      };
    }
    return {
      canonicalCategory: 'طلب معلومات شخصية',
      label: 'طلب معلومات شخصية / استدراج محتمل',
      status: 'تم رصد مؤشرات أولية',
      level: 'مرتفع — مراجعة بشرية مطلوبة لمؤشرات استدراج',
      reason: 'تطابق مع قاعدة مؤشرات الاستدراج وطلب البيانات: «' + matchedSolicitations.join('»، «') + '».',
      matched: matchedSolicitations
    };
  }

  // الإساءة ثالثاً
  if (matchedAbuse.length > 0) {
    if (matchedContext.length > 0) {
      return {
        canonicalCategory: 'مراجعة سياقية',
        label: 'مراجعة سياقية — مزاح أو سياق لعب',
        status: 'ملتبس — ألفاظ إهانة مع قرائن مزاح',
        level: 'متوسط — يتطلب تدقيق النية',
        reason: 'تطابق مع ألفاظ إهانة «' + matchedAbuse.join('»، «') + '» ترافقت مع قرائن مزاح.',
        matched: [...matchedAbuse, ...matchedContext]
      };
    }
    return {
      canonicalCategory: 'إساءة',
      label: 'إساءة لفظية محتملة',
      status: 'تم رصد مؤشرات أولية',
      level: 'متوسط — مراجعة بشرية مطلوبة لمؤشرات إهانة',
      reason: 'تطابق مع قاعدة مؤشرات الإساءة اللفظية: «' + matchedAbuse.join('»، «') + '».',
      matched: matchedAbuse
    };
  }

  // المزاح الصريح
  if (matchedContext.some(term => ['ترى امزح', 'امزح معك', 'لا تاخذها جد', 'لا تشدها', 'مقلب سويته', 'مقلب', 'عشان نضحك'].includes(term))) {
    return {
      canonicalCategory: 'مراجعة سياقية',
      label: 'مراجعة سياقية — مزاح أو سياق لعب',
      status: 'مزاح أو لعب ودي',
      level: 'منخفض المخاطر — حوار مزاح معتاد',
      reason: 'رُصدت مؤشرات مزاح واضحة أو مقلب لتلطيف الأجواء: «' + matchedContext.join('»، «') + '» خالية من مؤشرات التهديد أو الإساءة.',
      matched: matchedContext
    };
  }

  // 4. فحص الأنماط الإيجابية السليمة
  const benignPositiveTerms = [
    'يعطيك العافيه', 'يا وحش', 'جيم بطل', 'اسطوريه', 'اسطوري', 'كفو',
    'الزون', 'ناخذ الزون', 'ناخذ زون', 'في الزون', 'زون قبل', 'زون',
    'شكرا لك', 'شكرا', 'تسلم', 'مبروك الفوز', 'معوضين خير',
    'تغطية', 'تغطيه', 'مجرد تسليه', 'مجرد تسلية', 'مجرد تسليات', 'ما تستاهل زعل', 'ما تستاهل'
  ];
  const matchedBenign = benignPositiveTerms.filter(term => norm.includes(normalizeArabic(term)));
  if (matchedBenign.length > 0) {
    return {
      canonicalCategory: 'سليم',
      label: 'سليم مبدئياً — عبارات لعب أو شكر طبيعية',
      status: 'سليم',
      level: 'منخفض المخاطر — حوار طبيعي',
      reason: 'رُصدت عبارات تعبير إيجابي أو تنسيق لعب معتاد: «' + matchedBenign.join('»، «') + '» دون رصد مؤشرات إساءة.',
      matched: matchedBenign
    };
  }

  // 5. الحالة الافتراضية
  return {
    canonicalCategory: 'مراجعة سياقية / غير محسوم',
    label: 'لم تطابق القواعد أي مؤشر معروف',
    status: 'غير محسوم',
    level: 'غير محسوم — يحتاج مراجعة بشرية',
    reason: 'القواعد الاستدلالية الأولية لم ترصد ألفاظاً مسجلة. هذا لا يعني بالضرورة سلامة المحتوى أو خلوه من الإساءات المبطنة، ويتطلب التحقق البشري.',
    matched: []
  };
}

function mapToCanonical(label) {
  if (!label) return 'مراجعة سياقية / غير محسوم';
  const l = label.trim();
  if (l.includes('سليم') || l.includes('وقائي')) return 'سليم';
  if (l.includes('إساءة')) return 'إساءة';
  if (l.includes('تهديد')) return 'تهديد';
  if (l.includes('معلومات') || l.includes('استدراج')) return 'طلب معلومات شخصية';
  if (l.includes('سياق') || l.includes('مزاح') || l.includes('لم تطابق') || l.includes('غير محسوم')) return 'مراجعة سياقية / غير محسوم';
  return 'مراجعة سياقية / غير محسوم';
}

function main() {
  const jsonPath = path.resolve('data/audio_benchmark_results.json');
  const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const updatedResults = existing.results.map(r => {
    const t1 = classifyContent(r.ground_truth_text);
    const t2 = classifyContent(r.extracted_transcript);

    const gtCanonical = mapToCanonical(r.ground_truth_label);
    const t1Canonical = mapToCanonical(t1.label);
    const t2Canonical = mapToCanonical(t2.label);

    const werNum = parseFloat(String(r.norm_wer_pct || '0').replace('%', ''));
    let rootCause = 'مطابقة تامة دون خطأ';
    let remediation = 'لا يتطلب إجراء؛ مخرجات النموذج والقواعد متطابقة مع المرجع.';

    if (gtCanonical !== t2Canonical) {
      if (werNum >= 35.0) {
        rootCause = 'خطأ في التفريغ الصوتي (ASR)';
        remediation = 'الارتقاء إلى نموذج تفريغ صوتي أكبر أو تدريب موجه على الصوتيات العامية لاستعادة الكلمات المفتاحية.';
      } else if (r.ground_truth_label === 'مراجعة سياقية' || t2.label.includes('مزاح') || t2.label.includes('سياق')) {
        rootCause = 'غموض السياق والمزاح';
        remediation = 'إحالة المحتوى للتدقيق البشري وإتاحة نافذة سياق أوسع للحوار لتحديد النية.';
      } else {
        rootCause = 'قصور في القواعد المعجمية';
        remediation = 'إضافة تراكيب معجمية جديدة أو مراعاة التفرعات الدلالية دون إحداث إنذارات خاطئة.';
      }
    }

    return {
      ...r,
      track1_ref_label: t1.label,
      track1_ref_canonical: t1Canonical,
      track1_ref_level: t1.level,
      track1_ref_matched: t1.matched,
      track2_hyp_label: t2.label,
      track2_hyp_canonical: t2Canonical,
      track2_hyp_level: t2.level,
      track2_hyp_matched: t2.matched,
      classification_match: (gtCanonical === t2Canonical),
      error_root_cause: rootCause,
      proposed_remediation: remediation
    };
  });

  // Calculate updated model summaries
  const models = ['Xenova/whisper-tiny', 'Xenova/whisper-small'];
  const updatedSummary = {};

  models.forEach(mId => {
    const runs = updatedResults.filter(r => r.model_id === mId);
    let multiMatches = 0;
    let tp = 0, fp = 0, tn = 0, fn = 0, excluded = 0;
    let totalNormWer = 0, totalRawWer = 0;
    let totalSubs = 0, totalDels = 0, totalIns = 0, totalRefWords = 0;
    let totalTime = 0;

    runs.forEach(r => {
      const gt = mapToCanonical(r.ground_truth_label);
      const pred = mapToCanonical(r.track2_hyp_label);
      if (gt === pred) multiMatches++;

      const isGtHarm = ['إساءة', 'تهديد', 'طلب معلومات شخصية'].includes(gt);
      const isPredHarm = ['إساءة', 'تهديد', 'طلب معلومات شخصية'].includes(pred);

      if (r.ground_truth_label === 'مراجعة سياقية') {
        excluded++;
      } else {
        if (isGtHarm && isPredHarm) tp++;
        else if (!isGtHarm && isPredHarm) fp++;
        else if (!isGtHarm && !isPredHarm) tn++;
        else fn++;
      }

      totalNormWer += parseFloat(String(r.norm_wer_pct).replace('%', ''));
      totalRawWer += parseFloat(String(r.raw_wer_pct).replace('%', ''));
      totalSubs += r.substitutions;
      totalDels += r.deletions;
      totalIns += r.insertions;
      totalRefWords += r.ref_words_count;
      totalTime += r.processing_time_ms;
    });

    const prec = (tp + fp) ? (tp / (tp + fp) * 100).toFixed(1) + '%' : '0.0%';
    const rec = (tp + fn) ? (tp / (tp + fn) * 100).toFixed(1) + '%' : '0.0%';
    const f1 = (tp + fn && tp + fp) ? (2 * tp / (2 * tp + fp + fn) * 100).toFixed(1) + '%' : '0.0%';
    const fpr = (fp + tn) ? (fp / (fp + tn) * 100).toFixed(1) + '%' : '0.0%';

    updatedSummary[mId] = {
      model_id: mId,
      model_name: mId.includes('small') ? 'Whisper Small' : 'Whisper Tiny',
      samples_tested: runs.length,
      avg_raw_wer: (totalRawWer / runs.length).toFixed(2) + '%',
      avg_norm_wer: (totalNormWer / runs.length).toFixed(2) + '%',
      corpus_wer: ((totalSubs + totalDels + totalIns) / totalRefWords * 100).toFixed(2) + '%',
      total_ref_words: totalRefWords,
      total_substitutions: totalSubs,
      total_deletions: totalDels,
      total_insertions: totalIns,
      avg_processing_time_sec: (totalTime / runs.length / 1000).toFixed(2),
      multi_class_accuracy: (multiMatches / runs.length * 100).toFixed(1) + '%',
      harm_detection_metrics: {
        evaluated_cohort_size: runs.length - excluded,
        excluded_contextual_size: excluded,
        true_positives: tp,
        false_positives: fp,
        true_negatives: tn,
        false_negatives: fn,
        precision: prec,
        recall: rec,
        f1_score: f1,
        false_positive_rate: fpr
      }
    };
  });

  const fullData = {
    metadata: {
      ...existing.metadata,
      audit_date: '2026-10-23',
      audit_status: 'audited_and_recalculated_with_canonical_categories'
    },
    model_summary: updatedSummary,
    results: updatedResults
  };

  fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2), 'utf8');
  console.log('Saved updated audio_benchmark_results.json');

  // CSV output
  const csvHeaders = [
    'sample_id', 'model_name', 'voice_name', 'ground_truth_label', 'ground_truth_canonical',
    'system_label', 'system_canonical', 'classification_match', 'norm_wer', 'raw_wer',
    'error_root_cause', 'proposed_remediation', 'ground_truth_text', 'extracted_transcript'
  ];
  const formatCell = v => '"' + String(v || '').replace(/"/g, '""') + '"';
  const csvRows = [
    csvHeaders.join(','),
    ...updatedResults.map(r => [
      r.sample_id,
      formatCell(r.model_name),
      formatCell(r.voice_name),
      formatCell(r.ground_truth_label),
      formatCell(r.ground_truth_canonical || mapToCanonical(r.ground_truth_label)),
      formatCell(r.track2_hyp_label),
      formatCell(r.track2_hyp_canonical || mapToCanonical(r.track2_hyp_label)),
      r.classification_match,
      formatCell(r.norm_wer_pct),
      formatCell(r.raw_wer_pct),
      formatCell(r.error_root_cause),
      formatCell(r.proposed_remediation),
      formatCell(r.ground_truth_text),
      formatCell(r.extracted_transcript)
    ].join(','))
  ];
  fs.writeFileSync(path.resolve('data/audio_benchmark_results.csv'), '\uFEFF' + csvRows.join('\r\n'), 'utf8');
  console.log('Saved updated audio_benchmark_results.csv');

  // Save compact UI json
  const compact = updatedResults.map(r => ({
    id: r.sample_id,
    scenario: r.scenario_ref,
    voice: r.voice_name,
    gt_label: r.ground_truth_label,
    gt_canonical: mapToCanonical(r.ground_truth_label),
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
    t1_canonical: r.track1_ref_canonical,
    t2_label: r.track2_hyp_label,
    t2_canonical: r.track2_hyp_canonical,
    match: r.classification_match,
    error_root_cause: r.error_root_cause,
    proposed_remediation: r.proposed_remediation
  }));
  fs.writeFileSync(path.resolve('data/compact_benchmark_for_ui.json'), JSON.stringify(compact, null, 2), 'utf8');
  console.log('Saved updated compact_benchmark_for_ui.json');

  // Error analysis report json and csv
  const errorCasesOnly = updatedResults.filter(r => !r.classification_match);
  fs.writeFileSync(path.resolve('data/mizan_voice_error_analysis_report.json'), JSON.stringify({
    report_title: 'Mizan Voice Error & Misclassification Analysis Report',
    date: '2026-10-23',
    total_errors_recorded: errorCasesOnly.length,
    errors: errorCasesOnly
  }, null, 2), 'utf8');
  console.log('Saved mizan_voice_error_analysis_report.json');

  console.log('Summary of recalculation:');
  console.log('Whisper Small Summary:', updatedSummary['Xenova/whisper-small']);
  console.log('Whisper Tiny Summary:', updatedSummary['Xenova/whisper-tiny']);
}

main();
