import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'docs', 'admob-setup-guide.html');
const pdfPath = path.join(root, 'docs', 'AdMob-설정-가이드.pdf');

if (!fs.existsSync(htmlPath)) {
  console.error('HTML guide not found:', htmlPath);
  process.exit(1);
}

const require = createRequire(import.meta.url);
let puppeteer;

try {
  puppeteer = require('puppeteer');
} catch {
  console.log('Installing puppeteer...');
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['install', '--no-save', 'puppeteer@24'],
      { cwd: root, stdio: 'inherit', shell: true }
    );
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`npm install failed: ${code}`))
    );
  });
  puppeteer = require('puppeteer');
}

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, {
  waitUntil: 'networkidle0',
});
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '12mm', bottom: '14mm', left: '14mm', right: '14mm' },
});
await browser.close();

console.log('PDF created:', pdfPath);
