class Api::AuthController < ApplicationController
  include JwtAuthentication

  skip_forgery_protection
  allow_unauthenticated_access only: %i[ verify refresh signin ]
  before_action :verify_jwt_api, only: %i[ user signout ]

  def verify
    # Accept token from request body or headers/cookies
    token = params[:token] || extract_jwt_token
    return render_unauthorized unless token

    user = User.decode_jwt(token)
    if user
      render json: {
        valid: true,
        user: {
          userId: user.id,
          email: user.email_address,
          role: user.role
        }
      }
    else
      render_unauthorized
    end
  end

  def refresh
    token = params[:token] || extract_jwt_token
    return render_unauthorized unless token

    user = User.decode_jwt(token)
    if user
      new_token = set_jwt_cookie(user)
      render json: {
        success: true,
        token: new_token,
        user: {
          userId: user.id,
          email: user.email_address,
          role: user.role
        }
      }
    else
      render_unauthorized
    end
  end

  def signin
    user = User.authenticate_by(
      email_address: params[:email],
      password: params[:password]
    )

    if user
      token = set_jwt_cookie(user)
      render json: {
        success: true,
        token: token,
        user: {
          userId: user.id,
          email: user.email_address,
          role: user.role
        }
      }
    else
      render json: {
        success: false,
        error: "Invalid email or password"
      }, status: :unauthorized
    end
  end

  def signout
    clear_jwt_cookie
    render json: {
      success: true,
      message: "Successfully signed out"
    }
  end

  def user
    render json: {
      user: {
        userId: @current_user.id,
        email: @current_user.email_address,
        role: @current_user.role
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
