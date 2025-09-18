package models

import (
	"log"

	"github.com/gobuffalo/envy"
	"github.com/gobuffalo/pop/v6"
)

// DB is the connection to the database
var DB *pop.Connection

// ENV is the current environment
var ENV = envy.Get("GO_ENV", "development")

func init() {
	var err error
	
	// Initialize database connection
	if DB, err = pop.Connect(ENV); err != nil {
		log.Fatal(err)
	}
	
	// Configure connection pool
	// Note: pop v6 doesn't expose the underlying DB directly
	// Connection pooling is handled internally
	
	pop.Debug = ENV == "development"
}