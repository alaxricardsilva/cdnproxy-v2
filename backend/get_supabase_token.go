
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_API_KEY")

	if len(os.Args) < 3 {
		fmt.Println("Usage: go run get_supabase_token.go <email> <password>")
		os.Exit(1)
	}

	email := os.Args[1]
	password := os.Args[2]

	url := fmt.Sprintf("%s/auth/v1/token?grant_type=password", supabaseURL)

	requestBody, err := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	if err != nil {
		log.Fatalf("Error marshalling request body: %v", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(requestBody))
	if err != nil {
		log.Fatalf("Error creating request: %v", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", supabaseKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Error sending request: %v", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to get token. Status: %s, Body: %s", resp.Status, string(body))
	}

	var result map[string]interface{}
	json.Unmarshal(body, &result)

	accessToken, ok := result["access_token"].(string)
	if !ok {
		log.Fatalf("Could not find access_token in response: %s", string(body))
	}

	fmt.Println(accessToken)
}
