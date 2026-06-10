#!/usr/bin/env python3
"""
Local background-removal HTTP server backed by transparent-background (InSPyReNet).

Replaces the old remove.bg-website scraping path. The model is loaded ONCE at
startup and kept warm, so each request is fast (~1-1.5s/image on Apple-Silicon
MPS, a few seconds on CPU).

Run (Apple Silicon, GPU/MPS — invoke as arm64):
    arch -arm64 /Users/duongtran-dl/inspyrenet-env/bin/python bg_server.py

Env vars:
    BG_PORT    (default 7001)
    BG_MODE    InSPyReNet mode: "base" (best quality) | "fast"  (default "base")
    BG_DEVICE  "mps" | "cpu" | "cuda"  (default: auto — mps if available else cpu)

Endpoints:
    GET  /health   -> {"status":"ok","device":...,"mode":...}
    POST /remove   -> body = raw image bytes; returns image/png (RGBA, transparent bg)
"""
import io
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("BG_PORT", "7001"))
MODE = os.environ.get("BG_MODE", "base")
DEVICE = os.environ.get("BG_DEVICE", "")

# --- Load model once (warm) ---
print(f"[bg] loading transparent-background (mode={MODE})...", flush=True)
import torch  # noqa: E402
from PIL import Image  # noqa: E402
from transparent_background import Remover  # noqa: E402

if not DEVICE:
    if torch.backends.mps.is_available():
        DEVICE = "mps"
    elif torch.cuda.is_available():
        DEVICE = "cuda"
    else:
        DEVICE = "cpu"

remover = Remover(mode=MODE, device=DEVICE)
print(f"[bg] model ready on device={DEVICE}", flush=True)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet

    def _send(self, code, body=b"", ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            import json
            self._send(200, json.dumps({"status": "ok", "device": DEVICE, "mode": MODE}).encode())
        else:
            self._send(404, b'{"error":"not found"}')

    def do_POST(self):
        if self.path != "/remove":
            self._send(404, b'{"error":"not found"}')
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            img = Image.open(io.BytesIO(raw)).convert("RGB")
            out = remover.process(img, type="rgba")  # RGBA PIL, transparent bg
            buf = io.BytesIO()
            out.save(buf, format="PNG")
            self._send(200, buf.getvalue(), "image/png")
        except Exception as e:
            import json
            self._send(500, json.dumps({"error": str(e)}).encode())


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"[bg] listening on http://127.0.0.1:{PORT}  (GET /health, POST /remove)", flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("[bg] shutting down", flush=True)
        srv.shutdown()
