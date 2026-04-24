#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseFlows } = require('./src/parseFlows');
const { buildFieldData } = require('./src/buildData');

const repoPath = process.argv[2];
if (!repoPath) {
    console.error('Usage: node index.js <path-to-salesforce-repo>');
    process.exit(1);
}

const absPath = path.resolve(repoPath);
console.log(`Scanning ${absPath}...`);

const flows = parseFlows(absPath);
console.log(`Found ${flows.length} record-triggered flows`);

const fieldData = buildFieldData(flows);
console.log(`Found ${fieldData.length} fields across ${[...new Set(fieldData.map(f => f.object))].join(', ')}`);
const riskCounts = ['critical', 'high', 'medium'].map(r => `${r}: ${fieldData.filter(f => f.risk === r).length}`).join(', ');
console.log(`Risk fields — ${riskCounts}`);

const template = fs.readFileSync(path.join(__dirname, 'src/template.html'), 'utf8');
const html = template
    .replace('__DATA__', JSON.stringify(fieldData))
    .replace('__FILTERS_JS__', fs.readFileSync(path.join(__dirname, 'src/filters.js'), 'utf8'))
    .replace('__SIDEBAR_JS__', fs.readFileSync(path.join(__dirname, 'src/sidebar.js'), 'utf8'))
    .replace('__CHART_JS__', fs.readFileSync(path.join(__dirname, 'src/chart.js'), 'utf8'));

const outPath = path.join(process.cwd(), 'hotspot-report.html');
fs.writeFileSync(outPath, html);
console.log(`\nReport written to ${outPath}`);
