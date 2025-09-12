class RegistrationsController < ApplicationController
  allow_unauthenticated_access
  
  def new
    @user = User.new
  end

  def create
    @user = User.new(registration_params)
    
    if @user.save
      start_new_session_for @user
      redirect_to root_path, notice: "Welcome! Your account has been created successfully."
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  private
  
  def registration_params
    params.require(:user).permit(:email_address, :password, :password_confirmation)
  end
end
