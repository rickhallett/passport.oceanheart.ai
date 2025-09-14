module JwtAuthentication
  extend ActiveSupport::Concern

  private

  def verify_jwt
    token = extract_jwt_token
    return redirect_to_login unless token

    @current_user = User.decode_jwt(token)
    redirect_to_login unless @current_user
  end

  def verify_jwt_api
    token = extract_jwt_token
    return render_unauthorized unless token

    @current_user = User.decode_jwt(token)
    render_unauthorized unless @current_user
  end

  def extract_jwt_token
    # Support both old and new cookie names during migration
    cookies[:oh_session] || cookies[:jwt_token] || request.headers['Authorization']&.remove(/^Bearer /)
  end

  def redirect_to_login
    redirect_to new_session_path, alert: "Please log in to continue."
  end

  def render_unauthorized
    render json: { error: "Unauthorized", message: "Invalid or expired token" }, status: :unauthorized
  end

  def set_jwt_cookie(user)
    token = user.generate_jwt
    cookies[:oh_session] = {
      value: token,
      expires: 1.week.from_now,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      domain: cookie_domain_from_env
    }
    token
  end

  def clear_jwt_cookie
    # Clear both old and new cookie names during migration
    cookies.delete(:oh_session, domain: cookie_domain_from_env)
    cookies.delete(:jwt_token, domain: cookie_domain_from_env)
  end

  private

  def jwt_cookie_domain
    cookie_domain_from_env
  end

  def cookie_domain_from_env
    ENV.fetch('COOKIE_DOMAIN') do
      Rails.env.production? ? '.oceanheart.ai' : '.lvh.me'
    end
  end
end