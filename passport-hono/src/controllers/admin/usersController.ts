import { Context } from 'hono';
import { userService } from '../../services/users';
import { sessionService } from '../../services/sessions';

export const adminUsersController = {
  async list(c: Context) {
    try {
      const users = await userService.listUsers(50, 0);
      const stats = await userService.getUserStats();
      
      // Render admin users page
      return c.html(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Admin - Users - Passport</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="/assets/application.css" rel="stylesheet">
          </head>
          <body>
            <div class="min-h-screen bg-gradient-to-br from-gray-900 to-black">
              <nav class="bg-gray-900/50 backdrop-blur-lg border-b border-gray-800">
                <div class="container mx-auto px-4 py-4">
                  <div class="flex justify-between items-center">
                    <div class="flex items-center gap-4">
                      <a href="/" class="text-xl font-bold text-white">Passport</a>
                      <span class="text-gray-400">Admin</span>
                    </div>
                    <div class="flex items-center gap-4">
                      <form method="POST" action="/sign_out" style="display: inline;">
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="text-red-400 hover:text-red-300">
                          Sign Out
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </nav>
              
              <div class="container mx-auto px-4 py-16">
                <div class="max-w-6xl mx-auto">
                  <div class="glass-panel p-8">
                    <h2 class="text-2xl font-bold text-white mb-6">User Management</h2>
                    
                    <!-- Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div class="bg-gray-800/50 rounded-lg p-4">
                        <div class="text-2xl font-bold text-white">${stats.totalUsers}</div>
                        <div class="text-gray-400">Total Users</div>
                      </div>
                      <div class="bg-gray-800/50 rounded-lg p-4">
                        <div class="text-2xl font-bold text-white">${stats.adminCount}</div>
                        <div class="text-gray-400">Admins</div>
                      </div>
                      <div class="bg-gray-800/50 rounded-lg p-4">
                        <div class="text-2xl font-bold text-white">${stats.userCount}</div>
                        <div class="text-gray-400">Regular Users</div>
                      </div>
                    </div>
                    
                    <!-- Users table -->
                    <div class="overflow-x-auto">
                      <table class="w-full text-left text-gray-300">
                        <thead class="border-b border-gray-700">
                          <tr>
                            <th class="pb-3">Email</th>
                            <th class="pb-3">Role</th>
                            <th class="pb-3">Sessions</th>
                            <th class="pb-3">Created</th>
                            <th class="pb-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody class="space-y-2">
                          ${users.map(user => `
                            <tr class="border-b border-gray-800">
                              <td class="py-3">${user.email_address}</td>
                              <td class="py-3">
                                <span class="px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'}">
                                  ${user.role}
                                </span>
                              </td>
                              <td class="py-3">${user.sessionCount}</td>
                              <td class="py-3">${new Date(user.created_at).toLocaleDateString()}</td>
                              <td class="py-3">
                                <form method="POST" action="/admin/users/${user.id}/toggle_role" style="display: inline;">
                                  <input type="hidden" name="_csrf" value="${c.get('csrfToken') || ''}">
                                  <button type="submit" class="text-sm text-blue-400 hover:text-blue-300">
                                    ${user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                  </button>
                                </form>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>`
      );
    } catch (error) {
      console.error('Admin users list error:', error);
      return c.text('Error loading users', 500);
    }
  },
  
  async toggleRole(c: Context) {
    try {
      const userId = c.req.param('id');
      
      if (!userId) {
        return c.text('User ID required', 400);
      }
      
      const user = await userService.toggleRole(userId);
      
      if (!user) {
        return c.text('User not found', 404);
      }
      
      return c.redirect('/admin/users');
    } catch (error) {
      console.error('Toggle role error:', error);
      return c.text('Error updating user role', 500);
    }
  }
};