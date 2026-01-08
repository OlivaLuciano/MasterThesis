package main

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"
)

const (
	// Middlebox listens in cleartext so it can start even without certs.
	port             = ":8443"
	targetUrl        = "http://server:8000" // normale porta del server per i messaggi
	certUrl          = "http://server:5000" // endpoint dove richiedere /certs
	certsDir         = "/certs"             // -> percorso stabile dentro il container middlebox
	delegatedFile    = "/certs/dc.cred"
	delegatedKeyFile = "/certs/dckey.pem"
)

// info stampa su stderr (compatibile con il tuo codice)
func info(str string) {
	fmt.Fprintf(os.Stderr, str+"\n")
}

// isCertificateRequest identifica richieste che contengono "/certs"
func isCertificateRequest(r *http.Request) bool {
	return strings.Contains(r.URL.Path, "/certs")
}

// ensureCertificates controlla se i file di cert esistono; se no, li richiede al server
func ensureCertificates() error {
	files := []string{"dc.cred", "dckey.pem"}

	// controlla esistenza
	allExist := true
	for _, f := range files {
		p := fmt.Sprintf("%s/%s", certsDir, f)
		if _, err := os.Stat(p); os.IsNotExist(err) {
			allExist = false
			break
		}
	}
	if allExist {
		return nil
	}

	// crea dir se necessario
	if err := os.MkdirAll(certsDir, 0o700); err != nil {
		return fmt.Errorf("failed to create certs dir: %w", err)
	}

	// Richiesta al server per i certificati
	info("[MB] Certificati mancanti: richiedo /certs al server...")
	resp, err := http.Post(certUrl+"/certs", "application/json", nil)
	if err != nil {
		return fmt.Errorf("request to server /certs failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server returned %d: %s", resp.StatusCode, string(body))
	}

	// Decodifica JSON
	var data map[string]string
	dec := json.NewDecoder(resp.Body)
	if err := dec.Decode(&data); err != nil {
		return fmt.Errorf("failed to decode server response: %w", err)
	}

	// Salva solo dc.cred e dckey.pem
	dc_cred_b64 := data["dc_cred_b64"]
	dc_key_b64 := data["dc_key_b64"]

	if dc_cred_b64 == "" || dc_key_b64 == "" {
		return fmt.Errorf("missing dc_cred_b64 or dc_key_b64 in response")
	}

	dcBytes, err := base64.StdEncoding.DecodeString(dc_cred_b64)
	if err != nil {
		return fmt.Errorf("failed to decode dc_cred_b64: %w", err)
	}
	if err := os.WriteFile(delegatedFile, dcBytes, 0o600); err != nil {
		return fmt.Errorf("failed to write dc.cred: %w", err)
	}
	info("[MB] Salvato " + delegatedFile)

	dcKeyBytes, err := base64.StdEncoding.DecodeString(dc_key_b64)
	if err != nil {
		return fmt.Errorf("failed to decode dc_key_b64: %w", err)
	}
	if err := os.WriteFile(delegatedKeyFile, dcKeyBytes, 0o600); err != nil {
		return fmt.Errorf("failed to write dckey.pem: %w", err)
	}
	info("[MB] Salvato " + delegatedKeyFile)

	info("[MB] Certificati scaricati e salvati.")
	return nil
}

func main() {
	remote, err := url.Parse(targetUrl)
	if err != nil {
		log.Fatalf("invalid target url: %v", err)
	}

	// Assicurati che i certificati siano presenti prima di configurare TLS
	if err := ensureCertificates(); err != nil {
		log.Fatalf("failed to obtain certificates: %v", err)
	}

	// Carica il certificato delegato come DER e la chiave privata
	certDER, err := os.ReadFile(delegatedFile)
	if err != nil {
		log.Fatalf("Failed to read dc.cred: %v", err)
	}
	info(fmt.Sprintf("[MB] Loaded dc.cred, size: %d bytes", len(certDER)))

	// Verifica che sia un cert valido
	_, err = x509.ParseCertificate(certDER)
	if err != nil {
		log.Fatalf("Failed to parse certificate: %v", err)
	}
	info("[MB] Certificate parsed successfully")

	keyPEM, err := os.ReadFile(delegatedKeyFile)
	if err != nil {
		log.Fatalf("Failed to read dckey.pem: %v", err)
	}

	block, _ := pem.Decode(keyPEM)
	if block == nil {
		log.Fatalf("Failed to decode dckey.pem")
	}

	priv, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		log.Fatalf("Failed to parse private key: %v", err)
	}
	info("[MB] Private key parsed successfully")

	cert := tls.Certificate{
		Certificate: [][]byte{certDER},
		PrivateKey:  priv,
	}

	config := &tls.Config{
		Certificates: []tls.Certificate{cert},
	}

	var connectionID int = 0
	var valid bool
	var user string
	var messageType any

	// costruisce proxy verso il target (http)
	proxy := httputil.NewSingleHostReverseProxy(remote)
	// mantiene le variabili di stato aggiornate dalla handler
	proxy.ModifyResponse = func(r *http.Response) error {
		info("Valid: " + fmt.Sprint(valid) + ", user: " + user + ", messageType: " + fmt.Sprint(messageType))
		// processResponse è la tua funzione definita altrove; la chiamiamo come prima
		processResponse(r, user, messageType)
		return nil
	}

	// handler wrapper che chiama ensureCertificates prima di forwardare
	handler := func(p *httputil.ReverseProxy) func(http.ResponseWriter, *http.Request) {
		return func(w http.ResponseWriter, r *http.Request) {
			// Solo per log
			fmt.Fprintln(os.Stderr, time.Now().UnixNano(), "splice", connectionID, "(both-side): Handler started")
			log.Println(r.Method, r.URL)

			// Determina target in base al tipo di richiesta (manteniamo il comportamento)
			var targetRemote *url.URL
			if isCertificateRequest(r) {
				log.Println("[CERT REQUEST] Proxy verso", certUrl)
				targetRemote, _ = url.Parse(certUrl)
				r.Host = targetRemote.Host
				// Nota: il proxy principale punta a targetUrl; se vogliamo inoltrare verso certUrl
				// per questa richiesta, creiamo temporaneamente un proxy secondario.
				tempProxy := httputil.NewSingleHostReverseProxy(targetRemote)
				// Non vogliamo che ensureCertificates venga richiamato ricorsivamente: la request /certs
				// viene inoltrata al server così com'è.
				tempProxy.ServeHTTP(w, r)
				connectionID++
				fmt.Fprintln(os.Stderr, time.Now().UnixNano(), "splice", connectionID, "(both-side): Handler finished")
				return
			} else {
				log.Println("[NORMAL REQUEST] Proxy verso", targetUrl)
				r.Host = remote.Host
			}

			// processRequest (tua funzione) decide validità e setta user/messageType
			valid, user, messageType = processRequest(r)

			if valid {
				p.ServeHTTP(w, r)
			} else {
				// se non valido, si hijack e chiude
				conn, _, err := w.(http.Hijacker).Hijack()
				if err != nil {
					log.Println("Hijack failed: " + err.Error())
					http.Error(w, "Hijack failed", http.StatusInternalServerError)
					return
				}
				log.Println("Hijack OK")
				conn.Close()
			}

			fmt.Fprintln(os.Stderr, time.Now().UnixNano(), "splice", connectionID, "(both-side): Handler finished")
			connectionID++
		}
	}

	proxy = httputil.NewSingleHostReverseProxy(remote)
	proxy.ModifyResponse = func(r *http.Response) error {
		info("Valid: " + fmt.Sprint(valid) + ", user: " + user + ", messageType: " + fmt.Sprint(messageType) + "\n")
		fmt.Fprintln(os.Stderr, time.Now().UnixNano(), "splice", connectionID, "(client-side): processResponse started")
		processResponse(r, user, messageType)
		fmt.Fprintln(os.Stderr, time.Now().UnixNano(), "splice", connectionID, "(client-side): processResponse started")
		return nil
	}
	router := http.NewServeMux()
	router.HandleFunc("/", handler(proxy))

	srv := &http.Server{
		Addr:      port,
		Handler:   router,
		TLSConfig: config,
	}

	log.Printf("Middlebox listening on %s (HTTPS)...", port)
	if err := srv.ListenAndServeTLS("", ""); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Middlebox server failed: %v", err)
	}
}
