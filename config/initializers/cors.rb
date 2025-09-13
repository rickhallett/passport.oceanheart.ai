Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    if Rails.env.development?
      origins %r{https?://.*\.lvh\.me(:\d+)?$}
    else
      origins %r{https://.*\.oceanheart\.ai$}
    end
    
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true,
      expose: ['Authorization']
  end
end