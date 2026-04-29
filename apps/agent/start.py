from __future__ import annotations

import os

import uvicorn


def main() -> None:
    raw_port = os.getenv("PORT", "8010")
    try:
        port = int(raw_port)
    except ValueError as error:
        raise RuntimeError(f"Invalid PORT value: {raw_port!r}") from error

    print(f"Starting NoxPilot research agent on 0.0.0.0:{port}", flush=True)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level=os.getenv("UVICORN_LOG_LEVEL", "info"),
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


if __name__ == "__main__":
    main()
