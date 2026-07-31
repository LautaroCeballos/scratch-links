# Layout horizontal: verificador + información de inserción lado a lado

## 1. Objetivo
Reordenar la vista directa para que el verificador y la información de inserción queden **uno al lado del otro (horizontal)**. Además, **eliminar por completo la funcionalidad de proyecto precargado** (`?project=`) tanto de la sección de inserción como del widget: el alumno siempre pega su propio link.

## 2. Contexto actual
- `app/page.tsx`: `<Suspense>` envuelve `<ScratchWidget />` y debajo `<EmbedInfo />` (apilado vertical).
- `app/widget.tsx`: usa `useSearchParams` para leer `?project=` y precargar el input al montar (`bootstrapped`).
- `app/embed-info.tsx`: muestra 2 variantes de código (widget simple y con proyecto precargado) en `embed-info__cols`.
- `app/globals.css`: `.widget` centra en pantalla completa; `.embed-info` debajo con `margin: 20px auto 0`, ancho 820px.

## 3. Problema
- La vista directa apila las dos piezas en vertical, desperdiciando espacio en desktop.
- La variante precargada no se va a usar nunca; deja código muerto en el widget y confunde la documentación.

## 4. Resultado esperado
- En vista directa (desktop): **verificador a la izquierda, información de inserción a la derecha**, ambos alineados arriba, centrados como bloque.
- En el iframe (embed): solo el verificador, centrado (sin cambios).
- En mobile: se apilan (verificador arriba, info abajo), sin desbordes a 375px.
- Ya no existe ninguna mención de `?project=` en UI, README ni wiki.

## 5. Restricciones y supuestos
- No usar Tailwind ni librerías UI (CSS puro + BEM).
- La sección de inserción sigue oculta dentro de iframes (`window.self !== window.top`).
- El iframe de Genially sigue siendo 520×740.
- Suposición: la columna de información puede ser algo más angosta que el verificador (440px vs 520px) por ser secundaria.

## 6. Dirección visual
- Mismo lenguaje visual: cards blancas, `--radius`, `--shadow`, paleta Scratch.
- El verificador conserva 520px; la info de inserción 440px; gap 20px.
- En <980px se apila en una sola columna de 520px.

## 7. Skills y referencias a usar
- `frontend-design` (criterio visual), `next-best-practices` (Suspense/useSearchParams).
- Docs locales Next.js: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md` (confirma que sin el hook no hace falta Suspense), `page.md`.

## 8. Arquitectura de implementación
- `page.tsx` (Server Component): `<main class="page"><div class="page__cols"><ScratchWidget/><EmbedInfo/></div></main>` sin Suspense.
- `widget.tsx`: quitar `useSearchParams`, `initialProject`, `bootstrapped` y el efecto de precarga; `<main class="widget">` → `<section class="widget">`.
- `embed-info.tsx`: quitar `EMBED_PRECARGADO_CODE` y el segundo `<article>`; `<section>` → `<aside>`.
- `globals.css`: `.page` toma el rol de contenedor (min-height + centrado); `.page__cols` grid 2 columnas; `.widget` pasa a ser la card; `.embed-info` 440px sin margen superior; eliminar `.embed-info__cols`.

## 9. Cambios por archivo
- `app/page.tsx`: reescribir (sin Suspense, sin fallback, layout grid).
- `app/widget.tsx`: 3 eliminaciones + cambiar `<main>`→`<section>`.
- `app/embed-info.tsx`: quitar constante y artículo precargado; `<aside>`.
- `app/globals.css`: refactor de layout (`.page`, `.page__cols`, `.widget`, `.embed-info`) + media queries.
- `README.md` + wiki local: quitar menciones de `?project=` y actualizar descripción del layout.

## 10. Componentes y contratos
- `ScratchWidget` y `EmbedInfo` mantienen sus props actuales (ninguna). Solo cambia el contenedor en `page.tsx`.

## 11. Estados y comportamiento
- Sin cambios funcionales en los 6 estados del widget (idle, checking, public, private, invalid, error).
- Sin precarga: el input siempre arranca vacío.
- `embed-info` continúa ocultándose en iframes.

## 12. Responsive
- ≥980px: 2 columnas `minmax(0,520px) minmax(0,440px)`, `justify-content: center`.
- <980px: 1 columna `minmax(0,520px)` (apilado).
- ≤480px: padding del `.page` 16/12px (como antes en `.widget`).

## 13. Accesibilidad
- El `<aside>` con `aria-labelledby` mantiene la semántica de contenido complementario.
- El verificador conserva su `h1`; la info usa `h2` (orden de encabezados correcto en ambas rutas de render).
- Sin cambios en `aria-live`/`aria-invalid`.

## 14. Riesgos y mitigaciones
- Riesgo: romper el centrado del widget dentro del iframe de 520px. Mitigación: con una sola columna y `justify-content: center`, el widget queda centrado igual.
- Riesgo: `.embed-info` muy angosto para el código. Mitigación: `white-space: pre-wrap; overflow-wrap: anywhere` ya existente + columna de 440px.
- Riesgo: doc desactualizada. Mitigación: actualizar README + wiki y pushear.

## 15. Orden de ejecución
1. `globals.css` (tokens/layout).
2. `page.tsx`.
3. `widget.tsx`.
4. `embed-info.tsx`.
5. `npm run build`.
6. Validación en navegador.
7. README + wiki + push.

## 16. Validación en navegador
- Desktop (~1440px): verificador e info lado a lado, alineados arriba, sin scroll horizontal.
- ~900px: apilado.
- 375px: sin desbordes.
- Vista directa: aparece la info; embed (iframe 520×740): solo el verificador, centrado.
- Verificar que pegar un link sigue funcionando (debounce + API).

## 17. Criterios de aceptación
- El verificador y la info de inserción se ven lado a lado en desktop.
- No existe más código, UI ni doc que mencione el proyecto precargado.
- El widget dentro de un iframe se ve igual que antes (solo verificador, centrado).
- Sin regresiones: build OK, estados OK, responsive sin desbordes.
