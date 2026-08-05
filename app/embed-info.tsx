"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Información de inserción visible SOLO cuando la página se visita
 * directamente (no embebida). Detecta si la web corre dentro de un
 * iframe comparando window.self con window.top.
 */
const BASE_SRC = "https://scratch-links.vercel.app/";

type EmbedInfoProps = {
  botonTexto: string;
  botonLink: string;
  onBotonTextoChange: (value: string) => void;
  onBotonLinkChange: (value: string) => void;
};

export default function EmbedInfo({
  botonTexto,
  botonLink,
  onBotonTextoChange,
  onBotonLinkChange,
}: EmbedInfoProps) {
  // Inicializamos como "embebida" para que la sección nunca haga flash
  // dentro de un iframe anfitrión; el effect la revela en vista directa.
  const [embedded, setEmbedded] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  const embedCode = useMemo(() => {
    const qs =
      botonTexto && botonLink
        ? `?boton_texto=${encodeURIComponent(botonTexto)}&boton_link=${encodeURIComponent(botonLink)}`
        : "";
    return `<iframe
  src="${BASE_SRC}${qs}"
  style="border: 0; width: 100%; height: 100%; display: block;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen
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
              onChange={(e) => onBotonTextoChange(e.target.value)}
              placeholder="Ej: Ir a mi proyecto"
            />
          </label>
          <label>
            Enlace del botón
            <input
              type="url"
              className="embed-info__input"
              value={botonLink}
              onChange={(e) => onBotonLinkChange(e.target.value)}
              placeholder="Ej: https://scratch.mit.edu/projects/1234567890"
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
        acepte HTML. El widget se adapta automáticamente al tamaño del bloque:
        redimensioná el elemento HTML hasta el tamaño deseado. Llená{" "}
        <code>Texto del botón</code> y <code>Enlace del botón</code> para el
        botón de éxito; si los dejás vacíos no se muestra.
      </p>
    </aside>
  );
}
