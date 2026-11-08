// Genera las capturas de los proyectos definidas en lab/projects.json.
//
// Cada proyecto puede tener una lista "captures". Cada entrada es una de estas:
//   { "file": "home", "url": "https://...", "device": "desktop" | "mobile",
//     "wait": 1500, "hide": [".cookie-banner"], "fullPage": false }
//   { "file": "hoy", "src": "C:/ruta/a/captura.png", "device": "mobile" }
//
// Las de "url" se hacen con el Chrome del sistema (o Chromium en CI) y las de "src"
// se importan desde una imagen local. Todo acaba en site/assets/lab/<id>/<file>.webp.
//
// Uso:
//   node scripts/capture.mjs                 todas
//   node scripts/capture.mjs kitmaternidad   solo ese proyecto
//   node scripts/capture.mjs --live          solo las de URL http(s) (lo que usa CI)

import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const liveOnly = args.includes('--live');
const only = args.filter((a) => !a.startsWith('--'));

const data = JSON.parse(await readFile(path.join(root, 'lab/projects.json'), 'utf8'));
const projects = data.projects.filter((p) => !only.length || only.includes(p.id));

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, outWidth: 1440 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    outWidth: 780,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  },
};

const toWebp = (input, out, width) =>
  sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);

let browser;
async function getBrowser() {
  if (browser) return browser;
  const { chromium } = await import('playwright-core');
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/opt/pw-browsers/chromium',
  ].filter(Boolean);
  const executablePath = candidates.find((c) => existsSync(c));
  if (!executablePath) throw new Error('No encuentro Chrome. Define CHROME_PATH.');
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  return browser;
}

let failures = 0;
for (const project of projects) {
  for (const cap of project.captures ?? []) {
    const isLive = /^https?:/.test(cap.url ?? '');
    if (liveOnly && !isLive) continue;
    const device = DEVICES[cap.device ?? 'desktop'];
    const dir = path.join(root, 'site/assets/lab', project.id);
    await mkdir(dir, { recursive: true });
    const out = path.join(dir, `${cap.file}.webp`);
    try {
      if (cap.src) {
        await toWebp(cap.src.replace(/^~/, process.env.USERPROFILE ?? process.env.HOME), out, device.outWidth);
      } else {
        const b = await getBrowser();
        const { outWidth, ...ctxOpts } = device;
        const ctx = await b.newContext({ ...ctxOpts, locale: 'es-ES', colorScheme: cap.colorScheme ?? 'light' });
        const page = await ctx.newPage();
        await page.goto(cap.url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
        if (cap.hide?.length) {
          await page.addStyleTag({ content: `${cap.hide.join(',')}{display:none!important}` });
        }
        await page.waitForTimeout(cap.wait ?? 1200);
        const buf = await page.screenshot({ fullPage: !!cap.fullPage });
        await toWebp(buf, out, outWidth);
        await ctx.close();
      }
      console.log(`✓ ${project.id}/${cap.file}.webp`);
    } catch (err) {
      failures++;
      console.error(`✗ ${project.id}/${cap.file}: ${err.message}`);
    }
  }
}
await browser?.close();
process.exit(failures ? 1 : 0);
