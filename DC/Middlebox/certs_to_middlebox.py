import docker
import os
import tarfile
import io

SERVER_CONTAINER = "server"
MIDDLEBOX_CONTAINER = "middlebox"

CONTAINER_CERT_DIR = "/certs"
LOCAL_OUTPUT_DIR = "./certs_fuori"
FILES = ["cert.pem", "key.pem", "dc.cred", "dckey.pem"]


def extract_from_container(container, remote_path, local_path):
    try:
        stream, stat = container.get_archive(remote_path)
        data = io.BytesIO()
        for chunk in stream:
            data.write(chunk)
        data.seek(0)

        with tarfile.open(fileobj=data) as tar:
            member = tar.getmembers()[0]
            extracted = tar.extractfile(member)
            with open(local_path, "wb") as f:
                f.write(extracted.read())

        print(f"Estratto: {remote_path} → {local_path}")
    except Exception as e:
        print(f"Errore estraendo {remote_path}: {e}")


def put_file_in_container(container, src_path, dest_path):
    data = io.BytesIO()
    filename = os.path.basename(dest_path)

    with tarfile.open(fileobj=data, mode="w") as tar:
        tar.add(src_path, arcname=filename)

    data.seek(0)
    container.put_archive(os.path.dirname(dest_path), data)

    print(f"Copiato: {src_path} → {dest_path}")


def main():
    client = docker.from_env()

    # Recupera container server
    try:
        server = client.containers.get(SERVER_CONTAINER)
    except docker.errors.NotFound:
        print("Container 'server' non trovato")
        return

    # Recupera container middlebox
    try:
        middlebox = client.containers.get(MIDDLEBOX_CONTAINER)
    except docker.errors.NotFound:
        print("Container 'middlebox' non trovato")
        return

    # Crea la cartella locale
    os.makedirs(LOCAL_OUTPUT_DIR, exist_ok=True)

    # 1) Estrazione certificati
    for filename in FILES:
        extract_from_container(
            server,
            f"{CONTAINER_CERT_DIR}/{filename}",
            os.path.join(LOCAL_OUTPUT_DIR, filename)
        )

    # 2) Copia nella middlebox
    print("\n Copio certificati in middlebox")
    for filename in FILES:
        local_path = os.path.join(LOCAL_OUTPUT_DIR, filename)
        dest_path = f"{CONTAINER_CERT_DIR}/{filename}"

        if not os.path.exists(local_path):
            print(f"Mancante: {local_path}")
            continue

        put_file_in_container(middlebox, local_path, dest_path)

    # 3) Verifica
    print("\n Verifico contenuto /certs in middlebox:")
    code, output = middlebox.exec_run(f"ls -l {CONTAINER_CERT_DIR}")
    print(output.decode())



if __name__ == "__main__":
    main()
