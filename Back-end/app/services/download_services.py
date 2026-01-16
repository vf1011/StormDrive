import hashlib
import json
import logging , struct, anyio
from dataclasses import dataclass
from typing import AsyncIterator, Optional, Dict, Tuple, List, Set, Iterable 
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.file_repository import FileRepository
from app.repositories.folder_repository import FolderRepository

from app.security.server_wrapup import ServerCipherWrap, ServerWrapError
from app.storage.chunk_storage import ChunkStorage
from app.storage.chunk_package import decode_chunk_package

from app.schemas.dash_schema import DownloadPlanItem,DownloadRoot,FolderDownloadPlanResponse

from app.security.name_validator import _validate_name

logger = logging.getLogger(__name__)

class DownloadNotFoundError(FileNotFoundError):
    pass

class DownloadCorruptionError(RuntimeError):
    pass

@dataclass(frozen=True)
class DownloadTarget:
    file_id: UUID
    file_name: str
    file_type: str
    file_size: int
    file_path: str          
    integrity_hash: str
    encryption_metadata: Optional[str]

@dataclass(frozen=True)
class FolderNode:
    folder_id: int
    parent_id: Optional[int]
    name: str
    root_id: int


class DownloadService:
    def __init__(self,file_repo :FileRepository, storage: ChunkStorage, wrapper: ServerCipherWrap,folder_repo:FolderRepository):
        self.filerepo = file_repo
        self.storage = storage
        self.wrapper = wrapper
        self.folder_repo = folder_repo

    C1_SCHEMA_VERSION = 1

    def aad_bytes(self, upload_id:str,chunk_size:str,file_size: int,file_type: str, chunk_idx:int)->bytes:
        enc_stream_id = str(upload_id).encode("utf-8")
        prefix = f"SD:C1|v{self.C1_SCHEMA_VERSION}|".encode("utf-8")
        sep = b"|"

        idx_be = struct.pack(">I", int(chunk_idx))          
        cs_be  = struct.pack(">I", int(chunk_size))    
        fs_utf8 = str(int(file_size)).encode("utf-8") #file_size
        ft_utf8 = file_type.encode("utf-8") #file_type

        return b"".join([prefix, enc_stream_id, sep, idx_be, cs_be, fs_utf8, sep, ft_utf8])

    async def get_download_file(
        self,
        session: AsyncSession,
        user_id: str,
        file_id: UUID,
        version_id: Optional[int] = None,
    ) -> DownloadTarget:
        if version_id is None:
            file = await self.filerepo.get_active_file(session,user_id=user_id,file_id=file_id)
            if not file:
                raise DownloadNotFoundError("File not found")

            return DownloadTarget(
                file_id=file_id,
                file_name=file.file_name,
                file_type=file.file_type,
                file_size=int(file.file_size),
                file_path=file.file_path,
                integrity_hash=file.integrity_hash or "",
                encryption_metadata=file.encryption_metadata,
            )

        # versioned download
        ver_file = await self.filerepo.get_file_version(session,user_id=user_id,file_id=file_id,version_id=version_id)
        if not ver_file:
            raise DownloadNotFoundError("File version not found")

        return DownloadTarget(
            file_id=file_id,
            file_name=ver_file.file_name,
            file_type=ver_file.file_type,
            file_size=int(ver_file.file_size),
            file_path=ver_file.file_path,
            integrity_hash=ver_file.integrity_hash or "",
            encryption_metadata=ver_file.encryption_metadata,
        )

    async def build_files_path(
        self,
        session: AsyncSession,
        user_id: str,
        file_ids: List[UUID],
        include_parent_paths: bool = True,
        include_virtual_root: bool = False,   
        max_items: int = 100_000,
    ) -> FolderDownloadPlanResponse:
        if not file_ids:
            raise ValueError("file_ids is empty")
        if len(file_ids) > max_items:
            raise ValueError(f"Too many files to download in one request ({len(file_ids)}).")

        files = await self.filerepo.get_file_by_active_ids(
            session,
            user_id=user_id,
            file_ids=file_ids,
            include_deleted=False,
        )
        if len(files) != len(file_ids):
            raise LookupError("One or more files not found")

        folder_map = {}
        if include_parent_paths:
            folder_ids = sorted({int(f.folder_id) for f in files if f.folder_id is not None})
            if folder_ids:
                folders = await self.folder_repo.get_active_folders_by_ids(session, user_id, folder_ids)
                folder_map = {int(fl.folder_id): fl for fl in folders}

        items: List[DownloadPlanItem] = []
        seen_paths: Set[str] = set()

        for f in files:
            _validate_name(f.file_name)

            parts: List[str] = []

            if include_virtual_root:
                parts.append("Selected Files")

            if include_parent_paths and f.folder_id is not None:
                parent = folder_map.get(int(f.folder_id))
                if parent and getattr(parent, "heirarchy_path", None):
                    # heirarchy_path example: "Docs/2024/Jan"
                    for seg in str(parent.heirarchy_path).strip("/").split("/"):
                        if seg:
                            _validate_name(seg)
                            parts.append(seg)

            parts.append(f.file_name)
            full_path = "/".join(parts)

            if full_path in seen_paths:
                raise ValueError(f"Download path collision: {full_path}")
            seen_paths.add(full_path)

            items.append(
                DownloadPlanItem(
                    file_id=f.file_id,
                    folder_id=f.folder_id,
                    path=full_path,
                    size_bytes=getattr(f, "file_size", None),
                    mime_type=getattr(f, "file_type", None),
                    integrity_hash=getattr(f, "integrity_hash", None),
                    is_encrypted=bool(getattr(f, "is_encrypted", True)),
                    encryption_metadata=getattr(f, "encryption_metadata", None),
                )
            )

        return FolderDownloadPlanResponse(
            created_at=datetime.utcnow(),
            roots=[],  
            items=items,
        )


    async def stream_encrypted_packages(
        self,
        session: AsyncSession,
        user_id: str,
        file_id: UUID,
        version_id: Optional[int] = None,
        verify_sha256: bool = True,
    ) -> tuple[DownloadTarget, Dict[str, str], AsyncIterator[bytes]]:
        target = await self.get_download_file(session, user_id, file_id, version_id)

        # Read and parse manifest JSON (created at upload finalize)
        manifest_text = await self.storage.read_text(target.file_path)
        try:
            manifest = json.loads(manifest_text)
        except Exception:
            # If you still have legacy single-path files, you can support them later.
            raise DownloadNotFoundError("Not a chunked manifest file")

        required = {"upload_id", "chunk_size", "total_chunks", "file_size", "file_type", "chunks"}
        if not required.issubset(manifest.keys()):
            raise DownloadNotFoundError("Invalid manifest")

        upload_id = str(manifest["upload_id"])
        chunk_size = int(manifest["chunk_size"])
        total_chunks = int(manifest["total_chunks"])
        file_size = int(manifest["file_size"])
        file_type = str(manifest["file_type"])
        chunks = list(manifest["chunks"])

        if not isinstance(chunks, list):
            raise DownloadNotFoundError("Invalid manifest: chunks must be a list")
        # Basic sanity
        if total_chunks <= 0 or len(chunks) != total_chunks:
            raise DownloadNotFoundError("Manifest chunk count mismatch")
        
        if verify_sha256 and target.integrity_hash:
            manifest_bytes = manifest_text.encode("utf-8") if isinstance(manifest_text, str) else manifest_text
            manifest_hash = hashlib.sha256(manifest_bytes).hexdigest()
            if manifest_hash != target.integrity_hash:
                raise DownloadCorruptionError("Manifest integrity hash mismatch (storage may be tampered)")

        # Stream headers (client can use these)
        headers = {
            "X-StormDrive-Upload-Id": upload_id,
            "X-StormDrive-Chunk-Size": str(chunk_size),
            "X-StormDrive-Total-Chunks": str(total_chunks),
            "X-StormDrive-File-Size": str(file_size),
            "X-StormDrive-Integrity-Hash": str(manifest.get("integrity_hash") or target.integrity_hash or ""),
        }

        async def iterator() -> AsyncIterator[bytes]:
            # Stream chunks in order (manifest already ordered, but we enforce)
            async def iterator() -> AsyncIterator[bytes]:
                for chunk_idx in range(total_chunks):
                    chunk_meta = chunks[chunk_idx]
                    rel_path = chunk_meta.get("c2_rel")
                    expected_sha = chunk_meta.get("sha256")

                    if not rel_path:
                        raise DownloadCorruptionError(f"Missing c2_rel for chunk {chunk_idx}")

                    # Read C2 from disk
                    c2 = await self.storage.read_bytes(rel_path)

                    try:
                        package = await anyio.to_thread.run_sync(self.wrapper.unwrapper, c2)
                    except ServerWrapError as e:
                        raise DownloadCorruptionError(f"Server unwrap failed at chunk {chunk_idx}: {e}") from e

                    # Parse + sanity-check the package
                    parsed = decode_chunk_package(package)
                    if int(parsed["chunk_index"]) != int(chunk_idx):
                        raise DownloadCorruptionError(
                            f"Chunk index mismatch: expected {chunk_idx}, got {parsed['chunk_index']}"
                        )

                    nonce = parsed["nonce"]
                    tag = parsed["tag"]
                    ciphertext = parsed["ciphertext"]

                    # Verify SHA-256 receipt (optional but recommended to enforce)
                    if verify_sha256:
                        if not expected_sha:
                            raise DownloadCorruptionError(f"Missing sha256 receipt for chunk {chunk_idx}")

                        aad = self.aad_bytes(
                            file_id=file_id,
                            chunk_idx=chunk_idx,
                            chunk_size=chunk_size,
                            file_size=file_size,
                            file_type=file_type,
                        )

                        h = hashlib.sha256()
                        h.update(aad)
                        h.update(nonce)
                        h.update(ciphertext)
                        h.update(tag)
                        computed = h.hexdigest()

                        if computed != expected_sha:
                            raise DownloadCorruptionError(
                                f"SHA256 mismatch at chunk {chunk_idx}: expected {expected_sha}, got {computed}"
                            )
                    yield package

        return target, headers, iterator()
    
    def dedupe_roots(self, xs: Iterable[int]) -> List[int]:
        out: List[int] = []
        seen: Set[int] = set()
        for x in xs or []:
            xi = int(x)
            if xi not in seen:
                seen.add(xi)
                out.append(xi)
        return out
    
    # This is ONLY for the virtual download root; it does not rename DB items.
    def disambiguate_names(self, names: List[str]) -> List[str]:
        used: Dict[str, int] = {}
        out: List[str] = []
        for n in names:
            base = (n or "").strip() or "Untitled"
            if base not in used:
                used[base] = 0
                out.append(base)
                continue
            used[base] += 1
            out.append(f"{base} ({used[base]})")
        return out
    
    async def build_folder_path(self,session:AsyncSession,user_id:str, root_folder_ids: List[int],include_root: bool = True,max_items: int = 100_000) -> FolderDownloadPlanResponse:
        root_folder_ids = self.dedupe_roots(root_folder_ids)
        if not root_folder_ids:
            raise ValueError("folder_ids is empty")
        
        if len(root_folder_ids) > 1:
            include_root = True

        roots = await self.folder_repo.get_active_folders_by_ids(session, user_id, root_folder_ids)
        if len(roots) != len(root_folder_ids):
            raise LookupError("One or more folders not found")
        
        roots_by_id = {f.folder_id: f for f in roots}
        ordered_roots = [roots_by_id[i] for i in root_folder_ids]

        root_names = [r.folder_name for r in ordered_roots]
        root_aliases = self.disambiguate_names(root_names)
        root_alias_by_id = {r.folder_id: alias for r, alias in zip(ordered_roots, root_aliases)}

        rows = await self.folder_repo.list_subtree_folders_by_roots(
            session,
            user_id,
            root_folder_ids=root_folder_ids,
            include_roots=True,
        )

        node_by_id: Dict[int, FolderNode] = {}
        for (root_id, folder_id, parent_id, folder_name, depth, hpath) in rows:
            node_by_id[int(folder_id)] = FolderNode(
                folder_id=int(folder_id),
                parent_id=(int(parent_id) if parent_id is not None else None),
                name=str(folder_name),
                root_id=int(root_id),
            )

        subtree_folder_ids = list(node_by_id.keys())
        if not subtree_folder_ids:
            raise LookupError("Folder subtree not found")
        
        files = await self.filerepo.list_files_in_folder(
            session,
            user_id=user_id,
            folder_ids=subtree_folder_ids,
            include_deleted=False,
        )

        if len(files) > max_items:
            raise ValueError(f"Too many files to download in one request ({len(files)}).")
        rel_cache: Dict[int, Tuple[str, ...]] = {}

        def rel_dir(folder_id: int) -> Tuple[str, ...]:
            if folder_id in rel_cache:
                return rel_cache[folder_id]

            node = node_by_id.get(folder_id)
            if node is None:
                # If data is inconsistent, keep it safe (no traversal outside)
                rel_cache[folder_id] = tuple()
                return rel_cache[folder_id]

            root_id = node.root_id

            parts: List[str] = []
            curr = folder_id
            guard = 0

            while True:
                guard += 1
                if guard > 10_000:
                    raise RuntimeError("Folder cycle detected")
                n = node_by_id.get(curr)
                if n is None:
                    break

                if curr == root_id:
                    if include_root:
                        parts.append(root_alias_by_id.get(root_id, n.name))
                    break

                parts.append(n.name)

                if n.parent_id is None:
                    break
                curr = n.parent_id

            parts.reverse()
            rel_cache[folder_id] = tuple(parts)
            return rel_cache[folder_id]
        items: List[DownloadPlanItem] = []
        seen_paths: Set[str] = set()

        for f in files:
            # Most of your files are folder-scoped, but keep safe for root-level files too.
            if f.folder_id is None:
                full_path = f.file_name
            else:
                dir_parts = rel_dir(int(f.folder_id))
                if dir_parts:
                    full_path = "/".join([*dir_parts, f.file_name])
                else:
                    full_path = f.file_name

            if full_path in seen_paths:
                full_path = f"{full_path} ({str(f.file_id)[:8]})"
            seen_paths.add(full_path)

            items.append(
                DownloadPlanItem(
                    file_id=f.file_id,
                    folder_id=f.folder_id,
                    path=full_path,
                    size_bytes=getattr(f, "file_size", None),
                    mime_type=getattr(f, "mime_type", None),
                    integrity_hash=getattr(f, "integrity_hash", None),
                    is_encrypted=bool(getattr(f, "is_encrypted", True)),
                    encryption_metadata=getattr(f, "encryption_metadata", None),
                )
            )

        return FolderDownloadPlanResponse(
            created_at=datetime.utcnow(),
            roots=[DownloadRoot(folder_id=r.folder_id, name=root_alias_by_id[r.folder_id]) for r in ordered_roots],
            items=items,
        )