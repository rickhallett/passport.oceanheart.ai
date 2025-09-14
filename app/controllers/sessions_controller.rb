class SessionsController < ApplicationController
  include JwtAuthentication
  
  allow_unauthenticated_access only: %i[ new create ]
  rate_limit to: 10, within: 3.minutes, only: :create, with: -> { redirect_to sign_in_path, alert: "Try again later." }

  def new
    @return_to = sanitize_return_url(params[:returnTo])
  end

  def create
    if user = User.authenticate_by(params.permit(:email_address, :password))
      start_new_session_for user
      set_jwt_cookie(user)
      
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
        format.html { redirect_to return_url_or_default }
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
    clear_jwt_cookie

    # Always navigate back to home on sign out (single user action)
    redirect_to root_path, status: :see_other
  end

  private

  def return_url_or_default
    return_to = sanitize_return_url(params[:returnTo] || session[:return_to])
    session.delete(:return_to)
    return_to || after_authentication_url
  end

  def sanitize_return_url(url)
    return nil if url.blank?
    
    begin
      uri = URI.parse(url)
      return nil unless allowed_redirect_host?(uri.host)
      url
    rescue URI::InvalidURIError
      nil
    end
  end

  def allowed_redirect_host?(host)
    return false if host.nil?
    
    allowed_hosts = if Rails.env.production?
      [
        'oceanheart.ai',
        'www.oceanheart.ai',
        /\A[a-z0-9-]+\.oceanheart\.ai\z/
      ]
    else
      [
        'lvh.me',
        /\A[a-z0-9-]+\.lvh\.me\z/,
        'localhost'
      ]
    end
    
    allowed_hosts.any? do |allowed|
      allowed.is_a?(Regexp) ? host =~ allowed : host == allowed
    end
  end
end
