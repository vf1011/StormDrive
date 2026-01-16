import uuid
from datetime import datetime, timedelta
import uuid 

from sqlalchemy import (
    Column, String, DateTime, Integer, BigInteger, ForeignKey,
    CheckConstraint, Index, UniqueConstraint, Text
)

from app.domain.persistance.database import Base
from sqlalchemy.dialects.postgresql import UUID


class UploadSession(Base):
    __tablename__ = "upload_sessions"
    
    upload_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)

    user_id = Column(String, nullable = False,index=True)
    folder_id = Column(Integer, ForeignKey("folders.folder_id", ondelete="SET NULL"), nullable=True, index=True)

    file_name = Column(String(255), nullable=False)
    file_type = Column(String(128), nullable=False)
    file_size = Column(BigInteger, nullable=False)

    chunk_size = Column(Integer, nullable=False)
    total_chunks = Column(Integer, nullable=False)

    status = Column(String(32), nullable=False, default="UPLOADING", index=True)
    replace_of_file_id = Column(UUID(as_uuid=True), nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    __table_args__ = (CheckConstraint("file_size >=0 ", name="check_upload_file_size_non_negative"),
                      CheckConstraint("chunk_size >=0", name="check_upload_chunk_size_positive"),
                      CheckConstraint("total_chunks >0", name="check_total_chunks_size_positive"),
                      Index("idx_sessions_user_status", "user_id", "status"))
    
    @staticmethod
    def default_expiry(hours: int = 24) -> datetime:
        return datetime.utcnow() + timedelta(hours=hours)
    
class UploadChunk(Base):
    __tablename__ = "upload_chunks"

    upload_id = Column(UUID(as_uuid=True), ForeignKey("upload_sessions.upload_id", ondelete="CASCADE"), primary_key=True)
    chunk_index = Column(Integer, primary_key=True)

    total_size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False, index=True)  
    storage_key = Column(String(2048), nullable=False)       

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("chunk_index >= 0", name="check_upload_chunk_index_non_negative"),
        CheckConstraint("total_size >= 0", name="check_upload_chunk_size_non_negative"),
        UniqueConstraint("upload_id", "chunk_index", name="uq_upload_id_chunk_index"),
        Index("idx_upload_chunks_upload", "upload_id"),
    )

class UploadFolderSession(Base):
    __tablename__ = "upload_folder_sessions"

    folder_upload_id = Column(UUID(as_uuid=True),primary_key=True,default=uuid.uuid4, nullable=False)

    user_id = Column(String, nullable=False, index=True)
    parent_folder_id = Column(Integer, ForeignKey("folders.folder_id", ondelete="SET NULL"), nullable=True, index=True)
    root_folder_id = Column(Integer, ForeignKey("folders.folder_id", ondelete="SET NULL"), nullable=True, index=True)

    root_folder_name = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="UPLOADING", index=True)

    total_files = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    __table_args__ = (
        CheckConstraint("total_files >= 0", name="check_folder_upload_total_files_non_negative"),
        Index("idx_folder_upload_user_status", "user_id", "status"),
    )

    @staticmethod
    def default_expiry(hours: int = 24) -> datetime:
        return datetime.utcnow() + timedelta(hours=hours)

class UploadItems(Base):
    __tablename__ = "upload_folder_items"

    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)

    folder_upload_id = Column(UUID(as_uuid=True), ForeignKey("upload_folder_sessions.folder_upload_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, nullable=False, index=True)

    rel_path = Column(Text, nullable=False)  
    folder_id = Column(Integer, ForeignKey("folders.folder_id", ondelete="SET NULL"), nullable=True, index=True)

    file_name = Column(String(255), nullable=False)
    file_type = Column(String(128), nullable=False)
    file_size = Column(Integer, nullable=False)

    upload_id = Column(UUID(as_uuid=True), ForeignKey("upload_sessions.upload_id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String(32), nullable=False, default="PENDING", index=True)  # PENDING/UPLOADING/COMPLETE/FAILED

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_folder_upload_items_fu", "folder_upload_id"),
        Index("idx_folder_upload_items_fu_status", "folder_upload_id", "status"),
    )