import struct
from dataclasses import dataclass

MAGIC = b"SDC1"  # StormDrive Chunk v1


def encode_chunk_package(chunk_index: int, nonce: bytes, tag: bytes, ciphertext: bytes) -> bytes:
    if chunk_index < 0:
        raise ValueError("chunk_index must be >= 0")

    header = bytearray()
    header += MAGIC
    header += struct.pack(">I", chunk_index)
    header += struct.pack(">H", len(nonce)) + nonce
    header += struct.pack(">H", len(tag)) + tag
    header += struct.pack(">I", len(ciphertext)) + ciphertext
    return bytes(header)


@dataclass(frozen=True)
class DecodedChunkPackage:
    chunk_index: int
    nonce: bytes
    tag: bytes
    ciphertext: bytes


def decode_chunk_package(blob: bytes) -> DecodedChunkPackage:
    """
    Parses a single package. Useful for server-side SHA256 verification and debugging.
    """
    if not blob or len(blob) < 4 + 4 + 2 + 2 + 4:
        raise ValueError("Chunk package too small")

    off = 0
    if blob[off:off + 4] != MAGIC:
        raise ValueError("Invalid chunk package magic")
    off += 4

    (chunk_index,) = struct.unpack_from(">I", blob, off)
    off += 4

    (nonce_len,) = struct.unpack_from(">H", blob, off)
    off += 2
    if nonce_len <= 0 or off + nonce_len > len(blob):
        raise ValueError("Invalid nonce length")
    nonce = blob[off:off + nonce_len]
    off += nonce_len

    (tag_len,) = struct.unpack_from(">H", blob, off)
    off += 2
    if tag_len <= 0 or off + tag_len > len(blob):
        raise ValueError("Invalid tag length")
    tag = blob[off:off + tag_len]
    off += tag_len

    (ct_len,) = struct.unpack_from(">I", blob, off)
    off += 4
    if ct_len < 0 or off + ct_len > len(blob):
        raise ValueError("Invalid ciphertext length")
    ciphertext = blob[off:off + ct_len]

    return DecodedChunkPackage(
        chunk_index=int(chunk_index),
        nonce=nonce,
        tag=tag,
        ciphertext=ciphertext,
    )
