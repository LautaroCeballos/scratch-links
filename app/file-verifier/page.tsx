"use client";

import { useEffect, useMemo, useState } from "react";
import FileVerifierWidget from "./file-widget";

const BASE_SRC = "https://scratch-links.vercel.app/file-verifier";

/**
 * Página del widget de verificación de archivos .sb3.
 * Visible en /file-verifier. Cuando corre dentro de un iframe (Genially)
 * solo se muestra el widget; en visita directa se agrega el bloque de
 * instrucciones de inserción.
 */
export default function FileVerifierPage() {
  const [embedded, setEmbedded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [botonTexto, setBotonTexto] = useState("");
  const [botonLink, setBotonLink] = useState("");

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  const successCta =
    botonTexto.trim() && botonLink.trim()
      ? { texto: botonTexto.trim(), link: botonLink.trim() }
      : null;

  const embedCode = useMemo(() => {
    const qs =
      botonTexto && botonLink
        ? `?boton_texto=${encodeURIComponent(botonTexto)}&boton_link=${encodeURIComponent(botonLink)}`
        : "";
    return `<iframe
  src="${BASE_SRC}${qs}"
  style="border: 0; width: 100%; height: 100%; display: block;"
  title="Verificador de archivos de proyectos de Scratch"
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

  return (
    <main className="fv-page">
      <div className="fv-page__cols">
        <FileVerifierWidget successCta={successCta} />
        {!embedded && (
          <aside className="fv-embed-info" aria-labelledby="fv-embed-info-title">
            <h2 id="fv-embed-info-title">Insertá esta herramienta en tu web</h2>
            <article className="fv-embed-info__item">
              <h3>Widget de archivos</h3>
              <p>El alumno sube su archivo .sb3.</p>
              <div className="fv-embed-info__config">
                <label>
                  Texto del botón
                  <input
                    type="text"
                    className="fv-embed-info__input"
                    value={botonTexto}
                    onChange={(e) => setBotonTexto(e.target.value)}
                    placeholder="Ej: Ir a mi proyecto"
                  />
                </label>
                <label>
                  Enlace del botón
                  <input
                    type="url"
                    className="fv-embed-info__input"
                    value={botonLink}
                    onChange={(e) => setBotonLink(e.target.value)}
                    placeholder="Ej: https://scratch.mit.edu/projects/1234567890"
                  />
                </label>
              </div>
              <pre className="fv-embed-info__code">
                <code>{embedCode}</code>
              </pre>
              <button
                type="button"
                className={`fv-embed-info__copy${copied ? " is-copied" : ""}`}
                onClick={copyCode}
                aria-live="polite"
              >
                {copied ? "¡Copiado!" : "Copiar código"}
              </button>
            </article>
            <p className="fv-embed-info__note">
              Pegá el código en Genially (Insertar → HTML) o en cualquier web
              que acepte HTML. El widget se adapta automáticamente al tamaño
              del bloque. Llená <code>Texto del botón</code> y{" "}
              <code>Enlace del botón</code> para el botón de éxito; si los
              dejás vacíos no se muestra.
            </p>
          </aside>
        )}
      </div>
    </main>
  );
}
