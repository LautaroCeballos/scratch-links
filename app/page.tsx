"use client";

import { useState } from "react";
import ScratchWidget from "./widget";
import EmbedInfo from "./embed-info";

export default function Home() {
  const [botonTexto, setBotonTexto] = useState("");
  const [botonLink, setBotonLink] = useState("");

  const successCta =
    botonTexto.trim() && botonLink.trim()
      ? { texto: botonTexto.trim(), link: botonLink.trim() }
      : null;

  return (
    <main className="page">
      <div className="page__cols">
        <ScratchWidget successCta={successCta} />
        <EmbedInfo
          botonTexto={botonTexto}
          botonLink={botonLink}
          onBotonTextoChange={setBotonTexto}
          onBotonLinkChange={setBotonLink}
        />
      </div>
    </main>
  );
}
