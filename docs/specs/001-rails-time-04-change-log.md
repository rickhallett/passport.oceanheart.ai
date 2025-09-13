# Change Log: Phase 4 – Admin Interface
Date: 2025-09-12

## Files Modified/Added

### db/migrate/20250912100000_add_role_to_users.rb
- Add `role` string column with default `user`; add index

### app/models/user.rb
- Add `enum role: { user: 'user', admin: 'admin' }` and `admin?`

### app/controllers/concerns/admin_authorization.rb (new)
- Require admin for controllers including this concern; respond with redirect/json

### app/controllers/admin/users_controller.rb (new)
- Actions: `index`, `show`, `destroy`, `toggle_role`
- Filtering, basic pagination, Turbo Stream responses

### app/views/admin/users/index.html.erb (new)
- Terminal-styled admin list, filter form, pagination summary

### app/views/admin/users/_user_row.html.erb (new)
- Row partial with role toggle and delete buttons

### app/views/admin/users/show.html.erb (new)
- Minimal user details view

### app/views/layouts/admin.html.erb (new)
- Minimal layout using app styles; suppresses global auth status banner

### config/routes.rb
- Add `namespace :admin` routes and admin root

## Impact
- Enables admin management of users behind role-based access control
- Keeps UI consistent with terminal theme

## Follow-ups
- Replace manual pagination with kaminari/pagy if needed
- Add system tests; improve flash UX
