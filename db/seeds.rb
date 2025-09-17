require 'securerandom'

# Ensure a baseline admin user exists in production so deployments always have
# an account that can sign in to manage the application. The block is idempotent
# and safe to run on every deploy.
if Rails.env.production?
  admin_email = ENV.fetch('ADMIN_EMAIL', 'admin@oceanheart.ai')
  explicit_password = ENV['ADMIN_PASSWORD']

  unless User.exists?(email_address: admin_email)
    generated_password = explicit_password || SecureRandom.base64(24)

    User.create!(
      email_address: admin_email,
      password: generated_password,
      password_confirmation: generated_password,
      role: 'admin'
    )

    puts "Seeded admin user: #{admin_email}"
    puts "Generated password: #{generated_password}" unless explicit_password
  else
    puts "Admin user already present: #{admin_email}"
  end
end
