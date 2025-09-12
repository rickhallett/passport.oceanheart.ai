# PRD: Rails 8 + Hotwire Authentication Solutions for Oceanheart.ai

## Summary
Implement a self-hosted authentication solution using Rails 8's native authentication generator and Hotwire for `www.oceanheart.ai` and conditional authentication across subdomains (research, clinic, admin, labs). The solution leverages Rails 8's built-in authentication features and Hotwire 2.0 for real-time, interactive user experiences without third-party API dependencies.

## Requirements
- **Primary Domain**: `www.oceanheart.ai` (Rails 8 app with full authentication)
- **Subdomains**: `research.oceanheart.ai`, `clinic.oceanheart.ai`, `passport.oceanheart.ai`, `labs.oceanheart.ai` (various stacks, conditional auth)
- **Admin Panel**: `passport.oceanheart.ai` provides user management via Hotwire interfaces
- **Authentication**: Email/password using Rails 8 native auth generator (no SSO complexity, no password reset for MVP)
- **Session Sharing**: Across all subdomains via domain cookies and JWT tokens
- **Real-time Updates**: Hotwire 2.0 for dynamic UI updates and broadcasting
- **Security**: Production-ready, secure implementation with Rails 8 security defaults

## Current State Analysis
- **Current Provider**: Supabase Auth with SSR cookies
- **Cookie Domain**: Already configured for `.oceanheart.ai`
- **Integration**: Deep integration with Next.js middleware and API routes
- **Migration Target**: Rails 8 with native authentication and PostgreSQL

## Tech Stack Overview

### Rails 8 Features (2025)
- **Ruby Version**: 3.4.5 (latest stable for macOS)
- **Rails Version**: 8.0+ (released November 2024)
- **Native Authentication**: Built-in authentication generator
- **Hotwire 2.0**: Enhanced Turbo Streams, Stimulus, and real-time capabilities
- **Database**: PostgreSQL with Active Record
- **Background Jobs**: Solid Queue (Rails 8 default)
- **Caching**: Solid Cache (Rails 8 default)

### Key Dependencies
```ruby
# Gemfile
gem 'rails', '~> 8.0'
gem 'pg', '~> 1.1'
gem 'redis', '~> 5.0'
gem 'bcrypt', '~> 3.1.7'
gem 'jwt', '~> 2.7'
gem 'hotwire-rails', '~> 0.1'
gem 'turbo-rails', '~> 2.0'
gem 'stimulus-rails', '~> 1.3'
gem 'solid_queue'
gem 'solid_cache'
```

## Top 3 Authentication Solutions (Rails 8 Focused)

### 1. **Rails 8 Native Authentication + JWT for Cross-Domain** ⭐⭐⭐⭐⭐
**Recommended - Leverages Rails 8's new authentication features**

**Pros:**
- Rails 8's built-in authentication generator provides secure defaults
- Native session management with database-backed sessions
- Hotwire 2.0 integration for real-time authentication flows
- JWT tokens for cross-subdomain authentication
- Minimal external dependencies
- Built-in password encryption and session handling
- Easy integration with existing PostgreSQL setup
- Turbo Streams for dynamic authentication UI updates

**Cons:**
- Need to extend Rails auth for JWT cross-domain functionality
- Manual admin interface creation (though Hotwire simplifies this)
- Custom rate limiting implementation needed

**Implementation Estimate:** 3-4 days
**Complexity:** Low-Medium
**Maintenance:** Low

---

### 2. **Rails 8 Native Auth + ActionCable for Real-time** ⭐⭐⭐⭐
**Good alternative with enhanced real-time features**

**Pros:**
- Full Rails 8 native authentication integration
- ActionCable for real-time authentication state broadcasting
- Hotwire Turbo Streams for instant UI updates
- Built-in Rails security best practices
- Strong WebSocket support for multi-device session management
- Native Rails session store with Redis backing

**Cons:**
- ActionCable adds complexity for simple auth needs
- Requires Redis for ActionCable scaling
- More infrastructure overhead than JWT-only approach

**Implementation Estimate:** 4-5 days
**Complexity:** Medium
**Maintenance:** Medium

---

### 3. **Hybrid: Rails 8 Auth + Devise + Hotwire** ⭐⭐⭐
**Fallback option if more authentication features needed**

**Pros:**
- Combines Rails 8 improvements with Devise maturity
- Hotwire integration for dynamic authentication flows
- Extensive authentication feature set
- Well-documented and battle-tested
- Rich ecosystem of extensions

**Cons:**
- Goes against Rails 8's "batteries included" philosophy
- Heavier dependency footprint
- Potential conflicts with Rails 8 native auth features
- More complex configuration and customization

**Implementation Estimate:** 5-6 days
**Complexity:** Medium-High
**Maintenance:** Medium

---

## Recommended Solution: Rails 8 Native Authentication + JWT + Hotwire

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ www.oceanheart. │    │ PostgreSQL       │    │ passport.       │
│ ai (Rails 8)    │◄──►│ users table      │◄──►│ oceanheart.ai   │
│ + Hotwire       │    │ sessions table   │    │ (Admin Panel)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                ▲
                                │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ research.       │◄───┤ JWT + Domain    │───►│ clinic.         │
│ oceanheart.ai   │    │ Cookies         │    │ oceanheart.ai   │
└─────────────────┘    │ (.oceanheart.ai)│    └─────────────────┘
                       │ + Turbo Streams │
                       └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │ labs.           │
                       │ oceanheart.ai   │
                       └─────────────────┘
```

### Implementation Plan

#### Phase 1: Rails 8 Authentication Setup (1.5 days)
1. **Generate Rails 8 Authentication**
   ```bash
   rails new oceanheart_auth --database=postgresql
   cd oceanheart_auth
   rails generate authentication
   ```

2. **Database Schema** (Rails 8 auth generator provides)
   - `users` table with email, password_digest, created_at, updated_at
   - `sessions` table with user_id, token, expires_at
   - Built-in password encryption with bcrypt

3. **Extend for JWT Cross-Domain**
   ```ruby
   # app/models/user.rb
   class User < ApplicationRecord
     has_secure_password
     has_many :sessions, dependent: :destroy
     
     def generate_jwt
       JWT.encode(
         { user_id: id, email: email, exp: 1.week.from_now.to_i },
         Rails.application.credentials.secret_key_base,
         'HS256'
       )
     end
   end
   ```

#### Phase 2: Hotwire Integration (1 day)
1. **Authentication Views with Hotwire**
   ```erb
   <!-- app/views/sessions/new.html.erb -->
   <%= turbo_frame_tag "authentication" do %>
     <%= form_with url: sign_in_path, local: false, data: { turbo_frame: "authentication" } do |f| %>
       <%= f.email_field :email, placeholder: "Email", required: true %>
       <%= f.password_field :password, placeholder: "Password", required: true %>
       <%= f.submit "Sign In", class: "btn btn-primary" %>
     <% end %>
   <% end %>
   ```

2. **Real-time Authentication State Broadcasting**
   ```ruby
   # app/models/session.rb
   class Session < ApplicationRecord
     belongs_to :user
     
     after_create_commit { broadcast_authentication_update }
     after_destroy_commit { broadcast_authentication_update }
     
     private
     
     def broadcast_authentication_update
       broadcast_update_to "user_#{user_id}_auth", target: "auth_status"
     end
   end
   ```

3. **Stimulus Controllers for Auth**
   ```javascript
   // app/javascript/controllers/auth_controller.js
   import { Controller } from "@hotwired/stimulus"
   
   export default class extends Controller {
     static targets = ["form", "status"]
     
     connect() {
       this.statusTarget.textContent = "Connected"
     }
     
     signInSuccess(event) {
       // Handle successful authentication
       this.statusTarget.textContent = "Authenticated"
     }
   }
   ```

#### Phase 3: Cross-Domain JWT Integration (1 day)
1. **JWT Verification Middleware**
   ```ruby
   # app/controllers/concerns/jwt_authentication.rb
   module JwtAuthentication
     extend ActiveSupport::Concern
     
     def verify_jwt
       token = cookies['oh_session']
       return redirect_to_auth unless token
       
       begin
         payload = JWT.decode(token, Rails.application.credentials.secret_key_base, algorithm: 'HS256')[0]
         @current_user = User.find(payload['user_id'])
       rescue JWT::DecodeError
         redirect_to_auth
       end
     end
     
     private
     
     def redirect_to_auth
       return_to = "#{request.protocol}#{request.host_with_port}#{request.fullpath}"
       redirect_to "#{ENV['AUTH_URL']}/sign_in?return_to=#{CGI.escape(return_to)}"
     end
   end
   ```

2. **Cross-Domain Cookie Setting**
   ```ruby
   # app/controllers/sessions_controller.rb
   class SessionsController < ApplicationController
     def create
       user = User.authenticate_by(email: params[:email], password: params[:password])
       
       if user
         session = user.sessions.create!(
           token: SecureRandom.base58(32),
           expires_at: 2.weeks.from_now
         )
         
         # Set session cookie
         cookies.signed[:session_token] = {
           value: session.token,
           expires: session.expires_at,
           domain: Rails.env.production? ? '.oceanheart.ai' : '.lvh.me'
         }
         
         # Set JWT for cross-domain
         jwt_token = user.generate_jwt
         cookies[:oh_session] = {
           value: jwt_token,
           expires: 1.week.from_now,
           domain: Rails.env.production? ? '.oceanheart.ai' : '.lvh.me',
           httponly: true,
           secure: Rails.env.production?
         }
         
         respond_to do |format|
           format.turbo_stream { render turbo_stream: turbo_stream.replace("authentication", partial: "auth_success") }
           format.html { redirect_to params[:return_to] || root_path }
         end
       else
         respond_to do |format|
           format.turbo_stream { render turbo_stream: turbo_stream.replace("authentication", partial: "auth_error") }
           format.html { render :new, status: :unprocessable_entity }
         end
       end
     end
   end
   ```

#### Phase 4: Admin Interface with Hotwire (0.5 days)
1. **User Management Interface**
   ```erb
   <!-- app/views/admin/users/index.html.erb -->
   <%= turbo_frame_tag "users_list" do %>
     <div class="overflow-x-auto">
       <table class="table w-full">
         <thead>
           <tr>
             <th>Email</th>
             <th>Created</th>
             <th>Actions</th>
           </tr>
         </thead>
         <tbody>
           <% @users.each do |user| %>
             <%= turbo_frame_tag "user_#{user.id}" do %>
               <tr>
                 <td><%= user.email %></td>
                 <td><%= user.created_at.strftime("%b %d, %Y") %></td>
                 <td>
                   <%= link_to "Delete", admin_user_path(user), 
                       method: :delete, 
                       data: { 
                         turbo_method: :delete,
                         turbo_frame: "user_#{user.id}",
                         confirm: "Are you sure?" 
                       },
                       class: "btn btn-sm btn-error" %>
                 </td>
               </tr>
             <% end %>
           <% end %>
         </tbody>
       </table>
     </div>
   <% end %>
   ```

### API Endpoints for External Subdomains

1. **Token Verification** (`/api/auth/verify`)
   ```ruby
   # app/controllers/api/auth_controller.rb
   class Api::AuthController < ApplicationController
     skip_before_action :verify_authenticity_token
     
     def verify
       token = params[:token]
       
       begin
         payload = JWT.decode(token, Rails.application.credentials.secret_key_base, algorithm: 'HS256')[0]
         user = User.find(payload['user_id'])
         
         render json: { 
           valid: true, 
           user: { id: user.id, email: user.email } 
         }
       rescue JWT::DecodeError, ActiveRecord::RecordNotFound
         render json: { valid: false }, status: :unauthorized
       end
     end
     
     def refresh
       token = params[:token]
       
       begin
         payload = JWT.decode(token, Rails.application.credentials.secret_key_base, algorithm: 'HS256', verify_expiration: false)[0]
         user = User.find(payload['user_id'])
         
         # Check if token is within refresh window (e.g., expired less than 1 day ago)
         if payload['exp'] > 1.day.ago.to_i
           new_token = user.generate_jwt
           render json: { token: new_token }
         else
           render json: { error: 'Token too old for refresh' }, status: :unauthorized
         end
       rescue JWT::DecodeError, ActiveRecord::RecordNotFound
         render json: { error: 'Invalid token' }, status: :unauthorized
       end
     end
   end
   ```

### Environment Configuration

#### Development (.env.development)
```bash
# Database
DATABASE_URL=postgresql://localhost/oceanheart_auth_development

# Authentication
JWT_SECRET=your-development-jwt-secret-min-32-characters
COOKIE_DOMAIN=.lvh.me
AUTH_URL=http://www.lvh.me:3000

# Redis for ActionCable/Turbo Broadcasting
REDIS_URL=redis://localhost:6379/0

# Rails 8 Defaults
SOLID_QUEUE_DATABASE_URL=postgresql://localhost/oceanheart_auth_development
SOLID_CACHE_DATABASE_URL=postgresql://localhost/oceanheart_auth_development
```

#### Production (.env.production)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/oceanheart_auth_production

# Authentication
JWT_SECRET=your-production-jwt-secret-min-32-characters
COOKIE_DOMAIN=.oceanheart.ai
AUTH_URL=https://www.oceanheart.ai

# Redis
REDIS_URL=redis://your-redis-host:6379/0

# Rails 8 Production
SOLID_QUEUE_DATABASE_URL=postgresql://user:password@host:port/oceanheart_auth_production
SOLID_CACHE_DATABASE_URL=postgresql://user:password@host:port/oceanheart_auth_production
```

### Security Features

1. **Rails 8 Security Defaults**
   - Built-in CSRF protection
   - Secure password encryption with bcrypt
   - Session security with signed cookies
   - SQL injection prevention with Active Record

2. **Enhanced Security**
   ```ruby
   # config/application.rb
   config.force_ssl = Rails.env.production?
   config.session_store :cookie_store, 
     key: '_oceanheart_session',
     domain: Rails.env.production? ? '.oceanheart.ai' : '.lvh.me',
     secure: Rails.env.production?,
     httponly: true,
     same_site: :lax
   ```

3. **Rate Limiting** (Rails 8 built-in)
   ```ruby
   # app/controllers/sessions_controller.rb
   class SessionsController < ApplicationController
     rate_limit to: 5, within: 1.minute, only: :create
   end
   ```

### Hotwire Real-time Features

1. **Live Authentication Status**
   ```erb
   <!-- Shared layout partial -->
   <%= turbo_stream_from "user_#{current_user&.id}_auth" %>
   <div id="auth_status">
     <% if current_user %>
       <span class="badge badge-success">Authenticated as <%= current_user.email %></span>
     <% else %>
       <span class="badge badge-error">Not authenticated</span>
     <% end %>
   </div>
   ```

2. **Real-time Session Management**
   ```javascript
   // app/javascript/controllers/session_controller.js
   import { Controller } from "@hotwired/stimulus"
   
   export default class extends Controller {
     static values = { userId: Number }
     
     connect() {
       if (this.userIdValue) {
         // Subscribe to real-time session updates
         this.subscription = window.App.cable.subscriptions.create(
           { channel: "SessionChannel", user_id: this.userIdValue },
           {
             received: (data) => {
               if (data.action === 'session_expired') {
                 this.handleSessionExpired()
               }
             }
           }
         )
       }
     }
     
     handleSessionExpired() {
       window.location.reload()
     }
   }
   ```

### Migration Strategy from Supabase

1. **Phase 1: Parallel Development**
   - Develop Rails 8 auth system alongside existing Supabase
   - Test with feature flags

2. **Phase 2: User Data Migration**
   ```ruby
   # db/migrate/xxx_migrate_from_supabase.rb
   class MigrateFromSupabase < ActiveRecord::Migration[8.0]
     def up
       # Export users from Supabase
       # Import into Rails 8 users table
       # Generate new password reset tokens for transition
     end
   end
   ```

3. **Phase 3: DNS Cutover**
   - Switch DNS to point to Rails 8 application
   - Maintain backward compatibility during transition

## Success Criteria

- [ ] User can sign in on `www.oceanheart.ai` using Rails 8 native auth
- [ ] Session works across all subdomains without re-authentication
- [ ] Admin panel on `passport.oceanheart.ai` can manage users via Hotwire
- [ ] Real-time authentication state updates via Turbo Streams
- [ ] No third-party API dependencies for authentication
- [ ] Performance equivalent or better than current Supabase setup
- [ ] Security audit passes for production deployment
- [ ] Hotwire features provide smooth, JavaScript-minimal user experience

## Implementation Timeline

- **Day 1**: Rails 8 auth generation + database setup + JWT extension
- **Day 2**: Hotwire integration + real-time features + Turbo Streams
- **Day 3**: Cross-domain JWT implementation + API endpoints
- **Day 4**: Admin interface + testing + production deployment

**Total Estimate: 4 days for full implementation**

## Rails 8 + Hotwire Advantages

1. **Modern Stack**: Latest Rails 8 with built-in authentication
2. **Real-time UI**: Hotwire 2.0 for instant updates without JavaScript complexity
3. **Security**: Rails 8's enhanced security defaults and best practices
4. **Performance**: Solid Queue and Solid Cache for optimal performance
5. **Developer Experience**: Rails 8's improved tooling and generators
6. **Future-Proof**: Built on Rails 8's long-term architectural decisions

This Rails 8 + Hotwire solution provides a modern, secure, and maintainable authentication system that leverages the latest Rails features while maintaining the simplicity and control required for the Oceanheart ecosystem.