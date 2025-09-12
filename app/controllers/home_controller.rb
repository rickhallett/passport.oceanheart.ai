class HomeController < ApplicationController
  allow_unauthenticated_access
  before_action :resume_session
  
  def index
    Rails.logger.info "=== HOME CONTROLLER DEBUG ==="
    Rails.logger.info "cookies.signed[:session_id]: #{cookies.signed[:session_id]}"
    Rails.logger.info "Current.session: #{Current.session.inspect}"
    Rails.logger.info "current_user: #{current_user.inspect}"
    Rails.logger.info "authenticated?: #{authenticated?}"
    Rails.logger.info "All cookies: #{cookies.to_h}"
    Rails.logger.info "================================"
  end
end
