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
            
            // Paso 2: Obtener clientes relacionados
            this.updateProgress('Obteniendo clientes...', 10, 100);
            const clientesCodes = [...new Set(documentos.map(doc => doc.co_cli))];
            const clientes = await this.fetchClientesFromMSSQL(clientesCodes);

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

            // Paso 10: Guardar renglones de documentos en IndexedDB
            this.updateProgress('Guardando renglones de documentos...', 90, 100);
            await window.indexedDBService.saveDocLines(lines);

            // Paso 11: Guardar Ventas Mensuales en IndexedDB
            this.updateProgress('Guardando ventas mensuales...', 95, 100);
            await window.indexedDBService.saveMonthSales(month_sales);

            // Paso 12: Actualizar metadatos de sincronización
            this.updateProgress('Finalizando...', 97, 100);

            await window.indexedDBService.setSyncMetadata('last_sync', new Date().toISOString());
            await window.indexedDBService.setSyncMetadata('total_clientes', clientes.length);
            await window.indexedDBService.setSyncMetadata('total_documentos', documentos.length);
            await window.indexedDBService.setSyncMetadata('total_renglones_documentos', lines.length);
            await window.indexedDBService.setSyncMetadata('user_name', userInfo.username); 
            await window.indexedDBService.setSyncMetadata('nombre_completo', userInfo.nombre_completo);
            await window.indexedDBService.setSyncMetadata('codigo_vendedor_profit', userInfo.codigo_vendedor_profit);

            this.updateProgress('Importación completada', 100, 100);

            return {
                success: true,
                clientes_imported: clientes.length,
                documentos_imported: documentos.length,
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