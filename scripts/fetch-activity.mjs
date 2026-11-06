// Builds assets/data/activity.json from the public GitHub contribution calendar of ian-Reis.
// With "Include private contributions on my profile" turned on, that calendar already counts
// private repositories (as anonymous daily totals), so no token is needed and nothing private
// beyond the numbers is exposed.
// The file is only replaced when the parsed data passes validation, so a change in GitHub's
// markup can never publish an empty or broken heatmap: the last good file stays in place.
// Usage: node scripts/fetch-activity.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USER = 'ian-Reis';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/data/activity.json');

const res = await fetch(`https://github.com/users/${USER}/contributions`, {
  headers: { 'User-Agent': 'portfolio-activity-updater', Accept: 'text/html' },
});
if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
const html = await res.text();

// day cells: <td ... data-date="YYYY-MM-DD" ... id="contribution-day-component-W-D" ...>
const dateById = new Map();
for (const [tag] of html.matchAll(/<td\b[^>]*ContributionCalendar-day[^>]*>/g)) {
  const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
  const id = /\bid="(contribution-day-component-[\d-]+)"/.exec(tag)?.[1];
  if (date && id) dateById.set(id, date);
}
// tooltips: <tool-tip for="contribution-day-component-W-D" ...>12 contributions on ...</tool-tip>
const counts = new Map();
for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="(contribution-day-component-[\d-]+)"[^>]*>\s*(No|[\d,]+) contributions?\b/g)) {
  const date = dateById.get(m[1]);
  if (date) counts.set(date, m[2] === 'No' ? 0 : Number(m[2].replace(/,/g, '')));
}

const dates = [...counts.keys()].sort();
const problems = [];
if (dates.length < 360 || dates.length > 380) problems.push(`expected about a year of days, got ${dates.length}`);
if (dateById.size !== counts.size) problems.push(`${dateById.size} day cells but ${counts.size} counts`);
for (let i = 1; i < dates.length; i += 1) {
  const gap = (Date.parse(dates[i]) - Date.parse(dates[i - 1])) / 86400000;
  if (gap !== 1) { problems.push(`gap between ${dates[i - 1]} and ${dates[i]}`); break; }
}
if (problems.length) {
  console.error(`Not updating activity.json: ${problems.join('; ')}`);
  process.exit(1);
}

const series = dates.map((d) => counts.get(d));
const data = {
  user: USER,
  source: 'GitHub contribution calendar (private contributions included as daily totals)',
  start: dates[0],
  end: dates[dates.length - 1],
  total: series.reduce((a, b) => a + b, 0),
  activeDays: series.filter((n) => n > 0).length,
  counts: series,
};

// keep the file stable when nothing changed (avoids an empty commit every day)
let previous = null;
try { previous = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* first run */ }
const same = previous && previous.start === data.start && JSON.stringify(previous.counts) === JSON.stringify(data.counts);
if (same) {
  console.log('Activity unchanged.');
} else {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify({ ...data, updated: new Date().toISOString() })}\n`);
  console.log(`Wrote ${OUT}: ${data.total} contributions on ${data.activeDays} days (${data.start} to ${data.end}).`);
}
