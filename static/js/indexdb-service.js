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

                // Store para vendedroes
                if (!db.objectStoreNames.contains('vendedores')) {
                    const sellersStore = db.createObjectStore('vendedores', { keyPath: 'co_ven' });
                    sellersStore.createIndex('nombre', 'ven_des', { unique: false });
                }

                // Store para documentos
                if (!db.objectStoreNames.contains('documentos')) {
                    const documentosStore = db.createObjectStore('documentos', { keyPath: 'id' });
                    documentosStore.createIndex('co_cli', 'co_cli', { unique: false });
                    documentosStore.createIndex('tipo_doc', 'tipo_doc', { unique: false });
                    documentosStore.createIndex('fec_venc', 'fec_venc', { unique: false });
                    documentosStore.createIndex('saldo', 'saldo', { unique: false });
                }

                // Store para renglones
                if (!db.objectStoreNames.contains('renglones')) {
                    const renglonesStore = db.createObjectStore('renglones', { keyPath: 'id' });
                    renglonesStore.createIndex('doc_id', 'doc_id', { unique: false });
                }

                // Store para ventas mensuales
                if (!db.objectStoreNames.contains('ventas_mensuales')) {
                    const ventasMensualesStore = db.createObjectStore('ventas_mensuales', { keyPath: 'id' });
                    ventasMensualesStore.createIndex('mes', 'mes', { unique: false });
                }

                // Store para metadatos de sincronización
                if (!db.objectStoreNames.contains('sync_metadata')) {
                    db.createObjectStore('sync_metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async saveClients(clientes) {
        const transaction = this.db.transaction(['clientes'], 'readwrite');
        const store = transaction.objectStore('clientes');

        for (const cliente of clientes) {
            await store.put(cliente);
        }

        return transaction.complete;
    }

    async saveSellers(sellers) {
        const transaction = this.db.transaction(['vendedores'], 'readwrite');
        const store = transaction.objectStore('vendedores');

        for (const seller of sellers) {
            await store.put(seller);
        }

        return transaction.complete;
    }

    async saveMonthSales(month_sales) {
        const transaction = this.db.transaction(['ventas_mensuales'], 'readwrite');
        const store = transaction.objectStore('ventas_mensuales');

        for (const month_sale of month_sales) {
            await store.put(month_sale);
        }

        return transaction.complete;
    }

    async saveDocs(documentos) {
        const transaction = this.db.transaction(['documentos'], 'readwrite');
        const store = transaction.objectStore('documentos');

        for (const documento of documentos) {
            // Crear ID único combinando tipo_doc y nro_doc
            documento.id = `${documento.tipo_doc}_${documento.nro_doc}`;
            await store.put(documento);
        }

        return transaction.complete;
    }

    async saveDocLines(lines) {
        const transaction = this.db.transaction(['renglones'], 'readwrite');
        const store = transaction.objectStore('renglones');

        for (const line of lines) {
            // Crear ID único combinando tipo_doc y nro_doc
            //documento.id = `${documento.tipo_doc}_${documento.nro_doc}`;
            await store.put(line);
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

    async getSellerByCode(sellerId){
        const transaction = this.db.transaction("vendedores", "readonly");
        const store = transaction.objectStore("vendedores");

        return new Promise((resolve, reject) => {
            const request = store.get(sellerId.trim());
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getDocLines(docId){
        const transaction = this.db.transaction("renglones", "readonly");
        const store = transaction.objectStore("renglones");

        return new Promise((resolve, reject) => {
            const index = store.index("doc_id");
            const request = index.getAll(docId);
            //const request = store.get(sellerId.trim());
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
                    // Admitir valor único, lista separada por comas o array
                    let coVenList = [];
                    if (Array.isArray(filtros.co_ven)) {
                        coVenList = filtros.co_ven.map(v => String(v).trim()).filter(Boolean);
                    } else if (typeof filtros.co_ven === 'string' && filtros.co_ven.includes(',')) {
                        coVenList = filtros.co_ven.split(',').map(v => v.trim()).filter(Boolean);
                    } else {
                        coVenList = [String(filtros.co_ven).trim()];
                    }

                    documentos = documentos.filter(doc => coVenList.includes(String(doc.co_ven).trim()));
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
        // Obtener documentos filtrados por vendedor (admite lista separada por comas)
        const documentos = await this.getDocumentos({ co_ven: seller_code });

        // Fecha actual (solo parte de fecha)
        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr);

        const resumen = {
            total_vencido: 0,
            total_por_vencer: 0,
            total_creditos: 0,
            total_sinvencimiento: 0,
            cantidad_vencidos: 0,
            cantidad_por_vencer: 0,
            cantidad_total: 0,
            dias_promedio_vencimiento: 0,
            dias_promedio_vencimiento_todos: 0,
            dias_transcurridos: 0,
            dias_faltantes: 0
        };

        // Reglas (alineadas con servidor):
        // - Excluir saldo == 0
        // - Excluir tipo 'N/CR' de vencidos/por_vencer
        // - Considerar anulado = false (si el campo no existe, asumimos no anulado)
        // - Créditos: tipo in ['N/CR', 'ADEL'] y saldo < 0

        const isAnulado = (doc) => {
            // Aceptar 0/1, true/false, '0'/'1'
            const val = doc.anulado;
            if (val === undefined || val === null) return false;
            if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
            return Boolean(val);
        };

        // Acumuladores de días
        let totalDiasVencimientoVencidos = 0; // solo vencidos
        let cantidadVencidos = 0;
        let totalDiasVencimientoTodos = 0; // vencidos + por vencer (negativos para por vencer)
        let cantidadTodos = 0; // vencidos + por vencer + sin_vencimiento (solo cuenta)
        let cantidadPorVencer = 0;
        let cantidadSinVencimiento = 0;

        let porVencerDias = 0;
        let vencidosDias = 0;
        let sinVencimientoDias = 0;

        for (const doc of documentos) {
            const saldo = parseFloat(doc.saldo);
            if (!isFinite(saldo) || saldo === 0) continue;
            if (isAnulado(doc)) continue;

            const tipo = (doc.tipo_doc || '').trim();
            const fecVencStr = (doc.fec_venc || '').slice(0, 10);
            if (!fecVencStr) continue;
            const fecVenc = new Date(fecVencStr);

            // Créditos (N/CR, ADEL) se acumulan por separado (como positivo)
            if (tipo === 'N/CR' || tipo === 'ADEL') {
                if (saldo < 0) {
                    resumen.total_creditos += Math.abs(saldo);
                } 

                // Además, N/CR cuentan como "sin vencimiento" en el online
                
                if (tipo === 'N/CR') {
                    resumen.total_sinvencimiento += saldo;
                    cantidadSinVencimiento += 1;
                    const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                    if (isFinite(diasVenc)) {
                        sinVencimientoDias += diasVenc;
                    }
                }

                // fix: ADEL se considera vencido
                if (tipo === 'ADEL') {
                    if (fecVencStr <= todayStr) {
                        resumen.total_vencido += saldo;
                        resumen.cantidad_vencidos++;
    
                        // Días de vencimiento (hoy - fecha_venc)
                        const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                        if (isFinite(diasVenc)) {
                            totalDiasVencimientoVencidos += Math.max(0, diasVenc);
                            cantidadVencidos++;
                            //totalDiasVencimientoTodos += diasVenc; // positivo
                            cantidadTodos++;
                            vencidosDias += diasVenc;
                        }
                        else {
                            // Por vencer: tipo distinto de N/CR
                            debugger;
                            resumen.total_por_vencer += saldo;
                            resumen.cantidad_por_vencer++;
                            cantidadPorVencer++;

                            const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                            if (isFinite(diasVenc)) {
                               // totalDiasVencimientoTodos += diasVenc; // negativo
                                cantidadTodos++;
                                porVencerDias += diasVenc;
                            }
                        }
                    }
                }
                // Se excluyen de los bloques vencidos/por vencer para totales, pero sí cuentan en cantidad_total (online los incluye en el denominador)
                continue;
            }

            // Clasificación por fecha de vencimiento
            if (fecVencStr <= todayStr) {
                // Vencidos: tipo distinto de N/CR
                resumen.total_vencido += saldo;
                resumen.cantidad_vencidos++;

                // Días de vencimiento (hoy - fecha_venc)
                const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                if (isFinite(diasVenc)) {
                    totalDiasVencimientoVencidos += Math.max(0, diasVenc);
                    cantidadVencidos++;
                    //totalDiasVencimientoTodos += diasVenc; // positivo
                    cantidadTodos++;
                    vencidosDias += diasVenc;
                }
            } else {
                // Por vencer: tipo distinto de N/CR
                resumen.total_por_vencer += saldo;
                resumen.cantidad_por_vencer++;
                cantidadPorVencer++;

                const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                if (isFinite(diasVenc)) {
                    //totalDiasVencimientoTodos += diasVenc; // negativo
                    cantidadTodos++;
                    porVencerDias += diasVenc;
                }
            }
        }

        totalDiasVencimientoTodos = vencidosDias + porVencerDias + sinVencimientoDias;

        // Promedio de días vencidos (solo sobre vencidos, como en servidor)
        resumen.dias_promedio_vencimiento = cantidadVencidos > 0
            ? Math.round(totalDiasVencimientoVencidos / cantidadVencidos)
            : 0;

        // Total sin vencimiento usa valor absoluto en el retorno online
        resumen.total_sinvencimiento = Math.abs(resumen.total_sinvencimiento);

        // Cantidad total: vencidos + por vencer + sin vencimiento
        resumen.cantidad_total = (resumen.cantidad_vencidos || 0) + (cantidadPorVencer || 0) + (cantidadSinVencimiento || 0);

        // Promedio de vencimiento considerando todos (vencidos + por vencer) como en servidor
        resumen.dias_promedio_vencimiento_todos = resumen.cantidad_total > 0
            ? Math.round(totalDiasVencimientoTodos / (resumen.cantidad_total)) // servidor no suma días de sin_vencimiento
            : 0;

        // Días transcurridos y faltantes en el mes actual
        const now = new Date();
        const diasTranscurridos = now.getDate();
        const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        resumen.dias_transcurridos = diasTranscurridos;
        resumen.dias_faltantes = ultimoDiaMes - diasTranscurridos;

        return resumen;
    }

    async getVentasMensuales() {
        const transaction = this.db.transaction(['ventas_mensuales'], 'readonly');
        const store = transaction.objectStore('ventas_mensuales');
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getVentasTrimestre(seller_code) {
        // Cargar documentos filtrados por vendedor (admite CSV)
        const documentos = await this.getDocumentos({ co_ven: seller_code });
        debugger;

        // Determinar los últimos 3 meses (incluyendo mes actual)
        const now = new Date();
        const months = [];
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
        }

        // Mapa YYYYMM -> total
        const totals = new Map(months.map(({ y, m }) => [String(y) + String(m).padStart(2, '0'), 0]));

        // Función para obtener YYYYMM desde fecha (string 'YYYY-MM-DD' o Date)
        const toYYYYMM = (dateStr) => {
            if (!dateStr) return null;
            const d = new Date(dateStr.slice(0, 10));
            if (isNaN(d.getTime())) return null;
            const ym = String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0');
            return ym;
        };

        for (const doc of documentos) {
            const tipo = (doc.tipo_doc || doc.tipo || '').trim();
            if (tipo === 'N/CR' || tipo === 'ADEL') continue; // excluir créditos/adelantos

            const monto = parseFloat(doc.monto);
            if (!isFinite(monto) || monto <= 0) continue;

            // Usar fecha de emisión si existe, si no, fecha de vencimiento
            const fecEmis = doc.fec_emis || doc.fecha_emision;
            const fecVenc = doc.fec_venc || doc.fecha_vencimiento;
            const ym = toYYYYMM(fecEmis) || toYYYYMM(fecVenc);
            if (!ym) continue;

            if (totals.has(ym)) {
                totals.set(ym, totals.get(ym) + monto);
            }
        }

        // Etiquetas de meses (abreviadas en español, minúsculas)
        const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        const result = months.map(({ y, m }) => {
            const ym = String(y) + String(m).padStart(2, '0');
            return { mes: MESES[m - 1], monto: totals.get(ym) || 0 };
        });

        return result;
    }

    async getResumenCliente(cliente_id) {
        // Documentos del cliente
        const allDocs = await this.getDocumentos();
        const documentos = allDocs.filter(d => String(d.co_cli).trim() === String(cliente_id).trim());

        const todayStr = new Date().toISOString().split('T')[0];
        const today = new Date(todayStr);

        const resumen = {
            total_vencido: 0,
            total_por_vencer: 0,
            total_creditos: 0,
            total_sinvencimiento: 0,
            cantidad_vencidos: 0,
            cantidad_total: 0,
            dias_promedio_vencimiento: 0,
            dias_promedio_vencimiento_todos: 0,
            dias_transcurridos: 0,
            dias_faltantes: 0
        };

        const isAnulado = (doc) => {
            const val = doc.anulado;
            if (val === undefined || val === null) return false;
            if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true';
            return Boolean(val);
        };

        let totalDiasVencimientoVencidos = 0;
        let cantidadVencidos = 0;
        let totalDiasVencimientoTodos = 0; // vencidos + por vencer (negativos para por vencer)
        let cantidadTodos = 0; // vencidos + por vencer + sin_vencimiento (solo cuenta)
        let cantidadPorVencer = 0;
        let cantidadSinVencimiento = 0;

        let porVencerDias = 0;
        let vencidosDias = 0;
        let sinVencimientoDias = 0;

        for (const doc of documentos) {
            const saldo = parseFloat(doc.saldo);
            if (!isFinite(saldo) || saldo === 0) continue;
            if (isAnulado(doc)) continue;

            const tipo = (doc.tipo_doc || doc.tipo || '').trim();
            const fecVencStr = (doc.fec_venc || doc.fecha_vencimiento || '').slice(0, 10);
            const fecVenc = fecVencStr ? new Date(fecVencStr) : null;

            if (tipo === 'N/CR' || tipo === 'ADEL') {
                if (saldo < 0) resumen.total_creditos += Math.abs(saldo);
                // Además, N/CR cuentan como "sin vencimiento" en el online
                
                if (tipo === 'N/CR') {
                    resumen.total_sinvencimiento += saldo;
                    cantidadSinVencimiento += 1;
                    const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                    if (isFinite(diasVenc)) {
                        sinVencimientoDias += diasVenc;
                    }
                }

                // fix: ADEL se considera vencido
                if (tipo === 'ADEL') {
                    if (fecVencStr <= todayStr) {
                        resumen.total_vencido += saldo;
                        resumen.cantidad_vencidos++;
    
                        // Días de vencimiento (hoy - fecha_venc)
                        const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                        if (isFinite(diasVenc)) {
                            totalDiasVencimientoVencidos += Math.max(0, diasVenc);
                            cantidadVencidos++;
                            //totalDiasVencimientoTodos += diasVenc; // positivo
                            cantidadTodos++;
                            vencidosDias += diasVenc;
                        }
                        else {
                            // Por vencer: tipo distinto de N/CR
                            debugger;
                            resumen.total_por_vencer += saldo;
                            resumen.cantidad_por_vencer++;
                            cantidadPorVencer++;

                            const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                            if (isFinite(diasVenc)) {
                               // totalDiasVencimientoTodos += diasVenc; // negativo
                                cantidadTodos++;
                                porVencerDias += diasVenc;
                            }
                        }
                    }
                }
                // Se excluyen de los bloques vencidos/por vencer para totales, pero sí cuentan en cantidad_total (online los incluye en el denominador)
                continue;
            }

            // Clasificación por fecha de vencimiento
            if (fecVencStr <= todayStr) {
                // Vencidos: tipo distinto de N/CR
                resumen.total_vencido += saldo;
                resumen.cantidad_vencidos++;

                // Días de vencimiento (hoy - fecha_venc)
                const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                if (isFinite(diasVenc)) {
                    totalDiasVencimientoVencidos += Math.max(0, diasVenc);
                    cantidadVencidos++;
                    //totalDiasVencimientoTodos += diasVenc; // positivo
                    cantidadTodos++;
                    vencidosDias += diasVenc;
                }
            } else {
                // Por vencer: tipo distinto de N/CR
                resumen.total_por_vencer += saldo;
                resumen.cantidad_por_vencer++;
                cantidadPorVencer++;

                const diasVenc = Math.floor((today - fecVenc) / (1000 * 60 * 60 * 24));
                if (isFinite(diasVenc)) {
                    //totalDiasVencimientoTodos += diasVenc; // negativo
                    cantidadTodos++;
                    porVencerDias += diasVenc;
                }
            }
        }

        totalDiasVencimientoTodos = vencidosDias + porVencerDias + sinVencimientoDias;

        // Promedio de días vencidos (solo sobre vencidos, como en servidor)
        resumen.dias_promedio_vencimiento = cantidadVencidos > 0
            ? Math.round(totalDiasVencimientoVencidos / cantidadVencidos)
            : 0;

        // Total sin vencimiento usa valor absoluto en el retorno online
        resumen.total_sinvencimiento = Math.abs(resumen.total_sinvencimiento);
        resumen.cantidad_total = (resumen.cantidad_vencidos || 0) + (cantidadPorVencer || 0) + (cantidadSinVencimiento || 0);
        resumen.dias_promedio_vencimiento = cantidadVencidos > 0 ? Math.round(totalDiasVencimientoVencidos / cantidadVencidos) : 0;
        resumen.dias_promedio_vencimiento_todos = resumen.cantidad_total > 0
            ? Math.round(totalDiasVencimientoTodos / (resumen.cantidad_total)) // servidor no suma días de sin_vencimiento
            : 0;

        const now = new Date();
        const diasTranscurridos = now.getDate();
        const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        resumen.dias_transcurridos = diasTranscurridos;
        resumen.dias_faltantes = ultimoDiaMes - diasTranscurridos;

        return resumen;
    }


    async getEventosCliente(cliente_id) {
        // Aprox de eventos: documentos del cliente en últimos 90 días
        const documentos = await this.getDocumentos();
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

        const docsCliente = documentos.filter(d => String(d.co_cli).trim() === String(cliente_id).trim());

        const eventos = [];
        for (const d of docsCliente) {
            const emisStr = (d.fec_emis || d.fecha_emision || '').slice(0, 10);
            if (!emisStr) continue;
            const emis = new Date(emisStr);
            if (isNaN(emis.getTime())) continue;
            if (emis < ninetyDaysAgo) continue;

            eventos.push({
                tipo: (d.tipo_doc || d.tipo || '').trim(),
                numero: d.nro_doc || d.numero,
                fecha_emision: emisStr,
                fecha_vencimiento: (d.fec_venc || d.fecha_vencimiento || '').slice(0, 10),
                monto: parseFloat(d.monto_net) || 0,
                saldo: parseFloat(d.saldo) || 0,
                empresa: d.empresa || 1
            });
        }

        // Ordenar por fecha_emision desc (más recientes primero)
        eventos.sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision));
        return eventos;
    }

    async getDocumentosPendientesCliente(cliente_id) {
        // Obtiene documentos del cliente y los mapea al formato usado por la UI
        const allDocs = await this.getDocumentos();
        const docsCliente = allDocs.filter(d => String(d.co_cli).trim() === String(cliente_id).trim());

        const today = new Date();

        const mapped = docsCliente
            .filter(d => {
                const saldo = parseFloat(d.saldo);
                if (!isFinite(saldo)) return false;
                // Excluir pagos puros si vinieran marcados como tipo 'COB'
                const tipo = (d.tipo_doc || d.tipo || '').trim();
                return tipo !== 'COB';
            })
            .map(d => {
                const tipo = (d.tipo_doc || d.tipo || '').trim();
                const fecha_emision = (d.fec_emis || d.fecha_emision || '').slice(0, 10);
                const fecha_vencimiento = (d.fec_venc || d.fecha_vencimiento || '').slice(0, 10);
                const monto = parseFloat(d.monto_net) || 0;
                const saldo = parseFloat(d.saldo) || 0;
                const numero = d.nro_doc || d.numero;

                let dias_vencimiento = null;
                let esta_vencido = false;

                if (fecha_vencimiento) {
                    const fv = new Date(fecha_vencimiento);
                    const diffDays = Math.floor((today - fv) / (1000 * 60 * 60 * 24));
                    dias_vencimiento = diffDays;
                    esta_vencido = diffDays >= 0;
                }

                return {
                    tipo,
                    numero,
                    fecha_emision,
                    fecha_vencimiento,
                    monto,
                    saldo,
                    dias_vencimiento,
                    esta_vencido,
                    empresa: d.empresa || 1
                };
            })
            // Ordenar por fecha de emisión DESC
            .sort((a, b) => new Date(b.fecha_emision) - new Date(a.fecha_emision));

        return mapped;
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

    async getDocLinesCount(){
        const transaction = this.db.transaction(['renglones'], 'readonly');
        const store = transaction.objectStore('renglones');
        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getStorageInfo() {
        const clientes = await this.getClientes();
        const documentos = await this.getDocumentos();
        //const renglonees = await this.getRenglones();
        const renglones_count = await this.getDocLinesCount();
        const lastSync = await this.getSyncMetadata('last_sync');
        const swVersion = await this.getSyncMetadata('sw_version');

        return {
            clientes_count: clientes.length,
            documentos_count: documentos.length,
            renglones_count: renglones_count,
            last_sync: lastSync,
            storage_size: await this.calculateStorageSize(),
            sw_version: swVersion
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
        const userName = await this.getSyncMetadata('user_name');
        const fullName = await this.getSyncMetadata('nombre_completo');
        const sellerCode = await this.getSyncMetadata('codigo_vendedor_profit');

        return {
            user_name: userName,
            nombre_completo: fullName,
            codigo_vendedor_profit: sellerCode
        }
    }
}

// Instancia global del servicio
window.indexedDBService = new IndexedDBService();