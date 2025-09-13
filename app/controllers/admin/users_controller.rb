class Admin::UsersController < ApplicationController
  include AdminAuthorization

  before_action :set_user, only: [:show, :destroy, :toggle_role]

  def index
    @search = params[:search].to_s.strip
    @role = params[:role].presence

    users = User.all
    users = users.where("email_address ILIKE ?", "%#{@search}%") if @search.present?
    users = users.where(role: @role) if @role.present?
    users = users.order(:email_address)

    @page = params.fetch(:page, 1).to_i.clamp(1, 10_000)
    @per = 25
    @total_pages = (users.count / @per.to_f).ceil
    @users = users.offset((@page - 1) * @per).limit(@per)

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def show
  end

  def destroy
    if @user == current_user
      redirect_to admin_users_path, alert: "Cannot delete your own account"
      return
    end

    @user.destroy

    respond_to do |format|
      format.html { redirect_to admin_users_path, notice: 'User deleted successfully' }
      format.turbo_stream { render turbo_stream: turbo_stream.remove(dom_id(@user)) }
    end
  end

  def toggle_role
    if @user == current_user
      redirect_to admin_users_path, alert: "Cannot modify your own role"
      return
    end

    @user.update!(role: @user.admin? ? 'user' : 'admin')

    respond_to do |format|
      format.html { redirect_to admin_users_path, notice: 'Role updated' }
      format.turbo_stream do
        render turbo_stream: turbo_stream.replace(dom_id(@user), partial: 'admin/users/user_row', locals: { user: @user })
      end
    end
  end

  private

  def set_user
    @user = User.find(params[:id])
  end
end

