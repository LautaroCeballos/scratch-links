/**
 * Utilidades para parsear links de proyectos de Scratch y constantes del embed.
 */

export const EMBED_WIDTH = 485;
export const EMBED_HEIGHT = 402;

export const EMBED_URL = (id: string) =>
  `https://scratch.mit.edu/projects/${id}/embed`;

/**
 * Proyectos originales de la competencia: son los que el docente entrega a
 * cada estudiante para que los reinvente. Si el alumno pega uno de estos,
 * NO es su entregable: se le avisa que debe crear su propia versión mejorada.
 */
export const ORIGINAL_PROJECTS = [
  { challenge: 1, id: "1081188585" },
  { challenge: 2, id: "1081199620" },
  { challenge: 3, id: "1081201741" },
  { challenge: 4, id: "1081217132" },
] as const;

/**
 * Devuelve el número de desafío si el projectId corresponde a un proyecto
 * original de la competencia, o null si es un proyecto del estudiante.
 */
export function getOriginalChallenge(projectId: string): number | null {
  const found = ORIGINAL_PROJECTS.find((p) => p.id === projectId);
  return found ? found.challenge : null;
}

/** Valida que un projectId tenga 9–10 dígitos (defensa server-side). */
export const VALID_PROJECT_ID = /^\d{9,10}$/;

/**
 * Formatos aceptados (URL completa, anclada al inicio y fin):
 * - "https://scratch.mit.edu/projects/1234567890"
 * - "https://www.scratch.mit.edu/projects/1234567890" (con subdominio www)
 * - ".../projects/1234567890/" (con "/" final)
 * - ".../projects/1234567890/editor", ".../projects/1234567890/fullscreen"
 *
 * El ID debe tener entre 9 y 10 dígitos.
 * No se aceptan: ID pelado, texto extra, query params, otros dominios
 * ni longitudes de ID fuera de rango. Devuelve null en esos casos.
 */
const PROJECT_URL_PATTERN =
  /^https?:\/\/(?:www\.)?scratch\.mit\.edu\/projects\/(\d{9,10})\/?(?:editor|fullscreen)?$/;

export function extractProjectId(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  const match = normalized.match(PROJECT_URL_PATTERN);
  return match ? match[1] : null;
}
