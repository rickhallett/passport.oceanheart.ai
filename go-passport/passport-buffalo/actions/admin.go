package actions

import (
	"net/http"

	"github.com/gobuffalo/buffalo"
	"github.com/gobuffalo/pop/v6"
	"github.com/gofrs/uuid"
	"passport-buffalo/models"
)

// AdminUsersIndex renders the admin users list
func AdminUsersIndex(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	users := &models.Users{}
	
	// Paginate users
	q := tx.PaginateFromParams(c.Params())
	if err := q.All(users); err != nil {
		return err
	}
	
	c.Set("users", users)
	c.Set("pagination", q.Paginator)
	
	return c.Render(http.StatusOK, r.HTML("admin/users/index.plush.html"))
}

// AdminUsersShow renders a single user
func AdminUsersShow(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	userID, err := uuid.FromString(c.Param("user_id"))
	if err != nil {
		return c.Error(http.StatusBadRequest, err)
	}
	
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(http.StatusNotFound, err)
	}
	
	// Load sessions for this user
	sessions := &models.Sessions{}
	if err := tx.Where("user_id = ?", userID).Order("created_at DESC").All(sessions); err != nil {
		return err
	}
	
	c.Set("user", user)
	c.Set("sessions", sessions)
	
	return c.Render(http.StatusOK, r.HTML("admin/users/show.plush.html"))
}

// AdminUsersDestroy deletes a user
func AdminUsersDestroy(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	userID, err := uuid.FromString(c.Param("user_id"))
	if err != nil {
		return c.Error(http.StatusBadRequest, err)
	}
	
	// Don't allow deleting yourself
	currentUser := c.Value("current_user").(*models.User)
	if currentUser.ID == userID {
		c.Flash().Add("danger", "You cannot delete your own account")
		return c.Redirect(http.StatusSeeOther, "/admin/users")
	}
	
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(http.StatusNotFound, err)
	}
	
	if err := tx.Destroy(user); err != nil {
		return err
	}
	
	c.Flash().Add("success", "User deleted successfully")
	return c.Redirect(http.StatusSeeOther, "/admin/users")
}

// AdminUsersToggleRole toggles user between user and admin roles
func AdminUsersToggleRole(c buffalo.Context) error {
	tx := c.Value("tx").(*pop.Connection)
	
	userID, err := uuid.FromString(c.Param("user_id"))
	if err != nil {
		return c.Error(http.StatusBadRequest, err)
	}
	
	// Don't allow changing your own role
	currentUser := c.Value("current_user").(*models.User)
	if currentUser.ID == userID {
		c.Flash().Add("danger", "You cannot change your own role")
		return c.Redirect(http.StatusSeeOther, "/admin/users")
	}
	
	user := &models.User{}
	if err := tx.Find(user, userID); err != nil {
		return c.Error(http.StatusNotFound, err)
	}
	
	// Toggle role
	if user.Role == "admin" {
		user.Role = "user"
	} else {
		user.Role = "admin"
	}
	
	if err := tx.Update(user); err != nil {
		return err
	}
	
	c.Flash().Add("success", "User role updated successfully")
	return c.Redirect(http.StatusSeeOther, "/admin/users/" + userID.String())
}