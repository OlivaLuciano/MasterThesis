import docker
import os
import tarfile
import io

GO = "/root/go/bin/go"
TLS_PATH = "/root/go/src/crypto/tls"
CMD_CERT =  (f"{GO} run {TLS_PATH}/generate_cert.go -host 127.0.0.1 -allowDC")
CMD_DC = (f"{GO} run {TLS_PATH}/generate_delegated_credential.go -cert-path cert.pem -key-path key.pem -signature-scheme Ed25519 -duration 168h")

CONTAINER_CERT_DIR = "/certs"
LOCAL_OUTPUT_DIR = "./certs_fuori"
FILES = ["cert.pem", "key.pem", "dc.cred", "dckey.pem"]


def run_in_container(container, cmd, raise_on_fail=False):
   
    exit_code, output = container.exec_run(cmd, tty=True, privileged=True)
    output_text = output.decode(errors="replace")
    print(output_text)

    if cmd == "pwd" and output_text != "/certs":
        print("try cd /certs")
        
        exit_code, output = container.exec_run("ls /", tty=True)
        print(output.decode())

        exit_code, output = container.exec_run("bash -c 'cd /certs && ls -l'", tty=True, privileged=True)
        output_text = output.decode(errors="replace")
        print(output_text)

    if exit_code != 0:
        print("Errore nell'esecuzione del comando.")
        if raise_on_fail:
            raise RuntimeError(f"Comando fallito con exit code {exit_code}")
    else:
        print("Comando eseguito correttamente.")
    return exit_code, output_text


def extract_from_container(container, remote_path, local_path):
    try:
        stream, stat = container.get_archive(remote_path)
        file_like = io.BytesIO()
        for chunk in stream:
            file_like.write(chunk)
        file_like.seek(0)

        with tarfile.open(fileobj=file_like) as tar:
            member = tar.getmembers()[0]
            extracted = tar.extractfile(member)
            with open(local_path, "wb") as f:
                f.write(extracted.read())

        print(f"Estratto: {remote_path} → {local_path}")

    except Exception as e:
        print(f"Errore estraendo {remote_path}: {e}")


def main():
    print("\n\n Connessione a Docker...")
    client = docker.from_env()

    print("\n\n\n Cerco container 'server'...")
    try:
        container = client.containers.get("server")
        print(f"\n\n OKOKOK Container trovato: {container.id}")
    except docker.errors.NotFound:
        print("\n\n XXX Container 'server' non trovato.")
        return

    # 1) Generazione certificati
    print("\n Generazione dei certificati ")
    run_in_container(container, "pwd")
    run_in_container(container, CMD_CERT)
    run_in_container(container, CMD_DC)

    # 2) Estrazione certificati
    os.makedirs(LOCAL_OUTPUT_DIR, exist_ok=True)

    print("\n Estraggo i certificati dal container ")
    for filename in FILES:
        container_file = f"{CONTAINER_CERT_DIR}/{filename}"
        host_file = os.path.join(LOCAL_OUTPUT_DIR, filename)
        extract_from_container(container, container_file, host_file)

    # 3) Report finale
    print("\n Controllo finale certificati ")
    for filename in FILES:
        path = os.path.join(LOCAL_OUTPUT_DIR, filename)
        if os.path.exists(path):
            print(f"{filename} OK")
        else:
            print(f"{filename} NON trovato")

    print("\n Procedura completata.")


if __name__ == "__main__":
    main()
