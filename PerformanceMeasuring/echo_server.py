#!/usr/bin/env python3
"""
echo_server.py
Semplice HTTP server (porta 8000) che risponde 200 OK a qualsiasi richiesta.
Serve come endpoint che il client contatterà tramite middlebox.
"""
import http.server
import socketserver

PORT = 8000

class EchoHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Rispondiamo 200 OK con un body semplice
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        body = "OK"
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def do_POST(self):
        # leggi body (opzionale) e rispondi 200
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length:
            _ = self.rfile.read(content_length)  # non usiamo, ma lo leggiamo per non rompere connessione
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        body = "OK"
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, format, *args):
        # log minimale
        print("[ECHO] " + (format % args))

if __name__ == "__main__":
    print(f"[ECHO] listening on port {PORT}")
    with socketserver.TCPServer(("", PORT), EchoHandler) as httpd:
        httpd.serve_forever()
