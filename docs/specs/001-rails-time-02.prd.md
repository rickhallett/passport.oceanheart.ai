# Phase 2: Hotwire Integration + Real-time Features

## Objective
Transform basic authentication into a dynamic, real-time experience using Hotwire 2.0 (Turbo + Stimulus).

## Prerequisites
✅ Phase 1 completed - basic Rails 8 authentication working

## Deliverables
- Hotwire-powered authentication forms
- Real-time authentication state updates
- Turbo Streams for dynamic UI
- Stimulus controllers for enhanced UX
- Redis integration for broadcasting

## Manual Test Checkpoint
✅ Login form submits without page refresh  
✅ Authentication status updates instantly  
✅ Multiple browser tabs show synced auth state  
✅ Smooth animations and transitions  
✅ No JavaScript errors in console  

## Technical Requirements

### 1. Hotwire Dependencies
```ruby
# Already included in Rails 8, but verify:
gem 'turbo-rails', '~> 2.0'
gem 'stimulus-rails', '~> 1.3'
```

### 2. Redis Setup
```bash
# Local development
brew install redis
redis-server

# Add to .env
REDIS_URL=redis://localhost:6379/0
```

### 3. Authentication Views with Turbo Frames
```erb
<!-- app/views/sessions/new.html.erb -->
<%= turbo_frame_tag "authentication" do %>
  <div class="auth-container">
    <%= form_with url: sign_in_path, 
        local: false, 
        data: { 
          turbo_frame: "authentication",
          controller: "auth",
          action: "turbo:submit-end->auth#handleResponse"
        } do |f| %>
      
      <div class="form-group">
        <%= f.email_field :email, 
            placeholder: "Email", 
            required: true,
            class: "input input-bordered w-full",
            data: { auth_target: "email" } %>
      </div>
      
      <div class="form-group">
        <%= f.password_field :password, 
            placeholder: "Password", 
            required: true,
            class: "input input-bordered w-full",
            data: { auth_target: "password" } %>
      </div>
      
      <%= f.submit "Sign In", 
          class: "btn btn-primary w-full",
          data: { auth_target: "submit" } %>
    <% end %>
  </div>
<% end %>
```

### 4. Enhanced Session Model with Broadcasting
```ruby
# app/models/session.rb
class Session < ApplicationRecord
  belongs_to :user
  
  after_create_commit :broadcast_auth_update
  after_destroy_commit :broadcast_auth_update
  
  private
  
  def broadcast_auth_update
    broadcast_replace_to(
      "user_#{user_id}_auth",
      target: "auth_status",
      partial: "shared/auth_status",
      locals: { user: user }
    )
  end
end
```

### 5. Stimulus Auth Controller
```javascript
// app/javascript/controllers/auth_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["email", "password", "submit", "status"]
  
  connect() {
    console.log("Auth controller connected")
    this.updateStatus("Ready")
  }
  
  handleResponse(event) {
    if (event.detail.success) {
      this.updateStatus("Authentication successful")
      this.clearForm()
    } else {
      this.updateStatus("Authentication failed", "error")
      this.shakeForm()
    }
  }
  
  updateStatus(message, type = "info") {
    if (this.hasStatusTarget) {
      this.statusTarget.textContent = message
      this.statusTarget.className = `status status-${type}`
    }
  }
  
  clearForm() {
    if (this.hasEmailTarget) this.emailTarget.value = ""
    if (this.hasPasswordTarget) this.passwordTarget.value = ""
  }
  
  shakeForm() {
    this.element.classList.add("shake")
    setTimeout(() => this.element.classList.remove("shake"), 500)
  }
}
```

### 6. Enhanced Sessions Controller
```ruby
# app/controllers/sessions_controller.rb
class SessionsController < ApplicationController
  def new
    # Turbo Frame will load this
  end
  
  def create
    user = User.authenticate_by(email: params[:email], password: params[:password])
    
    if user
      session = user.sessions.create!(
        token: SecureRandom.base58(32),
        expires_at: 2.weeks.from_now
      )
      
      cookies.signed[:session_token] = {
        value: session.token,
        expires: session.expires_at,
        domain: Rails.env.production? ? '.oceanheart.ai' : '.lvh.me'
      }
      
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: [
            turbo_stream.replace("authentication", 
              partial: "sessions/success", 
              locals: { user: user }),
            turbo_stream.replace("auth_status", 
              partial: "shared/auth_status", 
              locals: { user: user })
          ]
        end
        format.html { redirect_to root_path }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace("authentication", 
            partial: "sessions/error")
        end
        format.html { render :new, status: :unprocessable_entity }
      end
    end
  end
  
  def destroy
    if current_session
      current_session.destroy
      cookies.delete(:session_token, domain: Rails.env.production? ? '.oceanheart.ai' : '.lvh.me')
    end
    
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
end
```

### 7. Real-time Status Partial
```erb
<!-- app/views/shared/_auth_status.html.erb -->
<div id="auth_status" class="auth-status">
  <% if user %>
    <div class="flex items-center space-x-2">
      <div class="badge badge-success">✓</div>
      <span>Authenticated as <%= user.email %></span>
      <%= link_to "Sign Out", 
          sign_out_path, 
          method: :delete,
          data: { 
            turbo_method: :delete,
            turbo_frame: "_top"
          },
          class: "btn btn-sm btn-ghost" %>
    </div>
  <% else %>
    <div class="flex items-center space-x-2">
      <div class="badge badge-error">✗</div>
      <span>Not authenticated</span>
    </div>
  <% end %>
</div>
```

### 8. Layout Integration
```erb
<!-- app/views/layouts/application.html.erb -->
<!DOCTYPE html>
<html>
<head>
  <!-- existing head content -->
  <%= turbo_include_tags %>
  <%= stimulus_include_tags %>
</head>
<body>
  <!-- Auth status broadcast target -->
  <%= turbo_stream_from "user_#{current_user&.id}_auth" if current_user %>
  
  <nav class="navbar">
    <%= render "shared/auth_status", user: current_user %>
  </nav>
  
  <main>
    <%= turbo_frame_tag "authentication" do %>
      <% unless current_user %>
        <%= render "sessions/new" %>
      <% end %>
    <% end %>
    
    <%= yield %>
  </main>
</body>
</html>
```

### 9. CSS for Smooth Animations
```css
/* app/assets/stylesheets/auth.css */
.auth-container {
  transition: all 0.3s ease;
}

.shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}

.auth-status {
  transition: all 0.2s ease;
}
```

## Testing Scenarios
1. **Single Tab**: Login → status updates immediately
2. **Multiple Tabs**: Login in tab A → tab B status updates
3. **Form Validation**: Invalid credentials → smooth error display
4. **Network Issues**: Slow connection → proper loading states

## Success Criteria
- [ ] Login form submits via Turbo (no page refresh)
- [ ] Authentication status updates in real-time
- [ ] Multiple browser tabs stay in sync
- [ ] Error messages display smoothly
- [ ] Logout works with Turbo Streams
- [ ] Redis broadcasts working locally
- [ ] No JavaScript console errors
- [ ] Smooth animations and transitions

## Time Estimate: 6-8 hours