# Scratch Links

**Verificador de entregas de proyectos de Scratch**, pensado como widgets **embebibles** (iframe) para Genially y cualquier web.

Incluye **dos verificadores** que corren en URLs separadas:

1. **Verificador de links** (`/`): pegar el link de un proyecto → verifica desde el servidor si es **público** o **privado**. Si es público, renderiza el juego con el embed oficial de Scratch para jugarlo al instante.
2. **Verificador de archivos** (`/file-verifier`): subir el archivo `.sb3` → valida el formato **en el navegador** (no se sube a ningún servidor) y avisa si corresponde a un proyecto original de la competencia.

Ambos detectan si el proyecto subido/pegado es uno de los **originales de la competencia** y bloquean la entrega hasta que el alumno cree su propia versión.

Demos en producción:
- **https://scratch-links.vercel.app/** — verificador de links
- **https://scratch-links.vercel.app/file-verifier** — verificador de archivos

---

## Funcionalidades

### Verificador de links (`/`)
- ✅ Verifica si un proyecto de Scratch es **público** o **privado/inexistente** (desde el servidor, evita el bloqueo de CORS del navegador).
- ✅ Acepta links completos de Scratch: `https://scratch.mit.edu/projects/1234567890`, opcionalmente con `/`, `/editor/` o `/fullscreen/`. El ID debe tener **9–10 dígitos**. Otros formatos (ID pelado, texto extra, query params, otra longitud de ID) → **link inválido**.
- ✅ Si el proyecto es público, muestra el **juego embebido** con el embed oficial de Scratch (485×402, escalable), con botón para alternar vista previa.
- ✅ Verificación automática con **debounce de 500 ms** mientras escribís/pegás.
- ✅ Estados claros de UI: vacío, verificando, público, privado, **proyecto original**, link inválido y error de red (con reintento manual).
- ✅ Detecta si el link pegada corresponde a un **proyecto original de la competencia** (los 4 desafíos) y avisa que no es el entregable.
- ✅ Responsive (desde 375 px), accesible (`aria-live`, `aria-invalid`, focus visible, `prefers-reduced-motion`) y sin navegación interna.

### Verificador de archivos (`/file-verifier`)
- ✅ Subida de `.sb3` por **clic o arrastrar y soltar**; la validación corre **100 % en el navegador** (File + ArrayBuffer + `crypto.subtle`), nunca se sube el archivo.
- ✅ Validación en capas: extensión `.sb3` → firma ZIP (magic bytes `PK\x03\x04`) → apertura del ZIP → `project.json` presente con estructura de Scratch 3.
- ✅ Anti-origen: compara el **hash SHA-256** de `project.json` contra los 4 proyectos originales de la competencia; si coincide, avisa el número de desafío y bloquea.
- ✅ Estados claros de UI: vacío, verificando, válido, no-`.sb3`, no-ZIP, dañado, no-Scratch, **proyecto original** y error de lectura.
- ✅ Links de **ayuda en video** (YouTube) que se reproducen en una modal.
- ✅ Responsive (desde 375 px), accesible y sin navegación interna.

---

## Cómo funciona — Verificador de links

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
┌─────────────────┐  ¿Es proyecto original? │ getOriginalChallenge()
│ getOriginalChal-│ ──────────────────────► │ lista ORIGINAL_PROJECTS
│ lenge() [cliente]│                        │ → avisa y corta
└─────────────────┘                        └──────────────────────┘
        │ no es original → projectId
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
{ public: false } → badge "Proyecto privado"
```

1. **`lib/scratch.ts`** — parseo de links, proyectos originales y constantes del embed.
   - `extractProjectId(input)` devuelve el `projectId` o `null` si el input no es válido.
   - `ORIGINAL_PROJECTS` (los 4 desafíos) y `getOriginalChallenge(id)` → número de desafío o `null`.
   - `EMBED_URL(id)` → `https://scratch.mit.edu/projects/<id>/embed`.
2. **`app/api/check/route.ts`** — endpoint `GET /api/check?projectId=123`.
   - El navegador no puede llamar a `api.scratch.mit.edu` por CORS, por eso el fetch vive en el servidor (Node runtime).
   - Timeout de 8 s y caché `s-maxage=300` + `stale-while-revalidate` en respuestas exitosas.
3. **`app/widget.tsx`** — widget cliente: debounce de 500 ms, `AbortController`, 7 estados de UI (incluido "proyecto original"), render del iframe oficial solo cuando el proyecto es público y botón de vista previa.
4. **`app/embed-info.tsx`** — información de inserción visible solo en vista directa: detecta si la web está embebida comparando `window.self !== window.top` y en ese caso no renderiza nada.
5. **`app/page.tsx`** — layout: coloca el verificador y la información de inserción **lado a lado** (`page__cols`, 2 columnas en desktop, apiladas en pantallas angostas).

---

## Cómo funciona — Verificador de archivos

```
Usuario sube un .sb3 (clic o drag & drop)
        │
        ▼
┌────────────────────────┐   validateScratchFile()   ┌─────────────────────┐
│ app/file-verifier/     │ ────────────────────────► │   lib/scratch-file  │
│ file-widget.tsx (cliente)│                         │ (todo en el browser)│
└────────────────────────┘                           └─────────────────────┘
        │
        ▼  validación en capas (todo local, sin subir el archivo)
  1. Extensión .sb3
  2. Firma ZIP (magic bytes PK\x03\x04)
  3. Apertura del ZIP (JSZip)  → dañado si falla
  4. project.json + estructura Scratch 3
  5. Hash SHA-256 de project.json → anti-origen
        │
        ▼
{ valid }    → "¡Archivo verificado!" + botón de entrega
{ original } → avisa el Desafío N y bloquea la entrega
{ not-sb3 } / { not-zip } / { corrupt } / { not-scratch } / { error }
            → mensaje de error con ayuda
```

1. **`lib/scratch-file.ts`** — validación de `.sb3` en el navegador.
   - `validateScratchFile(file)` → `FileCheckResult` (not-sb3, not-zip, corrupt, not-scratch, original, valid).
   - `ORIGINAL_PROJECT_JSON_HASHES` — SHA-256 del `project.json` de los 4 originales y `getOriginalChallengeFromHash()`.
2. **`app/file-verifier/file-widget.tsx`** — widget cliente: input/drag & drop, estados de UI, imágenes por estado, links de ayuda en video (modal) y botón de entrega configurable.
3. **`app/file-verifier/page.tsx`** — layout: widget + sección de inserción lado a lado (la inserción solo se ve en visita directa).

---

## Uso en la web

| URL | Comportamiento |
|---|---|
| `https://scratch-links.vercel.app/` | El usuario pega su propio link y verifica |
| `https://scratch-links.vercel.app/file-verifier` | El usuario sube su archivo `.sb3` y lo valida |

El alumno **siempre** es quien pega el link o sube el archivo; no hay proyecto precargado.

---

## Cómo insertarlo en otra web (Genially, WordPress, etc.)

Cada verificador es una app completa, así que se incrusta con un `<iframe>` independiente.

### Widget de links

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

**Dimensiones**: el widget mide 520 × ~709 px con el juego cargado; `520 × 740` cubre todo sin scroll interno. En 375 px el widget se adapta sin romperse (ancho mínimo recomendado: 340 px).

### Widget de archivos

```html
<iframe
  src="https://scratch-links.vercel.app/file-verifier"
  style="border: 0; width: 100%; height: 100%; display: block;"
  title="Verificador de archivos de proyectos de Scratch"
></iframe>
```

Este widget se adapta automáticamente al tamaño del bloque en el que se incrusta (Genially redimensiona el elemento según el lienzo).

### Botón de éxito configurable (ambos widgets)

Podés sumar un botón que aparece cuando el proyecto/archivo se verifica como **válido**, con texto y enlace propios. Se configura mediante parámetros de URL:

```html
<iframe
  src="https://scratch-links.vercel.app/?boton_texto=Ir%20a%20mi%20proyecto&boton_link=https%3A%2F%2Fscratch.mit.edu%2Fprojects%2F1234567890"
  width="520"
  height="740"
  style="border: 0; overflow: hidden;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen
></iframe>
```

- `boton_texto`: texto del botón (ej. "Ir a mi proyecto" o "Agregar entrega").
- `boton_link`: enlace que el botón abre en una pestaña nueva.
- Si falta alguno de los dos, el botón aparece deshabilitado.
- Para el verificador de archivos, la URL base es `/file-verifier` con los mismos parámetros.

> Al abrir la web directamente, el código de inserción se muestra a la derecha del verificador (o debajo en pantallas angostas). Dentro del iframe, solo se ve el verificador.

### En Genially

1. Abrí tu presentación en el editor.
2. Buscá el elemento **Insertar / Contenido web / HTML** (depende del plan; en algunos planes la opción de código HTML está limitada).
3. Pegá el código del iframe completo (o la URL del widget si Genially solo acepta URLs).
4. Redimensioná el recuadro en el lienzo (520 × 740 para links; para archivos ajustá al tamaño del bloque).

> La web **no envía `X-Frame-Options`**, así que se muestra en cualquier dominio. Si la página anfitriona tiene una CSP con `frame-src` restrictiva, habría que permitir `https://scratch-links.vercel.app`.

---

## API

### `GET /api/check?projectId=<id>`

| Respuesta | Significado |
|---|---|
| `200 { "public": true }` | El proyecto existe y es público |
| `200 { "public": false }` | Privado o no disponible (404 de Scratch) |
| `400 { "error": "id_invalido" }` | `projectId` debe tener entre 9 y 10 dígitos |
| `502 { "error": "no_se_pudo_verificar" }` | Error de red o Scratch respondió un estado inesperado |

> Nota: el verificador de **archivos** no usa esta API; valida todo localmente en el navegador.

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
│   │       └── route.ts        # GET /api/check (verificación server-side de links)
│   ├── file-verifier/
│   │   ├── file-widget.tsx     # widget cliente de archivos .sb3
│   │   └── page.tsx            # layout: widget de archivos + info de inserción
│   ├── embed-info.tsx          # sección de inserción (solo vista directa, links)
│   ├── globals.css             # tokens + estilos (CSS puro, BEM)
│   ├── layout.tsx              # <html lang="es">, Nunito, metadata noindex
│   ├── page.tsx                # layout del verificador de links
│   └── widget.tsx              # widget cliente de links (debounce, estados, embed)
├── lib/
│   ├── scratch-file.ts         # validación de .sb3 en el navegador + hash anti-origen
│   └── scratch.ts              # parseo de links, originales y constantes del embed
├── public/
│   ├── *.png                   # imágenes de estado de ambos verificadores
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
- **JSZip** + **Web Crypto API** para validar `.sb3` en el navegador
- Paleta oficial de Scratch: `#4D97FF` (azul), `#59C059` (verde), `#FF6680` (rojo), `#FFAB19` (ámbar)

---

## Deploy

El proyecto está configurado para Vercel (`vercel.json` fuerza el preset de Next.js). Conectá el repo en Vercel → cada push a `main` dispara un deploy automático.

Notas:

- `robots: noindex` en la metadata — el widget no está pensado para SEO.
- `.env*` está en `.gitignore` — no se suben secretos al repo.
- El endpoint de verificación de links depende de `api.scratch.mit.edu`; si Scratch cae, el widget muestra el estado "No se pudo verificar" con reintento manual.
- El verificador de archivos es **100 % local**: no hay server-side ni dependencia de red, por lo que funciona incluso offline tras la carga del JS.