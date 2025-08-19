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

    async importFromMSSQL() {
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
            const documentos = await this.fetchDocumentosFromMSSQL();
            
            // Paso 2: Obtener clientes relacionados
            this.updateProgress('Obteniendo clientes...', 25, 100);
            const clientesCodes = [...new Set(documentos.map(doc => doc.co_cli))];
            const clientes = await this.fetchClientesFromMSSQL(clientesCodes);

            // Paso 3: Limpiar datos locales
            this.updateProgress('Limpiando datos locales...', 50, 100);
            await window.indexedDBService.clearAllData();

            // Paso 4: Guardar clientes en IndexedDB
            this.updateProgress('Guardando clientes...', 70, 100);
            await window.indexedDBService.saveClientes(clientes);

            // Paso 5: Guardar documentos en IndexedDB
            this.updateProgress('Guardando documentos...', 85, 100);
            await window.indexedDBService.saveDocumentos(documentos);

            // Paso 6: Actualizar metadatos de sincronización
            this.updateProgress('Finalizando...', 95, 100);
            await window.indexedDBService.setSyncMetadata('last_sync', new Date().toISOString());
            await window.indexedDBService.setSyncMetadata('total_clientes', clientes.length);
            await window.indexedDBService.setSyncMetadata('total_documentos', documentos.length);

            this.updateProgress('Importación completada', 100, 100);

            return {
                success: true,
                clientes_imported: clientes.length,
                documentos_imported: documentos.length,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error durante la importación:', error);
            throw error;
        } finally {
            this.isImporting = false;
        }
    }

    async fetchDocumentosFromMSSQL() {
        const response = await fetch(`${this.apiBaseUrl}/import/documentos/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCsrfToken() || ''
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`Error al obtener documentos: ${response.statusText}`);
        }

        return await response.json();
    }

    async fetchClientesFromMSSQL(clientesCodes) {
        const codesString = clientesCodes.map(code => `'${code}'`).join(',');

        /*
        body: JSON.stringify({
                list_codes: ${codesString}
                query: `
                    SELECT 
                        co_cli,
                        cli_des,
                        rif,
                        telefonos,
                        email,
                        direc1,
                        inactivo
                    FROM clientes 
                    WHERE inactivo = 0 AND co_cli IN (${codesString})
                    ORDER BY cli_des
                `
            })
                */
        
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