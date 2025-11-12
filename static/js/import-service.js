class ImportService {
    constructor() {
        this.apiBaseUrl = '/api';
        this.isImporting = false;
        this.importProgress = {
            step: '',
            current: 0,
            total: 0,
            percentage: 0
        };

        this.ciudadesEstados = {
            "caracas": "Distrito Capital",
            "maracaibo": "Zulia",
            "valencia": "Carabobo",
            "barquisimeto": "Lara",
            "maracay": "Aragua",
            "ciudad guayana": "Bolívar",
            "barcelona": "Anzoátegui",
            "puerto la cruz": "Anzoátegui",
            "maturín": "Monagas",
            "san cristóbal": "Táchira",
            "barinas": "Barinas",
            "cumaná": "Sucre",
            "puerto ordaz": "Bolívar",
            "guatire": "Miranda",
            "guarenas": "Miranda",
            "los teques": "Miranda",
            "la guaira": "La Guaira",
            "san felipe": "Yaracuy",
            "acarigua": "Portuguesa",
            "araure": "Portuguesa",
            "el tigre": "Anzoátegui",
            "coro": "Falcón",
            "trujillo": "Trujillo",
            "mérida": "Mérida",
            "valera": "Trujillo",
            "san carlos": "Cojedes",
            "san fernando de apure": "Apure",
            "guanare": "Portuguesa",
            "carúpano": "Sucre",
            "tucupita": "Delta Amacuro",
            "el vigía": "Mérida",
            "ciudad bolívar": "Bolívar",
            "la asunción": "Nueva Esparta",
            "porlamar": "Nueva Esparta",
            "punto fijo": "Falcón",
            "guacara": "Carabobo",
            "naguanagua": "Carabobo",
            "tinaquillo": "Cojedes",
            "ocumare del tuy": "Miranda",
            "charallave": "Miranda",
            "san juan de los morros": "Guárico",
            "calabozo": "Guárico",
            "valle de la pascua": "Guárico",
            "cabimas": "Zulia",
            "santa rita": "Zulia",
            "machiques": "Zulia"
          };
          
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

    getAddressState(client) {
        if (!client.ciudad || client.ciudad.trim() == '') {
            return null
        }

        let ciudad = client.ciudad.trim().toLowerCase()

        if (ciudad in ['caracas', 'caraccas', 'caracaas', 'caraca', 'cararacas', 'caracs']) {
            ciudad = "caracas"
        }

        let state = this.ciudadesEstados[ciudad] || null

        return state;
    }

    async importFromMSSQL(userInfo) {
        if (this.isImporting) {
            throw new Error('Ya hay una importación en progreso');
        }

        this.isImporting = true;
        
        try {
            // Inicializar IndexedDB si no está inicializado
            if (!window.indexedDBService.db) {
                await window.indexedDBService.init();
            }

            // Paso 1: Obtener documentos de MSSQL
            this.updateProgress('Obteniendo documentos...', 0, 100);
            const documentos = await this.fetchDocumentosFromMSSQL(userInfo.codigo_vendedor_profit);
    
            // Paso 2: Obtener eventos de MSSQL
            this.updateProgress('Obteniendo eventos...', 5, 100);
            const events = await this.fetchEventsFromMSSQL(userInfo.codigo_vendedor_profit);

            // Paso 2: Obtener clientes relacionados
            this.updateProgress('Obteniendo clientes...', 10, 100);
            const clientesCodes = [...new Set(documentos.map(doc => doc.co_cli))];
            let clientes = await this.fetchClientesFromMSSQL(clientesCodes);

            debugger;

            clientes.map(cliente => {
               cliente["contacts"] = [
                 { 
                   id: -1, 
                   client_id: cliente.co_cli, 
                   name: cliente.cli_des, 
                   first_name: '', 
                   last_name: '', 
                   phones: (cliente.telefonos && cliente.telefonos.trim() != '') ? [
                    {
                        id: -1,
                        phone: cliente.telefonos,
                        phone_type: 'work'
                    }
                   ] : [], 
                   emails: (cliente.email && cliente.email.trim() != '') ? [
                    {
                        id: -1,
                        email: cliente.email,
                        mail_type: 'work'
                    }
                   ] : [], 
                   addresses: (cliente.direccion && cliente.direccion.trim() != '') ? [
                    {
                        id: -1,
                        address: cliente.direccion,
                        state: this.getAddressState(cliente),
                        zipcode: cliente.zip,
                        country_id: 1
                    }
                   ] : []
                 }
               ] 
            });

            // Paso 2.1: Obtener contactos relacionados
            /*
                    {
                    "id": 11,
                    "client_id": "J500449321",
                    "name": "VIVA SUPERCENTRO, C.A.",
                    "first_name": "",
                    "last_name": "",
                    "phones": [
                        {
                        "id": 5,
                        "phone": "0412 3083825                                      ",
                        "phone_type": "work"
                        }
                    ],
                    "emails": [
                        {
                        "id": 5,
                        "email": "jacqueline.y@mercadosmega.com           ",
                        "mail_type": "work"
                        }
                    ],
                    "addresses": [
                        {
                        "id": 9,
                        "address": "AV PRINCIPAL DE BOLEITA LOCAL ",
                        "state": "D.C.",
                        "zipcode": "1073      ",
                        "country_id": 1
                        }
                    ]
                    }

            */

            // Paso 3: Obtener vendedores
            this.updateProgress('Obteniendo vendedores...', 20, 100);
            const sellers = await this.fetchSellersFromMSSQL();

            // Paso 4: Obtener renglones de documentos
            this.updateProgress('Obteniendo renglones de documentos...', 30, 100);
            const lines = await this.fetchDocsDetailsFromMSSQL(userInfo.codigo_vendedor_profit);

            // Paso: 5 Obtener Ventas Mensuales
            this.updateProgress('Obteniendo ventas mensuales...', 40, 100);
            const month_sales = await this.fetchMonthSalesFromMSSQL(userInfo.codigo_vendedor_profit);

            // Paso 6: Limpiar datos locales
            this.updateProgress('Limpiando datos locales...', 50, 100);
            await window.indexedDBService.clearAllData();

            // Paso 7: Guardar clientes en IndexedDB
            this.updateProgress('Guardando clientes...', 60, 100);
            await window.indexedDBService.saveClients(clientes);

            // Paso 8: Guardar Vendedores en IndexedDB
            this.updateProgress('Guardando Vendedores...', 70, 100);
            await window.indexedDBService.saveSellers(sellers);

            // Paso 9: Guardar documentos en IndexedDB
            this.updateProgress('Guardando documentos...', 80, 100);
            await window.indexedDBService.saveDocs(documentos);

            // Paso 10: Guardar eventos en IndexedDB    
            this.updateProgress('Guardando eventos...', 85, 100);
            await window.indexedDBService.saveEvents(events);


            // Paso 11: Guardar renglones de documentos en IndexedDB
            this.updateProgress('Guardando renglones de documentos...', 90, 100);
            await window.indexedDBService.saveDocLines(lines);

            // Paso 12: Guardar Ventas Mensuales en IndexedDB
            this.updateProgress('Guardando ventas mensuales...', 95, 100);
            await window.indexedDBService.saveMonthSales(month_sales);

            // Paso 13: Actualizar metadatos de sincronización
            this.updateProgress('Finalizando...', 97, 100);

            await window.indexedDBService.setSyncMetadata('last_sync', new Date().toISOString());
            await window.indexedDBService.setSyncMetadata('total_clientes', clientes.length);
            await window.indexedDBService.setSyncMetadata('total_documentos', documentos.length);
            await window.indexedDBService.setSyncMetadata('total_renglones_documentos', lines.length);
            await window.indexedDBService.setSyncMetadata('total_eventos', events.length);
            await window.indexedDBService.setSyncMetadata('user_name', userInfo.username); 
            await window.indexedDBService.setSyncMetadata('nombre_completo', userInfo.nombre_completo);
            await window.indexedDBService.setSyncMetadata('codigo_vendedor_profit', userInfo.codigo_vendedor_profit);

            this.updateProgress('Importación completada', 100, 100);

            return {
                success: true,
                clientes_imported: clientes.length,
                documentos_imported: documentos.length,
                eventos_imported: events.length,
                renglones_imported: lines.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error durante la importación:', error);
            throw error;
        } finally {
            this.isImporting = false;
        }
    }

    async fetchDocumentosFromMSSQL(sellerCode) {
        const response = await fetch(`${this.apiBaseUrl}/import/documentos/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            },
            body: JSON.stringify({'sellerCode': sellerCode })
        });

        if (!response.ok) {
            throw new Error(`Error al obtener documentos: ${response.statusText}`);
        }

        return await response.json();
    }

    async fetchEventsFromMSSQL(sellerCode) {
        const response = await fetch(`${this.apiBaseUrl}/import/eventos/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            },
            body: JSON.stringify({'sellerCode': sellerCode })
        });

        if (!response.ok) {
            throw new Error(`Error al obtener eventos: ${response.statusText}`);
        }

        return await response.json();
    }

    async fetchClientesFromMSSQL(clientesCodes) {
        const codesString = clientesCodes.map(code => `'${code}'`).join(',');
       
        const response = await fetch(`${this.apiBaseUrl}/import/clientes/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            },
            body: JSON.stringify({ list_codes: codesString })
        });

        if (!response.ok) {
            throw new Error(`Error al obtener clientes: ${response.statusText}`);
        }

        return await response.json();
    }

    async fetchSellersFromMSSQL() {
        const response = await fetch(`${this.apiBaseUrl}/import/sellers/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            }
        });

        if (!response.ok) {
            throw new Error(`Error al obtener Vendedores: ${response.statusText}`);
        }

        return await response.json();
    }

    async fetchDocsDetailsFromMSSQL(sellerCode) {
        const response = await fetch(`${this.apiBaseUrl}/import/document-details/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            },
            body: JSON.stringify({'sellerCode': sellerCode })
        });

        if (!response.ok) {
            throw new Error(`Error al obtener los renglones de documentos: ${response.statusText}`);
        }

        return await response.json();
    }

    async fetchMonthSalesFromMSSQL(sellerCode) {
        const response = await fetch(`${this.apiBaseUrl}/import/month-sales/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            },
            body: JSON.stringify({'sellerCode': sellerCode })
        });

        if (!response.ok) {
            throw new Error(`Error al obtener las ventas mensuales: ${response.statusText}`);
        }

        return await response.json();
    }

    updateProgress(step, current, total) {
        this.importProgress = {
            step,
            current,
            total,
            percentage: total > 0 ? Math.round((current / total) * 100) : 0
        };

        // Emitir evento para actualizar la UI
        window.dispatchEvent(new CustomEvent('importProgress', {
            detail: this.importProgress
        }));
    }

    getProgress() {
        return this.importProgress;
    }

    isImportInProgress() {
        return this.isImporting;
    }
}

// Instancia global del servicio
window.importService = new ImportService();