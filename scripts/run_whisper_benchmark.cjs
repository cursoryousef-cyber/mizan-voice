const fs = require('fs');
const path = require('path');
const puppeteer = require(path.resolve(process.cwd(), 'node_modules/puppeteer-core'));

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const MANIFEST_PATH = path.resolve('data/audio_test_set/audio_test_manifest.json');
const OUTPUT_JSON = path.resolve('data/audio_benchmark_results.json');
const OUTPUT_CSV = path.resolve('data/audio_benchmark_results.csv');
const COMPARISON_CSV = path.resolve('data/model_comparison_tiny_vs_small.csv');

async function runBenchmark() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error('Manifest not found at ' + MANIFEST_PATH);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const samples = manifest.samples;
  console.log(`Loaded ${samples.length} audio test samples from manifest.`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--js-flags=--max-old-space-size=4096']
  });

  const allResults = [];

  const modelsToTest = [
    { id: 'Xenova/whisper-tiny', label: 'Whisper Tiny' },
    { id: 'Xenova/whisper-small', label: 'Whisper Small' }
  ];

  try {
    for (const model of modelsToTest) {
      console.log(`\n======================================================`);
      console.log(`Starting benchmark run for model: ${model.label} (${model.id})`);
      console.log(`======================================================`);

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(180000);
      page.setDefaultTimeout(180000);

      const labUrl = 'file:///' + path.resolve('audio-upload-lab.html').replace(/\\/g, '/');
      await page.goto(labUrl, { waitUntil: 'domcontentloaded' });

      // Select model
      await page.select('#modelChoice', model.id);
      await new Promise(r => setTimeout(r, 600));

      for (let idx = 0; idx < samples.length; idx++) {
        const sample = samples[idx];
        const audioFile = path.resolve(sample.relative_path);
        console.log(`\n[${idx + 1}/${samples.length}] Model: ${model.label} | Sample: ${sample.sample_id} (${sample.ground_truth_label})`);
        console.log(`Ground Truth: "${sample.ground_truth_text}"`);

        // Upload audio file
        const fileInput = await page.$('#audioFile');
        await fileInput.uploadFile(audioFile);
        await new Promise(r => setTimeout(r, 600));

        // Fill Reference Text & Label
        await page.evaluate((gtText, gtLabel) => {
          document.getElementById('referenceText').value = gtText;
          document.getElementById('referenceLabel').value = gtLabel;
          document.getElementById('transcript').value = '';
        }, sample.ground_truth_text, sample.ground_truth_label);

        const startTime = Date.now();
        await page.click('#runBtn');

        // Wait for transcription to complete (max 120s)
        let extractedText = '';
        let errorMsg = '';
        for (let t = 0; t < 120; t++) {
          await new Promise(r => setTimeout(r, 1000));
          const state = await page.evaluate(() => {
            const btn = document.getElementById('runBtn');
            const st = document.getElementById('status').textContent;
            const tr = document.getElementById('transcript').value;
            return { disabled: btn.disabled, status: st, transcript: tr };
          });

          if (!state.disabled) {
            extractedText = (state.transcript || '').trim();
            if (state.status.includes('تعذر')) {
              errorMsg = state.status;
            }
            break;
          }
        }
        const processingTimeMs = Date.now() - startTime;
        console.log(`-> Extracted in ${(processingTimeMs / 1000).toFixed(1)}s: "${extractedText}"`);
        if (errorMsg) console.log(`-> Error: ${errorMsg}`);

        // Compute WER in browser using the exact lab logic
        await page.click('#calcWerBtn');
        await new Promise(r => setTimeout(r, 300));

        // Compute detailed alignment metrics directly
        const werResult = await page.evaluate((ref, hyp) => {
          const normRef = window.MizanVoiceLab.normalizeArabic(ref);
          const normHyp = window.MizanVoiceLab.normalizeArabic(hyp);
          
          const rawLev = window.MizanVoiceLab.calculateWER(ref, hyp, false);
          const normLev = window.MizanVoiceLab.calculateWER(normRef, normHyp, true);

          // Word level breakdown
          const rWords = normRef.split(/\s+/).filter(Boolean);
          const hWords = normHyp.split(/\s+/).filter(Boolean);

          const d = Array.from({ length: rWords.length + 1 }, () => new Array(hWords.length + 1).fill(0));
          for (let i = 0; i <= rWords.length; i++) d[i][0] = i;
          for (let j = 0; j <= hWords.length; j++) d[0][j] = j;

          for (let i = 1; i <= rWords.length; i++) {
            for (let j = 1; j <= hWords.length; j++) {
              if (rWords[i - 1] === hWords[j - 1]) d[i][j] = d[i - 1][j - 1];
              else d[i][j] = Math.min(d[i - 1][j - 1] + 1, d[i][j - 1] + 1, d[i - 1][j] + 1);
            }
          }

          // Backtrack to count substitutions, insertions, deletions
          let i = rWords.length, j = hWords.length;
          let subs = 0, ins = 0, dels = 0;
          while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && rWords[i - 1] === hWords[j - 1]) {
              i--; j--;
            } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
              subs++; i--; j--;
            } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
              ins++; j--;
            } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
              dels++; i--;
            } else {
              break;
            }
          }

          // Two-track classification:
          // Track 1: Ground truth classification
          const track1 = window.MizanVoiceLab.classifyContent(ref);
          // Track 2: Extracted Whisper transcript classification
          const track2 = window.MizanVoiceLab.classifyContent(hyp);

          return {
            rawWer: rawLev.wer,
            rawWerPct: rawLev.werPercentage,
            normWer: normLev.wer,
            normWerPct: normLev.werPercentage,
            refWordCount: rWords.length,
            hypWordCount: hWords.length,
            substitutions: subs,
            deletions: dels,
            insertions: ins,
            track1: {
              label: track1.label,
              level: track1.level,
              matched: track1.matched
            },
            track2: {
              label: track2.label,
              level: track2.level,
              matched: track2.matched
            }
          };
        }, sample.ground_truth_text, extractedText);

        const record = {
          sample_id: sample.sample_id,
          scenario_ref: sample.scenario_ref,
          voice_name: sample.voice,
          ground_truth_label: sample.ground_truth_label,
          ground_truth_risk: sample.ground_truth_risk,
          model_id: model.id,
          model_name: model.label,
          ground_truth_text: sample.ground_truth_text,
          extracted_transcript: extractedText,
          raw_wer: werResult.rawWer,
          raw_wer_pct: werResult.rawWerPct,
          norm_wer: werResult.normWer,
          norm_wer_pct: werResult.normWerPct,
          ref_words_count: werResult.refWordCount,
          hyp_words_count: werResult.hypWordCount,
          substitutions: werResult.substitutions,
          deletions: werResult.deletions,
          insertions: werResult.insertions,
          processing_time_ms: processingTimeMs,
          error_status: errorMsg || 'none',
          track1_ref_label: werResult.track1.label,
          track1_ref_level: werResult.track1.level,
          track1_ref_matched: werResult.track1.matched.join('; '),
          track2_hyp_label: werResult.track2.label,
          track2_hyp_level: werResult.track2.level,
          track2_hyp_matched: werResult.track2.matched.join('; '),
          classification_match: (werResult.track1.label === werResult.track2.label)
        };

        allResults.push(record);
      }

      await page.close();
    }
  } finally {
    await browser.close();
  }

  // Summary analysis
  console.log('\n======================================================');
  console.log('BENCHMARK RUN COMPLETED. CALCULATING AGGREGATE METRICS');
  console.log('======================================================');

  // Compute metrics per model
  const modelStats = {};
  for (const m of modelsToTest) {
    const subset = allResults.filter(r => r.model_id === m.id);
    const avgRawWer = subset.reduce((acc, r) => acc + r.raw_wer, 0) / subset.length;
    const avgNormWer = subset.reduce((acc, r) => acc + r.norm_wer, 0) / subset.length;
    const totalWords = subset.reduce((acc, r) => acc + r.ref_words_count, 0);
    const totalSubs = subset.reduce((acc, r) => acc + r.substitutions, 0);
    const totalDels = subset.reduce((acc, r) => acc + r.deletions, 0);
    const totalIns = subset.reduce((acc, r) => acc + r.insertions, 0);
    const totalEdits = totalSubs + totalDels + totalIns;
    const corpusWer = totalEdits / totalWords;
    const avgTimeMs = subset.reduce((acc, r) => acc + r.processing_time_ms, 0) / subset.length;
    const classMatches = subset.filter(r => r.classification_match).length;

    modelStats[m.id] = {
      model_id: m.id,
      model_name: m.label,
      samples_tested: subset.length,
      avg_raw_wer: (avgRawWer * 100).toFixed(2) + '%',
      avg_norm_wer: (avgNormWer * 100).toFixed(2) + '%',
      corpus_wer: (corpusWer * 100).toFixed(2) + '%',
      total_ref_words: totalWords,
      total_substitutions: totalSubs,
      total_deletions: totalDels,
      total_insertions: totalIns,
      avg_processing_time_sec: (avgTimeMs / 1000).toFixed(2),
      classification_stability_rate: ((classMatches / subset.length) * 100).toFixed(1) + '%'
    };
  }

  console.log('Model Comparison Statistics:', JSON.stringify(modelStats, null, 2));

  // Write JSON output
  const outputData = {
    metadata: {
      generated_at: new Date().toISOString(),
      dataset_name: manifest.dataset_name,
      synthetic_notice: manifest.synthetic_notice,
      total_samples: samples.length,
      tested_models: modelsToTest.map(m => m.id)
    },
    model_summary: modelStats,
    results: allResults
  };
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(outputData, null, 2), 'utf-8');
  console.log(`Wrote full JSON results to: ${OUTPUT_JSON}`);

  // Write Main CSV
  const csvHeaders = [
    'sample_id', 'model_name', 'model_id', 'voice_name', 'ground_truth_label', 'ground_truth_risk',
    'norm_wer_pct', 'raw_wer_pct', 'ref_words_count', 'substitutions', 'deletions', 'insertions',
    'processing_time_ms', 'ground_truth_text', 'extracted_transcript',
    'track1_ref_label', 'track2_hyp_label', 'classification_match'
  ];
  let csvContent = csvHeaders.join(',') + '\n';
  for (const r of allResults) {
    const row = [
      r.sample_id,
      `"${r.model_name}"`,
      `"${r.model_id}"`,
      `"${r.voice_name}"`,
      `"${r.ground_truth_label}"`,
      `"${r.ground_truth_risk}"`,
      `"${r.norm_wer_pct}"`,
      `"${r.raw_wer_pct}"`,
      r.ref_words_count,
      r.substitutions,
      r.deletions,
      r.insertions,
      r.processing_time_ms,
      `"${r.ground_truth_text.replace(/"/g, '""')}"`,
      `"${r.extracted_transcript.replace(/"/g, '""')}"`,
      `"${r.track1_ref_label.replace(/"/g, '""')}"`,
      `"${r.track2_hyp_label.replace(/"/g, '""')}"`,
      r.classification_match
    ];
    csvContent += row.join(',') + '\n';
  }
  fs.writeFileSync(OUTPUT_CSV, csvContent, 'utf-8');
  console.log(`Wrote benchmark CSV to: ${OUTPUT_CSV}`);

  // Write Comparison CSV
  let compCsv = 'metric,Whisper_Tiny,Whisper_Small\n';
  const tiny = modelStats['Xenova/whisper-tiny'];
  const small = modelStats['Xenova/whisper-small'];
  compCsv += `tested_samples,${tiny.samples_tested},${small.samples_tested}\n`;
  compCsv += `avg_raw_wer,${tiny.avg_raw_wer},${small.avg_raw_wer}\n`;
  compCsv += `avg_normalized_wer,${tiny.avg_norm_wer},${small.avg_norm_wer}\n`;
  compCsv += `corpus_wer,${tiny.corpus_wer},${small.corpus_wer}\n`;
  compCsv += `total_ref_words,${tiny.total_ref_words},${small.total_ref_words}\n`;
  compCsv += `total_substitutions,${tiny.total_substitutions},${small.total_substitutions}\n`;
  compCsv += `total_deletions,${tiny.total_deletions},${small.total_deletions}\n`;
  compCsv += `total_insertions,${tiny.total_insertions},${small.total_insertions}\n`;
  compCsv += `avg_processing_time_sec,${tiny.avg_processing_time_sec},${small.avg_processing_time_sec}\n`;
  compCsv += `classification_stability_rate,${tiny.classification_stability_rate},${small.classification_stability_rate}\n`;
  fs.writeFileSync(COMPARISON_CSV, compCsv, 'utf-8');
  console.log(`Wrote model comparison CSV to: ${COMPARISON_CSV}`);
}

runBenchmark().catch(err => {
  console.error('Benchmark execution failed:', err);
  process.exit(1);
});
