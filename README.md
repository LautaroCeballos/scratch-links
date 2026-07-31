# Scratch Links

**Verificador + previsualizador de links de proyectos de Scratch**, pensado como widget **embebible** (iframe) para Genially y cualquier web.

Pegá el link de un proyecto y la app verifica desde el servidor si es **público** o **privado**. Si es público, renderiza el juego con el embed oficial de Scratch para jugarlo al instante.

Demo en producción: **https://scratch-links.vercel.app/**

---

## Funcionalidades

- ✅ Verifica si un proyecto de Scratch es **público** o **privado/inexistente** (desde el servidor, evita el bloqueo de CORS del navegador).
- ✅ Acepta distintos formatos de link: URL completa, `/projects/123/editor`, `/projects/123/fullscreen`, con query params, **ID pelado** (`1364131636`) e incluso **texto extra** pegado desde un buscador.
- ✅ Si el proyecto es público, muestra el **juego embebido** con el embed oficial de Scratch (485×402, escalable).
- ✅ Verificación automática con **debounce de 500 ms** mientras escribís/pegás.
- ✅ Soporte de **precarga** con el parámetro `?project=<link>` (ideal para iframes).
- ✅ Estados claros de UI: vacío, verificando, público, privado, link inválido y error de red (con reintento manual).
- ✅ Responsive (funciona desde 375 px), accesible (`aria-live`, `aria-invalid`, focus visible, `prefers-reduced-motion`) y sin navegación interna.
- ✅ Al visitar la web directamente se muestra una sección con el **código de inserción**; esa sección **desaparece automáticamente cuando la web está embebida** en un iframe.

---

## Cómo funciona

```
Usuario pega un link
        │
        ▼
┌─────────────────┐   extractProjectId()   ┌──────────────────────┐
│  app/widget.tsx │ ─────────────────────► │     lib/scratch.ts   │
│  (cliente)      │                        │ parseo de links      │
└─────────────────┘                        └──────────────────────┘
        │ projectId válido
        ▼
┌─────────────────┐   GET /api/check       ┌──────────────────────┐
│  fetch (cliente)│ ─────────────────────► │ app/api/check/route  │
└─────────────────┘                        │ (servidor, Node)     │
        │                                   └──────────┬───────────┘
        │                                             │ fetch server-side
        │                                             ▼
        │                                   ┌──────────────────────┐
        │                                   │ api.scratch.mit.edu  │
        │                                   └──────────────────────┘
        ▼
{ public: true } → renderiza iframe del juego
{ public: false } → badge "Proyecto privado o no existe"
```

1. **`lib/scratch.ts`** — parseo de links de Scratch y constantes del embed.
   - `extractProjectId(input)` devuelve el `projectId` o `null` si el input no es válido.
   - `EMBED_URL(id)` → `https://scratch.mit.edu/projects/<id>/embed`.
2. **`app/api/check/route.ts`** — endpoint `GET /api/check?projectId=123`.
   - El navegador no puede llamar a `api.scratch.mit.edu` por CORS, por eso el fetch vive en el servidor (Node runtime).
   - Timeout de 8 s y caché `s-maxage=300` + `stale-while-revalidate` en respuestas exitosas.
3. **`app/widget.tsx`** — widget cliente: debounce de 500 ms, `AbortController` para cancelar verificaciones previas, 6 estados de UI y render del iframe oficial solo cuando el proyecto es público.
4. **`app/embed-info.tsx`** — sección de inserción visible solo en vista directa: detecta si la web está embebida comparando `window.self !== window.top` y en ese caso no renderiza nada.

---

## Uso en la web

| URL | Comportamiento |
|---|---|
| `https://scratch-links.vercel.app/` | El usuario pega su propio link y verifica |
| `https://scratch-links.vercel.app/?project=https://scratch.mit.edu/projects/1364131636` | Precarga y verifica ese proyecto al abrir |

Formato del parámetro: puede ser un link completo, un ID pelado o texto con el link adentro. Se usa `?project=<texto>` tal cual lo pegaría un usuario.

---

## Cómo insertarlo en otra web (Genially, WordPress, etc.)

El widget es una app completa, así que se incrusta con un `<iframe>`:

```html
<iframe
  src="https://scratch-links.vercel.app/"
  width="520"
  height="740"
  style="border: 0; overflow: hidden;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen
></iframe>
```

**Dimensiones**: el widget mide 520 × ~709 px con el juego cargado; `520 × 740` cubre todo sin scroll interno. En 375 px el widget se adapta sin romperse (el ancho mínimo recomendado es 340 px).

**Con proyecto precargado** (el alumno solo debe presionar ▶):

```html
<iframe
  src="https://scratch-links.vercel.app/?project=https://scratch.mit.edu/projects/1364131636"
  width="520"
  height="740"
  style="border: 0; overflow: hidden;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen
></iframe>
```

### En Genially

1. Abrí tu presentación en el editor.
2. Buscá el elemento **Insertar / Contenido web / HTML** (depende del plan; en algunos planes la opción de código HTML está limitada).
3. Pegá el código del iframe completo (o la URL del widget si Genially solo acepta URLs).
4. Redimensioná el recuadro en el lienzo (520 × 740).

> La web **no envía `X-Frame-Options`**, así que se muestra en cualquier dominio. Si la página anfitriona tiene una CSP con `frame-src` restrictiva, habría que permitir `https://scratch-links.vercel.app`.

---

## API

### `GET /api/check?projectId=<id>`

| Respuesta | Significado |
|---|---|
| `200 { "public": true }` | El proyecto existe y es público |
| `200 { "public": false }` | Privado, no compartido o inexistente (404 de Scratch) |
| `400 { "error": "id_invalido" }` | `projectId` no es numérico |
| `502 { "error": "no_se_pudo_verificar" }` | Error de red o Scratch respondió un estado inesperado |

---

## Desarrollo local

```bash
npm install        # instalar dependencias
npm run dev        # desarrollo → http://localhost:3000
npm run build      # build de producción
npm start          # servir el build de producción
```

Requisitos: Node.js 20+ (probado con Node 24).

---

## Estructura del proyecto

```
scratch-links/
├── app/
│   ├── api/
│   │   └── check/
│   │       └── route.ts        # GET /api/check (verificación server-side)
│   ├── embed-info.tsx          # sección de inserción (solo vista directa)
│   ├── globals.css             # tokens + estilos (CSS puro, BEM)
│   ├── layout.tsx              # <html lang="es">, Nunito, metadata noindex
│   ├── page.tsx                # wrapper server + Suspense
│   └── widget.tsx              # widget cliente (debounce, estados, embed)
├── lib/
│   └── scratch.ts              # parseo de links + constantes del embed
├── public/
│   └── robots.txt              # User-agent: * / Disallow: /
├── next.config.ts
├── package.json
└── vercel.json                 # { "framework": "nextjs" }
```

---

## Stack

- **Next.js 16** (App Router) + TypeScript
- **CSS puro** con variables CSS (sin framework de estilos)
- **`next/font`** con Nunito (self-hosted)
- Paleta oficial de Scratch: `#4D97FF` (azul), `#59C059` (verde), `#FF6680` (rojo), `#FFAB19` (ámbar)

---

## Deploy

El proyecto está configurado para Vercel (`vercel.json` fuerza el preset de Next.js). Conectá el repo en Vercel → cada push a `main` dispara un deploy automático.

Notas:

- `robots: noindex` en la metadata — el widget no está pensado para SEO.
- `.env*` está en `.gitignore` — no se suben secretos al repo.
- El endpoint de verificación depende de `api.scratch.mit.edu`; si Scratch cae, el widget muestra el estado "No se pudo verificar" con reintento manual.
