from sqlalchemy import Column, String, Boolean, DateTime,Text, Integer
from app.domain.persistance.database import Base          
from datetime import datetime 

class userTotp(Base):
    __tablename__ = 'user_totp'

    user_id = Column(String,primary_key=True, nullable=False, index=True , unique=True)
    secret_key = Column(String, nullable=False)
    is_enabled = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserServerShare(Base):
    __tablename__ = "user_server_shares"

    user_id = Column(String, primary_key=True, nullable=False, index=True, unique=True)
    ss_master_enc = Column(String, nullable=False)  
    created_at = Column(DateTime, default=datetime.utcnow)
    rotated_at = Column(DateTime, nullable=True)

class KeyBundle(Base):
    __tablename__ = "user_key_bundle"

    user_id = Column(String, primary_key=True, nullable=False, index=True, unique=True)

    user_salt_b64 = Column(Text, nullable=False) # usersalt for cs

    wrapped_mak_b64 = Column(Text, nullable=False)
    wrapped_mak_recovery_b64 = Column(Text, nullable=False)

    wrapp_algo = Column(String(64), nullable=False, default="AES-256-GCM")
    wrapp_nonce_b64 = Column(Text, nullable=False)
    wrapp_tag_b64 = Column(Text, nullable=True)

    kdf_algo = Column(String(64), nullable=False, default="argon2id")
    kdf_params = Column(Text, nullable=False)

    version = Column(Integer, nullable=False, default=1)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

