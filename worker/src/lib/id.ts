const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** 10-char base36 id (~51 bits). Short ids keep MCP payloads small. */
export function id(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % 36];
  return out;
}
