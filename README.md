# Jon Muñoa — Web personal

Web personal de Jon Muñoa, ingeniero de software: https://jonmunoa.netlify.app

> El código es el medio. El valor está en la solución.

## Cómo funciona

- `site/` es lo que se publica (Netlify, sin build). `site/index.html` se edita a mano,
  salvo los bloques entre marcadores `<!-- BUILD:… -->`.
- `lab/projects.json` es la fuente de verdad de los proyectos: los que tienen `featured`
  salen en **Construyo**; el resto, en **Laboratorio**, ordenados por fecha.
- `scripts/capture.mjs` hace las capturas (Chrome del sistema) en `site/assets/lab/<id>/`.
- `scripts/build.mjs` vuelca el JSON en `site/index.html`.
- `scripts/og.mjs` regenera la imagen para compartir (`site/assets/og.png`).

## Actualización automática

1. Al terminar cada turno de Claude Code en un repo `github.com/jonmunoa/*`, el hook
   `~/.claude/hooks/web-sync-check.mjs` compara su HEAD con `lastSyncedCommit`.
2. Si hay commits nuevos, Claude lanza la skill `actualizar-web`
   (`~/.claude/skills/actualizar-web/SKILL.md`): reescribe la ficha, rehace capturas,
   regenera la página y hace commit en local. **No hace push**: Jon publica cuando quiere
   (cada push despliega en Netlify y gasta créditos).
3. Un repo personal nuevo dispara una pregunta a Jon (una vez por semana como mucho);
   si no lo quiere en la web, se añade a `ignored`.
4. `.github/workflows/recapturar.yml` rehace las capturas de las webs en vivo, solo a mano.

## En local

```bash
npm ci
npm run capture            # todas las capturas (o: npm run capture -- kitmaternidad)
npm run build
npx serve site             # o cualquier servidor estático sobre site/
```
