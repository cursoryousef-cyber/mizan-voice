const fs = require('fs');
const path = require('path');

const evalHtmlPath = path.join(__dirname, '..', 'evaluation-engine.html');
const compactJsonPath = path.join(__dirname, '..', 'data', 'compact_benchmark_for_ui.json');
const audioLabHtmlPath = path.join(__dirname, '..', 'audio-upload-lab.html');

// Read files
let evalHtml = fs.readFileSync(evalHtmlPath, 'utf8');
const compactJson = fs.readFileSync(compactJsonPath, 'utf8');
const audioLabHtml = fs.readFileSync(audioLabHtmlPath, 'utf8');

// Extract classifyContent from audio-upload-lab.html
const fnRegex = /function classifyContent\(rawText\)[\s\S]*?\n\}/;
const match = audioLabHtml.match(fnRegex);
if (!match) {
  console.error("Could not find classifyContent in audio-upload-lab.html");
  process.exit(1);
}
const labClassifyContent = match[0];

// Replace classifyContent in evaluation-engine.html
evalHtml = evalHtml.replace(/function classifyContent\(rawText\)[\s\S]*?\n\}/, labClassifyContent);

// Replace ACTUAL_AUDIO_BENCHMARK in evaluation-engine.html
const benchRegex = /const ACTUAL_AUDIO_BENCHMARK = \[[\s\S]*?\n\];/;
evalHtml = evalHtml.replace(benchRegex, `const ACTUAL_AUDIO_BENCHMARK = ${compactJson};`);

fs.writeFileSync(evalHtmlPath, evalHtml, 'utf8');
console.log('Successfully updated classifyContent and ACTUAL_AUDIO_BENCHMARK in evaluation-engine.html');
