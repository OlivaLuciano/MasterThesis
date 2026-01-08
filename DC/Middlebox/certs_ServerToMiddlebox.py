#!/usr/bin/env python3
"""
certs_ServerToMiddlebox.py (middlebox client)
- POST http://server:5000/certs
- measure t1.1 / t1.2 (ns)
- decode base64 dc.cred (binary) and dckey.pem and write them to /certs
- minimal prints: errors, timestamps, completion
"""
import requests
import time
import base64
import os
import sys
import json

SERVER_URL = "http://server:5000/certs"
CERTS_DIR = "/certs"
OUT_DC = os.path.join(CERTS_DIR, "dc.cred")
OUT_DCKEY = os.path.join(CERTS_DIR, "dckey.pem")

os.makedirs(CERTS_DIR, exist_ok=True)

def now_ns():
    return time.time_ns()

print(f"[MB] Avvio richiesta certificati al server: {SERVER_URL}")

t1_1 = now_ns()
try:
    r = requests.post(SERVER_URL, timeout=120)
except Exception as e:
    print("[MB] Errore durante la richiesta:", e)
    sys.exit(1)
t1_2 = now_ns()

print(f"[MB] HTTP status: {r.status_code}")
print(f"[MB] t1.1 (MB send request): {t1_1} ns")
print(f"[MB] t1.2 (MB recv response): {t1_2} ns")
print(f"[MB] Total time (t1.2 - t1.1): {t1_2 - t1_1} ns")

if r.status_code != 200:
    print("[MB] Errore: server ha risposto", r.status_code)
    print("Body (truncated):", r.text[:2000])
    sys.exit(1)

try:
    data = r.json()
except Exception as e:
    print("[MB] Errore decodificando JSON dal server:", e)
    print("Raw body (truncated):", r.text[:2000])
    sys.exit(1)

# print server timestamps if present
if "t2.1_ns" in data:
    print(f"[MB] t2.1 (server received request): {data['t2.1_ns']} ns")
if "t3.1_ns" in data:
    print(f"[MB] t3.1 (server start go): {data['t3.1_ns']} ns")
if "t3.2_ns" in data:
    print(f"[MB] t3.2 (server end go): {data['t3.2_ns']} ns")
if "t2.2_ns" in data:
    print(f"[MB] t2.2 (server send response): {data['t2.2_ns']} ns")

# get base64 payloads
dc_b64 = data.get("dc_cred_b64", "")
dckey_b64 = data.get("dc_key_b64", "")

if not dc_b64:
    print("[MB] Attenzione: campo dc_cred_b64 vuoto", flush=True)
else:
    try:
        dc_raw = base64.b64decode(dc_b64)
        with open(OUT_DC, "wb") as f:
            f.write(dc_raw)
        print(f"[MB] Salvato {OUT_DC}")
    except Exception as e:
        print("[MB] Errore salvando dc.cred:", e, flush=True)

if not dckey_b64:
    print("[MB] Attenzione: campo dc_key_b64 vuoto", flush=True)
else:
    try:
        key_raw = base64.b64decode(dckey_b64)
        with open(OUT_DCKEY, "wb") as f:
            f.write(key_raw)
        print(f"[MB] Salvato {OUT_DCKEY}")
    except Exception as e:
        print("[MB] Errore salvando dckey.pem:", e, flush=True)

print("[MB] Operazione completata. Middlebox pronto.")
