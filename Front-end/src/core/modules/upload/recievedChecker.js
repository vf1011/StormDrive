// core/upload/receivedChecker.js
import { fromBase64 } from "../crypto/base64.js";

/**
 * Backend status returns either:
 * - received_indices: number[]
 * OR
 * - received_bitmap_b64: string
 */
export function makeReceivedChecker({ totalChunks, received_indices, received_bitmap_b64 }) {
  if (Array.isArray(received_indices)) {
    const set = new Set(received_indices.map((n) => Number(n)));
    return (i) => set.has(i);
  }

  if (received_bitmap_b64) {
    const bytes = fromBase64(received_bitmap_b64);

    return (i) => {
      if (i < 0 || i >= totalChunks) return false;
      const byteIndex = (i / 8) | 0;
      const bitIndex = i % 8;
      const mask = 1 << (7 - bitIndex); // MSB-first
      return (bytes[byteIndex] & mask) !== 0;
    };
  }

  return () => false;
}
