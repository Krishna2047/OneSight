import base64
import hashlib
import logging
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings

logger = logging.getLogger("onesight.security")

def _get_cipher_suite() -> Fernet:
    """
    Derives a cryptographically secure 32-byte AES key from settings.ENCRYPTION_KEY
    and returns an initialized Fernet cipher instance.
    """
    raw_key = getattr(settings, "ENCRYPTION_KEY", None) or "onesight-finops-default-secure-vault-key-2026"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).digest()
    fernet_key = base64.urlsafe_b64encode(key_hash)
    return Fernet(fernet_key)

def encrypt_credential(plain_text: Optional[str]) -> Optional[str]:
    """
    Encrypts sensitive data (AWS Access Key, Secret Access Key, Session Token, External ID)
    prior to storing in PostgreSQL or SQLite.
    """
    if not plain_text or not plain_text.strip():
        return None
    try:
        cipher = _get_cipher_suite()
        encrypted_bytes = cipher.encrypt(plain_text.strip().encode("utf-8"))
        return encrypted_bytes.decode("utf-8")
    except Exception as e:
        logger.error(f"Encryption error: {e}")
        raise ValueError("Failed to encrypt sensitive cloud credentials.") from e

def decrypt_credential(cipher_text: Optional[str]) -> Optional[str]:
    """
    Decrypts encrypted cloud credentials in-memory for authorized API / Boto3 calls.
    Never exposes decrypted values in REST responses.
    """
    if not cipher_text or not cipher_text.strip():
        return None
    try:
        cipher = _get_cipher_suite()
        decrypted_bytes = cipher.decrypt(cipher_text.strip().encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        logger.error("Decryption failed: Invalid encryption token or key mismatch.")
        return None
    except Exception as e:
        logger.error(f"Decryption error: {e}")
        return None

def mask_access_key(key: Optional[str]) -> str:
    """
    Returns safe masked access key for UI display (e.g. AKIA****ABI5).
    """
    if not key:
        return "N/A"
    clean = key.strip()
    if len(clean) <= 8:
        return "****"
    return f"{clean[:4]}****{clean[-4:]}"
