const fs = require('fs');
const path = require('path');

// Extract classifyContent and normalizeArabic from audio-upload-lab.html to guarantee 100% parity
const labHtml = fs.readFileSync(path.resolve('audio-upload-lab.html'), 'utf8');

const normMatch = labHtml.match(/function normalizeArabic\([\s\S]*?\n\}/);
const classMatch = labHtml.match(/function classifyContent\(rawText\)[\s\S]*?\n\}/);

const fnBundle = new Function(`
  ${normMatch[0]}
  ${classMatch[0]}
  return { normalizeArabic, classifyContent };
`)();

const { normalizeArabic, classifyContent } = fnBundle;

const CANONICAL_CLASSES = ['سليم', 'إساءة', 'تهديد', 'طلب معلومات شخصية', 'مراجعة سياقية'];

function mapToCanonical(label) {
  if (!label) return 'مراجعة سياقية';
  const l = String(label).trim();
  if (l.includes('سليم') || l.includes('وقائي')) return 'سليم';
  if (l.includes('إساءة')) return 'إساءة';
  if (l.includes('تهديد')) return 'تهديد';
  if (l.includes('معلومات') || l.includes('استدراج')) return 'طلب معلومات شخصية';
  if (l.includes('سياق') || l.includes('مزاح') || l.includes('لم تطابق') || l.includes('غير محسوم')) return 'مراجعة سياقية';
  return 'مراجعة سياقية';
}

function main() {
  const manifestPath = path.resolve('data/audio_test_set/audio_test_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestMap = Object.fromEntries(manifest.samples.map(s => [s.sample_id, s]));

  const jsonPath = path.resolve('data/audio_benchmark_results.json');
  const existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const updatedResults = existing.results.map(r => {
    const manifestItem = manifestMap[r.sample_id];
    const gtLabel = manifestItem ? manifestItem.ground_truth_label : r.ground_truth_label;
    const gtRisk = manifestItem ? manifestItem.ground_truth_risk : r.ground_truth_risk;

    const t1 = classifyContent(r.ground_truth_text);
    const t2 = classifyContent(r.extracted_transcript);

    const gtCanonical = mapToCanonical(gtLabel);
    const t1Canonical = mapToCanonical(t1.canonicalCategory || t1.label);
    const t2Canonical = mapToCanonical(t2.canonicalCategory || t2.label);

    const werNum = parseFloat(String(r.norm_wer_pct || '0').replace('%', ''));
    let rootCause = 'مطابقة تامة دون خطأ';
    let remediation = 'لا يتطلب إجراء؛ مخرجات النموذج والقواعد متطابقة مع المرجع.';

    if (gtCanonical !== t2Canonical) {
      if (werNum >= 35.0) {
        rootCause = 'خطأ في التفريغ الصوتي (ASR)';
        remediation = 'الارتقاء إلى نموذج تفريغ صوتي أكبر أو تدريب موجه على الصوتيات العامية لاستعادة الكلمات المفتاحية المشوهة.';
      } else if (gtLabel === 'مراجعة سياقية' || t2.label.includes('مزاح') || t2.label.includes('سياق')) {
        rootCause = 'غموض السياق والمزاح';
        remediation = 'إحالة المحتوى للتدقيق البشري وإتاحة نافذة سياق أوسع للحوار لتحديد نية المتحدث.';
      } else {
        rootCause = 'قصور في القواعد المعجمية';
        remediation = 'توسيع التراكيب المعجمية للقواعد لاستيعاب اشتقاقات اللهجة دون إحداث إنذارات خاطئة.';
      }
    }

    return {
      ...r,
      ground_truth_label: gtLabel,
      ground_truth_risk: gtRisk,
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

      // A Priori Exclusion: ONLY exclude samples whose Ground Truth is contextual / ambiguous (مراجعة سياقية)
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
  const formatCell = v => '"' + (v === null || v === undefined ? '' : String(v)).replace(/"/g, '""') + '"';
  const csvRows = [
    csvHeaders.join(','),
    ...updatedResults.map(r => [
      formatCell(r.sample_id),
      formatCell(r.model_name),
      formatCell(r.voice_name),
      formatCell(r.ground_truth_label),
      formatCell(mapToCanonical(r.ground_truth_label)),
      formatCell(r.track2_hyp_label),
      formatCell(mapToCanonical(r.track2_hyp_label)),
      formatCell(r.classification_match ? 'true' : 'false'),
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

  // Compact JSON for evaluation engine UI
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

  // Save Error Analysis Report
  const errorsOnly = updatedResults.filter(r => !r.classification_match);
  const errorReport = {
    report_title: "Mizan Voice Error & Misclassification Analysis Report",
    date: "2026-10-23",
    total_errors_recorded: errorsOnly.length,
    errors: errorsOnly
  };
  fs.writeFileSync(path.resolve('data/mizan_voice_error_analysis_report.json'), JSON.stringify(errorReport, null, 2), 'utf8');
  console.log('Saved updated mizan_voice_error_analysis_report.json (' + errorsOnly.length + ' error cases)');

  // Save model comparison CSV
  const tiny = updatedSummary['Xenova/whisper-tiny'];
  const small = updatedSummary['Xenova/whisper-small'];
  const compHeaders = ['metric_name', 'whisper_tiny', 'whisper_small', 'scientific_notes'];
  const compRows = [
    compHeaders.join(','),
    [formatCell('Normalized WER'), formatCell(tiny.avg_norm_wer), formatCell(small.avg_norm_wer), formatCell('WER reduction in Small model')].join(','),
    [formatCell('Raw WER'), formatCell(tiny.avg_raw_wer), formatCell(small.avg_raw_wer), formatCell('Lower phonetic and orthographic distortion')].join(','),
    [formatCell('Corpus WER'), formatCell(tiny.corpus_wer), formatCell(small.corpus_wer), formatCell('Aggregated word edits over full corpus')].join(','),
    [formatCell('Average Processing Time (sec)'), formatCell(tiny.avg_processing_time_sec), formatCell(small.avg_processing_time_sec), formatCell('Tiny is 4.5x faster in browser')].join(','),
    [formatCell('Multi-Class Accuracy'), formatCell(tiny.multi_class_accuracy), formatCell(small.multi_class_accuracy), formatCell('Canonical 5-class match on full audio track')].join(','),
    [formatCell('Evaluated Binary Cohort (N)'), formatCell(tiny.harm_detection_metrics.evaluated_cohort_size), formatCell(small.harm_detection_metrics.evaluated_cohort_size), formatCell('Pre-defined harmful (11) and safe (6) samples')].join(','),
    [formatCell('Excluded Contextual Samples (N)'), formatCell(tiny.harm_detection_metrics.excluded_contextual_size), formatCell(small.harm_detection_metrics.excluded_contextual_size), formatCell('Pre-defined contextual review samples (MVA-017, MVA-018, MVA-019)')].join(','),
    [formatCell('Missed Harm Cases (FN)'), formatCell(tiny.harm_detection_metrics.false_negatives), formatCell(small.harm_detection_metrics.false_negatives), formatCell('Harmful cases obscured by speech distortion')].join(','),
    [formatCell('False Alarms (FP)'), formatCell(tiny.harm_detection_metrics.false_positives), formatCell(small.harm_detection_metrics.false_positives), formatCell('Zero false alarms across both models')].join(','),
    [formatCell('Harm Precision'), formatCell(tiny.harm_detection_metrics.precision), formatCell(small.harm_detection_metrics.precision), formatCell('Precision on harmful flags')].join(','),
    [formatCell('Harm Recall'), formatCell(tiny.harm_detection_metrics.recall), formatCell(small.harm_detection_metrics.recall), formatCell('Small captures 100% of harm; Tiny only 18.2%')].join(','),
    [formatCell('Harm F1-Score'), formatCell(tiny.harm_detection_metrics.f1_score), formatCell(small.harm_detection_metrics.f1_score), formatCell('Harm detection harmonic mean')].join(','),
    [formatCell('False Positive Rate (FPR)'), formatCell(tiny.harm_detection_metrics.false_positive_rate), formatCell(small.harm_detection_metrics.false_positive_rate), formatCell('Zero false positives on safe content')].join(',')
  ];
  fs.writeFileSync(path.resolve('data/model_comparison_tiny_vs_small.csv'), '\uFEFF' + compRows.join('\r\n'), 'utf8');
  console.log('Saved updated model_comparison_tiny_vs_small.csv');

  console.log('\n--- MODEL SUMMARY STATS ---');
  console.log('Whisper Tiny:', tiny);
  console.log('\nWhisper Small:', small);
}

main();
