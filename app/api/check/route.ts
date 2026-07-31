import { NextResponse } from "next/server";
import { VALID_PROJECT_ID } from "@/lib/scratch";

/**
 * GET /api/check?projectId=123
 *
 * Verifica desde el servidor si un proyecto de Scratch es público.
 * El navegador no puede llamar a api.scratch.mit.edu por CORS; por eso
 * el fetch vive acá (Node runtime, request-time).
 *
 * Respuestas:
 *   200 { public: true }   -> el proyecto existe y es público
 *   200 { public: false }  -> 404 desde Scratch (privado, no compartido o inexistente)
 *   400 { error }          -> projectId inválido
 *   502 { error }          -> no se pudo verificar (red / 5xx de Scratch)
 */
export const dynamic = "force-dynamic";

const SCRATCH_API_TIMEOUT_MS = 8000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId")?.trim() ?? "";

  if (!VALID_PROJECT_ID.test(projectId)) {
    return NextResponse.json(
      { error: "id_invalido", message: "projectId debe ser numérico" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://api.scratch.mit.edu/projects/${projectId}`, {
      signal: AbortSignal.timeout(SCRATCH_API_TIMEOUT_MS),
    });

    if (res.status === 200) {
      return NextResponse.json(
        { public: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    if (res.status === 404) {
      return NextResponse.json({ public: false });
    }

    return NextResponse.json(
      { error: "no_se_pudo_verificar", message: "Scratch respondió un estado inesperado" },
      { status: 502 }
    );
  } catch {
    return NextResponse.json(
      { error: "no_se_pudo_verificar", message: "No se pudo contactar la API de Scratch" },
      { status: 502 }
    );
  }
}
