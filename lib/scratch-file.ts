/**
 * Validación de archivos .sb3 (proyectos de Scratch 3).
 *
 * Un .sb3 es un ZIP que contiene project.json (el proyecto: sprites, scripts,
 * variables) y una carpeta assets/ (disfraces, sonidos).
 *
 * Niveles de verificación implementados:
 *   1. Extensión del archivo (.sb3)
 *   2. Firma ZIP (magic bytes PK\x03\x04)
 *   3. Estructura ZIP válida (abre con JSZip)
 *   4. Contiene project.json y es un proyecto Scratch 3 válido
 *   5. Anti-original: hash del contenido de project.json contra los 4
 *      proyectos originales de la competencia (una reinvención cambia el
 *      JSON → pasa automáticamente).
 *
 * Todo corre en el navegador (File + ArrayBuffer + crypto.subtle). No se
 * sube el archivo a ningún servidor.
 */

import JSZip from "jszip";

export const SB3_EXTENSION = ".sb3";

/** Firma de archivo ZIP: los primeros 4 bytes de todo .sb3. */
export const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04"

/**
 * SHA-256 del contenido de project.json de los proyectos originales de la
 * competencia (calculados sobre los archivos de docs/raw/originales/).
 * Si el docente actualiza los originales, hay que recalcular estos hashes.
 */
export const ORIGINAL_PROJECT_JSON_HASHES = [
  {
    challenge: 1,
    sha256:
      "93F462C2989F226D308BCC00A1E4BD53D0FCD1F81B6B64DFC2D94697DED8F9E8",
  }, // Buscando la nave incompleto.sb3
  {
    challenge: 2,
    sha256:
      "6EE1A890677D52726CD73B86A88932D1854DF2F89840E95725A06BA3433F011E",
  }, // Esquivar meteoros incompleto.sb3
  {
    challenge: 3,
    sha256:
      "BAB6B76B9B9D32460674DF505442216D97BB3423B1B028DEAB902C0061A1C2B2",
  }, // Conociendo otros planetas incompleto.sb3
  {
    challenge: 4,
    sha256:
      "D7A0DA565D6761CF7312D648CA85B82983C1BC84E353034DED652EFAFF165AB6",
  }, // Escape espacial incompleto.sb3
] as const;

/** Resultado de la validación de un archivo. */
export type FileCheckResult =
  | { status: "not-sb3" }
  | { status: "not-zip" }
  | { status: "corrupt" }
  | { status: "not-scratch" }
  | { status: "original"; challenge: number }
  | { status: "valid" };

/** Devuelve el desafío si el hash coincide con un proyecto original. */
export function getOriginalChallengeFromHash(
  sha256: string
): number | null {
  const found = ORIGINAL_PROJECT_JSON_HASHES.find(
    (p) => p.sha256 === sha256.toUpperCase()
  );
  return found ? found.challenge : null;
}

function hasSb3Extension(name: string): boolean {
  return name.trim().toLowerCase().endsWith(SB3_EXTENSION);
}

async function readMagicBytes(file: File): Promise<number[]> {
  const buffer = await file.slice(0, 4).arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function looksLikeScratch3(project: unknown): boolean {
  if (!project || typeof project !== "object") return false;
  const p = project as { targets?: unknown; meta?: { semver?: unknown } };
  if (!Array.isArray(p.targets) || p.targets.length === 0) return false;
  const semver = p.meta?.semver;
  return typeof semver === "string" && semver.startsWith("3");
}

/**
 * Valida un archivo .sb3 en el navegador. Nunca sube el archivo.
 *
 * Orden:
 *  1. extensión .sb3
 *  2. magic bytes ZIP
 *  3. apertura del ZIP (corrupt → error)
 *  4. project.json presente + parsea + estructura Scratch 3 (not-scratch si no)
 *  5. hash anti-original
 */
export async function validateScratchFile(
  file: File
): Promise<FileCheckResult> {
  if (!hasSb3Extension(file.name)) return { status: "not-sb3" };

  const magic = await readMagicBytes(file);
  const isZip =
    magic.length === ZIP_MAGIC.length &&
    magic.every((b, i) => b === ZIP_MAGIC[i]);
  if (!isZip) return { status: "not-zip" };

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    return { status: "corrupt" };
  }

  const entry = zip.file("project.json");
  if (!entry) return { status: "not-scratch" };

  let projectJson: string;
  try {
    projectJson = await entry.async("string");
  } catch {
    return { status: "corrupt" };
  }

  let project: unknown;
  try {
    project = JSON.parse(projectJson);
  } catch {
    return { status: "corrupt" };
  }

  if (!looksLikeScratch3(project)) return { status: "not-scratch" };

  const hash = await sha256Hex(
    new TextEncoder().encode(projectJson)
  );
  const challenge = getOriginalChallengeFromHash(hash);
  if (challenge !== null) return { status: "original", challenge };

  return { status: "valid" };
}
