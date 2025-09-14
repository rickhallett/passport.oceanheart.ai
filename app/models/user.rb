class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }
  
  enum :role, { user: 'user', admin: 'admin' }
  
  def admin?
    role == "admin"
  end
  
  def generate_jwt
    JWT.encode(
      { 
        user_id: id, 
        email: email_address, 
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
