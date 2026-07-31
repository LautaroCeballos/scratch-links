# Plan: Verificador + Previsualizador de Links de Scratch

## 1. Objetivo
Herramienta web **embebible** (iframe) que permite pegar un link de proyecto de Scratch, verificar si es **público** o **privado**, y renderizar el juego mediante el iframe de embed de Scratch. Se insertará en **Genially** vía URL.

## 2. Decisión de stack
- **Next.js (App Router, TypeScript)** desplegado en **Vercel**.
- Motivos:
  - Necesita una **URL pública estable** para embeber en Genially → deploy serverless.
  - El chequeo de visibilidad exige llamar a `api.scratch.mit.edu` **desde el servidor** (el navegador está bloqueado por CORS).
  - El repo ya está orientado a Next.js (AGENTS.md + skills instaladas).
- Nota: antes de escribir código se leerá `node_modules/next/dist/docs/` porque AGENTS.md advierte breaking changes respecto a versiones anteriores.

## 3. Requisitos funcionales
1. Campo de entrada para pegar el link de Scratch.
2. Chequeo automático al pegar el link (debounce ~500ms).
3. Mostrar **resultado**: "✓ Proyecto público" o "✗ Proyecto privado o no existe".
4. Si es público, renderizar el preview con el iframe oficial:
   ```html
   <iframe src="https://scratch.mit.edu/projects/{id}/embed"
     allowtransparency="true" width="485" height="402"
     frameborder="0" scrolling="no" allowfullscreen></iframe>
   ```
5. Si es privado/inexistente, **no** renderizar el iframe; solo el resultado.
6. Link inválido → mensaje "Link de Scratch no válido".
7. UI mínima, responsive, sin navegación (pensada para verse dentro de un iframe de Genially).
8. (Extensión) Query param `?project=<link>` para precargar un proyecto al embeber.

## 4. Arquitectura
```
scratch-links/
├─ app/
│  ├─ layout.tsx              # metadata, body base
│  ├─ page.tsx                # widget (input → resultado + iframe)
│  ├─ globals.css             # estilos del widget
│  └─ api/
│     └─ check/
│        └─ route.ts          # GET /api/check?projectId=123
├─ lib/
│  └─ scratch.ts              # parseo de URLs + constantes del embed
├─ package.json
└─ AGENTS.md
```

## 5. Detalle de implementación

### `lib/scratch.ts`
- `extractProjectId(input): string | null`
  - Acepta: `https://scratch.mit.edu/projects/1364131636`, `/projects/123/editor`, `/fullscreen`, con `/` final, con query params, o el ID pelado.
  - Regex: `/(?:scratch\.mit\.edu\/)?projects\/(\d+)/` + fallback a `^\d+$`.
- `EMBED_URL = (id) => `https://scratch.mit.edu/projects/${id}/embed``
- Constantes: `EMBED_WIDTH = 485`, `EMBED_HEIGHT = 402`.

### `app/api/check/route.ts`
- `GET /api/check?projectId=123`
- Server-side: `fetch("https://api.scratch.mit.edu/projects/123")`
  - **200** → `{ public: true }`
  - **404** → `{ public: false }` (privado/no compartido o inexistente)
  - Otros/error de red → `{ error: "no_se_pudo_verificar" }` con status 502.
- `Cache-Control` razonable (los proyectos cambian poco).

### `app/page.tsx` (widget)
- `useState`: input, estado del chequeo (`idle | checking | public | private | error | invalid`).
- Debounce de ~500ms al cambiar el input.
- `fetch("/api/check?projectId=" + id)` con manejo de estados (spinner mientras chequea).
- Resultado:
  - público → badge verde + `<iframe>` del embed (responsive: `max-width:485px`, `width:100%`, `aspect-ratio`).
  - privado → badge rojo, sin iframe.
  - inválido → mensaje de error.
  - Soporte de `?project=` al cargar (solo client; `useSearchParams` envuelto en `Suspense`).

## 6. Casos borde
- Link pegado con texto extra (ej. pegado desde un buscador).
- Proyecto con ID válido pero **privado** (404) → se informa como no público.
- Proyecto **inexistente** (404) → mismo mensaje (la API no distingue; aceptable).
- Red sin conexión a Scratch → mensaje de error de verificación (no "privado").
- Input vacío → estado idle, sin resultados.
- Caracteres no numéricos en el ID → link inválido.

## 7. Embed en Genially
1. Deploy a Vercel → `https://<app>.vercel.app`.
2. En Genially: insertar contenido > iframe/HTML → pegar la URL del widget.
3. Opcional: `https://<app>.vercel.app/?project=https://scratch.mit.edu/projects/1364131636` para precargar.

## 8. Pasos de ejecución
1. `npx create-next-app@latest .` (TypeScript, App Router, Tailwind opcional) en la carpeta.
2. Leer la doc de Next instalado en `node_modules/next/dist/docs/`.
3. Crear `lib/scratch.ts`.
4. Crear `app/api/check/route.ts`.
5. Implementar el widget en `app/page.tsx` + `globals.css`.
6. Probar en `npm run dev`:
   - Público: `https://scratch.mit.edu/projects/1364131636` → iframe renderizado + badge verde.
   - Privado/inventado: `https://scratch.mit.edu/projects/1` → badge rojo, sin iframe.
   - Inválido: `https://google.com` → mensaje de error.
7. `npm run build` para validar el build.
8. (Opcional) Deploy a Vercel y entrega de la URL para Genially.

## 9. Verificación
- Test manual en navegador (flujo de pegar link público/privado/inválido).
- Verificar en DevTools que `/api/check` responde 200/404 correctamente.
- Verificar responsive dentro de un iframe (viewport angosto).
