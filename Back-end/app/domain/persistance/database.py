from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_POSTGRES_URL = os.getenv("DATABASE_POSTGRES_URL")

# Create async engine
engine = create_async_engine(DATABASE_POSTGRES_URL, echo=True)

# Async session
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Declarative base
Base = declarative_base()

# streaming purpose
async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# database operation Dependency
async def get_db_tx() -> AsyncSession:
    async with async_session() as session:
        async with session.begin():
            try:
                yield session
            finally:
                await session.close()
