package actions

import (
	"net/http"

	"github.com/gobuffalo/buffalo"
)

// HomeHandler is the handler for the home page
func HomeHandler(c buffalo.Context) error {
	return c.Render(http.StatusOK, r.HTML("index.plush.html"))
}