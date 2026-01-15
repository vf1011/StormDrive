// core/download/exactByteReader.js
function cat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/**
 * @param {() => Promise<Uint8Array|null>} read  // returns null on end
 */
export function createExactByteReader(read) {
  let pending = new Uint8Array(0);

  return {
    async readExact(n) {
      while (pending.length < n) {
        const more = await read();
        if (more === null) throw new Error("Encrypted stream ended early");
        if (more.length) pending = cat(pending, more);
      }
      const out = pending.slice(0, n);
      pending = pending.slice(n);
      return out;
    },
  };
}
