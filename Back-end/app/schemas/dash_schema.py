from pydantic import BaseModel , Field
from typing import List, Optional , Dict, Any, ClassVar
from uuid import UUID
from datetime import datetime
from pydantic import ConfigDict

class DefaultFolderEntry(BaseModel):
    folder_name: str
    parent_folder_id: Optional[int] = None  # root = None/0
    key_version: int = 1

    wrapped_fok_b64: str
    wrapp_nonce_b64: str
    wrapp_tag_b64: Optional[str] = None
    wrapp_algo: str = "AES-256-GCM"
    version: int = 1

class BootstrapDefaultFoldersRequest(BaseModel):
    entries: List[DefaultFolderEntry]
    
class UploadRequest(BaseModel):
    file_name: str
    file_type: str 
    file_size: int 
    folder_id: Optional[int]

    chunk_size: Optional[int]

class UploadResponse(BaseModel):
    upload_id: UUID
    chunk_size: int
    total_chunks: int
    expires_at: str

class UploadStatusResponse(BaseModel):
    upload_id: UUID
    status: str
    chunk_size: int
    total_chunks: int
    received_count: int

    received_indices: Optional[List[int]] = None
    received_bitmap_b64: Optional[str] = None

class FinalUploadRequest(BaseModel):
    wrapped_fk_b64: str 

    replace_of_file_id: Optional[UUID] = None

    file_name: Optional[str] = None
    file_type: Optional[str] = None
    folder_id: Optional[int] = None

    encryption_metadata: Optional[Dict[str, Any]] = None

class FinalUploadResponse(BaseModel):
    file_id: UUID
    version_id: int
    version_number: int
    integrity_hash: str

class FolderUploadEntry(BaseModel):
    folder_path: str 
    file_size: Optional[int] 
    file_type: Optional[str]

class FolderUploadRequest(BaseModel):
    root_folder_name: str 
    parent_folder_id: Optional[int] = None

    entries: List[FolderUploadEntry] 
    chunk_size: Optional[int] 

class FolderUploadChildFile(BaseModel):
    rel_path: str
    file_name: str
    folder_id: int
    upload_id: UUID
    chunk_size: int
    total_chunks: int

class FolderUploadResponse(BaseModel):
    folder_upload_id: UUID
    root_folder_id: int
    root_folder_name: str
    total_files: int
    expires_at: str
    files: List[FolderUploadChildFile]

class FolderUploadChildStatus(BaseModel):
    rel_path: str
    file_name: str
    upload_id: UUID
    folder_id: int
    total_chunks: int
    received_count: int
    upload_status: str


class FolderUploadStatusResponse(BaseModel):
    folder_upload_id: UUID
    status: str
    root_folder_id: int
    total_files: int
    completed_files: int
    expires_at: str

    childs: Optional[List[FolderUploadChildStatus]] = None 

class FileDownloadRequest(BaseModel):
    file_id:UUID
    version_id : Optional[int]
    verify_sha : bool = True

class FolderDownloadPlanRequest(BaseModel):
    folder_ids: List[int] 
    include_root: bool = True 

class DownloadRoot(BaseModel):
    folder_id: int
    name: str 

class DownloadPlanItem(BaseModel):
    file_id: UUID
    folder_id: Optional[int] = None
    path: str
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    integrity_hash: Optional[str] = None  # whole-file SHA-256 if you store it
    is_encrypted: bool = True
    encryption_metadata: Optional[Dict] = None

class FolderDownloadPlanResponse(BaseModel):
    created_at: datetime
    roots: List[DownloadRoot]
    items: List[DownloadPlanItem]


class FileRenameRequest(BaseModel):
    file_id: UUID
    new_file_name: str

class FileRenameResponse(BaseModel):
    success: bool
    message: str
    file_id: UUID
    new_file_name: str 

class FolderRenameRequest(BaseModel):
    folder_id: int
    new_folder_name: str 

class FolderRenameResponse(BaseModel):
    success: bool
    message: str
    folder_id: int
    new_folder_name: str

class ActionResponse(BaseModel):
    success : bool
    message : str
    action : str

class MultipleFileMoveRequest(BaseModel):
    file_ids: List[UUID]
    new_folder_id: Optional[int]

class MultipleFileMoveResponse(BaseModel):
    success: bool
    message: str
    moved_files: List[dict]
    failed_files: List[dict]

class MultipleFolderMoveRequest(BaseModel):
    folder_ids: List[int]
    target_folder_id: Optional[int]

class MultipleFolderMoveResponse(BaseModel):
    success: bool
    message: str
    moved_folders: List[dict]
    failed_folders: List[dict]

class MultipleFileCopyRequest(BaseModel):
    file_ids: List[UUID]
    new_folder_id: Optional[int]

class MultipleFileCopyResponse(BaseModel):
    success: bool
    message: str
    copied_files: List[dict]
    failed_files: List[dict]

class MultipleFolderCopyRequest(BaseModel):
    folder_ids: List[int]
    new_folder_id: Optional[int]

class MultipleFolderCopyResponse(BaseModel):
    success: bool
    message: str
    copied_folders: List[dict]
    failed_folders: List[dict]

class MultipleFileDeleteRequest(BaseModel):
    file_ids: List[UUID]

class MultipleFileDeleteResponse(BaseModel):
    success : bool
    message: str
    deleted_files: List[dict]
    failed_files: List[dict]

class MultipleFileRestoreRequest(BaseModel):
    file_ids: List[UUID]

class MultipleFileRestoreResponse(BaseModel):
    success: bool
    message: str
    restored_files: List[dict]
    failed_files: List[dict]

class MultipleFilePermDeleteRequest(BaseModel):
    file_ids: List[UUID]

class MultipleFilePermDeleteResponse(BaseModel):
    success: bool
    message: str
    deleted_files: List[Dict[str, Any]]
    failed_files: List[Dict[str, str]]

class MultipleFolderDeleteRequest(BaseModel):
    folder_ids: List[int]

class MultipleFolderDeleteResponse(BaseModel):
    success : bool
    message: str
    deleted_folders: List[dict]
    failed_to_delete_folders: List[dict]

class MultipleFolderPermDeleteRequest(BaseModel):
    folder_ids: List[int]

class MultipleFolderPermDeleteResponse(BaseModel):
    success: bool
    message: str
    deleted_folders: List[dict]
    failed_folders: List[dict]

class MultipleFolderRestoreRequest(BaseModel):
    folder_ids: List[int]

class MultipleFolderRestoreResponse(BaseModel):
    success: bool
    message: str
    restored_folders: List[dict]
    failed_folders: List[dict]

class FileVersion(BaseModel):
    original_file_id : UUID
    file_name : str
    file_path : str
    file_size : int 

class FileVersionHistory(FileVersion):
    version_id : int
    created_at : datetime
    model_config = ConfigDict(from_attributes=True)

class FileVersionResponse(BaseModel):
    success: bool
    message: str
    file_versions: List[FileVersionHistory]
    file_id : UUID

class FileStorageStatsResponse(BaseModel):
    success: bool
    message: str
    total_storage: int
    total_used_storage: int
    available_storage: int
    used_storage_percentage: float
    active_files: Dict[str, Any]
    recycle_bin: Dict[str, Any]
    storage_info: Dict[str, Any]

class FileStorageBreakdownResponse(BaseModel):
    success: bool
    message: str
    active_files_breakdown: Dict
    recycle_bin_breakdown: Dict
    total_size_bytes: int
    total_size_gb: float

class CheckStorageRequest(BaseModel):
    file_size: int

class CheckStorageResponse(BaseModel):
    success: bool
    message: str
    allow_upload: bool
    storage_info: Dict[str, Any]

class FolderStorageRequest(BaseModel):
    folder_id: int

class FolderStorageResponse(BaseModel):
    success: bool
    message: str
    folder_id: int
    folder_name: str
    total_size_bytes: int
    total_size_mb: float
    total_size_gb: float

class FileSearchItem(BaseModel):
    file_id: str
    file_name: str
    file_type: Optional[str] = None
    folder_id: Optional[int] = None
    is_shared: bool = False
    created_at: Optional[datetime] = None

class FolderSearchItem(BaseModel):
    folder_id: int
    folder_name: str
    parent_folder_id: Optional[int] = None
    is_shared: bool = False
    created_at: Optional[datetime] = None

class SearchResponse(BaseModel):
    success: bool
    message: str
    files: List[FileSearchItem] 
    folders: List[FolderSearchItem]

class MultiFilePlanRequest(BaseModel):
    file_ids: List[UUID]
    include_parent_paths: bool = True
    include_virtual_root: bool = False

class EncFolderKeys(BaseModel):
    wrapped_fk_b64: str
    nonce_fk_b64: str
    wrapped_fok_b64: str
    nonce_fok_b64: str
    wrap_alg: str = "AESGCM"

class BootstrapFolderNode(BaseModel):
    folder_uid: UUID
    name: str
    parent_folder_uid: Optional[UUID] = None
    enc: EncFolderKeys

class BootstrapDefaultsRequest(BaseModel):
    root: BootstrapFolderNode
    children: List[BootstrapFolderNode] = Field(default_factory=list)

class BootstrapDefaultsResponse(BaseModel):
    root_folder_uid: UUID
    created_folder_uids: List[UUID]
    existing_folder_uids: List[UUID]