class AuthService {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.tokenKey = 'cobranzas_token';
        this.userKey = 'cobranzas_user';
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Verificar token al inicializar
        this.initializeAuth();
    }

    // CSRF helpers
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    getCsrfToken() {
        return this.getCookie('csrftoken');
    }

    async initializeAuth() {
        const token = this.getToken();
        if (token) {
            const isValid = await this.validateToken(token);
            if (!isValid) {
                this.logout();
            }
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/login/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken() || ''
                },
                credentials: 'same-origin',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Guardar token y usuario
                localStorage.setItem(this.tokenKey, data.token);
                localStorage.setItem(this.userKey, JSON.stringify(data.usuario));
                
                this.currentUser = data.usuario;
                this.isAuthenticated = true;
                
                // Emitir evento de login exitoso
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: { authenticated: true, user: data.usuario }
                }));
                
                return { success: true, user: data.usuario };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Error en login:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    async validateToken(token) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/validate-token/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken() || ''
                },
                credentials: 'same-origin',
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (data.valid) {
                this.currentUser = data.usuario;
                this.isAuthenticated = true;
                localStorage.setItem(this.userKey, JSON.stringify(data.usuario));
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error validando token:', error);
            return false;
        }
    }

    logout() {
        // Limpiar almacenamiento local
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Emitir evento de logout
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: false, user: null }
        }));
        
        // Redirigir a login
        this.redirectToLogin();
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    getCurrentUser() {
        if (!this.currentUser) {
            const userStr = localStorage.getItem(this.userKey);
            if (userStr) {
                try {
                    this.currentUser = JSON.parse(userStr);
                    this.isAuthenticated = true;
                } catch (e) {
                    console.error('Error parsing user data:', e);
                }
            }
        }
        return this.currentUser;
    }

    isUserAuthenticated() {
        // Considerar autenticado si existe token; la validez se verifica en segundo plano
        return this.getToken() !== null;
    }

    redirectToLogin() {
        // Mostrar vista de login
        document.getElementById('app').innerHTML = this.getLoginHTML();
        this.setupLoginEventListeners();
    }

    getLoginHTML() {
        return `
            <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div class="max-w-md w-full space-y-8">
                    <div class="text-center">
                        <div class="mx-auto h-16 w-16 bg-primary rounded-full flex items-center justify-center mb-4">
                            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">Cobranzas App</h2>
                        <p class="mt-2 text-sm text-gray-600">Ingresa tus credenciales para continuar</p>
                    </div>
                    
                    <form id="loginForm" class="mt-8 space-y-6">
                        <div class="space-y-4">
                            <div>
                                <label for="username" class="block text-sm font-medium text-gray-700">Usuario</label>
                                <input id="username" name="username" type="text" required 
                                       class="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" 
                                       placeholder="Ingresa tu usuario">
                            </div>
                            <div>
                                <label for="password" class="block text-sm font-medium text-gray-700">Contraseña</label>
                                <input id="password" name="password" type="password" required 
                                       class="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm" 
                                       placeholder="Ingresa tu contraseña">
                            </div>
                        </div>

                        <div id="loginError" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                        </div>

                        <div>
                            <button id="loginBtn" type="submit" 
                                    class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                                <span id="loginBtnText">Iniciar Sesión</span>
                                <div id="loginSpinner" class="hidden ml-2">
                                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    setupLoginEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const loginBtnText = document.getElementById('loginBtnText');
        const loginSpinner = document.getElementById('loginSpinner');
        const loginError = document.getElementById('loginError');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Mostrar loading
            loginBtn.disabled = true;
            loginBtnText.textContent = 'Iniciando...';
            loginSpinner.classList.remove('hidden');
            loginError.classList.add('hidden');

            try {
                const result = await this.login(username, password);
                
                if (result.success) {
                    // Login exitoso, recargar la aplicación
                    window.location.reload();
                } else {
                    // Mostrar error
                    loginError.textContent = result.message || 'Error al iniciar sesión';
                    loginError.classList.remove('hidden');
                }
            } catch (error) {
                loginError.textContent = 'Error de conexión. Intenta nuevamente.';
                loginError.classList.remove('hidden');
            } finally {
                // Restaurar botón
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Iniciar Sesión';
                loginSpinner.classList.add('hidden');
            }
        });
    }

    // Middleware para proteger rutas
    requireAuth() {
        if (!this.isUserAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    // Agregar token a requests
    getAuthHeaders() {
        const token = this.getToken();
        return token ? {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        } : {
            'Content-Type': 'application/json'
        };
    }
}

// Instancia global del servicio de autenticación
window.authService = new AuthService();