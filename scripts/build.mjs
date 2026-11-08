// Vuelca lab/projects.json en site/index.html, entre los marcadores
// <!-- BUILD:FEATURED --> ... <!-- /BUILD:FEATURED -->  (sección Construyo)
// <!-- BUILD:LAB --> ... <!-- /BUILD:LAB -->            (sección Laboratorio)
// <!-- BUILD:LAB-STAMP --> ... <!-- /BUILD:LAB-STAMP --> (fecha de última actualización)
// El resto de la página se edita a mano.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'site/index.html');
const data = JSON.parse(await readFile(path.join(root, 'lab/projects.json'), 'utf8'));

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const month = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '');
  return d ? `${d} ${month} ${y}` : `${month} ${y}`;
};

async function img(project, shot, sizes) {
  const rel = `assets/lab/${project.id}/${shot.file}.webp`;
  const abs = path.join(root, 'site', rel);
  if (!existsSync(abs)) return '';
  const { width, height } = await sharp(abs).metadata();
  return `<img src="${rel}" alt="${esc(shot.alt)}" width="${width}" height="${height}" loading="lazy" decoding="async" sizes="${sizes}">`;
}

async function visual(project, size) {
  const shots = (project.screenshots ?? []).filter((s) =>
    existsSync(path.join(root, 'site/assets/lab', project.id, `${s.file}.webp`)),
  );
  const desktop = shots.find((s) => s.device === 'desktop');
  const mobiles = shots.filter((s) => s.device === 'mobile');
  if (!shots.length) {
    return `<div class="shot shot-empty" aria-hidden="true"><span>${esc(project.category)}</span><b>Capturas en camino</b></div>`;
  }
  if (desktop) {
    const phone = mobiles[0]
      ? `<figure class="device device-phone device-overlap">${await img(project, mobiles[0], '160px')}</figure>`
      : '';
    return `<div class="shot shot-desktop${phone ? ' has-phone' : ''}"><figure class="device device-browser"><i aria-hidden="true"></i>${await img(project, desktop, size === 'lg' ? '(max-width: 900px) 92vw, 640px' : '(max-width: 900px) 92vw, 560px')}</figure>${phone}</div>`;
  }
  const phones = await Promise.all(
    mobiles.slice(0, 2).map(async (s) => `<figure class="device device-phone">${await img(project, s, '200px')}</figure>`),
  );
  return `<div class="shot shot-phones">${phones.join('')}</div>`;
}

const link = (p) =>
  p.url
    ? `<a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.urlLabel ?? 'Abrir')}<span aria-hidden="true">↗</span></a>`
    : `<span class="btn btn-off">Sin web pública</span>`;

const statusChip = (p) => `<span class="status status-${esc(p.status.replace(/\s+/g, '-'))}">${esc(p.status)}</span>`;

async function featuredCard(p, i) {
  const stats = p.stats?.length
    ? `<div class="stats">${p.stats.map((s) => `<div class="stat"><b>${esc(s.value)}</b><span>${esc(s.label.toUpperCase())}</span></div>`).join('')}</div>`
    : '';
  const pipeline = p.pipeline?.length
    ? `<ol class="pipeline" aria-label="Flujo">${p.pipeline.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>`
    : '';
  return `
          <article class="project" id="p-${esc(p.id)}">
            <div class="project-copy">
              <div class="project-top"><span>PROYECTO / ${String(i + 1).padStart(2, '0')}</span><span>${esc(p.category.toUpperCase())}</span></div>
              <h3>${esc(p.name)}</h3>
              <p class="project-hook">${esc(p.hook)}</p>
              <p>${esc(p.description)}</p>
              ${pipeline}
              <div class="project-foot">${link(p)}<span class="meta">${esc(p.stack.join(' · '))}</span></div>
            </div>
            <div class="visual">${await visual(p, 'lg')}</div>
            ${stats}
          </article>`;
}

async function labCard(p) {
  return `
          <article class="lab-card" id="p-${esc(p.id)}">
            ${await visual(p, 'sm')}
            <div class="lab-body">
              <div class="lab-meta"><span>${esc(p.category.toUpperCase())}</span>${statusChip(p)}</div>
              <h3>${esc(p.name)}</h3>
              <p class="lab-hook">${esc(p.hook)}</p>
              <p>${esc(p.description)}</p>
              <div class="lab-foot">${link(p)}<span class="meta">${esc(p.stack.join(' · '))}</span></div>
              <div class="lab-date">ACTUALIZADO · <time datetime="${esc(p.updated)}">${esc(fmtDate(p.updated).toUpperCase())}</time></div>
            </div>
          </article>`;
}

const byUpdated = (a, b) => b.updated.localeCompare(a.updated);
const featured = data.projects.filter((p) => p.featured).sort((a, b) => a.featured - b.featured);
const lab = data.projects.filter((p) => !p.featured).sort(byUpdated);
const latest = [...data.projects].sort(byUpdated)[0];

const blocks = {
  FEATURED: (await Promise.all(featured.map(featuredCard))).join('') + '\n          ',
  LAB: (await Promise.all(lab.map(labCard))).join('') + '\n          ',
  'LAB-STAMP': `<span>ÚLTIMO CAMBIO · <time datetime="${esc(latest.updated)}">${esc(fmtDate(latest.updated).toUpperCase())}</time> · ${esc(latest.name.toUpperCase())}</span>`,
};

let html = await readFile(htmlPath, 'utf8');
for (const [name, content] of Object.entries(blocks)) {
  const re = new RegExp(`(<!-- BUILD:${name} -->)[\\s\\S]*?(<!-- /BUILD:${name} -->)`);
  if (!re.test(html)) throw new Error(`Falta el marcador BUILD:${name} en site/index.html`);
  html = html.replace(re, `$1${content}$2`);
}
await writeFile(htmlPath, html);
console.log(`site/index.html: ${featured.length} destacados, ${lab.length} en laboratorio.`);
