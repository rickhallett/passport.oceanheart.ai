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
    cookies[:jwt_token] || request.headers['Authorization']&.remove(/^Bearer /)
  end

  def redirect_to_login
    redirect_to new_session_path, alert: "Please log in to continue."
  end

  def render_unauthorized
    render json: { error: "Unauthorized", message: "Invalid or expired token" }, status: :unauthorized
  end

  def set_jwt_cookie(user)
    token = user.generate_jwt
    cookies[:jwt_token] = {
      value: token,
      expires: 1.week.from_now,
      httponly: true,
      secure: Rails.env.production?,
      same_site: :lax,
      domain: jwt_cookie_domain
    }
    token
  end

  def clear_jwt_cookie
    cookies.delete(:jwt_token, domain: jwt_cookie_domain)
  end

  private

  def jwt_cookie_domain
    if Rails.env.development?
      '.lvh.me'
    else
      '.oceanheart.ai'
    end
  end
end