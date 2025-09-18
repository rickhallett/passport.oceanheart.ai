import { Context } from 'hono';

export const homeController = {
  async index(c: Context) {
    const user = c.get('user');
    
    if (!user) {
      return c.redirect('/sign_in');
    }
    
    // Render home/dashboard page
    return c.html(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Dashboard - Passport</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="/assets/application.css" rel="stylesheet">
        </head>
        <body>
          <div class="min-h-screen bg-gradient-to-br from-gray-900 to-black">
            <nav class="bg-gray-900/50 backdrop-blur-lg border-b border-gray-800">
              <div class="container mx-auto px-4 py-4">
                <div class="flex justify-between items-center">
                  <h1 class="text-xl font-bold text-white">Passport</h1>
                  <div class="flex items-center gap-4">
                    <span class="text-gray-300">${user.email_address}</span>
                    ${user.role === 'admin' ? '<a href="/admin/users" class="text-blue-400 hover:text-blue-300">Admin</a>' : ''}
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
              <div class="max-w-4xl mx-auto">
                <div class="glass-panel p-8">
                  <h2 class="text-2xl font-bold text-white mb-6">Welcome to Passport</h2>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-gray-800/50 rounded-lg p-6">
                      <h3 class="text-lg font-semibold text-white mb-2">Account Information</h3>
                      <dl class="space-y-2">
                        <div>
                          <dt class="text-gray-400 text-sm">Email</dt>
                          <dd class="text-white">${user.email_address}</dd>
                        </div>
                        <div>
                          <dt class="text-gray-400 text-sm">Role</dt>
                          <dd class="text-white capitalize">${user.role}</dd>
                        </div>
                        <div>
                          <dt class="text-gray-400 text-sm">Member Since</dt>
                          <dd class="text-white">${new Date(user.created_at).toLocaleDateString()}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div class="bg-gray-800/50 rounded-lg p-6">
                      <h3 class="text-lg font-semibold text-white mb-2">SSO Applications</h3>
                      <ul class="space-y-2">
                        <li class="text-gray-300">• Watson (watson.oceanheart.ai)</li>
                        <li class="text-gray-300">• Notebook (notebook.oceanheart.ai)</li>
                        <li class="text-gray-300">• Preflight (preflight.oceanheart.ai)</li>
                        <li class="text-gray-300">• Labs (labs.oceanheart.ai)</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div class="mt-8 p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                    <p class="text-blue-300 text-sm">
                      Your authentication session is active across all Oceanheart applications. 
                      You can access any connected service without signing in again.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>`
    );
  }
};