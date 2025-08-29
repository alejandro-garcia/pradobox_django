class IndexedDBService {
    constructor() {
        this.dbName = 'CobranzasDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store para clientes
                if (!db.objectStoreNames.contains('clientes')) {
                    const clientesStore = db.createObjectStore('clientes', { keyPath: 'co_cli' });
                    clientesStore.createIndex('nombre', 'cli_des', { unique: false });
                    clientesStore.createIndex('rif', 'rif', { unique: false });
                }

                // Store para documentos
                if (!db.objectStoreNames.contains('documentos')) {
                    const documentosStore = db.createObjectStore('documentos', { keyPath: 'id' });
                    documentosStore.createIndex('co_cli', 'co_cli', { unique: false });
                    documentosStore.createIndex('tipo_doc', 'tipo_doc', { unique: false });
                    documentosStore.createIndex('fec_venc', 'fec_venc', { unique: false });
                    documentosStore.createIndex('saldo', 'saldo', { unique: false });
                }

                // Store para metadatos de sincronización
                if (!db.objectStoreNames.contains('sync_metadata')) {
                    db.createObjectStore('sync_metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async saveClientes(clientes) {
        const transaction = this.db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');

        for (const cliente of clientes) {
            await store.put(cliente);
        }

        return transaction.complete;
    }

    async saveDocumentos(documentos) {
        const transaction = this.db.transaction(['documentos'], 'readwrite');
        const store = transaction.objectStore('documentos');

        for (const documento of documentos) {
            // Crear ID único combinando tipo_doc y nro_doc
            documento.id = `${documento.tipo_doc}_${documento.nro_doc}`;
            await store.put(documento);
        }

        return transaction.complete;
    }

    async getClientes() {
        const transaction = this.db.transaction(['clientes'], 'readonly');
        const store = transaction.objectStore('clientes');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getDocumentos(filtros = {}) {
        if (!this.db) {
            await this.init();
        }
        const transaction = this.db.transaction(['documentos'], 'readonly');
        const store = transaction.objectStore('documentos');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                let documentos = request.result;
                
                // Aplicar filtros
                if (filtros.co_cli) {
                    documentos = documentos.filter(doc => doc.co_cli === filtros.co_cli);
                }

                if (filtros.co_ven) {
                    documentos = documentos.filter(doc => doc.co_ven === filtros.co_ven);
                }

                if (filtros.vencidos) {
                    const today = new Date().toISOString().split('T')[0];
                    documentos = documentos.filter(doc => doc.fec_venc < today);
                }
                
                resolve(documentos);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getResumenCobranzas(seller_code) {
        const documentos = await this.getDocumentos({ co_ven: seller_code });
        const today = new Date().toISOString().split('T')[0];

        const resumen = {
            total_vencido: 0,
            total_por_vencer: 0,
            total_creditos: 0,
            cantidad_vencidos: 0,
            cantidad_por_vencer: 0,
            dias_promedio_vencimiento: 0
        };

        let totalDiasVencimiento = 0;
        let documentosVencidos = 0;

        documentos.forEach(doc => {
            const saldo = parseFloat(doc.saldo);
            
            if (doc.tipo_doc === 'N/C' || doc.tipo_doc == "ADEL") {
                resumen.total_creditos += Math.abs(saldo);
            } else if (doc.fec_venc < today) {
                resumen.total_vencido += saldo;
                resumen.cantidad_vencidos++;
                
                // Calcular días de vencimiento
                const fechaVenc = new Date(doc.fec_venc);
                const hoy = new Date();
                const diasVencimiento = Math.floor((hoy - fechaVenc) / (1000 * 60 * 60 * 24));
                totalDiasVencimiento += diasVencimiento;
                documentosVencidos++;
            } else {
                resumen.total_por_vencer += saldo;
                resumen.cantidad_por_vencer++;
            }
        });

        resumen.dias_promedio_vencimiento = documentosVencidos > 0 
            ? Math.round(totalDiasVencimiento / documentosVencidos) 
            : 0;

        return resumen;
    }

    async setSyncMetadata(key, value) {
        const transaction = this.db.transaction(['sync_metadata'], 'readwrite');
        const store = transaction.objectStore('sync_metadata');
        return store.put({ key, value, timestamp: new Date().toISOString() });
    }

    async getSyncMetadata(key) {
        const transaction = this.db.transaction(['sync_metadata'], 'readonly');
        const store = transaction.objectStore('sync_metadata');
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        const transaction = this.db.transaction(['clientes', 'documentos', 'sync_metadata'], 'readwrite');
        
        await Promise.all([
            transaction.objectStore('clientes').clear(),
            transaction.objectStore('documentos').clear(),
            transaction.objectStore('sync_metadata').clear()
        ]);

        return transaction.complete;
    }

    async getStorageInfo() {
        const clientes = await this.getClientes();
        const documentos = await this.getDocumentos();
        const lastSync = await this.getSyncMetadata('last_sync');

        return {
            clientes_count: clientes.length,
            documentos_count: documentos.length,
            last_sync: lastSync,
            storage_size: await this.calculateStorageSize()
        };
    }

    async calculateStorageSize() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage,
                available: estimate.quota,
                percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
            };
        }
        return null;
    }

    async getCurrentUser() {
        const transaction = this.db.transaction(['clientes'], 'readonly');
        const store = transaction.objectStore('clientes');
        return new Promise((resolve, reject) => {
            const request = store.get(1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Instancia global del servicio
window.indexedDBService = new IndexedDBService();