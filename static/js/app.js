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
        this.loadingDashboard = false;
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
        
        this.initializeIndexedDB().then(() => {
            this.setupEventListeners();
            this.loadDashboard();
            this.updateStorageInfo();
            this.updateUserInfo();
        }).catch(error => {
            console.error('Error initializing IndexedDB:', error);
        });
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

        // Documentos Pendientes click
        const documentosPendientesBtn = document.querySelector('[data-view="documentos-pendientes"]');
        if (documentosPendientesBtn) {
            documentosPendientesBtn.addEventListener('click', () => {
                this.navigateTo('documentos-pendientes');
            });
        }

        const pendingDocsCard = document.getElementById('pendingDocsCard');
        if (pendingDocsCard) {
            pendingDocsCard.addEventListener('click', () => {
                this.navigateTo('documentos-pendientes');
            });
        }

        // Import/Sync functionality
        this.setupImportEventListeners();
        
        // Client search functionality
        this.setupClientSearchEventListeners();
    }

    setupImportEventListeners() {
        // Start import button
        document.getElementById('startImportBtn').addEventListener('click', async () => {
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

    setupClientSearchEventListeners() {
        const searchInput = document.getElementById('clienteSearchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        let searchTimeout;

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                
                // Show/hide clear button
                if (searchTerm.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }

                // Clear previous timeout
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }

                // Set new timeout for search
                searchTimeout = setTimeout(() => {
                    if (searchTerm.length >= 3 || searchTerm.length === 0) {
                        this.searchClientes(searchTerm);
                    }
                }, 300); // 300ms delay for better UX
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('hidden');
                this.searchClientes('');
            });
        }
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
        document.querySelectorAll('[id$="-view"]').forEach(viewElement => {
            viewElement.classList.add('hidden');
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
            'documentos-pendientes': 'Cobrables',
            'documento-detalle': 'Detalle',
            'tareas': 'Tareas',
            'eventos': 'Eventos',
            'mas': 'Más',
            'docs-pdtes-cliente': 'Cobrables'
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
            case 'documentos-pendientes':
                this.loadDocumentosPendientes();
                break;
            case 'documento-detalle':
                // No load here, will be loaded when navigating with document ID
                debugger;
                break;
            case 'docs-pdtes-cliente':
                // Handled when opening from client detail
                this.LoadClientPendingDocs(this.currentClientId);
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

    getTipoColor(tipo) {
        const colors = {
            'FACT': 'bg-blue-500',
            'N/DB': 'bg-orange-500',
            'N/CR': 'bg-green-500',
            'ADEL': 'bg-purple-500',
            'AJPM': 'bg-indigo-500',
            'AJMN': 'bg-red-500',
            'DEV': 'bg-red-500',
            'PAGO': 'bg-green-500'
        };
        return colors[tipo] || 'bg-gray-500';
    }

    getTipoAbreviacion(tipo) {
        const abrev = {
            'FACT': 'F',
            'N/DB': 'D',
            'N/CR': 'C',
            'ADEL': 'A',
            'AJPM': 'P',
            'AJMN': 'M',
            'DEV': 'D',
            'PAGO': 'P'
        };
        return abrev[tipo] || 'D';
    }

    getTimeAgo(fecha) {
        const now = new Date();
        const date = new Date(fecha);
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return months === 1 ? 'un mes' : `${months} meses`;
        } else {
            const years = Math.floor(diffDays / 365);
            return years === 1 ? 'un año' : `${years} años`;
        }
    }

    calculateCreditDays(fechaEmision, fechaVencimiento) {
        const emision = new Date(fechaEmision);
        const vencimiento = new Date(fechaVencimiento);
        const diffTime = vencimiento - emision;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    calculateDaysOverdue(fechaVencimiento) {
        const now = new Date();
        const vencimiento = new Date(fechaVencimiento);
        const diffTime = now - vencimiento;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
                // TODO: get current user from IndexedDB
                const user = await window.indexedDBService.getCurrentUser();
                const seller_code = user.codigo_vendedor_profit; 

                data = await this.loadDashboardFromIndexedDB(seller_code);
            } else {
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

            let currentSales = 0;
            if (data.ventas_por_mes.length == 3){
                let correntSalesNum = data.ventas_por_mes[2].monto / 1000

                //verificar el mayor de los ultimos 2 meses 
                let topSales = 0;
                let topSalesMonth = ""; 
                let lessSales = 0;
                let lessSalesMonth = "";
                let lessSalesIndex = 1;

                let topSalesIndex = 0;
                
                if  (data.ventas_por_mes[0].monto < data.ventas_por_mes[1].monto) {
                    topSalesIndex = 1
                    lessSalesIndex = 0;
                }
                
                topSales = data.ventas_por_mes[topSalesIndex].monto / 1000;
                let remainingSales  = Math.round((topSales - correntSalesNum),1)

                topSalesMonth = data.ventas_por_mes[topSalesIndex].mes;

                lessSales = (data.ventas_por_mes[lessSalesIndex].monto / 1000).toString().split(".")[0] + "K";
                lessSalesMonth = data.ventas_por_mes[lessSalesIndex].mes;

                let salesPercentage = (topSales !== 0) ? correntSalesNum * 100 / topSales: 0; 

                if (salesPercentage > 100) salesPercentage = 100;

                let currentSales = (data.ventas_por_mes[2].monto / 1000).toString().split(".")[0] + "K";

                document.getElementById('currentSales').textContent = currentSales;
                document.getElementById('lessSales').textContent = lessSales + " " + lessSalesMonth;
                document.getElementById('topSales').textContent = topSales.toString().split(".")[0] + "K" + " " + topSalesMonth;
                document.getElementById('remainingSales').textContent = remainingSales.toString().split(".")[0] + "K";
                document.getElementById('salesPercentage').style= `width:${salesPercentage}%`;
            }

            document.getElementById('currentDay').textContent = data.situacion.dias_transcurridos.toString() + 'd';
            document.getElementById('remainingDays').textContent = data.situacion.dias_faltantes.toString() + 'd';
            let percentageDays = data.situacion.dias_transcurridos * 100 / (data.situacion.dias_faltantes + data.situacion.dias_transcurridos);
            document.getElementById('daysPercentage').style= `width:${percentageDays}%`;

            document.getElementById('totalVencido').textContent = this.formatCurrency(data.situacion.total_vencido);
            document.getElementById('cantidadVencido').textContent = data.situacion.cantidad_documentos_vencidos;
            document.getElementById('diasVencido').textContent = data.situacion.dias_promedio_vencimiento;
            document.getElementById('totalGeneral').textContent =  this.formatCurrency(data.situacion.total_vencido + data.situacion.total_por_vencer - data.situacion.total_sinvencimiento); ;   
            debugger;
            document.getElementById('cantidadTotal').textContent = data.situacion.cantidad_documentos_total;
            document.getElementById('diasTotal').textContent = data.situacion.dias_promedio_vencimiento_todos;
            document.getElementById('totalNeto').textContent =  this.formatCurrency(data.situacion.total_neto);
            document.getElementById('totalCreditos').textContent = this.formatCurrency(data.situacion.total_creditos * -1);

            // Create charts only if they don't exist
            if (!this.charts.ventas) {
                this.createVentasChart(data.ventas_por_mes);
            }
            // if (!this.charts.cobros) {
            //     this.createCobrosChart(data.cobros_por_mes);
            // }

            this.dashboardLoaded = true;

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Error cargando el dashboard');
        } finally {
            this.loadingDashboard = false;
        }
    }

    async loadDashboardFromIndexedDB(seller_code) {
        const resumen = await window.indexedDBService.getResumenCobranzas(seller_code);
        
        return {
            situacion: {
                total_vencido: resumen.total_vencido,
                total_por_vencer: resumen.total_por_vencer,
                total_creditos: resumen.total_creditos,
                total_neto: resumen.total_vencido + resumen.total_por_vencer - resumen.total_creditos,
                cantidad_documentos_vencidos: resumen.cantidad_vencidos,
                cantidad_documentos_por_vencer: resumen.cantidad_por_vencer,
                dias_promedio_vencimiento: resumen.dias_promedio_vencimiento,
                dias_transcurridos: new Date().getDate(),
                dias_faltantes: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()
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
        this.showClientesLoading(true);
        
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
                const user = window.authService.getCurrentUser();
                const sellerCode = user.codigo_vendedor_profit || '-1'; 

                const response = await fetch(`${this.apiBaseUrl}/clientes/vendedor/${sellerCode}`, {
                    headers: window.authService.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                clientes = await response.json();
            }

            this.displayClientes(clientes);
            this.updateSearchResults(clientes.length, '');

        } catch (error) {
            console.error('Error loading clientes:', error);
            this.showError('Error cargando los clientes');
            this.displayClientes([]);
        } finally {
            this.showClientesLoading(false);
        }
    }

    showDocumentosPendientesLoading(show) {
        const loading = document.getElementById('documentosPendientesLoading');
        const list = document.getElementById('documentosPendientesList');
        const empty = document.getElementById('documentosPendientesEmpty');
        
        if (show) {
            loading.classList.remove('hidden');
            list.innerHTML = '';
            empty.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showClientDocsPendingLoading(show) {
        const loading = document.getElementById('clientDocsPendingLoading');
        const list = document.getElementById('clientDocsPendingList');
        const empty = document.getElementById('documentosPendientesEmpty');
        
        if (show) {
            loading.classList.remove('hidden');
            list.innerHTML = '';
            empty.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    async loadDocumentosPendientes() {
        this.showDocumentosPendientesLoading(true);
        
        try {
            let data;
            
            if (this.offlineMode) {

                const user = await this.indexedDBService.getCurrentUser();
                const seller_code = user.codigo_vendedor_profit;                 
                // Load from IndexedDB
                const documentos = await window.indexedDBService.getDocumentos({ co_ven: seller_code });
                const resumen = await window.indexedDBService.getResumenCobranzas(seller_code);
                
                data = {
                    documentos: documentos.map(doc => ({
                        ...doc,
                        cliente_nombre: 'Cliente Local', // En IndexedDB necesitaríamos hacer join
                        dias_vencimiento: this.calculateDaysOverdue(doc.fec_venc),
                        esta_vencido: new Date(doc.fec_venc) < new Date()
                    })),
                    resumen: resumen
                };
            } else {
                // Load from API
                const [documentosResponse, resumenResponse] = await Promise.all([
                    fetch(`${this.apiBaseUrl}/cobranzas/pendientes/`, {
                        headers: window.authService.getAuthHeaders()
                    }),
                    fetch(`${this.apiBaseUrl}/dashboard/`, {
                        headers: window.authService.getAuthHeaders()
                    })
                ]);
                
                if (documentosResponse.status === 401 || resumenResponse.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                const documentos = await documentosResponse.json();
                const dashboardData = await resumenResponse.json();
                
                data = {
                    documentos: documentos,
                    resumen: dashboardData.situacion
                };
            }
            
            this.displayDocumentosPendientes(data);
            
        } catch (error) {
            console.error('Error loading documentos pendientes:', error);
            this.showError('Error cargando documentos pendientes');
        } finally {
            this.showDocumentosPendientesLoading(false);
        }
    }
    async LoadClientPendingDocs(clientId) {
        this.showClientDocsPendingLoading(true);
        
        try {
            let data;
            
            if (this.offlineMode) {
                // Load from IndexedDB
                const documentos = await window.indexedDBService.getDocumentos();
                const resumen = await window.indexedDBService.getResumenCobranzas();
                
                data = {
                    documentos: documentos.map(doc => ({
                        ...doc,
                        cliente_nombre: 'Cliente Local', // En IndexedDB necesitaríamos hacer join
                        dias_vencimiento: this.calculateDaysOverdue(doc.fec_venc),
                        esta_vencido: new Date(doc.fec_venc) < new Date()
                    })),
                    resumen: resumen
                };
            } else {
                // Load from API
                const [documentosResponse, resumenResponse] = await Promise.all([
                    fetch(`${this.apiBaseUrl}/cobranzas/pendientes/${clientId}`, {
                        headers: window.authService.getAuthHeaders()
                    }),
                    fetch(`${this.apiBaseUrl}/dashboard/`, {
                        headers: window.authService.getAuthHeaders()
                    })
                ]);
                
                if (documentosResponse.status === 401 || resumenResponse.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                const documentos = await documentosResponse.json();
                const dashboardData = await resumenResponse.json();
                
                data = {
                    documentos: documentos,
                    resumen: dashboardData.situacion
                };
            }
            
            this.displayClientDocsPending(data);
            
        } catch (error) {
            console.error('Error loading documentos pendientes:', error);
            this.showError('Error cargando documentos pendientes');
        } finally {
            this.showClientDocsPendingLoading(false);
        }
    }

    displayDocumentosPendientes(data) {
        // Update resumen
        document.getElementById('resumenVencido').textContent = this.formatCurrency(data.resumen.total_vencido);
        document.getElementById('resumenCantidadVencido').textContent = data.resumen.cantidad_documentos_vencidos;
        document.getElementById('resumenDiasVencido').textContent = data.resumen.dias_promedio_vencimiento;
        
        const totalGeneral = data.resumen.total_vencido + data.resumen.total_por_vencer;
        
        document.getElementById('resumenTotal').textContent = this.formatCurrency(totalGeneral);
        document.getElementById('resumenCantidadTotal').textContent = data.resumen.cantidad_documentos_total;
        document.getElementById('resumenDiasTotal').textContent = data.resumen.dias_promedio_vencimiento_todos;
        
        document.getElementById('resumenNeto').textContent = this.formatCurrency(data.resumen.total_neto);
        document.getElementById('resumenCreditos').textContent = this.formatCurrency(data.resumen.total_creditos * -1);

        // Display documentos
        const documentosList = document.getElementById('documentosPendientesList');
        const documentosEmpty = document.getElementById('documentosPendientesEmpty');
        
        if (data.documentos.length === 0) {
            documentosList.innerHTML = '';
            documentosEmpty.classList.remove('hidden');
            return;
        }
        
        documentosEmpty.classList.add('hidden');
        
        documentosList.innerHTML = data.documentos.map(doc => {
            debugger;
            const tipoColor = this.getTipoColor(doc.tipo);
            const tipoAbrev = this.getTipoAbreviacion(doc.tipo);
            const timeAgo = this.getTimeAgo(doc.fecha_emision);
            const diasCredito = this.calculateCreditDays(doc.fecha_emision, doc.fecha_vencimiento);
            const diasVencido = doc.dias_vencimiento;
            const isOverdue = doc.esta_vencido;
            //<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">

            return `
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors" 
                     onclick="cobranzasApp.viewDocumentoDetail('${doc.id}')">
                    <!-- Fila 1: Tipo, Cliente, Tiempo -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full ${tipoColor} flex items-center justify-center">
                                <span class="text-white text-xs font-bold">${tipoAbrev}</span>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 text-sm">${doc.cliente_nombre}</p>
                                <p class="text-xs text-gray-500">${doc.numero}</p>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500">${timeAgo}</span>
                    </div>
                    
                    <!-- Fila 2: Fecha emisión, Días crédito, Monto -->
                    <div class="flex justify-between items-center mb-2 text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">E</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <span class="text-gray-600">${diasCredito}d</span>
                        <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="flex justify-between items-center text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">V</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_vencimiento)}</span>
                        </div>
                        <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'}">${Math.abs(diasVencido)}d</span>
                        <div class="text-right">
                            <span class="text-xs text-gray-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    displayClientDocsPending(data) {
        // Display documentos
        const documentosList = document.getElementById('clientDocsPendingList');
        //const documentosEmpty = document.getElementById('documentosPendientesEmpty');
        
        if (data.documentos.length === 0) {
            documentosList.innerHTML = '';
            //documentosEmpty.classList.remove('hidden');
            return;
        }
        
        //documentosEmpty.classList.add('hidden');
        
        documentosList.innerHTML = data.documentos.map(doc => {
            const tipoColor = this.getTipoColor(doc.tipo);
            const tipoAbrev = this.getTipoAbreviacion(doc.tipo);
            const timeAgo = this.getTimeAgo(doc.fecha_emision);
            const diasCredito = this.calculateCreditDays(doc.fecha_emision, doc.fecha_vencimiento);
            const diasVencido = doc.dias_vencimiento;
            const isOverdue = doc.esta_vencido;
            
            return `
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <!-- Fila 1: Tipo, Cliente, Tiempo -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full ${tipoColor} flex items-center justify-center">
                                <span class="text-white text-xs font-bold">${tipoAbrev}</span>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 text-sm">${doc.cliente_nombre}</p>
                                <p class="text-xs text-gray-500">${doc.numero}</p>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500">${timeAgo}</span>
                    </div>
                    
                    <!-- Fila 2: Fecha emisión, Días crédito, Monto -->
                    <div class="flex justify-between items-center mb-2 text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">E</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <span class="text-gray-600">${diasCredito}d</span>
                        <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="flex justify-between items-center text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">V</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_vencimiento)}</span>
                        </div>
                        <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'}">${diasVencido}d</span>
                        <div class="text-right">
                            <span class="text-xs text-gray-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async searchClientes(searchTerm) {
        this.showClientesLoading(true);
        
        try {
            let clientes;
            
            if (this.offlineMode) {
                clientes = await window.indexedDBService.getClientes();
                // Transform and filter locally
                clientes = clientes
                    .map(cliente => ({
                        id: cliente.co_cli,
                        nombre: cliente.cli_des,
                        rif: cliente.rif,
                        telefono: cliente.telefonos,
                        email: cliente.email,
                        direccion: cliente.direccion
                    }))
                    .filter(cliente => 
                        searchTerm === '' || 
                        cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase())
                    );
            } else {
                const user = window.authService.getCurrentUser();
                const seller_code = user.codigo_vendedor_profit || '-1'; 

                const url = searchTerm 
                    ? `${this.apiBaseUrl}/clientes/vendedor/${seller_code}?search=${encodeURIComponent(searchTerm)}`
                    : `${this.apiBaseUrl}/clientes/vendedor/${seller_code}`;
                    
                const response = await fetch(url, {
                    headers: window.authService.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                clientes = await response.json();
            }

            this.displayClientes(clientes);
            this.updateSearchResults(clientes.length, searchTerm);

        } catch (error) {
            console.error('Error searching clientes:', error);
            this.showError('Error buscando clientes');
            this.displayClientes([]);
        } finally {
            this.showClientesLoading(false);
        }
    }

    displayClientes(clientes) {
        const clientesList = document.getElementById('clientesList');
        const clientesEmpty = document.getElementById('clientesEmpty');
        
        clientesList.innerHTML = '';
        
        if (clientes.length === 0) {
            clientesEmpty.classList.remove('hidden');
        } else {
            clientesEmpty.classList.add('hidden');
            clientes.forEach(cliente => {
                const clienteCard = this.createClienteCard(cliente);
                clientesList.appendChild(clienteCard);
            });
        }
    }

    showClientesLoading(show) {
        const loadingDiv = document.getElementById('clientesLoading');
        const clientesList = document.getElementById('clientesList');
        const clientesEmpty = document.getElementById('clientesEmpty');
        
        if (show) {
            loadingDiv.classList.remove('hidden');
            clientesList.classList.add('hidden');
            clientesEmpty.classList.add('hidden');
        } else {
            loadingDiv.classList.add('hidden');
            clientesList.classList.remove('hidden');
        }
    }

    updateSearchResults(count, searchTerm) {
        const searchResults = document.getElementById('searchResults');
        const searchResultsText = document.getElementById('searchResultsText');
        
        if (searchTerm && searchTerm.length >= 3) {
            searchResults.classList.remove('hidden');
            searchResultsText.textContent = `${count} cliente${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''} para "${searchTerm}"`;
        } else if (searchTerm && searchTerm.length > 0 && searchTerm.length < 3) {
            searchResults.classList.remove('hidden');
            searchResultsText.textContent = 'Ingresa al menos 3 caracteres para buscar';
        } else {
            searchResults.classList.add('hidden');
        }
    }

    async startImport() {
        const importBtn = document.getElementById('startImportBtn');
        const progressDiv = document.getElementById('importProgress');
        
        importBtn.disabled = true;
        importBtn.textContent = 'Importando...';
        progressDiv.classList.remove('hidden');
        
        try {
            const user = window.authService.getCurrentUser();
            const result = await window.importService.importFromMSSQL(user);
            
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

    async viewDocumentoDetail(documentoId) {
        try {
            this.showDocumentoDetailLoading(true);
            
            let documento;
            
            if (this.offlineMode) {
                // En modo offline, obtener de IndexedDB (funcionalidad limitada)
                const documentos = await window.indexedDBService.getDocumentos();
                documento = documentos.find(doc => doc.id === documentoId);
                if (documento) {
                    // Simular estructura completa para modo offline
                    documento = {
                        ...documento,
                        cliente_nombre: 'Cliente Local',
                        vendedor_nombre: 'Vendedor Local',
                        productos: [],
                        subtotal: documento.saldo,
                        descuentos: 0,
                        impuestos: 0,
                        total: documento.saldo,
                        comentarios: documento.observa || ''
                    };
                }
            } else {
                // Obtener desde API
                const response = await fetch(`${this.apiBaseUrl}/cobranzas/detalle/${documentoId}/`, {
                    headers: window.authService.getAuthHeaders()
                });
                
                if (response.status === 401) {
                    window.authService.logout();
                    return;
                }
                
                if (response.status === 404) {
                    this.showError('Documento no encontrado');
                    return;
                }
                
                documento = await response.json();
            }
            
            this.displayDocumentoDetail(documento);
            this.navigateTo('documento-detalle');
            
        } catch (error) {
            console.error('Error loading documento detail:', error);
            this.showError('Error cargando detalle del documento');
        } finally {
            this.showDocumentoDetailLoading(false);
        }
    }

    displayDocumentoDetail(documento) {
        const tipoColor = this.getTipoColor(documento.tipo);
        const tipoNombre = this.getTipoNombre(documento.tipo);
        const diasCredito = this.calculateCreditDays(documento.fecha_emision, documento.fecha_vencimiento);
        const diasDesdeEmision = this.calculateDaysSince(documento.fecha_emision);
        const fechaEmisionFormatted = this.formatDateWithDay(documento.fecha_emision);
        const isOverdue = documento.esta_vencido;
        
        const content = `
            <!-- Encabezado (fondo azul) -->
            <div class="${tipoColor} text-white p-6 rounded-t-lg">
                <!-- Línea 1: Tipo y número -->
                <h1 class="text-xl font-bold mb-2">${tipoNombre} ${documento.numero}</h1>
                
                <!-- Línea 2: Nombre del cliente -->
                <h2 class="text-lg font-medium mb-1">${documento.cliente_nombre}</h2>
                
                <!-- Línea 3: Vendedor -->
                <p class="text-sm opacity-90 mb-1">Vendido por ${documento.vendedor_nombre}</p>
                
                <!-- Línea 4: Fecha y días -->
                <div class="flex justify-between items-center">
                    <span class="text-sm">${fechaEmisionFormatted}</span>
                    <span class="text-sm font-medium">${diasDesdeEmision} días</span>
                </div>
            </div>

            <!-- Sección Info -->
            <div class="bg-white p-6 border-l border-r border-gray-200">
                <div class="space-y-3">
                    <!-- Emisión -->
                    <div class="flex justify-between">
                        <span class="text-gray-600">Emisión</span>
                        <span class="font-medium">${this.formatDate(documento.fecha_emision)}</span>
                    </div>
                    
                    <!-- Vencimiento -->
                    <div class="flex justify-between">
                        <span class="text-gray-600">Vencimiento</span>
                        <span class="font-medium">${this.formatDate(documento.fecha_vencimiento)}</span>
                    </div>
                    
                    <!-- Días de crédito -->
                    <div class="flex justify-between">
                        <span class="text-gray-600">Días de crédito</span>
                        <span class="font-medium">${diasCredito}d</span>
                    </div>
                    
                    <!-- Días vencido -->
                    <div class="flex justify-between">
                        <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'}">Días vencido</span>
                        <span class="${isOverdue ? 'text-red-500 font-medium' : 'font-medium'}">${Math.abs(documento.dias_vencimiento)}d</span>
                    </div>
                </div>
            </div>

            <!-- Sección Productos -->
            <div class="bg-gray-100 p-4">
                <h3 class="text-sm font-medium text-gray-600 mb-3">PRODUCTOS</h3>
                <div class="space-y-3">
                    ${documento.productos && documento.productos.length > 0 
                        ? documento.productos.map(producto => `
                            <div class="bg-white p-4 rounded">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <p class="font-medium text-gray-900">${producto.descripcion}</p>
                                        <p class="text-sm text-gray-600">${producto.codigo}</p>
                                        <p class="text-sm text-gray-500">${producto.cantidad} x ${this.formatCurrency(producto.precio_unitario)}</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="font-medium">${this.formatCurrency(producto.subtotal)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')
                        : `
                            <div class="bg-white p-4 rounded text-center text-gray-500">
                                <p>No hay productos disponibles</p>
                            </div>
                        `
                    }
                </div>
            </div>

            <!-- Sección Comentarios -->
            ${documento.comentarios ? `
                <div class="bg-gray-100 p-4">
                    <h3 class="text-sm font-medium text-gray-600 mb-3">COMENTARIOS</h3>
                    <div class="bg-white p-4 rounded">
                        <p class="text-gray-700">${documento.comentarios}</p>
                    </div>
                </div>
            ` : ''}

            <!-- Sección Totales -->
            <div class="bg-white p-6 rounded-b-lg border-l border-r border-b border-gray-200">
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Subtotal</span>
                        <span class="font-medium">${this.formatCurrency(documento.subtotal || 0)}</span>
                    </div>
                    
                    ${documento.descuentos && documento.descuentos > 0 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Descuentos</span>
                            <span class="font-medium text-red-500">-${this.formatCurrency(documento.descuentos)}</span>
                        </div>
                    ` : ''}
                    
                    ${documento.impuestos && documento.impuestos > 0 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Impuestos</span>
                            <span class="font-medium">${this.formatCurrency(documento.impuestos)}</span>
                        </div>
                    ` : ''}
                    
                    <hr class="border-gray-200">
                    
                    <div class="flex justify-between">
                        <span class="text-gray-900 font-medium">Total</span>
                        <span class="font-bold text-lg">${this.formatCurrency(documento.total || documento.monto)}</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-red-600 font-medium">Pendiente</span>
                        <span class="font-bold text-lg text-red-600">${this.formatCurrency(documento.saldo || documento.monto)}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('documentoDetalleContent').innerHTML = content;
    }

    showDocumentoDetailLoading(show) {
        const content = document.getElementById('documentoDetalleContent');
        
        if (show) {
            content.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p class="mt-2 text-gray-600">Cargando detalle...</p>
                </div>
            `;
        }
    }


    parseAmountToMilesK(amount) {
        let addSuffix = false;
        let result = amount;
        
        if (amount >= 1000) {
            addSuffix = true;
            result = result / 1000;
        }

        if (addSuffix) 
            return result.toFixed(0) + 'k';
        else
            return result.toFixed(0);   
    } 

    createClienteCard(cliente) {
        const card = document.createElement('div');
        card.className = 'bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors';
        card.onclick = () => this.showClienteDetail(cliente.id);

        let expiredAmountText = this.parseAmountToMilesK(cliente.vencido || 0);
        let totalAmountText = this.parseAmountToMilesK(cliente.total || 0);
        let lastQuarterSalesText = this.parseAmountToMilesK(cliente.ventas_ultimo_trimestre || 0);
        
        card.innerHTML += `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="grid grid-cols-1 gap-1">
                        <h3 class="font-semibold text-gray-800 break-words" >${cliente.nombre}</h3>
                    </div>
                </div>
                <div class="flex flex-col items-end space-y-1">
                    <div class="flex space-x-2">
                        <span class="text-sm ${cliente.vencido ? 'text-red-500' : 'text-gray-500'}">${expiredAmountText}</span>
                        <span class="text-sm text-gray-500">${cliente.dias_ult_fact  || 'N/A'}</span>
                    </div>
                    <div class="flex space-x-2">
                        <span class="text-sm text-orange-500">${totalAmountText}</span>
                        <span class="text-sm text-gray-500">${lastQuarterSalesText}</span>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `;

        return card;
    }

    async showClienteDetail(clienteId) {
        try {

            /*
                fetch(`${this.apiBaseUrl}/cobranzas/pendientes/${clienteId}`, {
                    headers: window.authService.getAuthHeaders()
                })
            */
            const [clienteResponse, resumenResponse, eventsResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/`, {
                    headers: window.authService.getAuthHeaders()
                }),
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/resumen/`, {
                    headers: window.authService.getAuthHeaders()
                }),
                fetch(`${this.apiBaseUrl}/cobranzas/eventos/${clienteId}`, {
                    headers: window.authService.getAuthHeaders()
                })
            ]);

            if (clienteResponse.status === 401 || resumenResponse.status === 401 || eventsResponse.status === 401) {
                window.authService.logout();
                return;
            }

            const cliente = await clienteResponse.json();
            const resumen = await resumenResponse.json();
            const eventos = await eventsResponse.json();

            const detailView = document.getElementById('cliente-detail-view');
            detailView.innerHTML = this.createClienteDetailHTML(cliente, resumen);

            if (eventos.length !== 0) {
                 this.createClienteEventsHTML(eventos);
            }
            
            // Hide clientes view and show detail view
            document.getElementById('clientes-view').classList.add('hidden');
            detailView.classList.remove('hidden');
            
            // Update header
            document.getElementById('pageTitle').textContent = cliente.nombre;

            // set pending document listener 
            document.getElementById('clientPendingDocs').onclick = () => {
                this.currentClientId = clienteId;
                this.LoadClientPendingDocs(clienteId);
                //this.showView('docs-pdtes-cliente');
            };

        } catch (error) {
            console.error('Error loading cliente detail:', error);
            this.showError('Error cargando los detalles del cliente');
        }
    }

    createClienteEventsHTML(docs){
        debugger; 
        const detailView = document.getElementById('cliente-detail-view');
        const documentosList = detailView.querySelector('#eventList');

        if (docs.length === 0) {
            documentosList.innerHTML = `
                <div class="text-center text-gray-500">
                    <p class="text-lg font-medium">No hay eventos los ultimos 90 dias</p>
                    <p class="text-sm">Este cliente no tiene eventos los ultimos 3 meses</p>
                </div>
            `;
            return;
        }

        documentosList.innerHTML = docs.map(doc => {
            const tipoColor = this.getTipoColor(doc.tipo);
            const tipoAbrev = this.getTipoAbreviacion(doc.tipo);
            const timeAgo = this.getTimeAgo(doc.fecha_emision);
            const diasCredito = this.calculateCreditDays(doc.fecha_emision, doc.fecha_vencimiento);
            const diasVencido = doc.dias_vencimiento;
            const isOverdue = doc.esta_vencido;
            
            return `
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <!-- Fila 1: Tipo, Cliente, Tiempo -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full ${tipoColor} flex items-center justify-center">
                                <span class="text-white text-xs font-bold">${tipoAbrev}</span>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 text-sm">${doc.numero}</p>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500">${timeAgo}</span>
                    </div>
                    
                    <!-- Fila 2: Fecha emisión, Días crédito, Monto -->
                    <div class="flex justify-between items-center mb-2 text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">E </span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <span class="text-gray-600">${diasCredito}d</span>
                        <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="flex justify-between items-center text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">${(doc.fecha_vencimiento) ? "V ": ""} </span>
                            <span class="text-gray-900">${(doc.fecha_vencimiento) ? this.formatDate(doc.fecha_vencimiento): ""}</span>
                        </div>
                        <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'}">${!isNaN(diasVencido) ? diasCredito.toString() + "d": ""}</span>
                        <div class="text-right">
                            <span class="text-xs text-gray-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    createClientePendingDocsHTML(docs){
    
        const detailView = document.getElementById('cliente-detail-view');
        const documentosList = detailView.querySelector('#documentosPendientes');

        if (docs.length === 0) {
            documentosList.innerHTML = `
                <div class="text-center text-gray-500">
                    <p class="text-lg font-medium">No hay documentos pendientes</p>
                    <p class="text-sm">Este cliente no tiene documentos pendientes de cobro.</p>
                </div>
            `;
            return;
        }

        documentosList.innerHTML = docs.map(doc => {
            const tipoColor = this.getTipoColor(doc.tipo);
            const tipoAbrev = this.getTipoAbreviacion(doc.tipo);
            const timeAgo = this.getTimeAgo(doc.fecha_emision);
            const diasCredito = this.calculateCreditDays(doc.fecha_emision, doc.fecha_vencimiento);
            const diasVencido = doc.dias_vencimiento;
            const isOverdue = doc.esta_vencido;
            
            return `
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <!-- Fila 1: Tipo, Cliente, Tiempo -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full ${tipoColor} flex items-center justify-center">
                                <span class="text-white text-xs font-bold">${tipoAbrev}</span>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 text-sm">${doc.cliente_nombre}</p>
                                <p class="text-xs text-gray-500">${doc.numero}</p>
                            </div>
                        </div>
                        <span class="text-xs text-gray-500">${timeAgo}</span>
                    </div>
                    
                    <!-- Fila 2: Fecha emisión, Días crédito, Monto -->
                    <div class="flex justify-between items-center mb-2 text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">E</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <span class="text-gray-600">${diasCredito}d</span>
                        <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="flex justify-between items-center text-sm">
                        <div class="flex items-center space-x-1">
                            <span class="text-gray-600">V</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_vencimiento)}</span>
                        </div>
                        <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'}">${Math.abs(diasVencido)}d</span>
                        <div class="text-right">
                            <span class="text-xs text-gray-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    createClienteDetailHTML(cliente, resumen) {
        return `
            <div class="space-y-6">
                <!-- Header Card -->
                <div class="bg-primary text-white rounded-lg p-6">
                    <h2 class="text-lg font-bold">${cliente.nombre}</h2>
                    <p class="text-sm opacity-90">Compañía</p>
                    <div class="grid grid-cols-1 gap-4 mt-4 text-sm">
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
                <div id="clientPendingDocs" class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">DOCUMENTOS PENDIENTES</h3>
                    <div id="clientDocsPendingLoading" class="hidden text-center py-8">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p class="mt-2 text-gray-600">Cargando documentos...</p>
                    </div>
                    <div id="clientDocsPendingList">
                        <!-- Documents will be loaded here -->
                    </div>
                </div>

                <!-- Eventos -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">EVENTOS</h3>
                    <div id="eventList">
                        <!-- Events will be loaded here -->
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
                labels: data.map(item => item.mes),  //+ ' (' + (item.monto / 1000).toFixed(0) + 'k)'
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
                    },
                    datalabels: {
                        anchor: 'center',       // posición
                        align: 'center',        // encima de la barra
                        color: '#FFFFFF',       // color del texto
                        font: {
                            weight: 'bold',
                            size: 12
                        },
                        formatter: function(value) {
                            return (value / 1000).toFixed(0) + 'k';
                        }
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

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
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
    debugger;
    Chart.register(ChartDataLabels);
});