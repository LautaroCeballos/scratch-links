"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EMBED_WIDTH,
  EMBED_HEIGHT,
  EMBED_URL,
  extractProjectId,
  getOriginalChallenge,
} from "@/lib/scratch";

const DEBOUNCE_MS = 500;

type CheckState =
  | { status: "idle" }
  | { status: "checking"; projectId: string }
  | { status: "original"; challenge: number; projectId: string }
  | { status: "public"; projectId: string }
  | { status: "private"; projectId: string }
  | { status: "invalid" }
  | { status: "error"; projectId: string };

/* ---------- Iconos inline (estilo lucide, MIT) ---------- */

function LinkIcon() {
  return (
    <svg
      className="widget__input-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/* ---------- Widget ---------- */

export default function ScratchWidget() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const [showEmbed, setShowEmbed] = useState(false);
  const [successCta, setSuccessCta] = useState<{
    texto: string;
    link: string;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runCheck = useCallback(async (raw: string) => {
    const projectId = extractProjectId(raw);
    if (!projectId) {
      setState({ status: "invalid" });
      return;
    }

    // Si es un proyecto original de la competencia, avisamos sin llamar a la API:
    // el estudiante debe entregar SU versión, no el original.
    const challenge = getOriginalChallenge(projectId);
    if (challenge !== null) {
      setState({ status: "original", challenge, projectId });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "checking", projectId });
    setShowEmbed(false);

    try {
      const res = await fetch(
        `/api/check?projectId=${encodeURIComponent(projectId)}`,
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      if (res.ok) {
        const data = (await res.json()) as { public?: boolean };
        setState(
          data.public
            ? { status: "public", projectId }
            : { status: "private", projectId }
        );
      } else {
        setState({ status: "error", projectId });
      }
    } catch {
      if (!controller.signal.aborted) {
        setState({ status: "error", projectId });
      }
    }
  }, []);

  // Debounce: al escribir se limpia el resultado previo y se re-chequea.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const value = input.trim();
    if (!value) {
      setState({ status: "idle" });
      return;
    }

    debounceRef.current = setTimeout(() => runCheck(value), DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, runCheck]);

  // Lee parámetros configurables: primero de los atributos del iframe
  // (<iframe boton_texto="..." boton_link="...">), y como fallback de
  // los query params (?boton_texto=...&boton_link=...).
  // Los atributos solo funcionan en mismo origen; en cross-origin
  // (Genially) la URL es la vía confiable.
  useEffect(() => {
    let texto = "";
    let link = "";

    try {
      const frame = window.frameElement as HTMLIFrameElement | null;
      if (frame) {
        texto = frame.getAttribute("boton_texto")?.trim() ?? "";
        link = frame.getAttribute("boton_link")?.trim() ?? "";
      }
    } catch {
      // cross-origin: sin acceso a frameElement
    }

    if (!texto || !link) {
      const params = new URLSearchParams(window.location.search);
      texto = params.get("boton_texto")?.trim() ?? "";
      link = params.get("boton_link")?.trim() ?? "";
    }

    if (texto && link) setSuccessCta({ texto, link });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const retry = () => runCheck(input);

  const invalid = state.status === "invalid";
  const checking = state.status === "checking";

  const success = state.status === "public";
  const error =
    state.status === "original" ||
    state.status === "invalid" ||
    state.status === "private" ||
    state.status === "error";
  const cardState = success
    ? " widget__card--success"
    : error
      ? " widget__card--error"
      : "";

  return (
    <section className="widget" aria-label="Verificador de proyectos de Scratch">
      <div className={`widget__card${cardState}`}>
        <label className="widget__label" htmlFor="scratch-input">
          Pegá aquí el link de tu proyecto
        </label>
        <div className="widget__field">
          <LinkIcon />
          <input
            id="scratch-input"
            className="widget__input"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://scratch.mit.edu/projects/1234567890"
            value={input}
            onChange={handleChange}
            aria-invalid={invalid || undefined}
          />
        </div>

        <div
          className="widget__result"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.status === "idle" && (
            <img
              className="widget__notify-img"
              src="/pegar-enlace.png"
              alt="Pegá el link de tu proyecto para verificar la entrega"
              width={1536}
              height={1024}
              loading="lazy"
            />
          )}

          {checking && (
            <div className="widget__checking">
              <span className="spinner" aria-hidden="true" />
              Verificando…
            </div>
          )}

          {state.status === "original" && (
            <img
              className="widget__notify-img"
              src={`/error-proyecto-original-${state.challenge}.png`}
              alt={`Imagen explicativa: no entregar el proyecto original del Desafío ${state.challenge}`}
              width={1536}
              height={1024}
              loading="lazy"
            />
          )}

          {state.status === "invalid" && (
            <img
              className="widget__notify-img"
              src="/link-invalido.png"
              alt="Imagen explicativa: el link ingresado no es un link de proyecto de Scratch, pegá el link completo https://scratch.mit.edu/projects/ID"
              width={1536}
              height={1024}
              loading="lazy"
            />
          )}

          {state.status === "private" && (
            <img
              className="widget__notify-img"
              src="/proyecto-no-compartido.png"
              alt="Imagen explicativa: tu proyecto está privado, activá Compartir para entregarlo"
              width={1536}
              height={1024}
              loading="lazy"
            />
          )}

          {state.status === "error" && (
            <>
              <img
                className="widget__notify-img"
                src="/no-se-pudo-verificar.png"
                alt="Imagen explicativa: no se pudo contactar a Scratch, revisá tu conexión e intentá de nuevo"
                width={1536}
                height={1024}
                loading="lazy"
              />
              <button type="button" className="widget__retry" onClick={retry}>
                Intentar de nuevo
              </button>
            </>
          )}

          {state.status === "public" && (
            <>
              {showEmbed ? (
                <div className="embed">
                  <div className="embed__inner">
                    <iframe
                      src={EMBED_URL(state.projectId)}
                      title="Vista previa del proyecto de Scratch"
                      width={EMBED_WIDTH}
                      height={EMBED_HEIGHT}
                      allow="autoplay"
                      allowFullScreen
                      scrolling="no"
                      onError={() => setShowEmbed(false)}
                    />
                  </div>
                </div>
              ) : (
                <img
                  className="widget__notify-img"
                  src="/enlace-verificado.png"
                  alt="Imagen de éxito: tu enlace fue verificado y está listo para entregar"
                  width={1536}
                  height={1024}
                  loading="lazy"
                />
              )}
              <div className="widget__actions">
                <button
                  type="button"
                  className="widget__retry"
                  onClick={() => setShowEmbed((v) => !v)}
                  aria-expanded={showEmbed}
                >
                  {showEmbed ? "Ocultar vista previa" : "Ver vista previa"}
                </button>
                {successCta && (
                  <a
                    className="widget__success-link"
                    href={successCta.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {successCta.texto}
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
