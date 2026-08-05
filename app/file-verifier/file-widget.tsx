"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  validateScratchFile,
  type FileCheckResult,
} from "@/lib/scratch-file";

type FileState =
  | { status: "idle" }
  | { status: "checking"; fileName: string }
  | { status: "valid"; fileName: string }
  | { status: "not-sb3"; fileName: string }
  | { status: "not-zip"; fileName: string }
  | { status: "corrupt"; fileName: string }
  | { status: "not-scratch"; fileName: string }
  | { status: "original"; challenge: number; fileName: string }
  | { status: "error"; fileName: string };

function UploadIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 21h14" />
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
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/** Lee el CTA configurable desde la URL de inserción (?boton_texto=&boton_link=). */
function readSuccessCta() {
  const params = new URLSearchParams(window.location.search);
  const texto = params.get("boton_texto")?.trim();
  const link = params.get("boton_link")?.trim();
  return texto && link ? { texto, link } : null;
}

/** Convierte https://www.youtube.com/watch?v=ID&t=30s en la URL embebible. */
function toEmbedUrl(watchUrl: string): string {
  try {
    const url = new URL(watchUrl);
    const v = url.searchParams.get("v");
    const t = (url.searchParams.get("t") ?? "").replace(/\D/g, "");
    if (!v) return watchUrl;
    return `https://www.youtube-nocookie.com/embed/${v}${t ? `?start=${t}` : ""}`;
  } catch {
    return watchUrl;
  }
}

type HelpVideo = { title: string; embedUrl: string };

export default function FileVerifierWidget() {
  const [state, setState] = useState<FileState>({ status: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [successCta, setSuccessCta] = useState<{
    texto: string;
    link: string;
  } | null>(null);
  const [helpVideo, setHelpVideo] = useState<HelpVideo | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);

  // Marca el documento cuando corre dentro de un iframe (Genially).
  useEffect(() => {
    if (window.self !== window.top) {
      document.documentElement.classList.add("is-embedded");
    }
  }, []);

  // Cierra la modal con Escape y devuelve el foco al abrir.
  useEffect(() => {
    if (!helpVideo) return;
    modalCloseRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpVideo(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [helpVideo]);

  useEffect(() => {
    setSuccessCta(readSuccessCta());
  }, []);

  const runCheck = async (file: File) => {
    setState({ status: "checking", fileName: file.name });
    try {
      const result: FileCheckResult = await validateScratchFile(file);
      const base = { fileName: file.name };
      switch (result.status) {
        case "not-sb3":
          setState({ status: "not-sb3", ...base });
          break;
        case "not-zip":
          setState({ status: "not-zip", ...base });
          break;
        case "corrupt":
          setState({ status: "corrupt", ...base });
          break;
        case "not-scratch":
          setState({ status: "not-scratch", ...base });
          break;
        case "original":
          setState({
            status: "original",
            challenge: result.challenge,
            ...base,
          });
          break;
        case "valid":
          setState({ status: "valid", ...base });
          break;
      }
    } catch {
      setState({ status: "error", fileName: file.name });
    }
  };

  const onFile = (file: File | undefined | null) => {
    if (!file) return;
    setSelectedFile(file);
    // Permite volver a elegir el mismo archivo (resetea el value del input).
    if (inputRef.current) inputRef.current.value = "";
    void runCheck(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const valid = state.status === "valid";
  const error =
    state.status === "not-sb3" ||
    state.status === "not-zip" ||
    state.status === "corrupt" ||
    state.status === "not-scratch" ||
    state.status === "original" ||
    state.status === "error";

  const cardState = valid
    ? " fv-card--success"
    : error
      ? " fv-card--error"
      : "";

  const hasFile = selectedFile !== null;

  const helpLinks = (
    <ul className="fv-help-list">
      {[
        {
          title: "Cómo reinventar un proyecto para comenzar a trabajar",
          url: "https://www.youtube.com/watch?v=Qyy6YJtx1Rw",
        },
        {
          title: "Cómo descargar un proyecto para realizar la entrega",
          url: "https://www.youtube.com/watch?v=pLd0S7GCNx0",
        },
      ].map((item) => (
        <li key={item.url}>
          <a
            className="fv-help-link"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              setHelpVideo({
                title: item.title,
                embedUrl: toEmbedUrl(item.url),
              });
            }}
          >
            <ExternalLinkIcon />
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      className="fv-widget"
      aria-label="Verificador de archivos de proyectos de Scratch"
    >
      <div className={`fv-card${cardState}`}>
        <div className="fv-head">
          <label className="fv-label" htmlFor="fv-file-input">
            Subí tu proyecto de Scratch para verificarlo
          </label>
        </div>

        <div
          className={`fv-upload${dragOver ? " fv-upload--dragover" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files?.[0]);
          }}
        >
          {hasFile ? (
            <span className="fv-upload__file">
              <UploadIcon />
              <span className="fv-upload__file-line">
                <strong>{selectedFile!.name}</strong>
              </span>
              <span className="fv-upload__meta">
                {formatSize(selectedFile!.size)} · .sb3
              </span>
            </span>
          ) : (
            <>
              <UploadIcon />
              <span>
                {state.status === "checking"
                  ? "Verificando…"
                  : "Arrastrá tu archivo .sb3 o hacé clic para elegirlo"}
              </span>
            </>
          )}
          <input
            ref={inputRef}
            id="fv-file-input"
            className="fv-upload__input"
            type="file"
            accept=".sb3,application/zip"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        <div
          className="fv-statebox"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="fv-statebox__main">
          {state.status === "idle" && (
            <>
              <p className="fv-help-text">
                Recordá que para entregar el desafío, tu proyecto debe estar
                completo. Si tenés dudas, revisá la ayuda a continuación:
              </p>
              {helpLinks}
            </>
          )}

          {state.status === "checking" && (
            <div className="fv-checking">
              <span className="spinner" aria-hidden="true" />
              Verificando…
            </div>
          )}

          {state.status === "not-sb3" && (
            <p className="fv-feedback-error">
              El archivo no tiene extensión .sb3. Exportá tu proyecto desde
              Scratch como archivo .sb3.
            </p>
          )}

          {state.status === "not-zip" && (
            <p className="fv-feedback-error">
              El archivo no es un proyecto válido de Scratch (no es un ZIP).
            </p>
          )}

          {state.status === "corrupt" && (
            <p className="fv-feedback-error">
              El archivo está dañado o incompleto. Exportalo de nuevo desde
              Scratch.
            </p>
          )}

          {state.status === "not-scratch" && (
            <p className="fv-feedback-error">
              El archivo es un ZIP pero no contiene un proyecto válido de
              Scratch 3.
            </p>
          )}

          {state.status === "original" && (
            <p className="fv-feedback-error">
              Este archivo es el proyecto original del Desafío{" "}
              {state.challenge}. Reinventalo y hace tu resolucion para poder
              hacer la entrega.
            </p>
          )}

          {state.status === "error" && (
            <p className="fv-feedback-error">
              No se pudo leer el archivo. Probá de nuevo.
            </p>
          )}

          {error && helpLinks}

          {valid && (
            <p className="fv-feedback-success">
              ¡Archivo verificado!
              <br />
              Ahora puedes continuar y realizar la entrega
            </p>
          )}
          </div>
        </div>

        <div className="fv-actions">
          {valid &&
            (successCta ? (
              <a
                className="fv-submit"
                href={successCta.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CheckIcon />
                {successCta.texto}
              </a>
            ) : (
              <button
                type="button"
                className="fv-submit"
                disabled
                title="El enlace de entrega se configura en la página de inserción"
              >
                <CheckIcon />
                Agregar entrega
              </button>
            ))}
        </div>

        <div className="fv-viewer">
          <div className="fv-viewer-body">
            {state.status === "idle" && (
              <img
                className="fv-notify-img"
                src="/subir-archivo.png"
                alt="Imagen explicativa: subí tu proyecto de Scratch para verificarlo"
                width={1536}
                height={1024}
                loading="lazy"
              />
            )}

            {state.status === "original" && (
              <img
                className="fv-notify-img"
                src={`/error-archivo-proyecto-original-${state.challenge}.png`}
                alt={`Imagen explicativa: este archivo es el proyecto original del Desafío ${state.challenge}`}
                width={1536}
                height={1024}
                loading="lazy"
              />
            )}

            {(state.status === "not-sb3" ||
              state.status === "not-zip" ||
              state.status === "corrupt" ||
              state.status === "not-scratch" ||
              state.status === "error") && (
              <img
                className="fv-notify-img"
                src="/error-archivo-formato-invalido.png"
                alt="Imagen explicativa: el archivo no es un proyecto válido de Scratch"
                width={1536}
                height={1024}
                loading="lazy"
              />
            )}

            {valid && (
              <img
                className="fv-notify-img"
                src="/archivo-verificado.png"
                alt="Imagen de éxito: el archivo fue verificado y está listo para entregar"
                width={1536}
                height={1024}
                loading="lazy"
              />
            )}
          </div>
        </div>
      </div>

      {helpVideo &&
        createPortal(
          <div
            className="fv-modal"
            role="dialog"
            aria-modal="true"
            aria-label={helpVideo.title}
            onClick={() => setHelpVideo(null)}
          >
            <div
              className="fv-modal-content"
              role="document"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fv-modal-video">
                <button
                  ref={modalCloseRef}
                  type="button"
                  className="fv-modal-close"
                  onClick={() => setHelpVideo(null)}
                  aria-label="Cerrar video"
                >
                  <CloseIcon />
                </button>
                <iframe
                  src={helpVideo.embedUrl}
                  title={helpVideo.title}
                  width={640}
                  height={360}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
