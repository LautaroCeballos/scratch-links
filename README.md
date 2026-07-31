# Scratch Links

Verificador + previsualizador de links de proyectos de **Scratch**, pensado como widget **embebible** (iframe) para Genially.

Pegá el link de un proyecto y la app verifica desde el servidor si es **público** o **privado**. Si es público, renderiza el juego con el embed oficial de Scratch.

## Cómo funciona

1. **`lib/scratch.ts`** — parseo de links de Scratch (`/projects/123`, `/editor`, `/fullscreen`, query params, texto extra, ID pelado) y constantes del embed.
2. **`app/api/check/route.ts`** — `GET /api/check?projectId=123` consulta `api.scratch.mit.edu` desde el servidor (el navegador está bloqueado por CORS) y responde `{ public: true | false }` o un error.
3. **`app/widget.tsx`** — widget con debounce (500ms), estados de verificación y render del iframe oficial solo cuando el proyecto es público.

## Uso

```bash
npm install
npm run dev        # desarrollo → http://localhost:3000
npm run build      # build de producción
npm start          # servir el build
```

### Embed en Genially

1. Deployá la app (p. ej. en Vercel) → `https://<app>.vercel.app`.
2. En Genially: **insertar contenido → iframe/HTML** con la URL del widget.
3. Opcional: `https://<app>.vercel.app/?project=https://scratch.mit.edu/projects/1364131636` para precargar un proyecto.

## Stack

- Next.js 16 (App Router) + TypeScript
- CSS puro con variables CSS (sin framework de estilos)
- `next/font` con Nunito
