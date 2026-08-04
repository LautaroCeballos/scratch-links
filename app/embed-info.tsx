"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Información de inserción visible SOLO cuando la página se visita
 * directamente (no embebida). Detecta si la web corre dentro de un
 * iframe comparando window.self con window.top.
 */
const BASE_SRC = "https://scratch-links.vercel.app/";

export default function EmbedInfo() {
  // Inicializamos como "embebida" para que la sección nunca haga flash
  // dentro de un iframe anfitrión; el effect la revela en vista directa.
  const [embedded, setEmbedded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [botonTexto, setBotonTexto] = useState("Ir a mi proyecto");
  const [botonLink, setBotonLink] = useState(
    "https://scratch.mit.edu/projects/1234567890"
  );

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  const embedCode = useMemo(() => {
    const attrs = botonTexto && botonLink
      ? `\n  boton_texto="${botonTexto}"\n  boton_link="${botonLink}"`
      : "";
    return `<iframe
  src="${BASE_SRC}"
  width="520"
  height="740"
  style="border: 0; overflow: hidden;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen${attrs}
></iframe>`;
  }, [botonTexto, botonLink]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (embedded) return null;

  return (
    <aside className="embed-info" aria-labelledby="embed-info-title">
      <h2 id="embed-info-title">Insertá esta herramienta en tu web</h2>
      <article className="embed-info__item">
        <h3>Widget</h3>
        <p>El alumno pega su propio link.</p>
        <div className="embed-info__config">
          <label>
            Texto del botón
            <input
              type="text"
              className="embed-info__input"
              value={botonTexto}
              onChange={(e) => setBotonTexto(e.target.value)}
              placeholder="Ir a mi proyecto"
            />
          </label>
          <label>
            Enlace del botón
            <input
              type="url"
              className="embed-info__input"
              value={botonLink}
              onChange={(e) => setBotonLink(e.target.value)}
              placeholder="https://scratch.mit.edu/projects/1234567890"
            />
          </label>
        </div>
        <pre className="embed-info__code">
          <code>{embedCode}</code>
        </pre>
        <button
          type="button"
          className={`embed-info__copy${copied ? " is-copied" : ""}`}
          onClick={copyCode}
          aria-live="polite"
        >
          {copied ? "¡Copiado!" : "Copiar código"}
        </button>
      </article>
      <p className="embed-info__note">
        Pegá el código en Genially (Insertar → HTML) o en cualquier web que
        acepte HTML. Si los dejás vacíos, el botón de éxito no aparece.
      </p>
    </aside>
  );
}
