/**
 * Utilidades para parsear links de proyectos de Scratch y constantes del embed.
 */

export const EMBED_WIDTH = 485;
export const EMBED_HEIGHT = 402;

export const EMBED_URL = (id: string) =>
  `https://scratch.mit.edu/projects/${id}/embed`;

/** Valida que un projectId sean solo dígitos (defensa server-side). */
export const VALID_PROJECT_ID = /^\d{1,20}$/;

/**
 * Patrones aceptados:
 * - "https://scratch.mit.edu/projects/1364131636" (con o sin subdominio www)
 * - ".../projects/123/editor", ".../projects/123/fullscreen"
 * - con "/" final o query params (".../projects/123?foo=bar")
 * - texto extra pegado desde un buscador (el patrón matchea en cualquier parte)
 * - ID pelado: "1364131636"
 *
 * Devuelve el projectId como string, o null si el input no es un link válido.
 */
const PROJECT_URL_PATTERN = /(?:scratch\.mit\.edu\/)?projects\/(\d+)/;
const BARE_ID_PATTERN = /^\d+$/;

export function extractProjectId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(PROJECT_URL_PATTERN);
  if (match) return match[1];

  if (BARE_ID_PATTERN.test(trimmed)) return trimmed;

  return null;
}
