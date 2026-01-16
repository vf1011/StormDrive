from dotenv import load_dotenv
from cryptography.fernet import Fernet
import os

load_dotenv()

FERNET_KEY = os.getenv('FERNET_KEY')
fernet = Fernet(FERNET_KEY.encode())

class Security:

    @staticmethod
    def encrypt(text: str) -> str:
        """
        Encrypts given text using Fernet cipher.
        """
        return fernet.encrypt(text.encode()).decode()

    @staticmethod
    def decrypt(text: str) -> str:
        """
        Decrypts given text using Fernet cipher.

        """
        return fernet.decrypt(text.encode()).decode()
    

    