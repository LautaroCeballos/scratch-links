# Plan: Verificación de proyectos originales de la competencia

## 1. Objetivo
Adaptar el verificador de Scratch Links para uso de **estudiantes**: el alumno pega el link de su proyecto para confirmar que (a) es **público** y (b) **no es el proyecto original** de la competencia (los 4 desafíos entregados por el docente para reinventar). Si pega uno de los originales, se le notifica de forma clara indicando el desafío al que pertenece.

## 2. Contexto actual
- Widget client (`app/widget.tsx`) con flujo: input → debounce 500ms → `extractProjectId` → `GET /api/check?projectId=` → estados `idle | checking | public | private | invalid | error`.
- `lib/scratch.ts` expone `extractProjectId`, `EMBED_URL`, `EMBED_WIDTH/HEIGHT`, `VALID_PROJECT_ID`.
- `app/api/check/route.ts` verifica publicidad server-side contra `api.scratch.mit.edu` (200 público / 404 privado o inexistente / 502 error).
- No hay hoy ninguna noción de "proyectos originales" ni de desafíos.

## 3. Problema
- Un estudiante podría entregar **el mismo proyecto original** sin hacer modificaciones. El verificador actual solo dice "público" y muestra el embed, sin detectar que es el original.
- Hay que detectar los 4 enlaces originales y notificarlo correctamente antes de habilitar la entrega.

## 4. Resultado esperado
- Al pegar uno de los enlaces originales de los 4 desafíos → notificación clara: "Es el proyecto original del Desafío N" + explicación de que debe reinventarlo y pegar su propia versión. **Sin** embed, **sin** badge de "público".
- Al pegar un proyecto distinto y público → comportamiento actual (badge verde + embed).
- Mensajes actualizados al contexto estudiante ("Link de tu proyecto", ayuda acorde).

## 5. Restricciones y supuestos
**Restricciones:**
- Sin nuevas dependencias ni cambios de arquitectura (la detección es client-side por comparación de `projectId`).
- El embed nunca debe renderizarse para un proyecto original.
- Mantener accesibilidad existente (aria-live, labels, focus).
- Idioma español.

**Supuestos:**
- Los 4 IDs originales son constantes conocidas del docente:
  - Desafío 1 → `1081188585`
  - Desafío 2 → `1081199620`
  - Desafío 3 → `1081201741`
  - Desafío 4 → `1081217132`
- La comparación por `projectId` (numérico) es robusta ante cualquier forma de URL (`/editor`, `/fullscreen`, query, etc.).
- No hace falta que el estudiante elija su desafío: cualquier original detectado se notifica con su número.

## 6. Dirección visual
- Reutilizar el lenguaje visual actual (tokens, badges, help text).
- El estado "original" usa el badge ámbar (`badge--warn`) con icono de alerta + texto de ayuda: transmite "atención, este no es tu entregable" sin sonar a error grave.
- No se agregan estilos nuevos salvo que la validación muestre necesidad.

## 7. Skills y referencias a usar
- Sin APIs nuevas de Next.js (lógica client pura) → no requiere doc nueva del framework.
- chrome-devtools: validar los 4 flujos en navegador real (original, público, privado, inválido, error) en desktop y 375px.
- Context7 solo si surge una duda puntual (no esperado).

## 8. Arquitectura de implementación
```
lib/scratch.ts      → ORIGINAL_PROJECTS (id, challenge) + getOriginalChallenge(id)
app/widget.tsx      → estado "original"; short-circuit antes del fetch; UI de notificación; copys
app/layout.tsx      → description acorde al contexto estudiante (solo metadata)
```
**Flujo nuevo (client):**
1. `extractProjectId(input)` → `null` = inválido.
2. `getOriginalChallenge(projectId)` → no-null = **estado `original`** (sin llamar a la API, respuesta instantánea).
3. Si no es original → `fetch(/api/check)` → `public | private | error`.

## 9. Cambios por archivo
| Archivo | Acción | Detalle |
|---|---|---|
| `lib/scratch.ts` | modificar | `ORIGINAL_PROJECTS` (4 desafíos) + `getOriginalChallenge(projectId): number \| null` |
| `app/widget.tsx` | modificar | estado `original`; short-circuit en `runCheck`; UI de notificación (badge ámbar + help); copys de label/empty |
| `app/layout.tsx` | modificar | `description` orientada al estudiante |
| `docs/raw/plans/2026-07-31-verificar-no-original.md` | crear | este plan |

## 10. Componentes y contratos
### `lib/scratch.ts`
```ts
export const ORIGINAL_PROJECTS = [
  { challenge: 1, id: "1081188585" },
  { challenge: 2, id: "1081199620" },
  { challenge: 3, id: "1081201741" },
  { challenge: 4, id: "1081217132" },
] as const;

export function getOriginalChallenge(projectId: string): number | null;
```

### `app/widget.tsx` — estado nuevo
```ts
| { status: "original"; challenge: number; projectId: string }
```
- Disparador: `getOriginalChallenge(projectId)` ≠ null en `runCheck`.
- UI: badge `badge--warn` "Es el proyecto original del Desafío {challenge}" + `widget__help` explicando que debe reinventarlo y entregar su versión. Sin embed.

## 11. Estados y comportamiento
| Estado | Disparador | UI |
|---|---|---|
| `original` | projectId coincide con un original | badge ámbar + texto: "Este es el proyecto original del Desafío N. Reinventalo: hacé tu versión mejorada y pegá el link de TU proyecto." |
| resto | sin cambios | sin cambios |

Comportamiento: al editar el input se limpia el resultado previo (ya implementado); el chequeo de original corre en cada debounce y antes que la API.

## 12. Responsive
- Sin layout nuevo: badge + texto reutilizan estilos que ya son responsive. Verificar en 375px que el texto no desborde.

## 13. Accesibilidad
- El resultado vive dentro del contenedor `role="status"` `aria-live="polite"` → la notificación se anuncia a lectores de pantalla automáticamente.
- Badge con icono `aria-hidden` + texto visible.
- Contraste ámbar existente (ya validado).

## 14. Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Que un original se muestre como "público" o con embed | short-circuit **antes** del fetch + estado `original` sin rama de embed |
| Copiar el original con URL distinta (`/editor`, etc.) | comparación por `projectId` numérico, no por string de URL |
| Cambiar los IDs originales en el futuro | constantes centralizadas en `lib/scratch.ts` (un solo lugar) |
| Mensaje confuso | copy explícito: diferencia "proyecto original" vs "tu proyecto mejorado" |

## 15. Orden de ejecución
1. `lib/scratch.ts`: constantes + helper.
2. `app/widget.tsx`: estado, short-circuit, UI, copys.
3. `app/layout.tsx`: metadata description.
4. `npm run build`.
5. Validación chrome-devtools (dev server): original Desafío 1–4, público, privado, inválido; desktop + 375px; console sin errores.

## 16. Validación en navegador (chrome-devtools)
- Pegar `https://scratch.mit.edu/projects/1081188585` → notificación "original del Desafío 1", sin embed.
- Repetir con los otros 3 IDs → desafíos 2/3/4.
- Pegar `https://scratch.mit.edu/projects/1364131636` → badge público + embed.
- Pegar `https://scratch.mit.edu/projects/1` → privado.
- Pegar `https://google.com` → inválido.
- Viewport 375px y 1280px sin overflow.
- Console sin errores de hidratación.

## 17. Criterios de aceptación
- [ ] `npm run build` pasa sin errores.
- [ ] Los 4 enlaces originales disparan la notificación con su número de desafío.
- [ ] Ningún original muestra embed ni badge de "público".
- [ ] Proyecto público no-original → badge verde + embed (regresión OK).
- [ ] Privado / inválido / error siguen funcionando (regresión OK).
- [ ] Sin overflow en 375px; a11y (aria-live) preservada.
