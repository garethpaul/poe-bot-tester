export const INVALID_JSON_BODY_ERROR = 'Request body must be a JSON object';
export const JSON_BODY_TOO_LARGE_ERROR = 'Request body is too large';
export const MAX_JSON_BODY_BYTES = 64 * 1024;

type JsonObjectParseResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: 'invalid' | 'too_large' };

function declaredBodyIsTooLarge(headers: Headers): boolean {
  const contentLength = headers.get('content-length');
  if (!contentLength || !/^\d+$/.test(contentLength)) return false;

  return BigInt(contentLength) > BigInt(MAX_JSON_BODY_BYTES);
}

async function readBoundedBody(request: Pick<Request, 'body' | 'headers'>): Promise<Uint8Array | null> {
  if (declaredBodyIsTooLarge(request.headers)) return null;
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function parseJsonObject(
  request: Pick<Request, 'body' | 'headers'>
): Promise<JsonObjectParseResult> {
  let bodyBytes: Uint8Array | null;
  try {
    bodyBytes = await readBoundedBody(request);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!bodyBytes) return { ok: false, reason: 'too_large' };

  try {
    const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bodyBytes));

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return { ok: false, reason: 'invalid' };
    }

    return { ok: true, value: body as Record<string, unknown> };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}
