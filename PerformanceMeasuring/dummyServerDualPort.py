#!/usr/bin/env python3
"""
Dual-port server:
- Port 5000: Normal HTTP requests (returns 200 OK)
- Port 5001: Certificate generation requests (returns certificate data)
"""

import json
import base64
import os
import threading
import http.server
import socketserver


class NormalRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler for normal requests on port 5000"""
    
    def do_GET(self):
        print(f"[5000-Normal] GET {self.path}")
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.send_header("Content-length", "2")
        self.end_headers()
        self.wfile.write(b"OK")

    def do_POST(self):
        print(f"[5000-Normal] POST {self.path}")
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        print(f"[5000-Normal] Body: {body}")
        
        self.send_response(200)
        self.send_header("Content-type", "text/plain")
        self.send_header("Content-length", "2")
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format, *args):
        print(f"[5000-Normal] {format % args}")


class CertificateRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler for certificate requests on port 5001"""
    
    def do_GET(self):
        print(f"[5001-Certs] GET {self.path}")
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.send_header("Content-length", "2")
        self.end_headers()
        self.wfile.write(b"{}")

    def do_POST(self):
        print(f"[5001-Certs] POST {self.path}")
        
        # Read request body if any
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length)
            print(f"[5001-Certs] Body: {body}")
        
        # Check if /certs endpoint
        if "/certs" in self.path:
            # Return dummy certificate data as base64-encoded JSON
            certs_data = {
                "cert.pem": base64.b64encode(b"DUMMY_CERT_DATA").decode(),
                "key.pem": base64.b64encode(b"DUMMY_KEY_DATA").decode(),
                "dc.cred": base64.b64encode(b"DUMMY_DC_DATA").decode(),
                "dckey.pem": base64.b64encode(b"DUMMY_DCKEY_DATA").decode(),
            }
            response = json.dumps(certs_data).encode()
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-length", str(len(response)))
            self.end_headers()
            self.wfile.write(response)
            print(f"[5001-Certs] Certificate data sent")
        else:
            # Default response
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Content-length", "2")
            self.end_headers()
            self.wfile.write(b"{}")

    def log_message(self, format, *args):
        print(f"[5001-Certs] {format % args}")


def start_server(port, handler_class):
    """Start an HTTP server on the specified port"""
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", port), handler_class) as httpd:
        print(f"Server listening on port {port}...")
        httpd.serve_forever()


if __name__ == "__main__":
    # Start port 5000 for normal requests in a background thread
    thread_5000 = threading.Thread(
        target=start_server,
        args=(5000, NormalRequestHandler),
        daemon=True
    )
    thread_5000.start()
    print("[Main] Started server on port 5000 (normal requests)")
    
    # Start port 5001 for certificate requests in main thread
    print("[Main] Starting server on port 5001 (certificate requests)...")
    start_server(5001, CertificateRequestHandler)
