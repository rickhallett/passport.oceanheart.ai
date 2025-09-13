class Api::AuthController < ApplicationController
  include JwtAuthentication
  
  skip_forgery_protection
  allow_unauthenticated_access only: %i[ verify refresh ]
  before_action :verify_jwt_api, only: %i[ user ]

  def verify
    token = extract_jwt_token
    return render_unauthorized unless token

    user = User.decode_jwt(token)
    if user
      render json: { 
        valid: true, 
        user: { 
          id: user.id, 
          email: user.email_address 
        } 
      }
    else
      render_unauthorized
    end
  end

  def refresh
    token = extract_jwt_token
    return render_unauthorized unless token

    user = User.decode_jwt(token)
    if user
      new_token = set_jwt_cookie(user)
      render json: { 
        token: new_token,
        user: { 
          id: user.id, 
          email: user.email_address 
        }
      }
    else
      render_unauthorized
    end
  end

  def user
    render json: { 
      user: { 
        id: @current_user.id, 
        email: @current_user.email_address 
      } 
    }
  end

  private

  def render_unauthorized
    render json: { 
      valid: false, 
      error: "Unauthorized", 
      message: "Invalid or expired token" 
    }, status: :unauthorized
  end
end