package main

import (
	"crypto/tls"
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
)

func httpsClient(method string, url string, token string, body string) ([]byte, error) {

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}

	client := &http.Client{Transport: tr}

	var reqBody io.Reader
	if body != "" {
		reqBody = strings.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	log.Println("Client: Sending request to", url)
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Client: Error during request:", err)
		return nil, err
	}
	defer resp.Body.Close()

	log.Println("Client: Response status:", resp.Status)
	respBody, _ := ioutil.ReadAll(resp.Body)
	return respBody, nil
}

func main() {
	tokenFlag := flag.String("H", "", "JWT Token")
	dataFlag := flag.String("data", "", "Request body data")
	flag.Parse()

	if len(flag.Args()) < 1 {
		fmt.Println("Usage: ./client -H \"<jwt_token>\" [-data \"<body>\"] https://middlebox:8443/function/init")
		os.Exit(1)
	}

	token := *tokenFlag
	if strings.HasPrefix(token, "Authorization : Bearer ") {
		token = strings.TrimPrefix(token, "Authorization : Bearer ")
	} else if strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	}
	url := flag.Args()[0]
	data := *dataFlag

	if token == "" {
		log.Println("No token provided")
		os.Exit(1)
	}

	method := "GET"
	if data != "" {
		method = "POST"
	}

	log.Println("Calling:", url)

	body, err := httpsClient(method, url, token, data)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(body))
}
