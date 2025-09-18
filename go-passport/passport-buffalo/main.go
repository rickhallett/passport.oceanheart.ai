package main

import (
	"log"
	"net/http"

	"github.com/gobuffalo/envy"
	"passport-buffalo/actions"
)

func main() {
	// Load environment variables
	envy.Load()
	
	port := envy.Get("PORT", "3000")
	app := actions.App()
	
	log.Printf("Starting Passport Buffalo on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, app))
}