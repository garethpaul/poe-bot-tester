export const INVALID_JSON_BODY_ERROR = 'Request body must be a JSON object';

export async function parseJsonObject(
  request: Pick<Request, 'json'>
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
