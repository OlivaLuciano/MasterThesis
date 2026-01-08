import http.server
import socketserver
import json
import subprocess
import time
import os

PORT = 8000

CERT_PATH = "/certs/cert.pem"
KEY_PATH = "/certs/key.pem"
DC_CERT_PATH = "/certs/dc.cred"
DC_KEY_PATH = "/certs/dckey.pem"

# Assicura che la directory esista
os.makedirs("/certs", exist_ok=True)

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/certs":
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Invalid endpoint")
            return

        print("[SERVER] Richiesta certificati ricevuta.")

        # Genera cert.pem e key.pem (sempre necessari per generare il DC)
        print("[SERVER] Genero cert.pem e key.pem...")
        subprocess.run([
            "openssl", "req",
            "-x509", "-newkey", "ed25519",
            "-keyout", KEY_PATH,
            "-out", CERT_PATH,
            "-days", "1",
            "-nodes",
            "-subj", "/CN=test-server"
        ], check=True)

        print("[SERVER] Chiamo il programma Go per delegated credential...")

        t3_1 = time.time_ns()
        go = subprocess.run([
            "go", "run", "/root/go/src/crypto/tls/generate_delegated_credential.go",
            "-cert-path", CERT_PATH,
            "-key-path", KEY_PATH,
            "-signature-scheme", "Ed25519",
            "-duration", "168h"
        ], capture_output=True, text=True)
        t3_2 = time.time_ns()

        if go.returncode != 0:
            print("[SERVER] Go returned non-zero code:", go.returncode)

        # Salva i DC prodotti
        with open(DC_CERT_PATH, "w") as f:
            f.write(go.stdout)

        with open(DC_KEY_PATH, "w") as f:
            f.write(go.stderr)

        print("[SERVER] Preparazione risposta verso il middlebox...")

        response = {
            "go_returncode": go.returncode,
            "go_stdout": go.stdout,
            "go_stderr": go.stderr,
            "dc_cert": open(DC_CERT_PATH).read(),
            "dc_key": open(DC_KEY_PATH).read()
        }

        encoded = json.dumps(response).encode()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()

        self.wfile.write(encoded)

        print("[SERVER] Certificati (DC) inviati.")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"[SERVER] In ascolto su port {PORT}")
    httpd.serve_forever()
