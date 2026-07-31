# Plan de implementación: Verificador + Previsualizador de Links de Scratch

## 1. Objetivo
Implementar la herramienta web embebible (iframe) definida en `docs/PLAN.md`: el usuario pega un link de proyecto de Scratch, la app verifica desde servidor si es público (`api.scratch.mit.edu`) y, si lo es, renderiza el embed oficial de Scratch (`/projects/{id}/embed`). Pensada para insertarse en Genially vía URL.

## 2. Contexto actual
- El proyecto **no está inicializado**: no hay `package.json`, `node_modules`, ni `app/`.
- Existen: `docs/PLAN.md`, `AGENTS.md`, `.env`, `.env.example`, `.gitignore`, `.opencode/` (config de opencode, skills y agentes).
- No hay repo git.
- Entorno: Node v24.15.0, npm 11.12.1 (compatibles con la última versión de Next.js).
- `AGENTS.md` advierte breaking changes de Next y exige leer `node_modules/next/dist/docs/` antes de escribir código (imposible hasta instalar Next).

## 3. Problema
- No existe ninguna base de código sobre la que iterar: hay que **bootstrap desde cero** cuidando de no destruir los archivos existentes del proyecto (`AGENTS.md`, `.env`, `docs/`, `.opencode/`).
- `create-next-app --agents-md` (default) sobrescribiría `AGENTS.md` → hay que respaldarlo y restaurarlo.
- La API de Scratch bloquea CORS desde navegador → el chequeo debe ser server-side (route handler).

## 4. Resultado esperado
- App Next.js (App Router + TypeScript) funcional en `npm run dev`.
- `GET /api/check?projectId=123` responde `{ public: true }`, `{ public: false }` o `{ error }`.
- Widget en `/` con: input → debounce 500ms → resultado (badge público/privado/inválido/error) → iframe solo si es público.
- Soporte `?project=<link>` para precargar.
- Build de producción limpio (`npm run build`).
- Deploy a Vercel opcional al final.

## 5. Restricciones y supuestos
**Restricciones:**
- Leer la doc de Next instalada (`node_modules/next/dist/docs/`) antes de escribir código del framework. Heed deprecation notices.
- No Tailwind (decisión deliberada: widget de una sola vista; CSS puro con variables CSS = cero dependencias, build mínimo, control fino; ver §6). Sin shadcn/ui, sin libs UI.
- Node runtime (default) en el route handler para `fetch` a Scratch.
- No se renderiza iframe si el proyecto no es público.
- UI sin navegación, responsive, pensada para un iframe de Genially.

**Supuestos:**
- `api.scratch.mit.edu/projects/{id}` → 200 = público; 404 = privado o inexistente (la API no distingue; aceptado en el plan maestro).
- El embed oficial `https://scratch.mit.edu/projects/{id}/embed` funciona igual que en la web de Scratch.
- El idioma del widget es español.

## 6. Dirección visual
- **Tono**: limpio, amigable y ligeramente juguetón, fiel al ADN visual de Scratch pero con criterio editorial (nada de "AI slop": sin gradientes violetas, sin cards clónicas).
- **Paleta** (variables CSS, derivada del branding oficial de Scratch, usada con moderación):
  - `--bg`: blanco neutro `#fafbfc` / card `#ffffff`.
  - `--ink`: gris oscuro de texto `#575e75` (color oficial de Scratch).
  - `--accent` (azul Scratch): `#4d97ff` + hover `#3c83e0`.
  - `--success` (verde Scratch): `#59c059` → badge público.
  - `--danger` (rojo/rosa Scratch): `#ff6680` → badge privado / error inválido.
  - `--border`: `#e6e9ef`.
- **Tipografía**: `Nunito` (next/font) — redondeada, amigable, con carácter; muy cercana a la estética Scratch y legible a tamaños compactos. Variantes 400/600/700/800. Única fuente del widget (sin fuentes genéricas tipo Inter).
- **Composición**: card central centrada (max ~520px), input grande con icono, área de resultado con transición suave, badge con icono (✓/✗). Ritmo vertical de 16–24px. Radios moderados (12px). Sin sombras exageradas (1 sombra sutil).
- **Microinteracción**: transición de 150–200ms en estados; spinner discreto durante el chequeo.

## 7. Skills y referencias a usar
- Skill `next-best-practices` (ya cargada): route handlers, Suspense para `useSearchParams`, `next/font`, async APIs. Se re-leerán las guías instaladas en `node_modules/next/dist/docs/` de la versión exacta tras el bootstrap.
- Skill `frontend-design` (ya cargada): criterio de dirección visual (§6).
- Context7: consultar Next.js docs si surge duda con APIs específicas de la versión instalada.
- chrome-devtools: validación final (responsive 375px, estados, contraste, sin overflow).

## 8. Arquitectura de implementación
```
scratch-links/
├─ app/
│  ├─ layout.tsx              # server: next/font (Nunito), metadata, lang="es"
│  ├─ page.tsx                # server wrapper + <Suspense> alrededor del widget
│  ├─ widget.tsx              # client: lógica del widget (input, debounce, estados, iframe)
│  ├─ globals.css             # tokens CSS + estilos del widget
│  └─ api/check/route.ts      # GET /api/check?projectId=… (server-side fetch a Scratch)
├─ lib/
│  └─ scratch.ts              # extractProjectId + constantes del embed
├─ docs/PLAN.md               # (sin cambios)
├─ AGENTS.md                  # respaldo + restauración tras create-next-app
├─ package.json, tsconfig.json, next.config.ts, etc.  # generados por create-next-app
```

**Flujo del widget (client):**
1. `extractProjectId(input)` → `null` = inválido.
2. Debounce 500ms → estado `checking` → `fetch(/api/check?projectId=…)`.
3. `public` → badge verde + iframe embed responsive.
4. `private` → badge rojo, sin iframe, hint de cómo compartir.
5. `error` → mensaje de "no se pudo verificar".
6. `?project=<link>` al montar → mismo flujo, precargado (vía `useSearchParams`).

**Flujo del route handler (server):**
1. Parsear `projectId` del query. Invalid → 400.
2. `fetch("https://api.scratch.mit.edu/projects/{id}")` con `AbortSignal.timeout(8000)`.
3. 200 → `{ public: true }` (con `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`).
4. 404 → `{ public: false }`.
5. Red/5xx → `{ error: "no_se_pudo_verificar" }` con status 502.
6. Validar que el `projectId` sea solo dígitos antes del fetch (defensa extra).

## 9. Cambios por archivo
| Archivo | Acción | Detalle |
|---|---|---|
| `docs/raw/plans/2026-07-31-scratch-links-widget.md` | crear | este plan |
| `AGENTS.md` | respaldo temporal | guardar copia antes del scaffold; restaurar después |
| `package.json` + scaffold | generar | `npx create-next-app@latest . --ts --app --no-tailwind --no-eslint --use-npm --disable-git --yes` |
| `lib/scratch.ts` | crear | `extractProjectId(input)`, `EMBED_URL(id)`, `EMBED_WIDTH=485`, `EMBED_HEIGHT=402`, `VALID_ID_RE` |
| `app/api/check/route.ts` | crear | GET handler según §8 |
| `app/layout.tsx` | modificar | `Nunito` via next/font, `lang="es"`, metadata mínima, import `globals.css` |
| `app/page.tsx` | reemplazar | server wrapper + `<Suspense>` |
| `app/widget.tsx` | crear | componente client del widget (núcleo de la UI) |
| `app/globals.css` | reemplazar | tokens + estilos (no Tailwind) |
| `.gitignore` | verificar | conservar `.env` excluido (create-next-app lo mantiene razonable) |

## 10. Componentes y contratos
### `lib/scratch.ts`
```ts
export const EMBED_WIDTH = 485
export const EMBED_HEIGHT = 402
export const EMBED_URL = (id: string) => `https://scratch.mit.edu/projects/${id}/embed`
export function extractProjectId(input: string): string | null
// acepta: https://scratch.mit.edu/projects/123, /123/editor, /fullscreen,
// con "/" final, con query, o ID pelado ("123"). Devuelve null si no matchea.
```

### `app/api/check/route.ts`
```ts
GET /api/check?projectId=123
→ 200 { public: true }            (público)
→ 200 { public: false }           (privado o inexistente)
→ 400 { error: "id_invalido" }    (projectId no numérico o ausente)
→ 502 { error: "no_se_pudo_verificar" } (red/5xx)
```

### `app/widget.tsx`
```ts
type CheckState =
  | { status: "idle" }
  | { status: "checking"; projectId: string }
  | { status: "public"; projectId: string }
  | { status: "private"; projectId: string }
  | { status: "invalid"; value: string }
  | { status: "error"; projectId: string }
Props: ninguna (lee `useSearchParams` interno).
```

## 11. Estados y comportamiento
| Estado | Disparador | UI |
|---|---|---|
| `idle` | input vacío / inicio | instrucción + placeholder |
| `invalid` | input no parseable (debounce) | input con borde danger + mensaje "Link de Scratch no válido" |
| `checking` | debounce cumplido, fetch en vuelo | spinner (aria-busy) |
| `public` | API 200 | badge verde "✓ Proyecto público" + iframe embed (title accesible) |
| `private` | API 404 | badge danger "✗ Proyecto privado o no existe" + hint, sin iframe |
| `error` | red/5xx | mensaje neutro "No se pudo verificar. Probá de nuevo." + retry implícito al pegar de nuevo |

Comportamiento: al cambiar el input se limpia el resultado previo; cada nueva secuencia de debounce re-evalúa; `?project=` al montar dispara el flujo completo.

## 12. Responsive
- Card: `width: min(100%, 520px)`, `margin-inline: auto`, padding generoso en mobile.
- Iframe: `width: min(100%, 485px)`, `aspect-ratio: 485/402`, `height: auto`, centrado.
- Sin scroll horizontal en 375px (validado con chrome-devtools).
- Tipografía fluida: base 16px; heading pequeño (18–20px).

## 13. Accesibilidad
- `<label htmlFor>` visible para el input.
- Resultado en contenedor `aria-live="polite"` (`role="status"`).
- Input: `type="url"`, `inputMode="url"`, `autoComplete="off"`, `spellCheck={false}`.
- Iframe con `title="Proyecto de Scratch"` (y `allow="autoplay"` opcional).
- Spinner con `aria-hidden` + texto visible "Verificando…".
- Contraste: texto `--ink` sobre blanco ≥ 4.5:1; badges con texto oscuro sobre fondo claro (verificar con Lighthouse a11y).
- Focus visible (outline accent 2px) en input.

## 14. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| `create-next-app` sobrescribe `AGENTS.md` | respaldo temporal `AGENTS.md.bak` y restauración post-scaffold |
| Breaking changes de Next desconocidos | leer `node_modules/next/dist/docs/` antes de escribir; confirmar `useSearchParams` + Suspense, `next/font`, route handler params |
| API de Scratch lenta/falla | `AbortSignal.timeout(8000)`; estado `error` diferenciado de `private` |
| CORS del embed de Scratch en iframe | el embed oficial es embeddable (es su propósito); validar en navegador real |
| Ratelimit de api.scratch.mit.edu | `Cache-Control` server-side + el chequeo solo ocurre al pegar (no en cada render) |
| Layout shift del iframe al cargar | reservar `aspect-ratio` fijo 485/402 en CSS |

## 15. Orden de ejecución
1. Respaldar `AGENTS.md` → `AGENTS.md.bak`.
2. `npx create-next-app@latest . --ts --app --no-tailwind --no-eslint --use-npm --disable-git --yes`.
3. Restaurar `AGENTS.md` (sobrescribir el generado).
4. Leer `node_modules/next/dist/docs/` (rutas relevantes: file conventions, route handlers, fonts, useSearchParams/Suspense, metadata).
5. Crear `lib/scratch.ts`.
6. Crear `app/api/check/route.ts`.
7. Modificar `app/layout.tsx` (font + metadata + lang) y `app/globals.css`.
8. Crear `app/widget.tsx` y reemplazar `app/page.tsx`.
9. `npm run dev` → pruebas manuales (público/privado/inválido/`?project=`).
10. `npm run build` → validar producción.
11. Validación chrome-devtools (desktop + 375px, a11y, estados).
12. (Opcional, con aprobación) Deploy a Vercel + URL para Genially.

## 16. Validación en navegador (chrome-devtools)
- Flujo público: pegar `https://scratch.mit.edu/projects/1364131636` → badge verde + iframe cargado.
- Flujo privado: pegar `https://scratch.mit.edu/projects/1` → badge rojo, sin iframe.
- Flujo inválido: pegar `https://google.com` → mensaje de error.
- `?project=<link>` → precarga.
- Viewport 375px y 1280px: sin overflow horizontal, iframe escalado.
- Console: sin errores de hidratación ni warnings.
- Lighthouse a11y ≥ 95 (en `/`).
- Inspeccionar computed styles de input en focus.

## 17. Criterios de aceptación
- [ ] `npm run build` pasa sin errores.
- [ ] `GET /api/check?projectId=1364131636` → `{ public: true }`.
- [ ] `GET /api/check?projectId=1` → `{ public: false }` (404 desde Scratch).
- [ ] `GET /api/check?projectId=abc` → 400.
- [ ] Widget pega → debounce 500ms → resultado correcto en los 4 escenarios.
- [ ] Iframe solo se renderiza en estado `public`.
- [ ] `?project=` precarga y verifica al cargar.
- [ ] Responsive OK en 375px y 1280px (sin desbordes).
- [ ] a11y: label, aria-live, iframe title, focus visible.
- [ ] `AGENTS.md` intacto (restaurado tras el scaffold).
- [ ] No hay dependencias UI extra (solo Next + React + fonts).
