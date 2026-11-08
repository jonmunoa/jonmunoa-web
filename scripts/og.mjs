// Genera site/assets/og.png (1200x630), la imagen que aparece al compartir la web.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const exe = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => p && existsSync(p));
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"><style>
body{margin:0;width:1200px;height:630px;background:#08090b;color:#eef2f2;font-family:'Space Grotesk';display:flex;flex-direction:column;justify-content:space-between;padding:72px;box-sizing:border-box;background-image:linear-gradient(rgba(125,249,208,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(125,249,208,.05) 1px,transparent 1px);background-size:64px 64px}
.top{display:flex;align-items:center;gap:14px;font:700 24px 'JetBrains Mono'}.dot{width:14px;height:14px;background:#7df9d0;box-shadow:0 0 20px #7df9d0}
h1{margin:0;font-size:88px;line-height:.92;letter-spacing:-.06em}h1 span{display:block;color:#7df9d0}
.foot{font:500 20px 'JetBrains Mono';letter-spacing:.14em;color:#99a5a3}</style></head><body>
<div class="top"><i class="dot"></i>JON_MUÑOA</div><h1>El código es el medio.<span>El valor está en la solución.</span></h1><div class="foot">INGENIERO DE SOFTWARE · PIENSO · CONSTRUYO · AUTOMATIZO</div></body></html>`, { waitUntil: 'networkidle' });
await p.screenshot({ path: 'site/assets/og.png' });
await b.close();
console.log('site/assets/og.png');
