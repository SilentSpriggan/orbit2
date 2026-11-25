"""Start the ORBIT local server over HTTPS.

    python server/run.py

Serves /api/* (voice, crew, evidence) and, after `npm run build`, the console itself
at https://localhost:8443. In development, `npm run dev` proxies /api here.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from orbit_server import config  # noqa: E402  (sets offline mode before anything loads models)
from orbit_server.certs import ensure_cert, lan_ip  # noqa: E402


def main() -> None:
    import uvicorn

    cert, key = ensure_cert()
    ip = lan_ip()
    print(f"\nORBIT server on https://localhost:{config.PORT}" + (f"  (LAN: https://{ip}:{config.PORT})" if ip else ""))
    print("The certificate is self-signed: your browser will ask you to accept it once.\n")
    uvicorn.run(
        "orbit_server.app:app",
        host=config.HOST,
        port=config.PORT,
        ssl_certfile=str(cert),
        ssl_keyfile=str(key),
        log_level="info",
    )


if __name__ == "__main__":
    main()
