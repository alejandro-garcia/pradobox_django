class CobranzasApp {
    constructor() {
        this.currentView = 'dashboard';
        this.apiBaseUrl = '/api';
        this.offlineMode = false;
        this.charts = {
            ventas: null
        };
        this.dashboardLoaded = false;
        this.loadingDashboard = false;
        this.sqlConfig = null;
        // Stores last applied filters. UI changes won't apply until user clicks Apply.
        this.activeFilters = null;

        // Simple navigation stack to support Back button
        this.viewHistory = [];

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
        this.lastScrollTop = 0;
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

            //Obtener version de cache
            if (caches) {
                const cacheNames = await caches.keys();
                if (cacheNames.length > 1) {
                    let cacheVersion = cacheNames[cacheNames.length - 1];
                    await window.indexedDBService.setSyncMetadata('sw_version', cacheVersion);
                }
            }

            console.log('IndexedDB initialized successfully');
        } catch (error) {
            console.error('Error initializing IndexedDB:', error);
        }
    }

    generateUUID() { // Public Domain/MIT
        var d = new Date().getTime();//Timestamp
        var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16;//random number between 0 and 16
            if(d > 0){//Use timestamp until depleted
                r = (d + r)%16 | 0;
                d = Math.floor(d/16);
            } else {//Use microseconds since page-load if supported
                r = (d2 + r)%16 | 0;
                d2 = Math.floor(d2/16);
            }
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    closeEditFieldModal(typeId) {
        const modal = document.getElementById('editFieldModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            if (typeId){
                document.getElementById(typeId).classList.add('hidden');
            } else {
                document.getElementById('mailTypeSelect').classList.add('hidden');
                document.getElementById('phoneTypeSelect').classList.add('hidden');
            }
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

        // Back button now navigates to the previous view
        document.getElementById('backBtn').addEventListener('click', () => {
            this.goBack();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            //this.refreshDashboard();
            this.navigateTo('sync');
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

        // User menu toggle (click on user name)
        const userInfoEl = document.getElementById('userInfo');
        const userMenu = document.getElementById('userMenu');
        const userMenuWrapper = document.getElementById('userMenuWrapper');
        if (userInfoEl && userMenu && userMenuWrapper) {
            userInfoEl.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
            });
            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!userMenuWrapper.contains(e.target)) {
                    userMenu.classList.add('hidden');
                }
            });
        }
        
        // Open Change Password Modal
        const changePwdItem = document.getElementById('changePasswordMenuItem');
        if (changePwdItem) {
            changePwdItem.addEventListener('click', () => {
                if (userMenu) userMenu.classList.add('hidden');
                const modal = document.getElementById('changePasswordModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            });
        }
        
        // Modal actions: cancel and confirm
        const cancelChangePasswordBtn = document.getElementById('cancelChangePasswordBtn');
        const confirmChangePasswordBtn = document.getElementById('confirmChangePasswordBtn');
        const oldPasswordInput = document.getElementById('oldPasswordInput');
        const newPasswordInput = document.getElementById('newPasswordInput');
        const confirmPasswordInput = document.getElementById('confirmPasswordInput');
        const changePasswordError = document.getElementById('changePasswordError');
        const changePasswordModal = document.getElementById('changePasswordModal');

        const closeChangePasswordModal = () => {
            if (changePasswordModal) {
                changePasswordModal.classList.add('hidden');
                changePasswordModal.classList.remove('flex');
            }
            if (oldPasswordInput) oldPasswordInput.value = '';
            if (newPasswordInput) newPasswordInput.value = '';
            if (confirmPasswordInput) confirmPasswordInput.value = '';
            if (changePasswordError) {
                changePasswordError.textContent = '';
                changePasswordError.classList.add('hidden');
            }
        };
        
        if (cancelChangePasswordBtn) {
            cancelChangePasswordBtn.addEventListener('click', () => closeChangePasswordModal());
        }
        
        if (confirmChangePasswordBtn) {
            confirmChangePasswordBtn.addEventListener('click', async () => {
                const oldPwd = oldPasswordInput ? oldPasswordInput.value : '';
                const newPwd = newPasswordInput ? newPasswordInput.value : '';
                const confirmPwd = confirmPasswordInput ? confirmPasswordInput.value : '';

                if (!oldPwd || !newPwd || !confirmPwd) {
                    if (changePasswordError) {
                        changePasswordError.textContent = 'Completa todos los campos';
                        changePasswordError.classList.remove('hidden');
                    }
                    return;
                }
                if (newPwd !== confirmPwd) {
                    if (changePasswordError) {
                        changePasswordError.textContent = 'Las contraseñas no coinciden';
                        changePasswordError.classList.remove('hidden');
                    }
                    return;
                }
                if (newPwd.length < 8) {
                    if (changePasswordError) {
                        changePasswordError.textContent = 'La nueva contraseña debe tener al menos 8 caracteres';
                        changePasswordError.classList.remove('hidden');
                    }
                    return;
                }

                // Call backend API via auth service
                const result = await window.authService.changePassword(oldPwd, newPwd);
                if (result.success) {
                    this.showSuccess(result.message || 'Contraseña actualizada correctamente');
                    closeChangePasswordModal();
                } else {
                    if (changePasswordError) {
                        changePasswordError.textContent = result.message || 'No se pudo cambiar la contraseña';
                        changePasswordError.classList.remove('hidden');
                    }
                }
            });
        }
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

        // Clear data button
        document.getElementById('clearCacheBtn').addEventListener('click', async () => {
            if (confirm('¿Está seguro de que desea eliminar los datos en cache?')) {
                await this.clearAllCaches();
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
            this.dashboardLoaded = false;
            
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
        const toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
        const searchFiltersDiv = document.getElementById('searchFilters');

        // Selects
        const filterLastYearSales = document.getElementById('filterLastYearSales');
        const filterOverdueDebt = document.getElementById('filterOverdueDebt');
        const filterTotalOverdue = document.getElementById('filterTotalOverdue');
        const filterDaysPastDue = document.getElementById('filterDaysPastDue');
        const filterDaysSinceLastInvoice = document.getElementById('filterDaysSinceLastInvoice');
        const orderField = document.getElementById('orderField');
        const orderDesc = document.getElementById('orderDesc');
        const btnClearFilter = document.getElementById('btnClearFilter');
        const btnApplyFilters = document.getElementById('btnApplyFilters');

        let searchTimeout;

        // Helpers
        const getFilters = () => ({
            lastYearSales: filterLastYearSales ? filterLastYearSales.value : 'all',
            overdueDebt: filterOverdueDebt ? filterOverdueDebt.value : 'all',
            totalOverdue: filterTotalOverdue ? filterTotalOverdue.value : 'all',
            daysPastDue: filterDaysPastDue ? filterDaysPastDue.value : 'all',
            daysSinceLastInvoice: filterDaysSinceLastInvoice ? filterDaysSinceLastInvoice.value : 'all',
            orderField: orderField ? orderField.value : '',
            orderDesc: orderDesc ? orderDesc.checked : false,
        });

        // Apply button: persist filters and execute search
        if (btnApplyFilters) {
            btnApplyFilters.addEventListener('click', () => {
                this.activeFilters = getFilters();
                const searchTerm = searchInput ? searchInput.value.trim() : '';
                this.searchClientes(searchTerm, this.activeFilters);
            });
        }

        // Clear button: reset UI to defaults (does NOT auto-apply)
        if (btnClearFilter) {
            btnClearFilter.addEventListener('click', () => {
                if (filterLastYearSales) filterLastYearSales.value = 'all';
                if (filterOverdueDebt) filterOverdueDebt.value = 'all';
                if (filterTotalOverdue) filterTotalOverdue.value = 'all';
                if (filterDaysPastDue) filterDaysPastDue.value = 'all';
                if (filterDaysSinceLastInvoice) filterDaysSinceLastInvoice.value = 'all';
                if (orderField) orderField.value = '';
                if (orderDesc) orderDesc.checked = false;
            });
        }

        if (toggleFiltersBtn && searchFiltersDiv) {
            toggleFiltersBtn.addEventListener('click', () => {
                searchFiltersDiv.classList.toggle('hidden');
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                if (searchTerm.length > 0) {
                    clearBtn.classList.remove('hidden');
                } else {
                    clearBtn.classList.add('hidden');
                }

                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                searchTimeout = setTimeout(() => {
                    if (searchTerm.length >= 3 || searchTerm.length === 0) {
                        // Use last applied filters, not the current UI state
                        this.searchClientes(searchTerm, this.activeFilters);
                    }
                }, 300);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearBtn.classList.add('hidden');
                this.searchClientes('', this.activeFilters);
            });
        }
    }

    navigateTo(view, options = {}) {
        const push = options.push !== false; // default: push into history
        const isBack = (options.hasOwnProperty("isBack") ?  options.isBack: false); 

        // Manage history stack
        if (push && this.currentView && this.currentView !== view) {
            // Avoid consecutive duplicates
            const last = this.viewHistory[this.viewHistory.length - 1];
            if (last !== this.currentView) {
                this.viewHistory.push(this.currentView);
            }
        }
        // Update current view
        this.currentView = view;

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
            'docs-pdtes-cliente': 'Cobrables',
            'cliente-detail': 'Detalle del Cliente',
            'sync': 'Sincronizar',
            'contacts': 'Contactos'
        };

        document.getElementById('pageTitle').textContent = titles[view] || 'Cobranzas';
        
        // Show/hide back button
        const backBtn = document.getElementById('backBtn');
        if (view === 'dashboard') {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
        }

        // Load view data
        switch (view) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'clientes':
                if (!isBack) {
                    this.loadClientes();
                } else {
                    window.scrollTo({ top: this.lastScrollTop, behavior: 'auto' });
                }
                break;
            case 'documentos-pendientes':
                this.loadDocumentosPendientes();
                break;
            case 'documento-detalle':
                // No load here, will be loaded when navigating with document ID
                break;
            case 'docs-pdtes-cliente':
                // Handled when opening from client detail
                this.LoadClientPendingDocs(this.currentClientId);
                break;
            case 'cliente-detail':
                // The content is injected before navigating; nothing to load here
                break;
            case 'sync':
                // The content is injected before navigating; nothing to load here
                this.updateStorageInfoSync();
                break;
            case 'mas':
                this.updateStorageInfo();
                break;
            case 'contacts':
                // Contacts view content is injected before navigation
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
            'COB': 'bg-green-500'
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
            'COB': 'P'
        };
        return abrev[tipo] || 'D';
    }
    getTipoNombre(tipo) {
        const abrev = {
            'FACT': 'Factura',
            'N/DB': 'Nota de Débito',
            'N/CR': 'Nota de Crédito',
            'ADEL': 'Adelanto',
            'AJPM': 'Ajuste Positivo Manual',
            'AJMN': 'Ajuste Negativo Manual',
            'DEV': 'Devolución',
            'COB': 'Pago'
        };
        return abrev[tipo] || 'Factura';
    }

    getTimeAgo(fecha) {
        const now = new Date();
        const date = this.stringToDate(fecha);

        // Normaliza ambas fechas al inicio del día local
        now.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

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

    dateDiffInDays(date1, date2) {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;

        // Normalizar quitando horas/minutos/segundos para evitar desfases por zona horaria
        const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
        const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

        return Math.floor((utc2 - utc1) / MS_PER_DAY);
    }

    formatDateWithDay(date) {
        const options = { weekday: 'long' }; // Día de la semana completo
        const locale = 'es-ES'; // Español de España (puedes adaptar si necesitas otro)

        const weekday = date.toLocaleDateString(locale, options); // e.g. "lunes"

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        // Capitalizar la primera letra del día de la semana
        const weekdayCapitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);

        return `${weekdayCapitalized}, ${day}-${month}-${year}`;
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
            if (this.loadingDashboard){ // || this.dashboardLoaded) {
                return;
            }
            this.loadingDashboard = true;
            
            let data;
            let seller_code;
            
            if (this.offlineMode) {
                // Load from IndexedDB
                const user = await window.indexedDBService.getCurrentUser();
                seller_code = user.codigo_vendedor_profit; 

                data = await this.loadDashboardFromIndexedDB(seller_code);
            } else {
                const user = window.authService.getCurrentUser();
                seller_code = user.codigo_vendedor_profit; 

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

                //lessSales = (data.ventas_por_mes[lessSalesIndex].monto / 1000).toString().split(".")[0] + "K";
                lessSales = this.formatCurrency(data.ventas_por_mes[lessSalesIndex].monto / 1000, false, false) + "K";
                lessSalesMonth = data.ventas_por_mes[lessSalesIndex].mes;

                let salesPercentage = (topSales !== 0) ? correntSalesNum * 100 / topSales: 0; 

                if (salesPercentage > 100) salesPercentage = 100;

                //let currentSales = (data.ventas_por_mes[2].monto / 1000).toString().split(".")[0] + "K";
                let currentSales = this.formatCurrency(data.ventas_por_mes[2].monto, true, false);

                topSales = this.formatCurrency(topSales, false, false) + "K";

                document.getElementById('currentSales').textContent = currentSales;
                document.getElementById('lessSales').textContent = lessSales + " " + lessSalesMonth;
                //document.getElementById('topSales').textContent = topSales.toString().split(".")[0] + "K" + " " + topSalesMonth;
                document.getElementById('topSales').textContent = topSales + " " + topSalesMonth;
                //document.getElementById('remainingSales').textContent = remainingSales.toString().split(".")[0] + "K";
                document.getElementById('remainingSales').textContent =  this.formatCurrency(remainingSales, false, false) + "K";
                document.getElementById('salesPercentage').style= `width:${salesPercentage}%`;
            }

            document.getElementById('currentDay').textContent = data.situacion.dias_transcurridos.toString() + 'd';
            document.getElementById('remainingDays').textContent = data.situacion.dias_faltantes.toString() + 'd';
            
            let percentageDays = data.situacion.dias_transcurridos * 100 / (data.situacion.dias_faltantes + data.situacion.dias_transcurridos);
           
            document.getElementById('daysPercentage').style= `width:${percentageDays}%`;
            document.getElementById('totalVencido').textContent = this.formatCurrency(data.situacion.total_vencido, true);
            document.getElementById('cantidadVencido').textContent = data.situacion.cantidad_documentos_vencidos;
            document.getElementById('diasVencido').textContent = data.situacion.dias_promedio_vencimiento;
            document.getElementById('totalGeneral').textContent =  this.formatCurrency(data.situacion.total_vencido + data.situacion.total_por_vencer - data.situacion.total_sinvencimiento, true);
            document.getElementById('cantidadTotal').textContent = data.situacion.cantidad_documentos_total;
            document.getElementById('diasTotal').textContent = data.situacion.dias_promedio_vencimiento_todos;
            document.getElementById('totalNeto').textContent =  this.formatCurrency(data.situacion.total_neto, true);
            document.getElementById('totalCreditos').textContent = this.formatCurrency(data.situacion.total_creditos * -1, true);

            // Create charts only if they don't exist
            if (!this.charts.ventas) {
                this.createVentasChart(data.ventas_por_mes, this.formatCurrency);
            }

            if (!this.offlineMode) {
                this.addSellerFloatingActionButton(seller_code);
            }

            this.dashboardLoaded = true;

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Error cargando el dashboard...' + error.message);
        } finally {
            this.loadingDashboard = false;
        }
    }

    async loadDashboardFromIndexedDB(seller_code) {
        const resumen = await window.indexedDBService.getResumenCobranzas(seller_code);
        //const ventas = await window.indexedDBService.getVentasTrimestre(seller_code);
        const ventas = await window.indexedDBService.getVentasMensuales();

        const situacion = {
            total_vencido: resumen.total_vencido,
            total_por_vencer: resumen.total_por_vencer,
            total_creditos: resumen.total_creditos,
            total_sinvencimiento: resumen.total_sinvencimiento,
            total_neto: resumen.total_vencido + resumen.total_por_vencer + resumen.total_creditos - resumen.total_sinvencimiento,
            cantidad_documentos_vencidos: resumen.cantidad_vencidos,
            cantidad_documentos_total: resumen.cantidad_total,
            dias_promedio_vencimiento: resumen.dias_promedio_vencimiento,
            dias_promedio_vencimiento_todos: resumen.dias_promedio_vencimiento_todos,
            dias_transcurridos: resumen.dias_transcurridos,
            dias_faltantes: resumen.dias_faltantes
        };

        return {
            situacion,
            ventas_por_mes: ventas
        };
    }

    clientToDomain(cliente){
        return {
            id: cliente.co_cli,
            nombre: cliente.cli_des,
            rif: cliente.rif,
            telefono: cliente.telefonos,
            email: cliente.email,
            direccion: cliente.direccion,
            dias_ult_fact: cliente.dias_ult_fact,
            vencido: cliente.vencido,
            total: cliente.total,
            ventas_ultimo_trimestre: cliente.ventas_ultimo_trimestre
        }
    }

    async loadClientes() {
        this.showClientesLoading(true);
        
        try {
            let clientes;
            
            if (this.offlineMode) {
                clientes = await window.indexedDBService.getClientes();
                clientes = clientes.map(c => this.clientToDomain(c));

                // name filter
                if (this.searchTerm && this.searchTerm.length >= 3) {
                    const term = this.searchTerm.toLowerCase();
                    clientes = clientes.filter(c => c.nombre.toLowerCase().includes(term));
                }

                if (!this.activeFilters) {
                    console.log('No order field set, defaulting to daysSinceLastInvoice');
                    
                    this.activeFilters = {
                        lastYearSales: 'all',
                        overdueDebt: 'all',
                        totalOverdue: 'all',
                        daysSinceLastInvoice: 'all',
                        orderField: 'daysSinceLastInvoice',
                        orderDesc: false,
                    };
                }

                // bucket filters
                if (this.activeFilters) {
                    const inBucket = (value, bucket) => {
                        if (bucket === 'all' || !bucket) return true;
                        const map = {
                            lessTen: [0, 10],
                            lestHundred: [11, 100],
                            lestThousand: [101, 1000],
                            lestTenThousand: [1001, 10000],
                            overTenThousand: [10001, null],
                        };
                        const range = map[bucket];
                        if (!range) return true;
                        const [min, max] = range;
                        const val = Number(value || 0);
                        if (min !== null && val < min) return false;
                        if (max !== null && val > max) return false;
                        return true;
                    };
                    const inDaysBucket = (value, bucket) => {
                        if (bucket === 'all' || !bucket) return true;
                        const map = {
                            upToSeven: [0, 7],
                            upToFourteen: [8, 14],
                            upToThirty: [15, 30],
                            upToSixty: [31, 60],
                            upToNinety: [61, 90],
                        };
                        const range = map[bucket];
                        if (!range) return true;
                        const [min, max] = range;
                        const val = Number(value || 0);
                        if (min !== null && val < min) return false;
                        if (max !== null && val > max) return false;
                        return true;
                    };

                    clientes = clientes.filter(c => {
                        const okSales = inBucket(c.ventas_ultimo_trimestre, this.activeFilters.lastYearSales);
                        const okOverdue = inBucket(c.vencido, this.activeFilters.overdueDebt);
                        const okTotal = inBucket(c.total, this.activeFilters.totalOverdue);
                        const okDaysSince = inDaysBucket(c.dias_ult_fact, this.activeFilters.daysSinceLastInvoice);
                        // daysPastDue not available per-client; ignored for now
                        return okSales && okOverdue && okTotal && okDaysSince;
                    });

                    if (this.activeFilters.orderField) {
                        const fieldMap = {
                            lastYearSales: 'ventas_ultimo_trimestre',
                            overdueDebt: 'vencido',
                            totalOverdue: 'total',
                            daysSinceLastInvoice: 'dias_ult_fact',
                        };
                        const f = fieldMap[this.activeFilters.orderField];
                        if (f) {
                            const desc = !!this.activeFilters.orderDesc;
                            clientes.sort((a, b) => {
                                const av = a[f] ?? 0;
                                const bv = b[f] ?? 0;
                                if (av < bv) return desc ? 1 : -1;
                                if (av > bv) return desc ? -1 : 1;
                                // then by name for stability
                                const an = (a.nombre || '').localeCompare(b.nombre || '');
                                return an;
                            });
                        }
                    }
                }
            } else {
                const user = window.authService.getCurrentUser();
                const sellerCode = user.codigo_vendedor_profit || '-1'; 

                const params = new URLSearchParams();
                if (this.searchTerm) params.set('search', this.searchTerm);
                if (this.activeFilters) {
                    Object.entries(this.activeFilters).forEach(([k, v]) => {
                        if (k === 'orderDesc') {
                            if (v) params.set('orderDesc', 'true');
                        } else if (v && v !== 'all' && v !== '') {
                            params.set(k, v);
                        }
                    });
                }

                const hasAnyFilter = this.activeFilters && Object.entries(this.activeFilters).some(([k, v]) => {
                    if (k === 'orderDesc') return !!v;
                    return v && v !== 'all' && v !== '';
                });
                const endpoint = hasAnyFilter ? `${this.apiBaseUrl}/clientes/vendedor/${sellerCode}/filter` : `${this.apiBaseUrl}/clientes/vendedor/${sellerCode}`;
                const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

                const response = await fetch(url, { headers: window.authService.getAuthHeaders() });
                if (response.status === 401) { window.authService.logout(); return; }
                clientes = await response.json();
            }

            this.displayClientes(clientes);
            this.updateSearchResults(clientes.length, this.searchTerm);

        } catch (error) {
            console.error('Error loading clientes:', error);
            this.showError('Error buscando clientes...' + error.message);
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

                const user = await window.indexedDBService.getCurrentUser();
                const seller_code = user.codigo_vendedor_profit;     
                
                const clientes = await window.indexedDBService.getClientes();

                const clientesDict = clientes.reduce((acc, item) => {
                        acc[item.co_cli] = item.cli_des.trim(); // trim() para limpiar espacios
                        return acc;
                }, {});    

                // Load from IndexedDB
                const documentos = await window.indexedDBService.getDocumentos({ co_ven: seller_code });
                const resumen = await window.indexedDBService.getResumenCobranzas(seller_code);

                const resumenDto = {
                    total_vencido: resumen.total_vencido,
                    total_por_vencer: resumen.total_por_vencer,
                    total_creditos: resumen.total_creditos,
                    total_sinvencimiento: resumen.total_sinvencimiento,
                    total_neto: resumen.total_vencido + resumen.total_por_vencer - resumen.total_sinvencimiento,
                    cantidad_documentos_vencidos: resumen.cantidad_vencidos,
                    cantidad_documentos_total: resumen.cantidad_total,
                    dias_promedio_vencimiento: resumen.dias_promedio_vencimiento,
                    dias_promedio_vencimiento_todos: resumen.dias_promedio_vencimiento_todos,
                    dias_transcurridos: resumen.dias_transcurridos,
                    dias_faltantes: resumen.dias_faltantes
                };
                
                data = {
                    // documentos: documentos.map(doc => ({
                    //     ...doc,
                    //     cliente_nombre: 'Cliente Local', // En IndexedDB necesitaríamos hacer join
                    //     dias_vencimiento: this.calculateDaysOverdue(doc.fec_venc),
                    //     esta_vencido: new Date(doc.fec_venc) < new Date()
                    // })),
                    documentos: documentos.map(doc => ({
                        cliente_id: doc.co_cli, 
                        vendedor_id: doc.co_ven, 
                        fecha_emision: doc.fec_emis, 
                        fecha_vencimiento: doc.fec_venc, 
                        id: doc.nro_doc,
                        numero: doc.nro_doc, 
                        tipo: doc.tipo_doc, 
                        monto: doc.monto_net,
                        saldo: doc.saldo, 
                        cliente_nombre: clientesDict[doc.co_cli] || 'Cliente: ' + doc.co_cli, 
                        dias_vencimiento: this.calculateDaysOverdue(doc.fec_venc),
                        esta_vencido: new Date(doc.fec_venc) < new Date(),
                        empresa: doc.empresa 
                    })),
                    resumen: resumenDto
                };
            } else {
                const user = window.authService.getCurrentUser();
                const seller_code = user.codigo_vendedor_profit; 

                // Load from API
                const [documentosResponse, resumenResponse] = await Promise.all([
                    fetch(`${this.apiBaseUrl}/cobranzas/pendientes/vendedor/${seller_code}`, {
                        headers: window.authService.getAuthHeaders()
                    }),
                    fetch(`${this.apiBaseUrl}/dashboard/${seller_code}`, {
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
            this.showError('Error cargando documentos pendientes...' + error.message);
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
                //const docsPendientes = await window.indexedDBService.getDocumentos();
                const docsPendientes = await window.indexedDBService.getDocumentosPendientesCliente(clientId);
                
                const resumen = await window.indexedDBService.getResumenCobranzas();
                
                // data = {
                //     documentos: documentos.map(doc => ({
                //         ...doc,
                //         cliente_nombre: 'Cliente Local', // En IndexedDB necesitaríamos hacer join
                //         dias_vencimiento: this.calculateDaysOverdue(doc.fec_venc),
                //         esta_vencido: new Date(doc.fec_venc) < new Date()
                //     })),
                //     resumen: resumen
                // };
                data = {
                    documentos: docsPendientes,
                    resumen: resumen
                };
            } else {
                // Load from API

                const documentosResponse = await fetch(`${this.apiBaseUrl}/cobranzas/pendientes/${clientId}`, {
                    headers: window.authService.getAuthHeaders()
                });
                
                const documentos = await documentosResponse.json();
                
                data = {
                    documentos: documentos, 
                };
            }
            
            this.displayClientDocsPending(data);
            
        } catch (error) {
            console.error('Error loading documentos pendientes:', error);
            this.showError('Error cargando documentos pendientes...' + error.message);
        } finally {
            this.showClientDocsPendingLoading(false);
        }
    }

    displayDocumentosPendientes(data) {
        // Update resumen
        document.getElementById('resumenVencido').textContent = this.formatCurrency(data.resumen.total_vencido, true);
        document.getElementById('resumenCantidadVencido').textContent = data.resumen.cantidad_documentos_vencidos;
        document.getElementById('resumenDiasVencido').textContent = data.resumen.dias_promedio_vencimiento;
        
        const totalGeneral = data.resumen.total_vencido + data.resumen.total_por_vencer - data.resumen.total_sinvencimiento;
        
        document.getElementById('resumenTotal').textContent = this.formatCurrency(totalGeneral, true);
        document.getElementById('resumenCantidadTotal').textContent = data.resumen.cantidad_documentos_total;
        document.getElementById('resumenDiasTotal').textContent = data.resumen.dias_promedio_vencimiento_todos;
        
        document.getElementById('resumenNeto').textContent = this.formatCurrency(data.resumen.total_neto, true);
        document.getElementById('resumenCreditos').textContent = this.formatCurrency(data.resumen.total_creditos * -1, true);

        // Display documentos
        document.getElementById('globalPendingDocsTitle').textContent = 'DOCUMENTOS PENDIENTES (' + data.documentos.length + ')';
        const documentosList = document.getElementById('documentosPendientesList');
        const documentosEmpty = document.getElementById('documentosPendientesEmpty');
        
        if (data.documentos.length === 0) {
            documentosList.innerHTML = '';
            documentosEmpty.classList.remove('hidden');
            return;
        }
        
        documentosEmpty.classList.add('hidden');
        
        documentosList.innerHTML = data.documentos.map(doc => {
            const tipoColor = this.getTipoColor(doc.tipo);
            const tipoAbrev = this.getTipoAbreviacion(doc.tipo);
            const timeAgo = this.getTimeAgo(doc.fecha_emision);

            let diasCredito =  ''; 
            let diasVencido = ''; 

            if (doc.tipo != 'COB') {
                diasCredito = this.calculateCreditDays(doc.fecha_emision, doc.fecha_vencimiento);
                diasCredito = diasCredito != null? diasCredito.toString() + 'd': '';

                diasVencido = doc.dias_vencimiento;
                diasVencido = diasVencido != null? Math.abs(diasVencido).toString() + 'd': '';
            } 

            const isOverdue = doc.esta_vencido;
            //<div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200">

            return `
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors" 
                    onclick="cobranzasApp.viewDocumentoDetail(${doc.empresa}, '${doc.tipo}', ${doc.numero})">
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
                    <div class="grid grid-cols-5 items-center mb-2 text-sm"> 
                        <div class="col-span-2 flex items-center space-x-1">
                            <span class="text-gray-600">E</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-gray-600 pr-10">${diasCredito}</span>
                        </div>
                        <div class="col-span-2 text-right">
                            <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="grid grid-cols-5 items-center mb-2 text-sm">
                        <div class="col-span-2 flex items-center space-x-1">
                            <span class="text-gray-600">V</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_vencimiento)}</span>
                        </div>
                        <div class="text-right pr-10">
                            <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'}">${diasVencido}</span>
                        </div>
                        <div class="col-span-2 text-right">
                            <span class="text-xs text-red-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.saldo)}</span>
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
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200" onclick="cobranzasApp.viewDocumentoDetail(${doc.empresa}, '${doc.tipo}', ${doc.numero})">
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
                    <div class="grid grid-cols-5 items-center mb-2 text-sm">
                        <div class="col-span-2 flex items-center space-x-1">
                            <span class="text-gray-600">E</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-gray-600 pr-10">${diasCredito}d</span>
                        </div>
                        <div class="col-span-2 text-right">
                            <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="grid grid-cols-5 items-center text-sm">
                        <div class="col-span-2 flex items-center space-x-1">
                            <span class="text-gray-600">V</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_vencimiento)}</span>
                        </div>
                        <div class="text-right">
                            <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'} pr-10">${diasVencido}d</span>
                        </div>
                        <div class="col-span-2 text-right">
                            <span class="text-xs text-red-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.saldo)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    async searchClientes(searchTerm, filters = null) {
        this.showClientesLoading(true);
        
        try {
            let clientes;
            
            if (this.offlineMode) {
                clientes = await window.indexedDBService.getClientes();
                clientes = clientes.map(c => this.clientToDomain(c));

                // name filter
                if (searchTerm && searchTerm.length >= 3) {
                    const term = searchTerm.toLowerCase();
                    clientes = clientes.filter(c => c.nombre.toLowerCase().includes(term));
                }

                // bucket filters
                if (filters) {
                    const inBucket = (value, bucket) => {
                        if (bucket === 'all' || !bucket) return true;
                        const map = {
                            lessTen: [0, 10],
                            lestHundred: [11, 100],
                            lestThousand: [101, 1000],
                            lestTenThousand: [1001, 10000],
                            overTenThousand: [10001, null],
                        };
                        const range = map[bucket];
                        if (!range) return true;
                        const [min, max] = range;
                        const val = Number(value || 0);
                        if (min !== null && val < min) return false;
                        if (max !== null && val > max) return false;
                        return true;
                    };
                    const inDaysBucket = (value, bucket) => {
                        if (bucket === 'all' || !bucket) return true;
                        const map = {
                            upToSeven: [0, 7],
                            upToFourteen: [8, 14],
                            upToThirty: [15, 30],
                            upToSixty: [31, 60],
                            upToNinety: [61, 90],
                        };
                        const range = map[bucket];
                        if (!range) return true;
                        const [min, max] = range;
                        const val = Number(value || 0);
                        if (min !== null && val < min) return false;
                        if (max !== null && val > max) return false;
                        return true;
                    };

                    clientes = clientes.filter(c => {
                        const okSales = inBucket(c.ventas_ultimo_trimestre, filters.lastYearSales);
                        const okOverdue = inBucket(c.vencido, filters.overdueDebt);
                        const okTotal = inBucket(c.total, filters.totalOverdue);
                        const okDaysSince = inDaysBucket(c.dias_ult_fact, filters.daysSinceLastInvoice);
                        // daysPastDue not available per-client; ignored for now
                        return okSales && okOverdue && okTotal && okDaysSince;
                    });

                    // ordering (offline)
                    if (!filters.orderField) {
                        console.log('No order field set, defaulting to daysSinceLastInvoice');
                        
                        filters.orderField = 'daysSinceLastInvoice';
                        filters.orderDesc = false;    
                    }

                    if (filters.orderField) {
                        const fieldMap = {
                            lastYearSales: 'ventas_ultimo_trimestre',
                            overdueDebt: 'vencido',
                            totalOverdue: 'total',
                            daysSinceLastInvoice: 'dias_ult_fact',
                        };
                        const f = fieldMap[filters.orderField];
                        if (f) {
                            const desc = !!filters.orderDesc;
                            clientes.sort((a, b) => {
                                const av = a[f] ?? 0;
                                const bv = b[f] ?? 0;
                                if (av < bv) return desc ? 1 : -1;
                                if (av > bv) return desc ? -1 : 1;
                                // then by name for stability
                                const an = (a.nombre || '').localeCompare(b.nombre || '');
                                return an;
                            });
                        }
                    }
                }
            } else {
                const user = window.authService.getCurrentUser();
                const sellerCode = user.codigo_vendedor_profit || '-1';
                const params = new URLSearchParams();
                if (searchTerm) params.set('search', searchTerm);
                if (filters) {
                    Object.entries(filters).forEach(([k, v]) => {
                        if (k === 'orderDesc') {
                            if (v) params.set('orderDesc', 'true');
                        } else if (v && v !== 'all' && v !== '') {
                            params.set(k, v);
                        }
                    });
                }

                const hasAnyFilter = filters && Object.entries(filters).some(([k, v]) => {
                    if (k === 'orderDesc') return !!v;
                    return v && v !== 'all' && v !== '';
                });
                const endpoint = hasAnyFilter ? `${this.apiBaseUrl}/clientes/vendedor/${sellerCode}/filter` : `${this.apiBaseUrl}/clientes/vendedor/${sellerCode}`;
                const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

                const response = await fetch(url, { headers: window.authService.getAuthHeaders() });
                if (response.status === 401) { window.authService.logout(); return; }
                clientes = await response.json();
            }

            this.displayClientes(clientes);
            this.updateSearchResults(clientes.length, searchTerm);

        } catch (error) {
            console.error('Error searching clientes:', error);
            this.showError('Error buscando clientes...' + error.message);
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
            
            this.showSuccess(`Importación completada: ${result.clientes_imported} clientes, ${result.documentos_imported} documentos, ${result.renglones_imported} renglones`);
            await this.updateStorageInfoSync();           
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
            document.getElementById('renglonesCount').textContent = info.renglones_count;
            
            if (info.last_sync) {
                const date = new Date(info.last_sync);
                document.getElementById('lastSync').textContent = date.toLocaleString();
            } else {
                document.getElementById('lastSync').textContent = 'Nunca';
            }

            if (info.sw_version){ 
                document.getElementById('swVersion').textContent = info.sw_version;
            } else {
                document.getElementById('swVersion').textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }

    async updateStorageInfoSync() {
        try {
            const info = await window.indexedDBService.getStorageInfo();
            
            document.getElementById('clientesCount2').textContent = info.clientes_count;
            document.getElementById('documentosCount2').textContent = info.documentos_count;
            document.getElementById('renglonesCount2').textContent = info.renglones_count;
            
            if (info.last_sync) {
                const date = new Date(info.last_sync);
                document.getElementById('lastSync2').textContent = date.toLocaleString();
            } else {
                document.getElementById('lastSync2').textContent = 'Nunca';
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

    // 🚀 Forzar reinicio completo del Service Worker y limpiar cachés
    async forceRestartServiceWorker() {
        if (!('serviceWorker' in navigator)) return;

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) {
                console.warn('⚠️ No hay Service Worker registrado.');
                return;
            }

            console.log('🔄 Verificando nueva versión del Service Worker...');
            await registration.update();

            // 🔹 Limpieza manual de todos los cachés antes de activar el nuevo SW
            console.log('🧹 Eliminando cachés antiguos...');
            const cacheKeys = await caches.keys();
            for (const key of cacheKeys) {
                await caches.delete(key);
                console.log(`🗑️ Cache eliminada: ${key}`);
            }

            // 🔹 Si hay un SW en estado "waiting", lo activamos inmediatamente
            if (registration.waiting) {
                console.log('⚙️ Activando nuevo Service Worker...');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });

                registration.waiting.addEventListener('statechange', (e) => {
                    if (e.target.state === 'activated') {
                        console.log('✅ Nuevo SW activado. Recargando...');
                        window.location.reload(true);
                    }
                });
            } else if (registration.active) {
                console.log('🟢 No hay nuevo SW esperando, recargando igualmente...');
                window.location.reload(true);
            } else {
                console.log('ℹ️ No hay SW activo aún.');
            }

        } catch (error) {
            console.error('❌ Error al forzar reinicio del SW:', error);
        }
    }


    async clearAllCaches() {
        // Eliminar caches de service worker
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
        );

        // Eliminar localStorage
        localStorage.clear();

        // Eliminar sessionStorage
        sessionStorage.clear();

        this.forceRestartServiceWorker();

        // // Eliminar IndexedDB
        // if (window.indexedDB) {
        //     indexedDB.databases().then(dbs => {
        //     dbs.forEach(db => {
        //         indexedDB.deleteDatabase(db.name);
        //     });
        //     });
        // }

        alert("Todo el caché local ha sido eliminado.");
    }

    async viewDocumentoDetail(empresa, tipo, documentoId) {
        try {
            this.showDocumentoDetailLoading(true);
            
            let documento;
            
            if (this.offlineMode) {
                // En modo offline, obtener de IndexedDB (funcionalidad limitada)
                const documentos = await window.indexedDBService.getDocumentos();

                const clientes = await window.indexedDBService.getClientes();

                const clientesDict = clientes.reduce((acc, item) => {
                        acc[item.co_cli] = item.cli_des.trim(); // trim() para limpiar espacios
                        return acc;
                }, {});    

                let doc = documentos.find(doc => doc.empresa == empresa && doc.tipo_doc === tipo && doc.nro_doc === documentoId);
                
                if (doc) {
                    // Simular estructura completa para modo offline
                    // documento = {
                    //     ...documento,
                    //     cliente_nombre: 'Cliente Local', // En IndexedDB necesitaríamos hacer join
                    //     vendedor_nombre: 'Vendedor Local',
                    //     productos: [],
                    //     subtotal: documento.saldo,
                    //     descuentos: 0,
                    //     impuestos: 0,
                    //     total: documento.saldo,
                    //     comentarios: documento.observa || ''
                    // };

                    let vendedor = await window.indexedDBService.getSellerByCode(doc.co_ven);
                    let vendedor_nombre = 'Vendedor Local'
                    if (vendedor)
                        vendedor_nombre = vendedor.ven_des; 

                    
                    let productos = [];
                    
                    if ('FACT|DEV'.indexOf(doc.tipo_doc) !== -1){
                        let doc_id = doc.empresa + "-" + doc.tipo_doc + '-' + doc.nro_doc.toString();
                        productos = await window.indexedDBService.getDocLines(doc_id);
                        if (!Array.isArray(productos))
                            productos = [productos];

                        productos = productos.map(p => ({
                            codigo: p.co_art, 
                            descripcion: p.art_des, 
                            cantidad: Number(p.total_art), 
                            precio_unitario: Number(p.prec_vta),
                            subtotal: Number(p.total)
                        }))
                    }
                    
                    //monto: doc.monto_net,
                    documento = {
                        cliente_id: doc.co_cli, 
                        vendedor_id: doc.co_ven, 
                        fecha_emision: doc.fec_emis, 
                        fecha_vencimiento: doc.fec_venc, 
                        numero: doc.nro_doc,
                        tipo: doc.tipo_doc, 
                        saldo: doc.saldo, 
                        cliente_nombre: clientesDict[doc.co_cli] || 'Cliente: ' + doc.co_cli, 
                        dias_vencimiento: this.calculateDaysOverdue(doc.fec_venc),
                        esta_vencido: new Date(doc.fec_venc) < new Date(),
                        vendedor_nombre,
                        productos,
                        subtotal: doc.monto_bru,
                        impuestos: doc.monto_imp,
                        total: doc.monto_net
                    }
                    
                }
            } else {
                // Obtener desde API
                let documentoKey = `${empresa}_${tipo.replace('/','')}_${documentoId}`;

                const response = await fetch(`${this.apiBaseUrl}/cobranzas/detalle/${documentoKey}/`, {
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
            this.showError('Error cargando detalle del documento...' + error.message);
        } finally {
            this.showDocumentoDetailLoading(false);
        }
    }

    legacyDownload(filename, blob) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    displayDocumentoDetail(documento) {
        const tipoColor = this.getTipoColor(documento.tipo);
        const tipoNombre = this.getTipoNombre(documento.tipo);
        const diasCredito = this.calculateCreditDays(documento.fecha_emision, documento.fecha_vencimiento);
        const diasDesdeEmision = this.dateDiffInDays(new Date(documento.fecha_emision), new Date());
        const fechaEmisionFormatted = this.formatDateWithDay(new Date(documento.fecha_emision));
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
            <div class="bg-gray-100 p-4 ${'FACT|DEV'.indexOf(documento.tipo) == -1 ? 'hidden': ''}" id="productsContainer">
                <h3 class="text-sm font-medium text-gray-600 mb-3">PRODUCTOS</h3>
                <div class="space-y-3">
                    ${documento.productos && documento.productos.length > 0 
                        ? documento.productos.map(producto => `
                            <div class="bg-white p-4 rounded">
                                <div class="flex justify-between items-start">
                                    <div class="flex-1">
                                        <p class="font-medium text-gray-900">${producto.descripcion}</p>
                                        <p class="text-sm text-gray-600">${producto.codigo}</p>
                                        <p class="text-sm text-gray-500">${producto.cantidad} x ${this.formatCurrency(producto.precio_unitario, true, true)}</p>
                                    </div>
                                    <div class="text-right">
                                        <span class="font-medium">${this.formatCurrency(producto.subtotal, true, true)}</span>
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
                        <span class="font-medium">${this.formatCurrency(documento.subtotal || 0, true)}</span>
                    </div>
                    
                    ${documento.descuentos && documento.descuentos > 0 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Descuentos</span>
                            <span class="font-medium text-red-500">-${this.formatCurrency(documento.descuentos, true)}</span>
                        </div>
                    ` : ''}
                    
                    ${documento.impuestos && documento.impuestos > 0 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600">Impuestos</span>
                            <span class="font-medium">${this.formatCurrency(documento.impuestos, true)}</span>
                        </div>
                    ` : ''}
                    
                    <hr class="border-gray-200">
                    
                    <div class="flex justify-between">
                        <span class="text-gray-900 font-medium">Total</span>
                        <span class="font-bold text-lg">${this.formatCurrency(documento.total || 0, true)}</span>
                    </div>
                    
                    <div class="flex justify-between">
                        <span class="text-red-600 font-medium">Pendiente</span>
                        <span class="font-bold text-lg text-red-600">${this.formatCurrency(documento.saldo || 0, true)}</span>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('documentoDetalleContent').innerHTML = content;

        // Floating Share Button for PDF
        try {
            const container = document.getElementById('documento-detalle-view') || document.body;
            const existingFab = document.getElementById('fabSharePdf');
            if (existingFab) existingFab.remove();

            const hasKeys = (documento.empresa !== undefined) && (documento.tipo) && (documento.numero !== undefined);
            if (!this.offlineMode && hasKeys) {
                let tipo_doc = (documento.tipo.indexOf("/") > -1) ? documento.tipo.replace("/", "") : documento.tipo;
                const documentoKey = `${documento.empresa}_${tipo_doc}_${documento.numero}`;
                const fab = document.createElement('button');
                fab.id = 'fabSharePdf';
                fab.type = 'button';
                fab.title = 'Compartir factura';
                fab.className = 'fixed bottom-20 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center focus:outline-none z-40';
                fab.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14" />
                    </svg>`;

                container.appendChild(fab);

                const setLoading = (loading) => {
                    if (loading) {
                        fab.disabled = true;
                        fab.innerHTML = '<span class="animate-spin inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full"></span>';
                    } else {
                        fab.disabled = false;
                        fab.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14" />
                            </svg>`;
                    }
                };

                fab.addEventListener('click', async () => {
                    const filename = `${tipo_doc}_${documento.numero}.pdf`;
                    const url = `${this.apiBaseUrl}/cobranzas/detalle/${documentoKey}/pdf/`;
                    setLoading(true);
                    try {
                        const response = await fetch(url, { headers: window.authService.getAuthHeaders() });
                        if (!response.ok) throw new Error(`Error ${response.status}`);
                        const blob = await response.blob();

                        // Web Share API with files (Android Chrome)
                        const file = new File([blob], filename, { type: 'application/pdf' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({ title: filename, text: `Compartiendo ${filename}`, files: [file] });
                            } catch (err) {
                                console.error('Error compartiendo archivo:', err);
                                this.legacyDownload(filename, blob);
                                if (this.showNotification) this.showNotification('Tu dispositivo no soporta compartir. Se descargó el PDF.', 'success');
                            }

                        } else if (navigator.share) {
                            await navigator.share({ title: filename, text: 'Factura generada. Descárguela a continuación.' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        } else {
                            this.legacyDownload(filename, blob);

                            if (this.showNotification) this.showNotification('Tu dispositivo no soporta compartir. Se descargó el PDF.', 'success');
                        }
                    } catch (err) {
                        console.error('Error al generar/compartir PDF:', err);
                        if (this.showNotification) this.showNotification('No se pudo generar o compartir el PDF', 'error');
                    } finally {
                        setLoading(false);
                    }
                });
            } else if (this.offlineMode) {
                // OFFLINE: botón para imprimir/guardar HTML del detalle actual
                const fab = document.createElement('button');
                fab.id = 'fabSharePdf';
                fab.type = 'button';
                fab.title = 'Imprimir/Guardar Estado de Cuenta (Offline)';
                fab.className = 'fixed bottom-20 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center focus:outline-none z-40';
                fab.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4 4m0 0l-4-4m4 4V4" />
                    </svg>`;

                container.appendChild(fab);

                fab.addEventListener('click', async () => {
                    try {
                        const detail = document.getElementById('cliente-detail-view');
                        if (!detail) {
                            this.showError('No se encontró el contenido del cliente para imprimir');
                            return;
                        }

                        const printableHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Estado de Cuenta - ${cliente.nombre}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color:#111827; }
    .container { max-width: 800px; margin: 0 auto; padding: 16px; }
    .print-only { display: block; margin-bottom: 12px; font-size: 12px; color: #6B7280; }
    .card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  </style>
  <link rel="icon" href="/static/icons/PradoBox_ico_32x32.ico">
  </head>
<body>
  <div class="container">
    <div class="print-only">Generado offline • ${new Date().toLocaleString()}</div>
    ${detail.innerHTML}
  </div>
  <script>window.onload = () => window.print();</script>
 </body>
</html>`;

                        const printWindow = window.open('', '_blank');
                        if (printWindow && printWindow.document) {
                            printWindow.document.open();
                            printWindow.document.write(printableHtml);
                            printWindow.document.close();
                        } else {
                            // Fallback: descargar como HTML
                            const blob = new Blob([printableHtml], { type: 'text/html;charset=utf-8' });
                            this.legacyDownload(`EstadoCuenta_${(cliente.rif||cliente.id||'cliente')}.html`, blob);
                            this.showSuccess('Archivo HTML descargado (offline)');
                        }
                    } catch (err) {
                        console.error('Error generando vista imprimible offline:', err);
                        this.showError('No se pudo generar la vista imprimible offline');
                    }
                });
            }
        } catch (e) {
            console.warn('No se pudo crear el botón flotante de compartir:', e);
        }
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
        let result =  (typeof(amount) !== 'string') ? amount: Number(amount);
        
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
                        <h4 class="text-gray-800 break-words" >${cliente.nombre}</h4>
                    </div>
                </div>
                <div class="flex flex-col items-end space-y-1">
                    <div class="flex space-x-2">
                        <span class="text-sm ${cliente.vencido ? 'text-red-500' : 'text-gray-500'}">${expiredAmountText !== "0" ? expiredAmountText: " "}</span>
                        <span class="text-sm text-gray-500">${cliente.dias_ult_fact ?  cliente.dias_ult_fact.toString() + "d" : 'N/A'}</span>
                    </div>
                    <div class="flex space-x-2">
                        <span class="text-sm text-gray-500">&nbsp;</span>
                        <span class="text-sm text-orange-500">${totalAmountText}</span>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </div>
            </div>
        `;

        return card;
    }

    addFloatingActionButton(cliente) {
        // Floating Share Button for PDF
        try {
            const container = document.getElementById('cliente-detail-view') || document.body;
            const existingFab = document.getElementById('fabSharePdf');
            if (existingFab) existingFab.remove();

            const hasKeys = (cliente.rif !== undefined);
            
            if (!this.offlineMode && hasKeys) {
                const documentoKey = cliente.rif.trim();
                const fab = document.createElement('button');
                fab.id = 'fabSharePdf';
                fab.type = 'button';
                fab.title = 'Compartir Estado de Cuenta';
                fab.className = 'fixed bottom-20 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center focus:outline-none z-40';
                fab.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14" />
                    </svg>`;

                container.appendChild(fab);

                const setLoading = (loading) => {
                    if (loading) {
                        fab.disabled = true;
                        fab.innerHTML = '<span class="animate-spin inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full"></span>';
                    } else {
                        fab.disabled = false;
                        fab.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14" />
                            </svg>`;
                    }
                };

                fab.addEventListener('click', async () => {
                    const filename = `EstadoCuenta_${documentoKey}.pdf`;
                    const url = `${this.apiBaseUrl}/cobranzas/balance/${documentoKey}/pdf/`;
                    setLoading(true);
                    try {
                        const response = await fetch(url, { headers: window.authService.getAuthHeaders() });
                        if (!response.ok) throw new Error(`Error ${response.status}`);
                        const blob = await response.blob();

                        // Web Share API with files (Android Chrome)
                        const file = new File([blob], filename, { type: 'application/pdf' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({ title: filename, text: `Compartiendo ${filename}`, files: [file] });
                            } catch (err) {
                                console.error('Error compartiendo archivo:', err);
                                this.legacyDownload(filename, blob);
                                if (this.showNotification) this.showNotification('Tu dispositivo no soporta compartir. Se descargó el PDF.', 'success');
                            }

                        } else if (navigator.share) {
                            await navigator.share({ title: filename, text: 'Estado de cuenta generado. Descárguelo a continuación.' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        } else {
                            this.legacyDownload(filename, blob);

                            if (this.showNotification) this.showNotification('Tu dispositivo no soporta compartir. Se descargó el PDF.', 'success');
                        }
                    } catch (err) {
                        console.error('Error al generar/compartir PDF:', err);
                        if (this.showNotification) this.showNotification('No se pudo generar o compartir el PDF', 'error');
                    } finally {
                        setLoading(false);
                    }
                });
            }
        } catch (e) {
            console.warn('No se pudo crear el botón flotante de compartir:', e);
        }
    }

    addSellerFloatingActionButton(sellerId) {
        // Floating Share Button for PDF
        try {
            const container = document.getElementById('dashboard-view') || document.body;
            const existingFab = document.getElementById('fabSharePdf');
            if (existingFab) existingFab.remove();

            //const hasKeys = (cliente.rif !== undefined);
            
            if (!this.offlineMode) {
                const documentoKey = sellerId.trim();
                const fab = document.createElement('button');

                //const uuid = uuid.v4();
                const uuid =  (crypto.randomUUID) ? crypto.randomUUID() : this.generateUUID();

                fab.id = 'fabSharePdf';
                fab.type = 'button';
                fab.title = 'Compartir Estado de Cuenta';
                fab.className = 'fixed bottom-20 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center focus:outline-none z-40';
                fab.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14" />
                    </svg>`;

                container.appendChild(fab);

                const setLoading = (loading) => {
                    if (loading) {
                        fab.disabled = true;
                        fab.innerHTML = '<span class="animate-spin inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full"></span>';
                    } else {
                        fab.disabled = false;
                        fab.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4m0 0L8 6m4-4v14" />
                            </svg>`;
                    }
                };

                fab.addEventListener('click', async () => {
                    const filename = `EstadoCuenta_${uuid}.pdf`;
                    //const filename = `EstadoCuenta_${documentoKey}.pdf`;
                    const url = `${this.apiBaseUrl}/cobranzas/balance/vendedor/${documentoKey}/pdf/`;
                    setLoading(true);
                    try {
                        const response = await fetch(url, { headers: window.authService.getAuthHeaders() });
                        if (!response.ok) throw new Error(`Error ${response.status}`);
                        const blob = await response.blob();

                        // Web Share API with files (Android Chrome)
                        const file = new File([blob], filename, { type: 'application/pdf' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({ title: filename, text: `Compartiendo ${filename}`, files: [file] });
                            } catch (err) {
                                console.error('Error compartiendo archivo:', err);
                                this.legacyDownload(filename, blob);
                                if (this.showNotification) this.showNotification('Tu dispositivo no soporta compartir. Se descargó el PDF.', 'success');
                            }

                        } else if (navigator.share) {
                            await navigator.share({ title: filename, text: 'Estado de cuenta generado. Descárguelo a continuación.' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = filename;
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        } else {
                            this.legacyDownload(filename, blob);

                            if (this.showNotification) this.showNotification('Tu dispositivo no soporta compartir. Se descargó el PDF.', 'success');
                        }
                    } catch (err) {
                        console.error('Error al generar/compartir PDF:', err);
                        if (this.showNotification) this.showNotification('No se pudo generar o compartir el PDF', 'error');
                    } finally {
                        setLoading(false);
                    }
                });
            }
        } catch (e) {
            console.warn('No se pudo crear el botón flotante de compartir:', e);
        }
    }

    async showClienteDetail(clienteId) {
        try {
            this.lastScrollTop = window.scrollY || window.pageYOffset;

            if (this.offlineMode) {
                // OFFLINE: obtener datos desde IndexedDB
                const clientes = await window.indexedDBService.getClientes();
                const c = clientes.find(x => String(x.co_cli).trim() === String(clienteId).trim());
                if (!c) {
                    this.showError('Cliente no encontrado en datos locales');
                    return;
                }

                let vendedor = await window.indexedDBService.getSellerByCode(c.co_ven);

                // Mapear al formato usado por la UI online
                const cliente = {
                    id: c.co_cli,
                    nombre: c.cli_des,
                    rif: c.rif || c.rif2 || '',
                    rif2: c.rif2 || '',
                    telefono: c.telefonos,
                    email: c.email,
                    direccion: c.direccion || c.direc1 || '',
                    dias_ult_fact: c.dias_ult_fact,
                    ventas_ultimo_trimestre: c.ventas_ultimo_trimestre || 0,
                    dias_promedio_emision: c.dias_promedio_emision || 0,
                    vendedor: vendedor.ven_des
                };

                const r = await window.indexedDBService.getResumenCliente(clienteId);
                const resumen = {
                    situacion: {
                        total_vencido: r.total_vencido,
                        total_por_vencer: r.total_por_vencer,
                        total_creditos: r.total_creditos,
                        total_sinvencimiento: r.total_sinvencimiento,
                        total_neto: r.total_vencido + r.total_por_vencer - r.total_sinvencimiento,
                        cantidad_documentos_vencidos: r.cantidad_vencidos,
                        cantidad_documentos_total: r.cantidad_total,
                        dias_promedio_vencimiento: r.dias_promedio_vencimiento,
                        dias_promedio_vencimiento_todos: r.dias_promedio_vencimiento_todos,
                        dias_transcurridos: r.dias_transcurridos,
                        dias_faltantes: r.dias_faltantes
                    }
                };

                const eventos = await window.indexedDBService.getEventosCliente(clienteId);
                //const docsPendientes = await window.indexedDBService.getDocumentosPendientesCliente(clienteId);

                const detailView = document.getElementById('cliente-detail-view');
                if (detailView) {
                    detailView.innerHTML = this.createClienteDetailHTML(cliente, resumen);
                    //this.createClientePendingDocsHTML(docsPendientes);
                    this.createClienteEventsHTML(eventos);
                }
                this.navigateTo('cliente-detail');
                document.getElementById('pageTitle').textContent = "Cliente";

                // Botón flotante (solo si no offline y tiene RIF); en offline no generamos PDF
                this.addFloatingActionButton(cliente);

                document.getElementById('clientPendingDocs').onclick = () => {
                    this.currentClientId = clienteId;
                    this.LoadClientPendingDocs(clienteId);
                };

                document.getElementById('clientContacts').onclick = () => {
                    this.currentClientId = clienteId;
                    this.openContactsForClient(clienteId, cliente);
                    //this.LoadClientContacts(clienteId);
                };

                window.scrollTo({ top: 0, behavior: 'auto' });

                return;
            }

            // ONLINE (sin cambios)
            const [clienteResponse, resumenResponse, eventsResponse] = await Promise.all([
                fetch(`${this.apiBaseUrl}/clientes/${clienteId}/`, {
                    headers: window.authService.getAuthHeaders()
                }),                
                fetch(`${this.apiBaseUrl}/dashboard/client/${clienteId}`, {
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

            const [cliente, resumen, eventos] = await Promise.all([
                clienteResponse.json(),
                resumenResponse.json(),
                eventsResponse.json()
            ]);

            // Render cliente detail
            const detailView = document.getElementById('cliente-detail-view');
            if (detailView) {
                detailView.innerHTML = this.createClienteDetailHTML(cliente, resumen);
                //this.createClientePendingDocsHTML([]);
                this.createClienteEventsHTML(eventos);
            }
            this.navigateTo('cliente-detail');
            document.getElementById('pageTitle').textContent = "Cliente";

            // add floating action button
            this.addFloatingActionButton(cliente);

            // set pending document listener 
            document.getElementById('clientPendingDocs').onclick = () => {
                this.currentClientId = clienteId;
                this.LoadClientPendingDocs(clienteId);
            };

            document.getElementById('clientContacts').onclick = () => {
                this.currentClientId = clienteId;
                this.openContactsForClient(clienteId, cliente);
                //this.LoadClientContacts(clienteId);
            };
            

            window.scrollTo({ top: 0, behavior: 'auto' });
        } catch (error) {
            console.error('Error loading cliente detail:', error);
            this.showError('Error cargando los detalles del cliente...' + error.message);
        }
    }

    createClienteEventsHTML(docs){
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
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-200" 
                onclick="cobranzasApp.viewDocumentoDetail(${doc.empresa}, '${doc.tipo}', ${doc.numero})">
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
                    <div class="grid grid-cols-5 items-center mb-2 text-sm">
                        <div class="col-span-2 flex items-center space-x-1">
                            <span class="text-gray-600">E</span>
                            <span class="text-gray-900">${this.formatDate(doc.fecha_emision)}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-gray-600 pr-10">${diasCredito}</span>
                        </div>
                        <div class="col-span-2 text-right">
                            <span class="text-gray-900 font-medium">${this.formatCurrency(doc.monto)}</span>
                        </div>
                    </div>
                    
                    <!-- Fila 3: Fecha vencimiento, Días vencido, Saldo -->
                    <div class="grid grid-cols-5 items-center text-sm">
                        <div class="col-span-2 flex items-center space-x-1">
                            <span class="text-gray-600">${(doc.fecha_vencimiento) ? "V ": ""} </span>
                            <span class="text-gray-900">${(doc.fecha_vencimiento) ? this.formatDate(doc.fecha_vencimiento): ""}</span>
                        </div>
                        <div class="text-right">
                            <span class="${isOverdue ? 'text-red-500' : 'text-gray-600'} pr-10">${(diasVencido != null && diasVencido != undefined) ? diasVencido : ""}</span>
                        </div>
                        <div class="col-span-2 text-right">
                            <span class="text-xs text-red-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.saldo)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    createClientePendingDocsHTML(docs){

        const documentosList = document.getElementById('clientDocsPendingList');

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
                                <p class="font-medium text-gray-900 text-sm">${doc.numero}</p>
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
                            <span class="text-xs text-red-500">falta</span>
                            <span class="text-red-500 font-medium">${this.formatCurrency(doc.saldo)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    createClienteDetailHTML(cliente, resumen) {
        let averageSales =  cliente.ventas_ultimo_trimestre ? Math.round(cliente.ventas_ultimo_trimestre/3,2) : 0; 
        let averageSalesStr = averageSales.toString();
        
        if (averageSales > 1000)
            averageSalesStr = (averageSales/1000).toString() + "K"


        // flex justify-between items-center mb-2
        return `
            <div class="space-y-6">
                <!-- Header Card -->
                <div class="bg-primary text-white rounded-lg p-6">
                    <h2 class="text-lg font-bold">${cliente.nombre}</h2>
                    <p class="text-sm opacity-90">Compañía</p>
                    <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                            <p><span class="opacity-75">RIOORO:</span>
                            <span class="font-medium">${cliente.rif}</span></p>
                            <p><span class="opacity-75">DEMO:</span>
                            <span class="font-medium">${cliente.rif2}</span></p>
                        </div>
                        <div class="text-right">
                            <span class="font-medium">${cliente.vendedor ? cliente.vendedor: "N/A"}</span>
                        </div>
                    </div>
                </div>

                <!-- VENTAS -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">VENTAS</h3>
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Desde última factura</p>
                            <p class="text-xl font-semibold text-gray-700">${cliente.dias_ult_fact ? cliente.dias_ult_fact.toString() + "d": "N/A"}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Días entre facturas</p>
                            <p class="text-xl font-semibold text-gray-700">${cliente.dias_promedio_emision ? cliente.dias_promedio_emision.toString() + "d": "N/A"}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Factura promedio</p>
                            <p class="text-xl font-semibold text-gray-700">${averageSalesStr}</p>
                        </div>
                    </div>
                </div>
                <!-- Cuentas por Cobrar -->
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">CUENTAS POR COBRAR</h3>
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Vencido</p>
                            <p class="text-sm font-semibold text-red-500">${this.formatCurrency(resumen.situacion.total_vencido, true) }</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Cantidad</p>
                            <p class="text-sm font-semibold text-red-500">${resumen.situacion.cantidad_documentos_vencidos}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Días</p>
                            <p class="text-sm font-semibold text-red-500">${resumen.situacion.dias_promedio_vencimiento}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Total</p>
                            <p class="text-sm font-semibold text-gray-700">${this.formatCurrency(resumen.situacion.total_neto, true)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Cantidad</p>
                            <p class="text-sm font-semibold text-gray-700">${resumen.situacion.cantidad_documentos_total}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Días</p>
                            <p class="text-sm font-semibold text-gray-700">${resumen.situacion.dias_promedio_vencimiento_todos}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Neto</p>
                            <p class="text-sm font-semibold text-gray-700">${this.formatCurrency(resumen.situacion.total_vencido + resumen.situacion.total_por_vencer, true)}</p>
                        </div>
                        <div class="text-center">
                            <p class="text-xs text-gray-500">Créditos</p>
                            <p class="text-sm font-semibold text-red-500">${this.formatCurrency(Math.abs(resumen.situacion.total_creditos)*-1, true)}</p>
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

                <!-- Contactos -->
                <div id="clientContacts" class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">CONTACTOS</h3>
                    <div id="clientContactsPendingLoading" class="hidden text-center py-8">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p class="mt-2 text-gray-600">Cargando contactos...</p>
                    </div>
                    <div id="contactsContainer">
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

    formatCurrency(amount,showSign = false, showDecimal = true) {
        return new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: showDecimal ? 2 : 0,
            maximumFractionDigits: showDecimal ? 2 : 0,
            useGrouping: true
        }).format(amount) + (showSign ? ' $' : '');
    }

    createVentasChart(data, formatCurrency) {       
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
                            return formatCurrency(value / 1000, false, false) + 'k';
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

    // Método para limpiar gráficos cuando sea necesario
    destroyCharts() {
        if (this.charts.ventas) {
            this.charts.ventas.destroy();
            this.charts.ventas = null;
        }

        this.dashboardLoaded = false;
    }

    updateUserInfo() {
        const user = window.authService.getCurrentUser();
        if (user) {
            document.getElementById('userInfo').textContent = user.nombre_completo || user.username;
        }
    }

    stringToDate(dateString) {
        if (dateString instanceof Date) {
            return dateString;
        }

        if (typeof dateString !== 'string') {
            return null;
        }

        let date;

        if (dateString.indexOf('-') != -1) {
            if (dateString.indexOf('T') != -1) {
                dateString = dateString.split('T')[0];
            }
            const [year, month, day] = dateString.split('-').map(Number);
        	date = new Date(year, month - 1, day); // mes empieza en 0
        } else {
            date = new Date(dateString);
        }

        return date;
    }

    formatDate(dateString) {
        let date;

        if (dateString.indexOf('-') != -1) {
            if (dateString.indexOf('T') != -1) {
                dateString = dateString.split('T')[0];
            }
            const [year, month, day] = dateString.split('-').map(Number);
        	date = new Date(year, month - 1, day); // mes empieza en 0
        } else {
            date = new Date(dateString);
        }
        
        return date.toLocaleDateString('es-VE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
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

    goBack() {
        if (this.viewHistory && this.viewHistory.length > 0) {
            const previousView = this.viewHistory.pop();
            // Replace current view without pushing a new history entry
            this.navigateTo(previousView, { push: false, isBack: true });
        } else {
            // Fallback to dashboard if no history
            this.navigateTo('dashboard', { push: false, isBack: true });
        }
    }

    toggleContactEditButtons() {
        const editPhoneBtns = document.querySelectorAll('#editPhoneBtn');
        const deletePhoneBtns = document.querySelectorAll('#deletePhoneBtn');
        //const addPhoneBtn = document.getElementById('addPhoneBtn');
        //const addEmailBtn = document.getElementById('addEmailBtn');
        //const addAddressBtn = document.getElementById('addAddressBtn');
        const editEmailBtns = document.querySelectorAll('#editEmailBtn');
        const deleteEmailBtns = document.querySelectorAll('#deleteEmailBtn');
        const editAddressBtns = document.querySelectorAll('#editAddressBtn');
        const deleteAddressBtns = document.querySelectorAll('#deleteAddressBtn');

        editPhoneBtns.forEach(btn => btn.classList.toggle('hidden'));
        deletePhoneBtns.forEach(btn => btn.classList.toggle('hidden'));

        editEmailBtns.forEach(btn => btn.classList.toggle('hidden'));
        deleteEmailBtns.forEach(btn => btn.classList.toggle('hidden'));

        editAddressBtns.forEach(btn => btn.classList.toggle('hidden'));
        deleteAddressBtns.forEach(btn => btn.classList.toggle('hidden'));

        //addPhoneBtn.classList.toggle('hidden');
        //addEmailBtn.classList.toggle('hidden');
        //addAddressBtn.classList.toggle('hidden');
    }

    async editPhone(phoneId, currentValue = '', currentPhoneType = '') {
        // Placeholder for phone editing logic
        console.log(`Editing phone with ID: ${phoneId}`);
        this.showSuccess(`Editing phone with ID: ${phoneId} clicked FUNCION EN DESARROLLO`);

        const modal = document.getElementById('editFieldModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('editFieldTitle').textContent = 'Editar Telefono';
            document.getElementById('editFieldInput').value = currentValue;
            document.getElementById('phoneTypeSelect').classList.remove('hidden');
            document.getElementById('phoneTypeSelect').value = currentPhoneType;
        }

        btnUpdateEditField.onclick = async (e) => {
            e.stopPropagation();

            try {
                const newValue = document.getElementById('editFieldInput').value;
                if (newValue !== currentValue) {
                    // Update phone logic here
                    const phoneType = document.getElementById('phoneTypeSelect').value;

                    const response = await fetch(`${this.apiBaseUrl}/contactos/tlf/${phoneId}/`, {
                        method: 'POST',
                        headers: window.authService.getAuthHeaders(),
                        body: JSON.stringify({ phone: newValue, phone_type: phoneType  })
                    });

                    const data = await response.json();
                    const phoneContainer = document.getElementById('contactPhonesList');
                    if (data && phoneContainer) {
                        const phoneElement = document.getElementById(`phone-${phoneId}`);
                        if (phoneElement) {
                            phoneElement.outerHTML = this.renderPhoneHTML(data);
                        }
                    }

                    console.log(`Updating phone with ID: ${phoneId} to: ${newValue}`);
                    //this.showSuccess(`Updating phone with ID: ${phoneId} to: ${newValue} clicked FUNCION EN DESARROLLO`);
                }
            } catch (err) {
                debugger; 
                console.error('Error updating phone:', err);
                this.showError('No fue posible actualizar el telefono');
            }

            this.closeEditFieldModal('phoneTypeSelect');
        };
    }

    async deletePhone(phoneId) {
        // Placeholder for phone deletion logic
        console.log(`Deleting phone with ID: ${phoneId}`);
        this.showSuccess(`Deleting phone with ID: ${phoneId} clicked`);
    }

    async editAddress(addressId, currentValue = {}){
        console.log(`Editing address with ID: ${addressId}`);
        this.showSuccess(`Editing address with ID: ${addressId} clicked FUNCION EN DESARROLLO`);

        const modal = document.getElementById('editFieldModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('editFieldTitle').textContent = 'Editar Telefono';
            document.getElementById('editFieldInput').value = currentValue.address;
            document.getElementById('addressExtraFields').classList.remove('hidden');
            document.getElementById('addressTypeSelect').classList.remove('hidden');
            document.getElementById('addressTypeSelect').value = currentValue.address_type;
            document.getElementById('editAddressState').value = currentValue.state;
            document.getElementById('editAddressZipCode').value = currentValue.zip_code;
            document.getElementById('editAddressCountry').value = currentValue.country;
            //document.getElementById('editAddressCity').value = currentValue.city;
        }
    }


    async editEmail(mailId, currentValue = '', currentMailType = ''){
        console.log(`Editing mail with ID: ${mailId}`);
        //this.showSuccess(`Editing mail with ID: ${mailId} clicked FUNCION EN DESARROLLO`);

        const modal = document.getElementById('editFieldModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('editFieldTitle').textContent = 'Editar Telefono';
            document.getElementById('editFieldInput').value = currentValue;
            document.getElementById('mailTypeSelect').classList.remove('hidden');
            document.getElementById('mailTypeSelect').value = currentMailType;
        }

        const btnUpdateEditField = document.getElementById('btnUpdateEditField');

        if (!btnUpdateEditField) {
            return;
        }

        btnUpdateEditField.onclick = async (e) => {
            e.stopPropagation();

            try {
                const newValue = document.getElementById('editFieldInput').value;
                if (newValue !== currentValue) {
                    // Update phone logic here
                    const mailType = document.getElementById('addressTypeSelect').value;

                    const response = await fetch(`${this.apiBaseUrl}/contactos/direccion/${addressId}/`, {
                        method: 'POST',
                        headers: window.authService.getAuthHeaders(),
                        body: JSON.stringify({ address: newValue, address_type: mailType  })
                    });

                    const data = await response.json();
                    const mailContainer = document.getElementById('contactEmailsList');
                    if (data && mailContainer) {
                        const mailElement = document.getElementById(`mail-${mailId}`);
                        if (mailElement) {
                            mailElement.outerHTML = this.renderMailHTML(data);
                        }
                    }

                    console.log(`Updating mail with ID: ${mailId} to: ${newValue}`);
                    //this.showSuccess(`Updating mail with ID: ${mailId} to: ${newValue} clicked FUNCION EN DESARROLLO`);
                }
            } catch (err) {
                debugger; 
                console.error('Error updating Email:', err);
                this.showError('No fue posible actualizar el Email');
            }

            this.closeEditFieldModal('mailTypeSelect');
        };
    }

    async deleteMail(mailId){
        console.log(`Deleting mail with ID: ${mailId}`);
        this.showSuccess(`Deleting mail with ID: ${mailId} clicked`);
    }

    async editAddress(addressId){
        console.log(`Editing address with ID: ${addressId}`);
        this.showSuccess(`Editing address with ID: ${addressId} clicked FUNCION EN DESARROLLO`);
    }

    async deleteAddress(addressId){
        console.log(`Deleting address with ID: ${addressId}`);
        this.showSuccess(`Deleting address with ID: ${addressId} clicked`);
    }

    buildContactsViewHTML(cliente, contacts) {
        // Select primary contact (first in array)
        const contact = Array.isArray(contacts) && contacts.length > 0 ? contacts[0] : null;

        // Mappers for type labels
        const phoneTypeLabel = {
            work: 'Trabajo',
            mobile: 'Móvil',
            fax: 'Fax',
            home: 'Casa',
            skype: 'Skype',
            other: 'Otro'
        };
        const mailTypeLabel = { work: 'Trabajo', personal: 'Personal', other: 'Otro' };

        // Phones HTML
        const phonesHTML = contact && Array.isArray(contact.phones) && contact.phones.length
            ? contact.phones.map(p => `
                <div id="phone-${p.id}" class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <span class="text-gray-800">📞${p.phone}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-gray-500 text-sm">${phoneTypeLabel[p.phone_type] || 'Otro'}</span>
                        <svg id="editPhoneBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.editPhone(${p.id}, '${p.phone}', '${p.phone_type}')">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                        <svg id="deletePhoneBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.deletePhone(${p.id})">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>   
                    </div>
                </div>`).join('')
            : '<p class="text-gray-500 text-sm">No hay teléfonos registrados</p>';

        // Emails HTML
        const emailsHTML = contact && Array.isArray(contact.emails) && contact.emails.length
            ? contact.emails.map(e => `
                <div id="mail-${e.id}" class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <span class="text-gray-800">✉️${e.email}</span>
                    <div class="flex items-center gap-3">
                        <span class="text-gray-500 text-sm">${mailTypeLabel[e.mail_type] || 'Otro'}</span>
                        <svg id="editEmailBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.editEmail(${e.id}, '${e.email}', '${e.mail_type}')">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                        <svg id="deleteEmailBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.deleteEmail(${e.id})">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>   
                    </div>
                </div>`).join('')
            : '<p class="text-gray-500 text-sm">No hay emails registrados</p>';

        // Addresses HTML
        const addressesHTML = contact && Array.isArray(contact.addresses) && contact.addresses.length
            ? contact.addresses.map(a => {
                const addressText = (a.address || '').replace(/\r?\n/g, '<br/>');
                let meta = '';
                if (a.city) meta += '<div><span class="font-bold text-sm">Ciudad: </span>' + a.city + '</div>';
                if (a.state) meta += '<div><span class="font-bold text-sm">Estado: </span>' + a.state + '</div>';
                if (a.zipcode) meta += '<div><span class="font-bold text-sm">Código Postal: </span>' + a.zipcode + '</div>';
                // <div class="text-gray-500 text-sm justify-between">${meta}</div>
                return `
                    <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div class="text-gray-800">📍${addressText}</div>
                        <div class="flex items-center gap-3">
                            <svg id="editAddressBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.editAddress(${a.id})">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                            </svg>
                            <svg id="deleteAddressBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.deleteAddress(${a.id})">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>   
                        </div>
                    </div>
                    <div class="py-2 border-b border-gray-100 last:border-b-0">
                        ${meta}
                    </div>
                    `;
            }).join('')
            : '<p class="text-gray-500 text-sm">No hay direcciones registradas</p>';

        const header = `
            <div class="bg-primary text-white rounded-lg p-6">
                <h2 class="text-lg font-bold">${cliente?.nombre || 'Contacto'}</h2>
                <p class="text-sm opacity-90">Contactos del cliente</p>
            </div>`;

        const phonesSection = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <h3 class="text-sm font-semibold text-gray-800 mb-2">TELÉFONOS</h3>
                    <button id="addPhoneBtn" class="text-gray-500 hover:text-gray-700 hidden">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                </div>
                <div id="contactPhonesList" class="space-y-2">
                    ${phonesHTML}
                </div>
            </div>`;

        const emailsSection = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <h3 class="text-sm font-semibold text-gray-800 mb-2">EMAILS</h3>
                    <button id="addEmailBtn" class="text-gray-500 hover:text-gray-700 hidden">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                </div>
                <div id="contactEmailsList" class="space-y-2">
                    ${emailsHTML}
                </div>
            </div>`;

        const addressesSection = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <h3 class="text-sm font-semibold text-gray-800 mb-2">DIRECCIONES</h3>
                    <button id="addAddressBtn" class="text-gray-500 hover:text-gray-700 hidden">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </button>
                </div>
                <div id="contactAddressesList" class="space-y-2">
                    ${addressesHTML}
                </div>
            </div>`;

        const fabs = `
            <div class="fixed bottom-20 right-6 flex flex-col gap-3 hidden">
                <button id="fabEditContact" class="rounded-full w-14 h-14 bg-primary text-white shadow-lg flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5h2m2 0h2M4 7h16M4 15h16M4 11h16"/></svg>
                </button>
            </div>`;

        return `
            <div class="space-y-4">
                ${header}
                ${phonesSection}
                ${emailsSection}
                ${addressesSection}
                ${fabs}
            </div>`;
    }

    renderPhoneHTML(phone){
        const phoneTypeLabel = {
            work: 'Trabajo',
            mobile: 'Móvil',
            fax: 'Fax',
            home: 'Casa',
            skype: 'Skype',
            other: 'Otro'
        };

        return  `
            <div id="phone-${phone.id}" class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span class="text-gray-800">📞${phone.phone}</span>
                <div class="flex items-center gap-3">
                    <span class="text-gray-500 text-sm">${phoneTypeLabel[phone.phone_type] || 'Otro'}</span>
                    <svg id="editPhoneBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.editPhone(${phone.id}, '${phone.phone}', '${phone.phone_type}')">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    <svg id="deletePhoneBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.deletePhone(${phone.id})">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>   
                </div>
            </div>`;
    }

    renderMailHTML(email){
        const mailTypeLabel = {
            work: 'Trabajo',
            personal: 'Personal',
            other: 'Otro'
        };

        return `
            <div id="mail-${email.id}" class="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span class="text-gray-800">✉️${email.email}</span>
                <div class="flex items-center gap-3">
                    <span class="text-gray-500 text-sm">${mailTypeLabel[email.mail_type] || 'Otro'}</span>
                    <svg id="editEmailBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.editEmail(${email.id}, '${email.email}', '${email.mail_type}')">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                    </svg>
                    <svg id="deleteEmailBtn" class="w-6 h-6 cursor-pointer hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" onclick="window.cobranzasApp.deleteEmail(${email.id})">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>   
                </div>
            </div>`;            
    }

    async openContactsForClient(clientId, cliente) {
        try {
            // Placeholder data until backend is wired
            //const contacts = [];
            let contacts = [];

            if (this.offlineMode) {
                debugger;
                contacts = await window.indexedDBService.getContactsByClientId(clientId);
            } else {
                const contactsResponse = await fetch(`${this.apiBaseUrl}/contactos/${clientId}`, {
                    headers: window.authService.getAuthHeaders()
                });
                contacts = await contactsResponse.json();
            }

            const contactsView = document.getElementById('contacts-view');
            if (!contactsView) {
                console.error('contacts-view container not found');
                return;
            }
            contactsView.innerHTML = this.buildContactsViewHTML(cliente, contacts);

            const fabEdit = document.getElementById('fabEditContact');
            if (fabEdit) {
                fabEdit.onclick = (e) => {
                    e.stopPropagation();

                    window.cobranzasApp.toggleContactEditButtons();

                    //this.showSuccess('Edit Contact tapped (to be implemented)');
                };
            }

            this.navigateTo('contacts');
            document.getElementById('pageTitle').textContent = 'Contactos';
            window.scrollTo({ top: 0, behavior: 'auto' });
        } catch (err) {
            console.error('Error opening contacts:', err);
            this.showError('No fue posible abrir los contactos');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cobranzasApp = new CobranzasApp();
    Chart.register(ChartDataLabels);
});