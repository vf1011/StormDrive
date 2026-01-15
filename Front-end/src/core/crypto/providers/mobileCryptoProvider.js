// core/crypto/providers/MobileAesGcmProvider.js (rename recommended)
export class MobileAesGcmProvider {
  constructor() {
    this.aead = {
      algo: "AES-256-GCM",
      nonceLength: 12,
      keyLength: 32,
      encrypt: async () => { throw new Error("MobileAesGcmProvider not implemented"); },
      decrypt: async () => { throw new Error("MobileAesGcmProvider not implemented"); },
    };
  }

  randomBytes() { throw new Error("MobileAesGcmProvider not implemented"); }
  async sha256() { throw new Error("MobileAesGcmProvider not implemented"); }
  async hmacSha256() { throw new Error("MobileAesGcmProvider not implemented"); }
}
