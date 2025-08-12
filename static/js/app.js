class CobranzasApp {
    constructor() {
        this.currentView = 'dashboard';
        this.apiBaseUrl = '/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
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

        this.currentView = view;

        // Load view data
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'clientes':
                this.loadClientes();
                break;
            // Add other views as needed
        }
    }

    async loadDashboard() {
        try {
            debugger;
            const response = await fetch(`${this.apiBaseUrl}/dashboard/`);
            const data = await response.json();

            // Update dashboard data
            document.getElementById('totalVencido').textContent = this.formatCurrency(data.situacion.total_vencido);
            document.getElementById('cantidadVencido').textContent = data.situacion.cantidad_documentos_vencidos;
            document.getElementById('diasVencido').textContent = data.situacion.dias_promedio_vencimiento;
            document.getElementById('totalGeneral').textContent = this.formatCurrency(data.situacion.total_neto);
            document.getElementById('cantidadTotal').textContent = data.situacion.cantidad_documentos_vencidos + data.situacion.cantidad_documentos_por_vencer;
            document.getElementById('diasTotal').textContent = data.situacion.dias_promedio_vencimiento;
            document.getElementById('totalNeto').textContent = this.formatCurrency(data.situacion.total_neto);
            document.getElementById('totalCreditos').textContent = this.formatCurrency(Math.abs(data.situacion.total_creditos));

            // Create charts
            this.createVentasChart(data.ventas_por_mes);
            this.createCobrosChart(data.cobros_por_mes);

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Error cargando el dashboard');
        }
    }

    async loadClientes() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/clientes/`);
            const clientes = await response.json();

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

    createClienteCard(cliente) {
        console.log("cliente", cliente);
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
            const [clienteResponse, resumenResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/`),
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/resumen/`)
            ]);

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
        const ctx = document.getElementById('ventasChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.ventasChart) {
            window.ventasChart.destroy();
        }

        window.ventasChart = new Chat.Chart(ctx, {
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
                responsive: true,
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
    }

    createCobrosChart(data) {
        const ctx = document.getElementById('cobrosChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (window.cobrosChart) {
            window.cobrosChart.destroy();
        }

        window.cobrosChart = new Chart(ctx, {
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
                responsive: true,
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
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    showError(message) {
        // Simple error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cobranzasApp = new CobranzasApp();
});