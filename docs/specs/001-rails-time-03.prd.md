# Phase 3: Cross-Domain JWT + API Endpoints

## Objective
Enable authentication across all Oceanheart subdomains using JWT tokens and API endpoints for external service integration.

## Prerequisites
✅ Phase 2 completed - Hotwire authentication working with real-time updates

## Deliverables
- JWT token generation and validation
- Cross-domain cookie configuration 
- API endpoints for token verification
- Subdomain authentication middleware
- Local testing with .lvh.me subdomains

## Manual Test Checkpoint
✅ Login on www.lvh.me:3000 sets cross-domain cookies  
✅ Visit research.lvh.me:3001 - automatically authenticated  
✅ API endpoint /api/auth/verify returns user data  
✅ Token refresh endpoint works  
✅ Logout clears authentication across all subdomains  

## Technical Requirements

### 1. JWT Integration in User Model
```ruby
# app/models/user.rb
class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  
  def generate_jwt
    JWT.encode(
      { 
        user_id: id, 
        email: email, 
        exp: 1.week.from_now.to_i,
        iat: Time.current.to_i
      },
      Rails.application.credentials.secret_key_base,
      'HS256'
    )
  end
  
  def self.decode_jwt(token)
    begin
      payload = JWT.decode(
        token, 
        Rails.application.credentials.secret_key_base, 
        true,
        algorithm: 'HS256'
      )[0]
      find(payload['user_id'])
    rescue JWT::DecodeError, JWT::ExpiredSignature, ActiveRecord::RecordNotFound
      nil
    end
  end
end
```

### 2. JWT Authentication Concern
```ruby
# app/controllers/concerns/jwt_authentication.rb
module JwtAuthentication
  extend ActiveSupport::Concern
  
  def verify_jwt
    token = cookies['oh_session'] || params[:token]
    return redirect_to_auth unless token
    
    @current_user = User.decode_jwt(token)
    redirect_to_auth unless @current_user
  end
  
  def verify_jwt_api
    token = cookies['oh_session'] || 
            request.headers['Authorization']&.remove('Bearer ') ||
            params[:token]
    
    return render_unauthorized unless token
    
    @current_user = User.decode_jwt(token)
    render_unauthorized unless @current_user
  end
  
  private
  
  def redirect_to_auth
    return_to = "#{request.protocol}#{request.host_with_port}#{request.fullpath}"
    auth_url = ENV.fetch('AUTH_URL', 'http://www.lvh.me:3000')
    redirect_to "#{auth_url}/sign_in?return_to=#{CGI.escape(return_to)}", allow_other_host: true
  end
  
  def render_unauthorized
    render json: { error: 'Unauthorized', valid: false }, status: :unauthorized
  end
end
```

### 3. Enhanced Sessions Controller with JWT
```ruby
# app/controllers/sessions_controller.rb
class SessionsController < ApplicationController
  def create
    user = User.authenticate_by(email: params[:email], password: params[:password])
    
    if user
      # Create database session
      session = user.sessions.create!(
        token: SecureRandom.base58(32),
        expires_at: 2.weeks.from_now
      )
      
      # Set Rails session cookie
      cookies.signed[:session_token] = {
        value: session.token,
        expires: session.expires_at,
        domain: cookie_domain
      }
      
      # Set JWT for cross-domain authentication
      jwt_token = user.generate_jwt
      cookies[:oh_session] = {
        value: jwt_token,
        expires: 1.week.from_now,
        domain: cookie_domain,
        httponly: true,
        secure: Rails.env.production?,
        same_site: :lax
      }
      
      handle_successful_authentication(user)
    else
      handle_failed_authentication
    end
  end
  
  def destroy
    if current_session
      current_session.destroy
    end
    
    # Clear both cookies
    cookies.delete(:session_token, domain: cookie_domain)
    cookies.delete(:oh_session, domain: cookie_domain)
    
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: [
          turbo_stream.replace("auth_status", 
            partial: "shared/auth_status", 
            locals: { user: nil }),
          turbo_stream.replace("authentication", 
            partial: "sessions/new")
        ]
      end
      format.html { redirect_to root_path }
    end
  end
  
  private
  
  def cookie_domain
    Rails.env.production? ? '.oceanheart.ai' : '.lvh.me'
  end
  
  def handle_successful_authentication(user)
    return_to = params[:return_to]
    
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: [
          turbo_stream.replace("authentication", 
            partial: "sessions/success", 
            locals: { user: user, return_to: return_to }),
          turbo_stream.replace("auth_status", 
            partial: "shared/auth_status", 
            locals: { user: user })
        ]
      end
      format.html do
        if return_to.present? && return_to.start_with?('http')
          redirect_to return_to, allow_other_host: true
        else
          redirect_to root_path
        end
      end
    end
  end
  
  def handle_failed_authentication
    respond_to do |format|
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace("authentication", 
          partial: "sessions/error")
      end
      format.html { render :new, status: :unprocessable_entity }
    end
  end
end
```

### 4. API Authentication Controller
```ruby
# app/controllers/api/auth_controller.rb
class Api::AuthController < ApplicationController
  skip_before_action :verify_authenticity_token
  before_action :verify_jwt_api, except: [:verify, :refresh]
  
  def verify
    token = params[:token] || cookies['oh_session']
    
    if token && (user = User.decode_jwt(token))
      render json: {
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        token: token
      }
    else
      render json: { 
        valid: false, 
        error: 'Invalid or expired token' 
      }, status: :unauthorized
    end
  end
  
  def refresh
    token = params[:token] || cookies['oh_session']
    return render_unauthorized unless token
    
    begin
      # Decode without expiration verification for refresh
      payload = JWT.decode(
        token,
        Rails.application.credentials.secret_key_base,
        true,
        { algorithm: 'HS256', verify_expiration: false }
      )[0]
      
      user = User.find(payload['user_id'])
      
      # Only refresh if expired less than 1 day ago
      if payload['exp'] > 1.day.ago.to_i
        new_token = user.generate_jwt
        render json: { 
          token: new_token,
          user: {
            id: user.id,
            email: user.email
          }
        }
      else
        render json: { 
          error: 'Token too old for refresh' 
        }, status: :unauthorized
      end
      
    rescue JWT::DecodeError, ActiveRecord::RecordNotFound
      render json: { 
        error: 'Invalid token' 
      }, status: :unauthorized
    end
  end
  
  def user
    render json: {
      id: @current_user.id,
      email: @current_user.email,
      created_at: @current_user.created_at
    }
  end
  
  private
  
  def render_unauthorized
    render json: { error: 'Unauthorized' }, status: :unauthorized
  end
end
```

### 5. API Routes
```ruby
# config/routes.rb
Rails.application.routes.draw do
  root "home#index"
  
  # Authentication routes
  get "sign_in", to: "sessions#new"
  post "sign_in", to: "sessions#create"
  delete "sign_out", to: "sessions#destroy"
  
  get "sign_up", to: "registrations#new"
  post "sign_up", to: "registrations#create"
  
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

### 6. CORS Configuration
```ruby
# config/application.rb
module OceanheartAuth
  class Application < Rails::Application
    # Existing configuration...
    
    # CORS for subdomains
    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins '.oceanheart.ai', '.lvh.me'
        resource '/api/*',
          headers: :any,
          methods: [:get, :post, :options],
          credentials: true
      end
    end
  end
end
```

### 7. Sample External Service Integration
```javascript
// Example for research.oceanheart.ai (Node.js/Next.js)
// utils/auth.js
export async function verifyAuth() {
  try {
    const response = await fetch('http://www.lvh.me:3000/api/auth/verify', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.valid ? data.user : null;
    }
    return null;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

// Middleware example
export function withAuth(handler) {
  return async (req, res) => {
    const user = await verifyAuth();
    if (!user) {
      return res.redirect('http://www.lvh.me:3000/sign_in?return_to=' + 
        encodeURIComponent(req.url));
    }
    req.user = user;
    return handler(req, res);
  };
}
```

### 8. Environment Configuration Updates
```bash
# .env.development
DATABASE_URL=postgresql://localhost/oceanheart_auth_development
REDIS_URL=redis://localhost:6379/0
COOKIE_DOMAIN=.lvh.me
AUTH_URL=http://www.lvh.me:3000
CORS_ORIGINS=.lvh.me

# .env.production
DATABASE_URL=(Render provides)
REDIS_URL=(Render provides)
COOKIE_DOMAIN=.oceanheart.ai
AUTH_URL=https://your-app.onrender.com
CORS_ORIGINS=.oceanheart.ai
```

### 9. Local Development Setup Script
```bash
#!/bin/bash
# scripts/setup_subdomains.sh

echo "Setting up local subdomain testing..."

# Add to /etc/hosts if not exists
if ! grep -q "lvh.me" /etc/hosts; then
  echo "127.0.0.1 www.lvh.me" | sudo tee -a /etc/hosts
  echo "127.0.0.1 research.lvh.me" | sudo tee -a /etc/hosts  
  echo "127.0.0.1 clinic.lvh.me" | sudo tee -a /etc/hosts
  echo "127.0.0.1 passport.lvh.me" | sudo tee -a /etc/hosts
  echo "127.0.0.1 labs.lvh.me" | sudo tee -a /etc/hosts
fi

echo "Subdomains configured. Test with:"
echo "- http://www.lvh.me:3000 (main auth app)"
echo "- http://research.lvh.me:3001 (external service)"
```

## Testing Scenarios
1. **Cross-domain cookies**: Login on www → check cookies on research
2. **API verification**: Call /api/auth/verify from external service
3. **Token refresh**: Test expired token refresh flow
4. **Logout sync**: Logout on www → verify logged out on research

## Success Criteria
- [ ] JWT tokens generated and validated correctly
- [ ] Cross-domain cookies set with proper domain (.lvh.me)
- [ ] API /api/auth/verify returns user data for valid tokens
- [ ] API /api/auth/refresh works for expired tokens
- [ ] External service can authenticate using JWT
- [ ] Logout clears authentication across subdomains
- [ ] CORS configured for subdomain requests
- [ ] Local testing works with .lvh.me subdomains

## Time Estimate: 6-8 hours