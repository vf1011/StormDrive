from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey , BigInteger , Text , JSON , Enum , Index , CheckConstraint
from sqlalchemy.orm import relationship , validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR
from datetime import datetime , timedelta
from app.domain.persistance.database import Base          
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
import uuid
import re


#  File Model 
class File(Base):
    __tablename__ = 'files'
    
    user_id = Column(String, nullable=False , index=True)
    file_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)

    file_name = Column(String(255), nullable=False)
    file_path = Column(String(2048), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_type = Column(String(128), nullable=False)

    folder_id = Column(Integer, ForeignKey('folders.folder_id' , ondelete="SET NULL"), nullable=True, index=True)

    is_shared = Column(Boolean, default=False,nullable=False)
    is_deleted = Column(Boolean, default=False,nullable=False,index=True)
    is_encrypted = Column(Boolean, default=False,nullable=False)

    uploaded_at = Column(DateTime, default=datetime.utcnow(), nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow(), onupdate=datetime.utcnow())

    integrity_hash = Column(String(255), nullable=False)
    encryption_metadata = Column(Text, nullable=True)

    tags = Column(ARRAY(String(128)), nullable=False, default=list)
    search_vector = Column(TSVECTOR, nullable=False, index=True, default="")

    version_number = Column(Integer, default=1, nullable=False)
    parent_file_version_id = Column(Integer, ForeignKey('file_versioning.version_id'), nullable=True, index=True)

    __table_args__ = (

        Index('idx_files_user_folder' , 'user_id' ,  'folder_id'),
        Index('idx_files_user' , 'user_id' , 'file_id'),
        Index('idx_files_user_delete', 'user_id', 'is_deleted'),
        Index('idx_files_user_tags', 'tags', postgresql_using='gin'),
        Index('idx_files_user_search', 'search_vector', postgresql_using='gin'),
        Index('idx_files_user_uploaded','user_id','uploaded_at'),

        CheckConstraint('file_size >= 0', name='check_file_size_non_negative'),
        CheckConstraint('version_number >= 1', name='check_version_number_positive'),
        CheckConstraint('length(file_type) <= 128',name='check_file_type_length'),
        CheckConstraint("(is_deleted = true AND deleted_at IS NOT NULL)  OR (is_deleted = false)", name="check_delete_at_null_when_deleted"),
    )

    folder = relationship('Folder', back_populates='files')
    versions = relationship('FileVersioning', back_populates='original_file', primaryjoin="File.file_id==foreign(FileVersioning.original_file_id)", cascade="all, delete-orphan")
    download_files = relationship("DownloadFile", primaryjoin="File.file_id==foreign(DownloadFile.file_id)", viewonly=True)

    @validates('file_name')
    def validate_file_name(self, key, file_name):
        if not file_name or not file_name.strip():
            raise ValueError("File name cannot be empty")
        
        forbidden_names = {'con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 
                          'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 
                          'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'}
        
        name_without_extension = file_name.split('.')[0].lower()
        if name_without_extension in forbidden_names:
            raise ValueError(f"File name '{file_name}' is not allowed.")
        
        return file_name

    @validates('tags')
    def validate_tags(self, key , tags):
        if not tags:
            return []
        
        if len(tags) > 20:
            raise ValueError("Too many tags (maximum 20)")
        
        validated_tags = []
        for tag in tags:
            if isinstance(tag, str):
                tag = tag.strip()
                if tag and len(tag) <= 50: 
                    # Remove special characters from tags
                    clean_tag = re.sub(r'[^\w\s-]', '', tag)
                    if clean_tag:
                        validated_tags.append(clean_tag)
        
        return validated_tags[:20]
        
    def to_dict(self,include_sensitive_data : bool = False):
        data = {
            "file_id": str(self.file_id),
            "file_name": self.file_name,   
            "file_path": self.file_path,
            "file_size": self.file_size,
            "file_type": self.file_type,
            "folder_id": self.folder_id,
            "is_shared": self.is_shared,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "delete_at": self.delete_at.isoformat() if self.delete_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_deleted": self.is_deleted,
            "tags": self.tags if self.tags else [],  # Handle potential None values
            "search_vector": self.search_vector if self.search_vector else None,
            "version_number": self.version_number,
        }
        if include_sensitive_data:
            data.update({
                "user_id": self.user_id,
                "is_encrypted": self.is_encrypted,
                "integrity_hash": self.integrity_hash,
                "encryption_metadata": self.encryption_metadata,
            })

        return data

#  Folder Model 
class Folder(Base):
    __tablename__ = 'folders'
    
    folder_id = Column(Integer, primary_key=True,autoincrement=True)
    user_id = Column(String , nullable=False , index=True)

    folder_name = Column(String(255), nullable=False)

    parent_folder_id = Column(Integer, ForeignKey('folders.folder_id', ondelete='CASCADE'), nullable=True)
    heirarchy_path = Column(Text, nullable=True)
    depth_level = Column(Integer, default=0, nullable=False)

    is_shared = Column(Boolean, default=False,nullable=False)
    is_deleted = Column(Boolean, default=False,nullable=False,index=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    folder_uid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        default=uuid.uuid4,
    )

    parent_folder = relationship('Folder', remote_side=[folder_id], back_populates="subfolders")
    files = relationship('File', back_populates='folder', cascade="all, delete-orphan")
    subfolders = relationship('Folder', back_populates='parent_folder', cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_folders_user_parent', 'user_id', 'parent_folder_id'),
        Index('idx_folders_user', 'user_id', 'folder_id'),
        Index('idx_folders_user_deleted', 'user_id', 'is_deleted'),

        CheckConstraint('depth_level >= 0', name='check_depth_level_non_negative'),
        CheckConstraint('length(folder_name) <= 255', name='check_folder_name_length'),
        CheckConstraint('folder_id != parent_folder_id', name='check_no_self_parenting'),
        CheckConstraint("(is_deleted = true AND deleted_at IS NOT NULL)  OR (is_deleted = false)", name="check_deleted_at_null_when_deleted"),
    )

    
    @validates('folder_name')
    def validate_folder_name(self,key,folder_name):
        if not folder_name or not folder_name.strip():
            raise ValueError("Folder name cannot be empty")
        
        return folder_name
    def to_dict(self, include_sensitive_data: bool = False):
        """Convert folder object to dictionary"""
        data = {
            "folder_id": self.folder_id,
            "folder_name": self.folder_name,
            "is_shared": self.is_shared,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_sensitive_data:
            data.update({
                "user_id": self.user_id,
                "is_deleted": self.is_deleted,
                "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
                "depth_level": self.depth_level,
                "heirarchy_path": self.heirarchy_path,
            })

        return data
    
class FolderKeys(Base):
    __tablename__ = "folder_keys"

    folder_id: Mapped[int] = mapped_column(ForeignKey("folders.folder_id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    wrapped_fk: Mapped[bytes] = mapped_column(nullable=False)
    nonce_fk: Mapped[bytes] = mapped_column(nullable=False)

    wrapped_fok: Mapped[bytes] = mapped_column(nullable=False)
    nonce_fok: Mapped[bytes] = mapped_column(nullable=False)

    wrap_alg: Mapped[str] = mapped_column(Text, nullable=False, default="AESGCM")
    wrapped_by_folder_id: Mapped[int | None] = mapped_column(ForeignKey("folders.folder_id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)


#  Recycle Bin 
class RecycleBin(Base):
    __tablename__ = 'recycle_bin'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)

    item_type = Column(Enum("file","folder",name="recycle_item_type"), nullable=False)

    file_id = Column(UUID(as_uuid=True),nullable=True)
    folder_id = Column(Integer,nullable=True)
    parent_folder_id = Column(Integer, ForeignKey('folders.folder_id'), nullable=True)

    item_name = Column(String(255), nullable=False)
    item_path = Column(String(2048), nullable=False)

    file_size = Column(BigInteger, nullable=False)
    file_type = Column(String(128), nullable=False)
    integrity_hash = Column(String(255), nullable=False)
    tags = Column(ARRAY(String(128)), nullable=False, default=list)

    deleted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_by_action = Column(String(255), nullable=True)

    scheduled_deletion_at = Column(DateTime, 
                                   nullable=False,
                                   default=lambda: datetime.utcnow() + timedelta(days=30))  # deleted_at + 30 days
    
    search_vector = Column(TSVECTOR, nullable=True,default="")

    restore_attempts = Column(Integer, default=0 , nullable=False)
    
    __table_args__ = (
        Index('idx_recycle_user_item', 'user_id', 'item_type'),
        Index('idx_recycle_user_file', 'user_id', 'file_id'),
        Index('idx_recycle_user_folder', 'user_id', 'folder_id'),
        Index('idx_recycle_user_deleted', 'user_id', 'deleted_at'),
        Index('idx_recycle_user_search','search_vector', postgresql_using='gin'),

        CheckConstraint('restore_attempts >= 0', name='check_restore_attempts_non_negative'),
        CheckConstraint("(item_type = 'file' AND file_size IS NOT NULL) OR (item_type = 'folder')", name="check_item_type_ids")
    )
    

# #  SharedLink 
# class SharedLink(Base):
#     __tablename__ = 'share_links'

#     share_id = Column(UUID(as_uuid=True), primary_key=True,default=uuid.uuid4)
#     user_id = Column(String, nullable=False, index=True)

#     file_id = Column(UUID(as_uuid=True), ForeignKey('files.file_id' , ondelete="CASCADE"), nullable=True)
#     folder_id = Column(Integer, ForeignKey('folders.folder_id' , ondelete="CASCADE"), nullable=True)

#     file_name = Column(String(255), nullable=False)
#     share_url = Column(String(512), nullable=False)

#     created_at = Column(DateTime, default=datetime.utcnow,nullable=False)
#     expires_at = Column(DateTime, nullable=False)
#     is_active = Column(Boolean, default=True, nullable=False)
    
#     permission = Column(
#         Enum("view" , "download" , name = "share_permission"),
#         nullable=False , default= "view")
    
#     download_limit = Column(Integer, nullable=True)
#     download_count = Column(Integer, default=0 , nullable=False)
#     view_limit = Column(Integer, nullable=True)
#     view_count = Column(Integer, default=0 , nullable=False)

#     hash_password = Column(String , nullable=True)

#     last_accessed_at = Column(DateTime, nullable=True)
#     last_accessed_ip = Column(String(45), nullable=True)
#     access_log_enabled = Column(Boolean, default=True, nullable=False)

#     blocked_ips = Column(ARRAY(String(45)), nullable=True, default=list)
#     allowed_countries = Column(ARRAY(String(2)), nullable=True, default=list)


#     __table_args__ = (
#         Index('idx_share_user_share' , 'user_id' , 'share_id'),
#         Index('idx_share_user_file' , 'user_id' , 'file_id'),
#         Index('idx_share_user_folder' , 'user_id' , 'folder_id'),
#         Index('idx_share_user_active' , 'user_id' , 'is_active' , 'expires_at'),

#         CheckConstraint('("download_count" >= 0)', name='check_download_count_non_negative'),
#         CheckConstraint('("view_count" >= 0)', name='check_view_count_non_negative'),
#         CheckConstraint('("download_limit" IS NULL OR "download_limit" > 0)', name='check_download_limit_positive'),
#         CheckConstraint('("view_limit" IS NULL OR "view_limit" > 0)', name='check_view_limit_positive'),
#         CheckConstraint('("hash_password" IS NULL OR length("hash_password") > 0)', name='check_hash_password_non_empty'),
#     )

#     @validates('expires_at')
#     def validate_expires_at(self, key,expires_at):
#         if expires_at <= datetime.utcnow():
#             raise ValueError("Expiration date must be in the future")
        
#         max_expires = datetime.utcnow() + timedelta(days=30) # 30 days max
#         if expires_at > max_expires:
#             raise ValueError("Expiration date too far in the future")
#         return expires_at

#     @hybrid_property
#     def is_expired(self):
#         """Check if share link has expired"""
#         return datetime.utcnow() > self.expires_at

#     @hybrid_property
#     def is_password_protected(self):
#         """Check if share requires password"""
#         return self.hash_password is not None

#     @hybrid_property
#     def download_available(self):
#         """Check if more downloads are available"""
#         return self.download_limit is None or self.download_count < self.download_limit

#     @hybrid_property
#     def view_available(self):
#         """Check if more views are available"""
#         return self.view_limit is None or self.view_count < self.view_limit

#     def can_access(self, ip_address: str = None, country_code: str = None) -> bool:
#         """Check if access is allowed from given location"""
#         if not self.is_active or self.is_expired:
#             return False
        
#         # Check IP blocks
#         if self.blocked_ips and ip_address in self.blocked_ips:
#             return False
        
#         # Check country restrictions
#         if self.allowed_countries and country_code not in self.allowed_countries:
#             return False
        
#         return True

 
class DownloadFile(Base):
    __tablename__ = 'download_files'

    download_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(100), nullable=True)  
    user_agent = Column(String(255), nullable=True)  

    file = relationship("File", primaryjoin="foreign(DownloadFile.file_id)==File.file_id", viewonly=True,back_populates="download_files")

    __table_args__ = (
        Index('idx_download_user_file' , 'user_id' , 'file_id'),
        Index('idx_download_user_ip' , 'user_id' , 'ip_address' ,'timestamp')
    )

#storage
class Storage(Base):
    __tablename__ = 'storage'
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)

    total_storage = Column(BigInteger, nullable=False)
    storage_used = Column(Integer, nullable=False)

    plan_type = Column(Enum("free", "basic", "premium" , name = "storage_plans"), default="free") # free, basic, premium
    is_premium = Column(Boolean, default=False)

    quota_warning_sent = Column(Boolean, default=False, nullable=False)
    last_quota_check = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index('idx_storage_user' , 'user_id' , 'created_at'),
        Index('idx_storage_user_plan' , 'user_id' , 'plan_type'),
        Index('idx_storage_user_storage' , 'user_id' , 'storage_used'),

        CheckConstraint('total_storage > 0', name='check_total_storage_positive'),
        CheckConstraint('storage_used >= 0', name='check_storage_used_positive'),
        CheckConstraint('storage_used <= total_storage', name='check_storage_within_limit')
    )

    @hybrid_property
    def available_storage(self):
        """Calculate available storage"""
        return self.total_storage - self.storage_used
    
    @hybrid_property
    def storage_usage_percentage(self):
        """Calculate storage usage percentage"""
        if self.total_storage == 0:
            return 0
        return (self.storage_used / self.total_storage) * 100
    
    @hybrid_property
    def is_near_quota(self):
        """Check if storage is near quota (80% threshold)"""
        return self.storage_usage_percentage >= 80
    
    @hybrid_property
    def is_over_quota(self):
        """Check if storage is over quota"""
        return self.storage_used >= self.total_storage


class undoRedoActions(Base):
    __tablename__ = 'undo_redo_actions'

    action_id = Column(Integer, primary_key=True)
    user_id = Column(String, nullable=False, index=True)

    action_type = Column(String, nullable=False)
    action_data = Column(JSON, nullable=False)
    
    is_done = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    change_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_undo_reedo_user', 'user_id' , 'action_type'),
        Index('idx_undo_redo_user_actions','user_id','is_done','created_at'),
    ) 

    @validates('action_type')
    def validate_action_type(self, key, action_type):
        """Validate action type"""
        allowed_actions = {
            "rename_file","rename_folder",
            "move_files","move_folders",
            "copy_files","copy_folders",
            "trash_files","trash_folders",
            "restore_files","restore_folders"
        }
        
        if action_type not in allowed_actions:
            raise ValueError(f"Invalid action type: {action_type}")
        
        return action_type

class FileVersioning(Base):
    __tablename__ = 'file_versioning'
    __table_args__ = (
        Index("idx_file_versions_original", 'version_id',"original_file_id"),
        Index("idx_file_version","version_id","created_at"),

        CheckConstraint('file_size >= 0', name='check_version_file_size_non_negative'),
    )

    user_id = Column(String, nullable=False, index=True)

    version_id = Column(Integer,primary_key=True,autoincrement=True)
    original_file_id = Column(UUID(as_uuid=True), ForeignKey('files.file_id', ondelete="CASCADE"), nullable=False, index=True)

    file_name = Column(String(255), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_type = Column(Text , nullable=False)
    integrity_hash = Column(String(255), nullable=False)

    encryption_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    version_number = Column(Integer, nullable=True, default=0)

    original_file = relationship('File', primaryjoin="foreign(FileVersioning.original_file_id)==File.file_id", back_populates='versions', viewonly=True)