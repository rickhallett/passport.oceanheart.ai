# Phase 4: Admin Interface + Production Deployment

## Objective
Create a complete admin interface at passport.oceanheart.ai with user management capabilities and finalize production deployment.

## Prerequisites
✅ Phase 3 completed - Cross-domain JWT authentication working across subdomains

## Deliverables
- Admin interface with user management
- Role-based access control
- Production-ready security configurations
- Render.com deployment optimization
- Monitoring and health checks

## Manual Test Checkpoint
✅ Admin can login to passport.oceanheart.ai  
✅ Admin can view all users in paginated table  
✅ Admin can delete users (with confirmation)  
✅ Admin can search/filter users  
✅ Non-admin users cannot access admin interface  
✅ Production deployment is stable and secure  

## Technical Requirements

### 1. User Roles & Authorization
```ruby
# db/migrate/xxx_add_role_to_users.rb
class AddRoleToUsers < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :role, :string, default: 'user'
    add_index :users, :role
  end
end

# app/models/user.rb
class User < ApplicationRecord
  enum role: { user: 'user', admin: 'admin' }
  
  # Existing code...
  
  def admin?
    role == 'admin'
  end
end
```

### 2. Admin Authorization Concern
```ruby
# app/controllers/concerns/admin_authorization.rb
module AdminAuthorization
  extend ActiveSupport::Concern
  
  included do
    before_action :require_admin
  end
  
  private
  
  def require_admin
    unless current_user&.admin?
      respond_to do |format|
        format.html { redirect_to root_path, alert: 'Access denied' }
        format.json { render json: { error: 'Access denied' }, status: :forbidden }
      end
    end
  end
end
```

### 3. Admin Users Controller
```ruby
# app/controllers/admin/users_controller.rb
class Admin::UsersController < ApplicationController
  include AdminAuthorization
  
  before_action :set_user, only: [:show, :destroy, :toggle_role]
  
  def index
    @users = User.all
    @users = @users.where("email ILIKE ?", "%#{params[:search]}%") if params[:search].present?
    @users = @users.where(role: params[:role]) if params[:role].present?
    @users = @users.order(:email).page(params[:page]).per(25)
    
    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end
  
  def show
  end
  
  def destroy
    if @user == current_user
      redirect_to admin_users_path, alert: "Cannot delete your own account"
      return
    end
    
    @user.destroy
    
    respond_to do |format|
      format.html { redirect_to admin_users_path, notice: 'User deleted successfully' }
      format.turbo_stream do
        render turbo_stream: [
          turbo_stream.remove("user_#{@user.id}"),
          turbo_stream.prepend("flash_messages", 
            partial: "shared/flash", 
            locals: { message: "User deleted successfully", type: "success" })
        ]
      end
    end
  end
  
  def toggle_role
    if @user == current_user
      redirect_to admin_users_path, alert: "Cannot modify your own role"
      return
    end
    
    @user.update!(role: @user.admin? ? 'user' : 'admin')
    
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace("user_#{@user.id}", 
          partial: "admin/users/user_row", 
          locals: { user: @user })
      end
    end
  end
  
  private
  
  def set_user
    @user = User.find(params[:id])
  end
end
```

### 4. Admin Layout & Views
```erb
<!-- app/views/layouts/admin.html.erb -->
<!DOCTYPE html>
<html>
<head>
  <title>Oceanheart Admin</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <%= csrf_meta_tags %>
  <%= csp_meta_tag %>
  
  <%= stylesheet_link_tag "application", "data-turbo-track": "reload" %>
  <%= javascript_importmap_tags %>
</head>
<body class="admin-layout">
  <nav class="navbar bg-base-300">
    <div class="navbar-start">
      <h1 class="text-xl font-bold">Oceanheart Admin</h1>
    </div>
    <div class="navbar-end">
      <div class="dropdown dropdown-end">
        <label tabindex="0" class="btn btn-ghost">
          <%= current_user.email %>
        </label>
        <ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
          <li><%= link_to "Main Site", root_path %></li>
          <li><%= link_to "Sign Out", sign_out_path, method: :delete %></li>
        </ul>
      </div>
    </div>
  </nav>
  
  <div class="drawer lg:drawer-open">
    <input id="drawer-toggle" type="checkbox" class="drawer-toggle">
    
    <div class="drawer-content">
      <!-- Flash messages -->
      <div id="flash_messages" class="container mx-auto px-4 pt-4">
        <%= render "shared/flash_messages" %>
      </div>
      
      <!-- Main content -->
      <main class="container mx-auto px-4 py-8">
        <%= yield %>
      </main>
    </div>
    
    <div class="drawer-side">
      <label for="drawer-toggle" class="drawer-overlay"></label>
      <aside class="w-64 min-h-full bg-base-200">
        <div class="menu p-4">
          <%= link_to admin_users_path, class: "menu-item #{active_class('admin/users')}" do %>
            👥 Users
          <% end %>
          <%= link_to admin_sessions_path, class: "menu-item #{active_class('admin/sessions')}" do %>
            🔒 Sessions
          <% end %>
        </div>
      </aside>
    </div>
  </div>
</body>
</html>
```

```erb
<!-- app/views/admin/users/index.html.erb -->
<div class="flex justify-between items-center mb-6">
  <h1 class="text-3xl font-bold">Users</h1>
  <div class="text-sm text-base-content/70">
    Total: <%= @users.total_count %> users
  </div>
</div>

<!-- Search and filters -->
<%= turbo_frame_tag "user_filters", class: "mb-6" do %>
  <%= form_with url: admin_users_path, method: :get, 
      local: false, 
      data: { turbo_frame: "users_list", turbo_action: "advance" },
      class: "flex gap-4 items-end" do |f| %>
    
    <div class="form-control">
      <label class="label">Search by email</label>
      <%= f.text_field :search, 
          value: params[:search],
          placeholder: "Enter email...",
          class: "input input-bordered" %>
    </div>
    
    <div class="form-control">
      <label class="label">Role</label>
      <%= f.select :role, 
          options_for_select([
            ['All Roles', ''],
            ['Users', 'user'],
            ['Admins', 'admin']
          ], params[:role]),
          {},
          { class: "select select-bordered" } %>
    </div>
    
    <%= f.submit "Filter", class: "btn btn-primary" %>
    <% if params[:search].present? || params[:role].present? %>
      <%= link_to "Clear", admin_users_path, class: "btn btn-ghost" %>
    <% end %>
  <% end %>
<% end %>

<!-- Users table -->
<%= turbo_frame_tag "users_list" do %>
  <div class="overflow-x-auto">
    <table class="table table-zebra w-full">
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Created</th>
          <th>Last Session</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <% @users.each do |user| %>
          <%= render "user_row", user: user %>
        <% end %>
      </tbody>
    </table>
  </div>
  
  <!-- Pagination -->
  <div class="flex justify-center mt-6">
    <%= paginate @users %>
  </div>
<% end %>
```

```erb
<!-- app/views/admin/users/_user_row.html.erb -->
<%= turbo_frame_tag "user_#{user.id}" do %>
  <tr>
    <td class="font-medium"><%= user.email %></td>
    <td>
      <div class="badge <%= user.admin? ? 'badge-warning' : 'badge-neutral' %>">
        <%= user.role.capitalize %>
      </div>
    </td>
    <td><%= user.created_at.strftime("%b %d, %Y") %></td>
    <td>
      <% if user.sessions.any? %>
        <%= time_ago_in_words(user.sessions.maximum(:updated_at)) %> ago
      <% else %>
        Never
      <% end %>
    </td>
    <td>
      <div class="flex gap-2">
        <% unless user == current_user %>
          <%= link_to toggle_role_admin_user_path(user),
              method: :patch,
              data: { 
                turbo_method: :patch,
                turbo_frame: "user_#{user.id}"
              },
              class: "btn btn-sm btn-outline" do %>
            <% if user.admin? %>Make User<% else %>Make Admin<% end %>
          <% end %>
          
          <%= link_to admin_user_path(user),
              method: :delete,
              data: { 
                turbo_method: :delete,
                turbo_frame: "user_#{user.id}",
                confirm: "Delete #{user.email}? This cannot be undone."
              },
              class: "btn btn-sm btn-error" do %>
            Delete
          <% end %>
        <% else %>
          <span class="text-sm text-base-content/50">Current user</span>
        <% end %>
      </div>
    </td>
  </tr>
<% end %>
```

### 5. Admin Routes
```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "home#index"
  
  # Authentication
  get "sign_in", to: "sessions#new"
  post "sign_in", to: "sessions#create"
  delete "sign_out", to: "sessions#destroy"
  
  # Admin interface
  namespace :admin do
    resources :users do
      member do
        patch :toggle_role
      end
    end
    resources :sessions, only: [:index, :destroy]
  end
  
  # API routes
  namespace :api do
    namespace :auth do
      post 'verify', to: 'auth#verify'
      post 'refresh', to: 'auth#refresh'
      get 'user', to: 'auth#user'
    end
  end
end
```

### 6. Production Security Configuration
```ruby
# config/environments/production.rb
Rails.application.configure do
  # Existing production config...
  
  # Security headers
  config.force_ssl = true
  config.ssl_options = { redirect: { status: 301, port: 443 } }
  
  # Session security
  config.session_store :cookie_store,
    key: '_oceanheart_session',
    domain: '.oceanheart.ai',
    secure: true,
    httponly: true,
    same_site: :lax
  
  # Rate limiting
  config.middleware.use Rack::Attack
  
  # Content Security Policy
  config.content_security_policy do |policy|
    policy.default_src :self, :https
    policy.font_src    :self, :https, :data
    policy.img_src     :self, :https, :data
    policy.object_src  :none
    policy.script_src  :self, :https
    policy.style_src   :self, :https, :unsafe_inline
  end
end
```

### 7. Rate Limiting Configuration
```ruby
# config/initializers/rack_attack.rb
class Rack::Attack
  # Throttle login attempts
  throttle('sessions/create', limit: 5, period: 1.minute) do |req|
    req.ip if req.post? && req.path == '/sign_in'
  end
  
  # Throttle API requests
  throttle('api/req/ip', limit: 100, period: 1.minute) do |req|
    req.ip if req.path.start_with?('/api/')
  end
  
  # Block suspicious requests
  blocklist('block suspicious') do |req|
    req.ip if Rails.env.production? && suspicious?(req)
  end
  
  def self.suspicious?(req)
    # Add your suspicious request detection logic
    false
  end
end
```

### 8. Health Check Endpoint
```ruby
# app/controllers/health_controller.rb
class HealthController < ApplicationController
  skip_before_action :verify_authenticity_token
  
  def show
    render json: {
      status: 'ok',
      timestamp: Time.current.iso8601,
      version: Rails.application.config.version || '1.0.0',
      database: database_status,
      redis: redis_status
    }
  end
  
  private
  
  def database_status
    ActiveRecord::Base.connection.execute('SELECT 1')
    'connected'
  rescue
    'disconnected'
  end
  
  def redis_status
    Redis.new.ping == 'PONG' ? 'connected' : 'disconnected'
  rescue
    'disconnected'
  end
end

# config/routes.rb (add)
get 'health', to: 'health#show'
```

### 9. Render.com Production Configuration
```yaml
# render.yaml
services:
  - type: web
    name: oceanheart-auth
    env: ruby
    buildCommand: bundle install && rails db:migrate && rails db:seed
    startCommand: rails server -h 0.0.0.0 -p $PORT
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: oceanheart-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: oceanheart-redis
          property: connectionString
      - key: RAILS_ENV
        value: production
      - key: RAILS_SERVE_STATIC_FILES
        value: true
      - key: COOKIE_DOMAIN
        value: .oceanheart.ai
      - key: AUTH_URL
        value: https://oceanheart-auth.onrender.com
    healthCheckPath: /health

databases:
  - name: oceanheart-db
    databaseName: oceanheart_auth_production
    plan: free

services:
  - type: redis
    name: oceanheart-redis
    plan: free
```

### 10. Database Seeds for Admin User
```ruby
# db/seeds.rb
# Create admin user for production
if Rails.env.production?
  admin_email = ENV.fetch('ADMIN_EMAIL', 'admin@oceanheart.ai')
  admin_password = ENV.fetch('ADMIN_PASSWORD') { SecureRandom.base64(12) }
  
  admin = User.find_or_create_by(email: admin_email) do |user|
    user.password = admin_password
    user.password_confirmation = admin_password
    user.role = 'admin'
  end
  
  if admin.persisted?
    puts "Admin user created: #{admin_email}"
    puts "Password: #{admin_password}" unless ENV['ADMIN_PASSWORD']
  end
end
```

## Testing Scenarios
1. **Admin Access**: Login as admin → access admin interface
2. **User Management**: Create, view, delete users via Hotwire
3. **Role Management**: Toggle user/admin roles
4. **Search & Filter**: Test user search and role filtering
5. **Security**: Verify non-admin cannot access admin routes

## Success Criteria
- [ ] Admin interface accessible at /admin/users
- [ ] Only admin users can access admin interface
- [ ] User management works via Turbo Streams
- [ ] Search and filtering functions correctly
- [ ] Role toggle works without page refresh
- [ ] Production deployment is secure and stable
- [ ] Health check endpoint responds correctly
- [ ] Rate limiting protects against abuse

## Time Estimate: 6-8 hours

## Total Project Completion
All phases completed → Full Rails 8 + Hotwire authentication system ready for production use across Oceanheart subdomains.