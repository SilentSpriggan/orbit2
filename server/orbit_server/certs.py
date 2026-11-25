"""Self-signed HTTPS certificate for the local network (browsers need HTTPS for the microphone)."""

import datetime as dt
import ipaddress
import socket
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID

from .config import CERT_DIR

CERT_FILE = CERT_DIR / "cert.pem"
KEY_FILE = CERT_DIR / "key.pem"


def lan_ip() -> str | None:
    """This machine's LAN address, or None when there is no network. Sends no packets."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
            return None if ip.startswith("127.") else ip
    except OSError:
        return None


def ensure_cert() -> tuple[Path, Path]:
    """Create cert.pem / key.pem on first run (valid one year) and return their paths."""
    if CERT_FILE.exists() and KEY_FILE.exists():
        return CERT_FILE, KEY_FILE
    CERT_DIR.mkdir(parents=True, exist_ok=True)

    key = ec.generate_private_key(ec.SECP256R1())
    host = socket.gethostname()
    names: list[x509.GeneralName] = [
        x509.DNSName("localhost"),
        x509.DNSName(host),
        x509.DNSName(f"{host}.local"),
        x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
        x509.IPAddress(ipaddress.ip_address("::1")),
    ]
    if ip := lan_ip():
        names.append(x509.IPAddress(ipaddress.ip_address(ip)))

    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "ORBIT local server")])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(subject)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(minutes=5))
        .not_valid_after(now + dt.timedelta(days=365))
        .add_extension(x509.SubjectAlternativeName(names), critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )
    KEY_FILE.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    CERT_FILE.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    return CERT_FILE, KEY_FILE


def cert_expiry() -> str | None:
    """ISO 8601 expiry of the current certificate."""
    if not CERT_FILE.exists():
        return None
    cert = x509.load_pem_x509_certificate(CERT_FILE.read_bytes())
    return cert.not_valid_after_utc.isoformat().replace("+00:00", "Z")
