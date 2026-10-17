import fs from 'fs';
import path from 'path';

const CORPUS_DIR = path.resolve(process.cwd(), 'corpus');
const CORPUS_NOW = process.env.CORPUS_NOW || '2026-10-21';
const nowDate = new Date(CORPUS_NOW);
const sevenDaysBefore = new Date(nowDate.getTime() - 7 * 24 * 60 * 60 * 1000);

if (!fs.existsSync(CORPUS_DIR)) {
  console.error(`Corpus directory not found: ${CORPUS_DIR}`);
  process.exit(1);
}

// Check README.md
const readmePath = path.join(CORPUS_DIR, 'README.md');
if (!fs.existsSync(readmePath)) {
  console.error('Missing server/corpus/README.md');
  process.exit(1);
}
const readmeContent = fs.readFileSync(readmePath, 'utf-8');
if (!readmeContent.includes('Seeded sample data, fictional people and companies.')) {
  console.error('README.md missing required seeded sample data notice');
  process.exit(1);
}

const files = fs.readdirSync(CORPUS_DIR).filter((f) => f.endsWith('.md') && f !== 'README.md');

if (files.length !== 50) {
  console.error(`Expected exactly 50 notes, but found ${files.length}`);
  process.exit(1);
}

const ids = new Set<string>();
let actionItemCount = 0;
let recentActionItemCount = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(CORPUS_DIR, file), 'utf-8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    console.error(`Invalid frontmatter in file: ${file}`);
    process.exit(1);
  }

  const frontmatterStr = match[1];
  const body = match[2];

  const idMatch = frontmatterStr.match(/id:\s*"([^"]+)"/);
  const titleMatch = frontmatterStr.match(/title:\s*"([^"]+)"/);
  const dateMatch = frontmatterStr.match(/date:\s*"([^"]+)"/);

  if (!idMatch || !titleMatch || !dateMatch) {
    console.error(`Missing required frontmatter fields in ${file}`);
    process.exit(1);
  }

  const id = idMatch[1];
  const dateStr = dateMatch[1];
  const noteDate = new Date(dateStr);

  if (ids.has(id)) {
    console.error(`Duplicate note id: ${id}`);
    process.exit(1);
  }
  ids.add(id);

  if (noteDate < new Date('2026-09-20') || noteDate > new Date('2026-10-21')) {
    console.error(`Note date out of range in ${file}: ${dateStr}`);
    process.exit(1);
  }

  // Check action items: - [ ], TODO:, Action:
  const hasActionItem =
    body.includes('- [ ]') ||
    body.includes('TODO:') ||
    body.includes('Action:');

  if (hasActionItem) {
    actionItemCount++;
    if (noteDate >= sevenDaysBefore && noteDate <= nowDate) {
      recentActionItemCount++;
    }
  }
}

console.log(`Corpus Check Passed:`);
console.log(`- Total notes: ${files.length} (expected 50)`);
console.log(`- Unique IDs: ${ids.size}`);
console.log(`- Notes with action items: ${actionItemCount} (expected >= 18)`);
console.log(`- Notes with action items in past 7 days: ${recentActionItemCount} (expected >= 10)`);

if (actionItemCount < 18) {
  console.error(`Action item count ${actionItemCount} is less than required 18`);
  process.exit(1);
}
if (recentActionItemCount < 10) {
  console.error(`Recent action item count ${recentActionItemCount} is less than required 10`);
  process.exit(1);
}
console.log('✓ All corpus checks passed successfully!');
