"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  EMBED_WIDTH,
  EMBED_HEIGHT,
  EMBED_URL,
  extractProjectId,
} from "@/lib/scratch";

const DEBOUNCE_MS = 500;

type CheckState =
  | { status: "idle" }
  | { status: "checking"; projectId: string }
  | { status: "public"; projectId: string }
  | { status: "private"; projectId: string }
  | { status: "invalid" }
  | { status: "error"; projectId: string };

/* ---------- Iconos inline (estilo lucide, MIT) ---------- */

function ScratchLogo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4" fill="#4D97FF" />
      <circle cx="18" cy="6" r="4" fill="#9966FF" />
      <circle cx="6" cy="18" r="4" fill="#FFAB19" />
      <circle cx="18" cy="18" r="4" fill="#59C059" />
    </svg>
  );
}

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

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/* ---------- Widget ---------- */

export default function ScratchWidget() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<CheckState>({ status: "idle" });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bootstrapped = useRef(false);

  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project");

  const runCheck = useCallback(async (raw: string) => {
    const projectId = extractProjectId(raw);
    if (!projectId) {
      setState({ status: "invalid" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "checking", projectId });

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

  // Precarga desde ?project=<link> (una sola vez al montar).
  useEffect(() => {
    if (bootstrapped.current || !initialProject) return;
    bootstrapped.current = true;
    setInput(initialProject);
  }, [initialProject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const retry = () => runCheck(input);

  const invalid = state.status === "invalid";
  const checking = state.status === "checking";

  return (
    <main className="widget">
      <div className="widget__card">
        <header className="widget__header">
          <span className="widget__logo">
            <ScratchLogo />
          </span>
          <div>
            <h1 className="widget__title">Scratch Links</h1>
            <p className="widget__subtitle">
              Verificá si un proyecto de Scratch es público y miralo al instante.
            </p>
          </div>
        </header>

        <label className="widget__label" htmlFor="scratch-input">
          Link del proyecto
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
            aria-describedby={
              invalid ? "scratch-feedback scratch-hint" : "scratch-hint"
            }
          />
        </div>
        <p className="widget__hint" id="scratch-hint">
          Probá con{" "}
          <code>https://scratch.mit.edu/projects/1364131636</code>
        </p>

        <div
          className="widget__result"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {state.status === "idle" && (
            <div className="widget__empty">
              <InfoIcon />
              Pegá el link y verificamos la visibilidad automáticamente.
            </div>
          )}

          {checking && (
            <div className="widget__checking">
              <span className="spinner" aria-hidden="true" />
              Verificando…
            </div>
          )}

          {state.status === "invalid" && (
            <div className="badge badge--danger" id="scratch-feedback">
              <CrossIcon />
              Link de Scratch no válido
            </div>
          )}

          {state.status === "private" && (
            <>
              <div className="badge badge--danger">
                <CrossIcon />
                Proyecto privado o no existe
              </div>
              <p className="widget__help">
                Para compartirlo: abrí el proyecto en Scratch y activá{" "}
                <strong>Compartir</strong> en la barra superior.
              </p>
            </>
          )}

          {state.status === "error" && (
            <>
              <div className="badge badge--warn">
                <AlertIcon />
                No se pudo verificar
              </div>
              <p className="widget__help">
                Hubo un problema contactando a Scratch. Revisá tu conexión y
                probá de nuevo.
              </p>
              <button type="button" className="widget__retry" onClick={retry}>
                Intentar de nuevo
              </button>
            </>
          )}

          {state.status === "public" && (
            <>
              <div className="badge badge--success">
                <CheckIcon />
                Proyecto público
              </div>
              <div className="embed">
                <div className="embed__inner">
                  <iframe
                    src={EMBED_URL(state.projectId)}
                    title="Proyecto de Scratch"
                    width={EMBED_WIDTH}
                    height={EMBED_HEIGHT}
                    allow="autoplay"
                    allowFullScreen
                    scrolling="no"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
