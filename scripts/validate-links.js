#!/usr/bin/env node
/**
 * Validates all markdown links in awesome-stars README.md and stars.md
 * Reports dead links, broken anchors, and formatting issues.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const README_PATH = join(ROOT_DIR, 'README.md');
const STARS_PATH = join(ROOT_DIR, 'stars.md');

// Parse markdown links: [text](url)
function extractLinks(content) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }
  return links;
}

// Parse category anchors from stargazed format: - [Header (N)](#anchor)
function extractAnchors(content) {
  const regex = /^- \[.+\(?\d+\)?\]\(#(.+)\)$/gm;
  const anchors = new Set();
  let match;
  while ((match = regex.exec(content)) !== null) {
    anchors.add(match[1]);
  }
  return anchors;
}

function validate() {
  console.log('🔍 Validating awesome-stars links...\n');

  const readmeContent = readFileSync(README_PATH, 'utf-8');
  const starsContent = readFileSync(STARS_PATH, 'utf-8');

  const readmeLinks = extractLinks(readmeContent);
  const starsLinks = extractLinks(starsContent);
  const allLinks = [...readmeLinks, ...starsLinks];

  const anchorSet = extractAnchors(readmeContent);

  const httpLinks = [];
  const brokenAnchors = [];
  const duplicateLinks = [];
  const seen = new Set();

  for (const { text, url } of allLinks) {
    if (seen.has(url)) {
      duplicateLinks.push({ text, url });
      continue;
    }
    seen.add(url);

    // Local anchor links
    if (url.startsWith('#')) {
      const anchor = url.substring(1);
      if (!anchorSet.has(anchor)) {
        brokenAnchors.push({ text, url });
      }
      continue;
    }

    // HTTP/HTTPS links
    if (url.startsWith('http://') || url.startsWith('https://')) {
      httpLinks.push({ text, url });
    }
  }

  // Count repos by category
  const categoryRegex = /^- \[(.+) \((\d+)\)\]\(#(.+)\)$/gm;
  const categories = [];
  let match;
  while ((match = categoryRegex.exec(readmeContent)) !== null) {
    categories.push({ name: match[1], count: parseInt(match[2]), anchor: match[3] });
  }
  const total = categories.reduce((sum, c) => sum + c.count, 0);

  console.log(`📊 Summary:`);
  console.log(`   Total links: ${allLinks.length}`);
  console.log(`   Unique links: ${seen.size}`);
  console.log(`   Local anchors: ${anchorSet.size}`);
  console.log(`   HTTP/HTTPS links: ${httpLinks.length}`);
  console.log(`   Broken anchors: ${brokenAnchors.length}`);
  console.log(`   Duplicate links: ${duplicateLinks.length}`);
  console.log(`   Categories: ${categories.length}, Total repos: ${total}\n`);

  // Report broken anchors (exclude common "Back to Index" patterns)
  const realBroken = brokenAnchors.filter(a => !a.text.includes('Back to Index'));
  if (realBroken.length > 0) {
    console.log(`⚠️  ${realBroken.length} broken anchors:`);
    for (const { text, url } of realBroken.slice(0, 15)) {
      console.log(`   ${url} — ${text}`);
    }
    if (realBroken.length > 15) {
      console.log(`   ... and ${realBroken.length - 15} more`);
    }
    console.log();
  }

  // Report duplicates (exclude Back to Index)
  const realDupes = duplicateLinks.filter(d => !d.text.includes('Back to Index'));
  if (realDupes.length > 0) {
    console.log(`📋 ${realDupes.length} duplicate repo links:`);
    for (const { text, url } of realDupes.slice(0, 10)) {
      console.log(`   ${url} — ${text}`);
    }
    if (realDupes.length > 10) {
      console.log(`   ... and ${realDupes.length - 10} more`);
    }
    console.log();
  }

  // HTTP (non-HTTPS) links
  const httpOnly = httpLinks.filter(l => l.url.startsWith('http://'));
  if (httpOnly.length > 0) {
    console.log(`🔓 ${httpOnly.length} HTTP (non-HTTPS) links:`);
    for (const { text, url } of httpOnly.slice(0, 10)) {
      console.log(`   ${url} — ${text}`);
    }
    if (httpOnly.length > 10) {
      console.log(`   ... and ${httpOnly.length - 10} more`);
    }
    console.log();
  }

  // Top categories
  const top = [...categories].sort((a, b) => b.count - a.count).slice(0, 10);
  console.log('🏆 Top 10 categories:');
  for (const { name, count } of top) {
    console.log(`   ${name}: ${count}`);
  }

  const hasIssues = realBroken.length > 0 || realDupes.length > 0 || httpOnly.length > 0;
  console.log(`\n${hasIssues ? '⚠️  Issues found' : '✅ No issues found'}`);
  return hasIssues ? 1 : 0;
}

const exitCode = validate();
process.exit(exitCode);
