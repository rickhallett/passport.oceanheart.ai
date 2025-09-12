class SessionsController < ApplicationController
  allow_unauthenticated_access only: %i[ new create ]
  rate_limit to: 10, within: 3.minutes, only: :create, with: -> { redirect_to sign_in_path, alert: "Try again later." }

  def new
  end

  def create
    if user = User.authenticate_by(params.permit(:email_address, :password))
      start_new_session_for user
      
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
        format.html { redirect_to after_authentication_url }
      end
    else
      respond_to do |format|
        format.turbo_stream do
          render turbo_stream: turbo_stream.replace("authentication", 
            partial: "sessions/error")
        end
        format.html { redirect_to sign_in_path, alert: "Try another email address or password." }
      end
    end
  end

  def destroy
    user = current_user
    terminate_session
    
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
      format.html { redirect_to sign_in_path }
    end
  end
end
