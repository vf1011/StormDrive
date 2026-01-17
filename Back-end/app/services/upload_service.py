import base64
import hashlib
import json , struct
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.repositories.upload_session_repository import UploadSessionRepository
from app.repositories.upload_chunk_repository import UploadChunkRepository
from app.repositories.folder_repository import FolderRepository
from app.repositories.file_repository import FileRepository
from app.repositories.version_repository import VersionRepository

from app.domain.persistance.models.upload_models import UploadSession, UploadChunk
from app.security.server_wrapup import ServerCipherWrap
from app.storage.chunk_storage import ChunkStorage
from app.storage.chunk_package import encode_chunk_package
from app.services.event.websocket_manager import websocket_manager
from app.security.name_validator import _validate_name

from app.config.config import get_settings

logger = logging.getLogger(__name__)

class UploadConflictError(RuntimeError):
    pass

class UploadServices:
    C1_SCHEMA_VERSION = 1

    def __init__(self,session_repo:UploadSessionRepository, chunk_repo:UploadChunkRepository,ver_repo:VersionRepository,
                 storage:ChunkStorage,serverwrap:ServerCipherWrap,folder_repo:FolderRepository,file_repo:FileRepository,settings:None):
        self.session_repo = session_repo
        self.chunk_repo = chunk_repo
        self.storage = storage
        self.serverwrap = serverwrap
        self.folder_repo = folder_repo
        self.file_repo = file_repo
        self.ver_repo = ver_repo

        cfg = settings or get_settings()
        self.min_chunk = cfg.folder_min_chunk_bytes
        self.max_chunk = cfg.folder_max_chunk_bytes
        self.default_chunk = cfg.folder_default_chunk_bytes
        self.session_ttl_hours = cfg.folder_session_ttl_hours

    def chunk_size(self, requested: Optional[int]) -> int:
        if requested is None:
            return self.default_chunk
        return max(self.min_chunk, min(self.max_chunk, int(requested)))
    
    def total_chunk_size(self, file_size:int , chunk_size:int) -> int:
        if file_size == 0 :
            return 1
        return (file_size + chunk_size - 1) // chunk_size

    def aad_bytes(self, upload:UploadSession, chunk_idx:int)->bytes:
        enc_stream_id = str(upload.upload_id).encode("utf-8")
        prefix = f"SD:C1|v{self.C1_SCHEMA_VERSION}|".encode("utf-8")
        sep = b"|"

        idx_be = struct.pack(">I", int(chunk_idx))          
        cs_be  = struct.pack(">I", int(upload.chunk_size))    
        fs_utf8 = str(int(upload.file_size)).encode("utf-8") #file_size
        ft_utf8 = upload.file_type.encode("utf-8") #file_type

        return b"".join([prefix, enc_stream_id, sep, idx_be, cs_be, fs_utf8, sep, ft_utf8])

    def bitmap_b64(self, total_chunks: int, indices: list[int]) -> str:
        nbytes = (total_chunks + 7) // 8
        b = bytearray(nbytes)
        for i in indices:
            if 0 <= i < total_chunks:
                b[i // 8] |= (1 << (i % 8))
        return base64.b64encode(bytes(b)).decode("ascii") 
        

    async def init_session(self, session:AsyncSession,user_id:str,
                           file_name:str,file_size:int,file_type:str,
                           folder_id:Optional[int],chunk_size:Optional[int],replace_of_file_id:Optional[UUID] = None) -> UploadSession:
        file_name = _validate_name(file_name)
        chunk_size = self.chunk_size(chunk_size)
        total_size = self.total_chunk_size(file_size,chunk_size)

        if folder_id is not None:
            folder_obj = await self.folder_repo.get_active_folder(session, user_id=user_id, folder_id=folder_id)
            if folder_obj is None:
                raise FileNotFoundError("Folder not found.")
            
        upload = UploadSession(
            user_id = user_id,
            folder_id=folder_id,
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            chunk_size=chunk_size,
            total_chunks=total_size,
            status="UPLOADING",
            replace_of_file_id=replace_of_file_id,
            expires_at=UploadSession.default_expiry(self.session_ttl_hours),
        )
        await self.session_repo.create_session(session, upload)
        logger.info("upload:init", extra={"user_id": user_id, "upload_id": str(upload.upload_id), "total_chunks": total_size})
        return upload
    
    async def put_chunk(self, session:AsyncSession, user_id:str,upload_id:UUID,chunk_idx:int, ciphertxt:bytes, nonce_b64:str, tag_b64:str) -> Dict[str,Any]:
        upload = await self.session_repo.get_session(session,user_id=user_id,upload_id=upload_id)
        if not upload:
            raise FileNotFoundError("File not Found.")
        
        if upload.status != "UPLOADING":
            raise UploadConflictError(f"Upload session not accepting chunks (status={upload.status})")
        
        if chunk_idx < 0 or chunk_idx >= upload.total_chunks:
            raise ValueError("Chunk idx is out of bound.")
        
        if len(ciphertxt) > upload.chunk_size:
            raise ValueError("Chunk is too large.")
        
        if ciphertxt is None or len(ciphertxt) == 0:
            raise ValueError("Empty chunk body")
        
        if datetime.utcnow() > upload.expires_at:
            raise UploadConflictError("Upload session expired.")
        
        try:
            nonce = base64.b64decode(nonce_b64)
            tag = base64.b64decode(tag_b64)
        except Exception:
            raise ValueError("Invalid base64 for nonce or tag.")
        
        if len(tag) not in (16,32):
            raise ValueError("Invalid tag length")
        
        aad = self.aad_bytes(upload,chunk_idx=chunk_idx)
        sha_hash = hashlib.sha256(aad + nonce + ciphertxt + tag).hexdigest()

        existing = await self.chunk_repo.get_chunk(session, upload_id, chunk_idx)
        if existing:
            if existing.sha256 == sha_hash:
                return {"chunk_index": chunk_idx, "status": "duplicate-ok"}
            raise UploadConflictError("Chunk data mismatch for this index (restart upload)")
        
        package = encode_chunk_package(chunk_idx, nonce=nonce, tag=tag, ciphertext=ciphertxt)
        cipher2 = self.serverwrap.wrapper(package, aad=self.serverwrap.AAD_WRAP)

        storageKey = await self.storage.save_chunk_c2(user_id=user_id,upload_id=str(upload_id),chunk_index=chunk_idx,sha256_hex=sha_hash,cipher2_bytes=cipher2)

        obj = UploadChunk(
            upload_id = upload_id,
            chunk_index = chunk_idx,
            total_size = len(ciphertxt),
            sha256 = sha_hash,
            storage_key = storageKey,
            created_at = datetime.utcnow() 
        )

        try:
            async with session.begin_nested():
                await self.chunk_repo.insert(session, obj)
        except IntegrityError:
            existing2 = await self.chunk_repo.get_chunk(session, upload_id, chunk_idx)
            if existing2 and existing2.sha256 == sha_hash:
                return {"chunk_index": chunk_idx, "status": "duplicate-ok"}
            raise UploadConflictError("Chunk index already exists with different data")

        return {"chunk_index": chunk_idx, "status": "stored"}
    
    async def status(self, session: AsyncSession, user_id: str, upload_id: UUID) -> Dict[str, Any]:
        upload = await self.session_repo.get_session(session, user_id, upload_id)
        if not upload:
            raise FileNotFoundError("Upload session not found")

        indices = await self.chunk_repo.last_indices(session, upload_id)
        received_count = len(indices)

        res: Dict[str, Any] = {
            "upload_id": upload_id,
            "status": upload.status,
            "chunk_size": upload.chunk_size,
            "total_chunks": upload.total_chunks,
            "received_count": received_count,
        }

        if upload.total_chunks <= 5000:
            res["received_indices"] = indices
        else:
            res["received_bitmap_b64"] = self.bitmap_b64(upload.total_chunks, indices)

        return res
    
    async def finalize(self, session:AsyncSession, user_id:str, upload_id:UUID,
                       wrapped_fk_b64: str,replace_of_file_id: Optional[UUID],
                       file_name: Optional[str],file_type: Optional[str],
                       folder_id: Optional[int],encryption_metadata: Optional[Dict[str, Any]]) -> tuple[UUID,int,int,str]:
        upload = await self.session_repo.get_session(session, user_id=user_id, upload_id=upload_id)
        if not upload:
            raise FileNotFoundError("Upload session not found")

        if datetime.utcnow() > upload.expires_at:
            raise UploadConflictError("Upload session expired")

        replace_id = replace_of_file_id or getattr(upload, "replace_of_file_id", None)

        final_name = _validate_name(file_name) if file_name else upload.file_name
        final_type = file_type or upload.file_type
        final_folder_id = folder_id if folder_id is not None else upload.folder_id

        if final_folder_id is not None:
            folder_obj = await self.folder_repo.get_active_folder(session, user_id=user_id, folder_id=final_folder_id)
            if folder_obj is None:
                raise FileNotFoundError("Folder not found")
            
        receipts = await self.chunk_repo.list_receipts_ordered(session, upload_id)
        if len(receipts) != upload.total_chunks:
            raise UploadConflictError("Not all chunks received") 

        concat = "".join([r.sha256 for r in receipts]).encode("utf-8")
        integrity_hash = hashlib.sha256(concat).hexdigest()

            
        meta: Dict[str, Any] = {
            "wrapped_fk_b64": wrapped_fk_b64,
            "upload_id": str(upload_id),
            "chunk_size": upload.chunk_size,
            "total_chunks": upload.total_chunks,
            "aad_spec": "upload_id|chunk_index|chunk_size|file_size|file_type",
        }
        if encryption_metadata:
            meta.update(encryption_metadata)

        manifest ={
            "upload_id": str(upload_id),
            "chunk_size": upload.chunk_size,
            "total_chunks": upload.total_chunks,
            "file_size": upload.file_size,
            "file_type": final_type,
            "integrity_hash": integrity_hash,
            "chunks": [{"i": r.chunk_index, "k": r.storage_key, "h": r.sha256, "s": r.size} for r in receipts],
        }

        async with session.begin_nested():
            await self.session_repo.set_status(session, user_id=user_id, upload_id=upload_id, status="FINALIZING")

            if replace_id:
                file_obj = await self.file_repo.get_active_file(session,user_id=user_id,file_id=replace_id)
                if not file_obj:
                        raise FileNotFoundError("Replace target file not found")

                curr_ver_num = int(getattr(file_obj, "version_number", 1) or 1)
                new_version_number = curr_ver_num + 1

                manifest_path = await self.storage.save_blueprint(user_id=user_id, file_id=str(file_obj.file_id), manifest_json=json.dumps(manifest))

                await self.file_repo.update_file_after_upload_complete(
                        session,
                        file_obj,
                        file_name=final_name,
                        file_type=final_type,
                        folder_id=final_folder_id,
                        file_size=upload.file_size,
                        file_path=manifest_path,
                        integrity_hash=integrity_hash,
                        encryption_metadata=json.dumps(meta),
                        is_encrypted=True,
                        version_number=new_version_number,
                    )

                ver = await self.ver_repo.create_version(session,
                                               original_file_id=file_obj.file_id,
                                               file_name=file_obj.file_name,
                                               file_path=file_obj.file_path,file_type=file_obj.file_type,
                                               integrity_hash=file_obj.integrity_hash,
                                               encryption_metadata=file_obj.encryption_metadata,
                                               version_number=new_version_number)

                await self.file_repo.set_head_version(session,file_obj=file_obj,version_id=ver.version_id)
                await self.session_repo.set_status(session, user_id, upload_id, "COMPLETE")

                try:
                    await websocket_manager.broadcast_to_user(
                        user_id,
                        {"event": "file-replaced", "data": {"file_id": str(file_obj.file_id), "version": new_version_number}},
                    )
                except Exception:
                    logger.exception("upload:finalize websocket failed", extra={"user_id": user_id})

                return file_obj.file_id, ver.version_id, new_version_number, integrity_hash
            
            else:
                file_obj = await self.file_repo.create_file(
                        session,
                        user_id=user_id,
                        file_name=final_name,
                        file_path="",  # set after blueprint write
                        file_size=upload.file_size,
                        file_type=final_type,
                        folder_id=final_folder_id,
                        integrity_hash=integrity_hash,
                        encryption_metadata=json.dumps(meta),
                        is_encrypted=True,
                        version_number=1,
                )

                manifest_path = await self.storage.save_blueprint(user_id=user_id, file_id=str(file_obj.file_id), manifest_json=json.dumps(manifest))
                await self.file_repo.set_file_path(session, file_obj, file_path=manifest_path)

                ver = await self.ver_repo.create_version(
                        session,
                        user_id=user_id,
                        original_file_id=file_obj.file_id,
                        file_name=final_name,
                        file_path=manifest_path,
                        file_type=final_type,
                        file_size=upload.file_size,
                        integrity_hash=integrity_hash,
                        encryption_metadata=json.dumps(meta),
                        version_number=1,
                )

                await self.file_repo.set_head_version(session, file_obj, version_id=ver.version_id)
                await self.session_repo.set_status(session, user_id, upload_id, "COMPLETE")

            try:
                await websocket_manager.broadcast_to_user(
                    user_id,
                    {"event": "file-uploaded", "data": {"file_id": str(file_obj.file_id), "file_name": file_obj.file_name}},
                )
            except Exception:
                logger.exception("upload:finalize websocket failed", extra={"user_id": user_id})

            return file_obj.file_id, ver.version_id, 1, integrity_hash