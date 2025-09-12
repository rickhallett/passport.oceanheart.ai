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
