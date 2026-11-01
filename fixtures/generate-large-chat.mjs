import { writeFileSync } from 'node:fs';

// Deterministic fictional export spanning March 2020 through November 2026.
const destination = process.argv[2] ?? '/tmp/spammy-large-chat.txt';
const count = Number(process.argv[3] ?? 22131);
if (!Number.isSafeInteger(count) || count < 2 || count > 500000)
  throw new Error('Message count must be an integer between 2 and 500000.');
const start = Date.UTC(2020, 2, 1, 9);
const end = Date.UTC(2026, 10, 1, 18);
const names = ['Alex Example', 'Sam Fiction', 'Robin Sample', 'Casey Demo'];
const lines = [
  'Who is bringing snacks?',
  'I will be five minutes late.',
  'The picnic plan is excellent.',
  'Please send the playlist.',
];
const messages = Array.from({ length: count }, (_, index) => {
  const date = new Date(start + Math.floor(((end - start) * index) / (count - 1)));
  const stamp = `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
  const time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  return `${stamp}, ${time} - ${names[index % names.length]}: ${lines[index % lines.length]} Fictional message ${index + 1}.`;
});
writeFileSync(destination, `${messages.join('\n')}\n`);
console.log(`Wrote ${count} synthetic messages to ${destination}`);
