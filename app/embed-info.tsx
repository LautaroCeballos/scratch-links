"use client";

import { useEffect, useState } from "react";

/**
 * Información de inserción visible SOLO cuando la página se visita
 * directamente (no embebida). Detecta si la web corre dentro de un
 * iframe comparando window.self con window.top.
 */
const EMBED_CODE = `<iframe
  src="https://scratch-links.vercel.app/"
  width="520"
  height="740"
  style="border: 0; overflow: hidden;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen
></iframe>`;

const EMBED_PRECARGADO_CODE = `<iframe
  src="https://scratch-links.vercel.app/?project=https://scratch.mit.edu/projects/1234567890"
  width="520"
  height="740"
  style="border: 0; overflow: hidden;"
  title="Verificador de proyectos de Scratch"
  allow="autoplay"
  allowfullscreen
></iframe>`;

export default function EmbedInfo() {
  // Inicializamos como "embebida" para que la sección nunca haga flash
  // dentro de un iframe anfitrión; el effect la revela en vista directa.
  const [embedded, setEmbedded] = useState(true);

  useEffect(() => {
    setEmbedded(window.self !== window.top);
  }, []);

  if (embedded) return null;

  return (
    <section className="embed-info" aria-labelledby="embed-info-title">
      <h2 id="embed-info-title">Insertá esta herramienta en tu web</h2>
      <div className="embed-info__cols">
        <article className="embed-info__item">
          <h3>Widget</h3>
          <p>El alumno pega su propio link.</p>
          <pre className="embed-info__code">
            <code>{EMBED_CODE}</code>
          </pre>
        </article>
        <article className="embed-info__item">
          <h3>Con proyecto precargado</h3>
          <p>Se verifica al abrir; el alumno solo presiona ▶.</p>
          <pre className="embed-info__code">
            <code>{EMBED_PRECARGADO_CODE}</code>
          </pre>
        </article>
      </div>
      <p className="embed-info__note">
        Pegá el código en Genially (Insertar → HTML) o en cualquier web que
        acepte HTML.
      </p>
    </section>
  );
}
