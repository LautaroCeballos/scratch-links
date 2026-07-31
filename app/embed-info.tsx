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
      <p>
        Esta página es un widget embebible. Copiá el código{" "}
        <code>&lt;iframe&gt;</code> y pegalo en Genially (Insertar → HTML) o en
        cualquier web que acepte HTML:
      </p>
      <pre className="embed-info__code">
        <code>{EMBED_CODE}</code>
      </pre>
      <p className="embed-info__note">
        Para precargar un proyecto al abrir, agregá{" "}
        <code>?project=https://scratch.mit.edu/projects/1234567890</code> a la
        URL dentro de <code>src</code>. Sin el parámetro, quien abra la web
        pega su propio link.
      </p>
    </section>
  );
}
