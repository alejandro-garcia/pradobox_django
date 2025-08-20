class CobranzasApp {
    constructor() {
        this.currentView = 'dashboard';
        this.apiBaseUrl = '/api';
        this.offlineMode = false;
        this.charts = {
            ventas: null,
            cobros: null
        };
        this.dashboardLoaded = false;
        this.sqlConfig = null;

        // Escuchar cambios de autenticación
        window.addEventListener('authStateChanged', (event) => {
            if (event.detail.authenticated) {
                this.init();
            } else {
                this.initialized = false;
            }
        });
        
        // Verificar autenticación e inicializar
        this.checkAuthAndInit();
        //this.init();
    }

    async checkAuthAndInit() {
        // Esperar a que el servicio de auth se inicialice
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (window.authService.requireAuth()) {
            this.init();
        }
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        
        this.initializeIndexedDB();
        this.setupEventListeners();
        this.loadDashboard();
        this.updateStorageInfo();
        this.updateUserInfo();
    }

    async initializeIndexedDB() {
        try {
            await window.indexedDBService.init();
            console.log('IndexedDB initialized successfully');
        } catch (error) {
            console.error('Error initializing IndexedDB:', error);
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.navigateTo(view);
            });
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            this.navigateTo('dashboard');
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshDashboard();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('¿Está seguro de que desea cerrar sesión?')) {
                window.authService.logout();
            }
        });

        // Import/Sync functionality
        this.setupImportEventListeners();
    }

    setupImportEventListeners() {
        // Start import button
        document.getElementById('startImportBtn').addEventListener('click', async () => {
            debugger;
            await this.startImport();
        });

        // Clear data button
        document.getElementById('clearDataBtn').addEventListener('click', async () => {
            if (confirm('¿Está seguro de que desea eliminar todos los datos locales?')) {
                await this.clearLocalData();
            }
        });

        // Import progress listener
        window.addEventListener('importProgress', (event) => {
            this.updateImportProgress(event.detail);
        });

        // Offline mode toggle
        document.getElementById('offlineMode').addEventListener('change', (e) => {
            this.offlineMode = e.target.checked;
            localStorage.setItem('offlineMode', this.offlineMode);
            
            // If we're on dashboard, refresh to show appropriate data
            if (this.currentView === 'dashboard') {
                this.refreshDashboard();
            }
        });

        // Load saved settings
        const savedOfflineMode = localStorage.getItem('offlineMode') === 'true';
        document.getElementById('offlineMode').checked = savedOfflineMode;
        this.offlineMode = savedOfflineMode;
    }

    navigateTo(view) {
        // Update navigation state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active', 'text-primary');
            item.classList.add('text-gray-600');
        });

        const activeNavItem = document.querySelector(`[data-view="${view}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active', 'text-primary');
            activeNavItem.classList.remove('text-gray-600');
        }

        // Hide all views
        document.querySelectorAll('[id$="-view"]').forEach(view => {
            view.classList.add('hidden');
        });

        // Show current view
        const viewElement = document.getElementById(`${view}-view`);
        if (viewElement) {
            viewElement.classList.remove('hidden');
        }

        // Update header
        const titles = {
            'dashboard': 'Situación',
            'clientes': 'Clientes',
            'tareas': 'Tareas',
            'eventos': 'Eventos',
            'mas': 'Más'
        };

        document.getElementById('pageTitle').textContent = titles[view] || 'Cobranzas';
        
        // Show/hide back button
        const backBtn = document.getElementById('backBtn');
        if (view === 'dashboard') {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
        }

        // Clean up charts when leaving dashboard
        if (this.currentView === 'dashboard' && view !== 'dashboard') {
            this.destroyCharts();
        }

        this.currentView = view;

        // Load view data
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'clientes':
                this.loadClientes();
                break;
            case 'mas':
                this.updateStorageInfo();
                break;
            // Add other views as needed
        }
    }

    async refreshDashboard() {
        // Reset dashboard state to allow reloading
        this.dashboardLoaded = false;
        this.loadingDashboard = false;
        
        // Clear existing charts
        this.destroyCharts();
        
        // Reload dashboard
        await this.loadDashboard();
    }

    async loadDashboard() {
        try {
            // Evitar múltiples cargas simultáneas y cargas innecesarias
            if (this.loadingDashboard || this.dashboardLoaded) {
                return;
            }
            this.loadingDashboard = true;
            
            let data;
            
            if (this.offlineMode) {
                // Load from IndexedDB
                debugger;
                data = await this.loadDashboardFromIndexedDB();
            } else {
                debugger;
                const user = window.authService.getCurrentUser();
                const seller_code = user.codigo_vendedor_profit; 

                // Load from API
                const response = await fetch(`${this.apiBaseUrl}/dashboard/${seller_code}`, {
                    headers: window.authService.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                data = await response.json();
            }

            // Update dashboard data
            document.getElementById('totalVencido').textContent = this.formatCurrency(data.situacion.total_vencido);
            document.getElementById('cantidadVencido').textContent = data.situacion.cantidad_documentos_vencidos;
            document.getElementById('diasVencido').textContent = data.situacion.dias_promedio_vencimiento;
            document.getElementById('totalGeneral').textContent = this.formatCurrency(data.situacion.total_neto);
            document.getElementById('cantidadTotal').textContent = data.situacion.cantidad_documentos_vencidos + data.situacion.cantidad_documentos_por_vencer;
            document.getElementById('diasTotal').textContent = data.situacion.dias_promedio_vencimiento;
            document.getElementById('totalNeto').textContent = this.formatCurrency(data.situacion.total_neto);
            document.getElementById('totalCreditos').textContent = this.formatCurrency(Math.abs(data.situacion.total_creditos));

            // Create charts only if they don't exist
            if (!this.charts.ventas) {
                this.createVentasChart(data.ventas_por_mes);
            }
            if (!this.charts.cobros) {
                this.createCobrosChart(data.cobros_por_mes);
            }

            this.dashboardLoaded = true;

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Error cargando el dashboard');
        } finally {
            this.loadingDashboard = false;
        }
    }

    async loadDashboardFromIndexedDB() {
        const resumen = await window.indexedDBService.getResumenCobranzas();
        
        return {
            situacion: {
                total_vencido: resumen.total_vencido,
                cantidad_documentos_vencidos: resumen.cantidad_vencidos,
                dias_promedio_vencimiento: resumen.dias_promedio_vencimiento,
                total_neto: resumen.total_vencido + resumen.total_por_vencer + resumen.total_creditos,
                cantidad_documentos_por_vencer: resumen.cantidad_por_vencer,
                total_creditos: resumen.total_creditos
            },
            ventas_por_mes: [
                { mes: 'may', monto: 155000 },
                { mes: 'jun', monto: 144000 },
                { mes: 'jul', monto: 69400 }
            ],
            cobros_por_mes: [
                { mes: 'may', monto: 188000 },
                { mes: 'jun', monto: 185000 },
                { mes: 'jul', monto: 71400 }
            ]
        };
    }

    async loadClientes() {
        try {
            let clientes;
            
            if (this.offlineMode) {
                clientes = await window.indexedDBService.getClientes();
                // Transform to match API format
                clientes = clientes.map(cliente => ({
                    id: cliente.co_cli,
                    nombre: cliente.cli_des,
                    rif: cliente.rif,
                    telefono: cliente.telefonos,
                    email: cliente.email,
                    direccion: cliente.direccion
                }));
            } else {
                const response = await fetch(`${this.apiBaseUrl}/clientes/`, {
                    headers: window.authService.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                clientes = await response.json();
            }

            const clientesList = document.getElementById('clientesList');
            clientesList.innerHTML = '';

            clientes.forEach(cliente => {
                const clienteCard = this.createClienteCard(cliente);
                clientesList.appendChild(clienteCard);
            });

        } catch (error) {
            console.error('Error loading clientes:', error);
            this.showError('Error cargando los clientes');
        }
    }

    async startImport() {
        const importBtn = document.getElementById('startImportBtn');
        const progressDiv = document.getElementById('importProgress');
        
        importBtn.disabled = true;
        importBtn.textContent = 'Importando...';
        progressDiv.classList.remove('hidden');
        
        try {
            const result = await window.importService.importFromMSSQL();
            
            this.showSuccess(`Importación completada: ${result.clientes_imported} clientes, ${result.documentos_imported} documentos`);
            await this.updateStorageInfo();
            
        } catch (error) {
            this.showError('Error durante la importación: ' + error.message);
        } finally {
            importBtn.disabled = false;
            importBtn.textContent = 'Iniciar Importación';
            progressDiv.classList.add('hidden');
        }
    }

    updateImportProgress(progress) {
        document.getElementById('progressText').textContent = progress.step;
        document.getElementById('progressPercentage').textContent = `${progress.percentage}%`;
        document.getElementById('progressBar').style.width = `${progress.percentage}%`;
    }

    async updateStorageInfo() {
        try {
            const info = await window.indexedDBService.getStorageInfo();
            
            document.getElementById('clientesCount').textContent = info.clientes_count;
            document.getElementById('documentosCount').textContent = info.documentos_count;
            
            if (info.last_sync) {
                const date = new Date(info.last_sync);
                document.getElementById('lastSync').textContent = date.toLocaleString();
            } else {
                document.getElementById('lastSync').textContent = 'Nunca';
            }
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }

    async clearLocalData() {
        try {
            await window.indexedDBService.clearAllData();
            await this.updateStorageInfo();
            this.showSuccess('Datos locales eliminados correctamente');
        } catch (error) {
            this.showError('Error eliminando datos locales: ' + error.message);
        }
    }

    createClienteCard(cliente) {
        const card = document.createElement('div');
        card.className = 'bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors';
        card.onclick = () => this.showClienteDetail(cliente.id);

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800">${cliente.nombre}</h3>
                    <p class="text-sm text-gray-600">${cliente.rif}</p>
                    ${cliente.telefono ? `<p class="text-sm text-gray-500">${cliente.telefono}</p>` : ''}
                </div>
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </div>
        `;  

        return card;
    }

    async showClienteDetail(clienteId) {
        try {
            debugger;
            const [clienteResponse, resumenResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/`, {
                    headers: window.authService.getAuthHeaders()
                }),
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/resumen/`, {
                    headers: window.authService.getAuthHeaders()
                })
            ]);

            if (clienteResponse.status === 401 || resumenResponse.status === 401) {
                window.authService.logout();
                return;
            }

            const cliente = await clienteResponse.json();
            const resumen = await resumenResponse.json();

            const detailView = document.getElementById('cliente-detail-view');
            detailView.innerHTML = this.createClienteDetailHTML(cliente, resumen);
            
            // Hide clientes view and show detail view
            document.getElementById('clientes-view').classList.add('hidden');
            detailView.classList.remove('hidden');
            
            // Update header
            document.getElementById('pageTitle').textContent = cliente.nombre;

        } catch (error) {
            console.error('Error loading cliente detail:', error);
            this.showError('Error cargando los detalles del cliente');
        }
    }

    createClienteDetailHTML(cliente, resumen) {
        return `
            <div class="space-y-6">
                <!-- Header Card -->
                <div class="bg-primary text-white rounded-lg p-6">
                    <h2 class="text-lg font-bold">${cliente.nombre}</h2>
                    <p class="text-sm opacity-90">Compañía</p>
                    <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                            <p class="opacity-75">RIF</p>
                            <p class="font-medium">${cliente.rif}</p>
                        </div>
                        <div>
                            <p class="opacity-75">RIF</p>
                            <p class="font-medium">${cliente.rif}</p>
                        </div>
                    </div>
                </div>

                <!-- Cuentas por Cobrar -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">CUENTAS POR COBRAR</h3>
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Vencido</p>
                            <p class="text-xl font-semibold text-primary">${this.formatCurrency(resumen.total_vencido)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Cantidad</p>
                            <p class="text-xl font-semibold text-accent">${resumen.cantidad_documentos}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Días</p>
                            <p class="text-xl font-semibold text-accent">${resumen.dias_promedio_vencimiento}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Total</p>
                            <p class="text-xl font-semibold text-gray-700">${this.formatCurrency(resumen.total_vencido + resumen.total_por_vencer)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Cantidad</p>
                            <p class="text-xl font-semibold text-gray-700">${resumen.cantidad_documentos}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Días</p>
                            <p class="text-xl font-semibold text-gray-700">${resumen.dias_promedio_vencimiento}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Neto</p>
                            <p class="text-xl font-semibold text-gray-700">${this.formatCurrency(resumen.total_neto)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Créditos</p>
                            <p class="text-xl font-semibold text-success">${this.formatCurrency(Math.abs(resumen.total_creditos))}</p>
                        </div>
                    </div>
                </div>

                <!-- Documentos Pendientes -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">DOCUMENTOS PENDIENTES</h3>
                    <div id="documentosPendientes">
                        <!-- Documents will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    createVentasChart(data) {       
        // Verificar si ya existe un gráfico
        if (this.charts.ventas) {
            this.charts.ventas.data.labels = data.map(item => item.mes);
            this.charts.ventas.data.datasets[0].data = data.map(item => item.monto);
            this.charts.ventas.update();
            return;
        }

        const ctx = document.getElementById('ventasChart');
        if (!ctx) {
            console.error('Canvas ventasChart no encontrado');
            return;
        }

        // responsive: true,
/*
,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                console.log("ejecutando callback... valor:", value);
                                return (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }

                data: data.map(item => (item.monto / 1000).toFixed(0) + 'k'),
                    */

        this.charts.ventas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.mes),
                datasets: [{
                    data: data.map(item => item.monto),
                    backgroundColor: '#3B82F6',
                    borderRadius: 4,
                    barThickness: 60
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }
            }
        });
        
        console.log("Gráfico de ventas creado exitosamente");
    }

    createCobrosChart(data) {       
        // Verificar si ya existe un gráfico
        if (this.charts.cobros) {
            this.charts.cobros.data.labels = data.map(item => item.mes);
            this.charts.cobros.data.datasets[0].data = data.map(item => item.monto);
            this.charts.cobros.update();
            return;
        }

        const ctx = document.getElementById('cobrosChart');
        if (!ctx) {
            console.error('Canvas cobrosChart no encontrado');
            return;
        }

        //responsive: true,
        this.charts.cobros = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.mes),
                datasets: [{
                    data: data.map(item => item.monto),
                    backgroundColor: '#3B82F6',
                    borderRadius: 4,
                    barThickness: 60
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                //console.log("ejecutando callback chart cobro, value:", value);
                                return (value / 1000).toFixed(0) + 'k';
                            }
                        }
                    }
                }
            }
        });
    }

    // Método para limpiar gráficos cuando sea necesario
    destroyCharts() {
        if (this.charts.ventas) {
            this.charts.ventas.destroy();
            this.charts.ventas = null;
        }
        if (this.charts.cobros) {
            this.charts.cobros.destroy();
            this.charts.cobros = null;
        }
        this.dashboardLoaded = false;
    }

    updateUserInfo() {
        const user = window.authService.getCurrentUser();
        if (user) {
            document.getElementById('userInfo').textContent = user.nombre_completo || user.username;
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'error') {
        // Simple error notification
        const notificationDiv = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        notificationDiv.className = `fixed top-4 left-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50`;
        notificationDiv.textContent = message;
        
        document.body.appendChild(notificationDiv);
        
        setTimeout(() => {
            notificationDiv.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cobranzasApp = new CobranzasApp();
});