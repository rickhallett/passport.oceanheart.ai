Rails.application.routes.draw do
  root "home#index"
  
  # Authentication routes  
  get "sign_in", to: "sessions#new"
  post "sign_in", to: "sessions#create"
  delete "sign_out", to: "sessions#destroy"
  
  get "sign_up", to: "registrations#new"
  post "sign_up", to: "registrations#create"
  
  resource :session, only: [:show, :destroy]
  resources :passwords, param: :token
  
  # API routes for cross-domain authentication
  namespace :api do
    post 'auth/verify', to: 'auth#verify'
    post 'auth/refresh', to: 'auth#refresh'
    post 'auth/signin', to: 'auth#signin'
    delete 'auth/signout', to: 'auth#signout'
    get 'auth/user', to: 'auth#user'
  end

  # Admin interface
  namespace :admin do
    resources :users, only: [:index, :show, :destroy] do
      post :toggle_role, on: :member
    end
    root to: 'users#index'
  end
  
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/* (remember to link manifest in application.html.erb)
  # get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  # get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
end
