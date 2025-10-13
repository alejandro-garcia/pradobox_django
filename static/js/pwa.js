// =============================
// 📱 PWA Service Worker Registration
// =============================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then((registration) => {
                console.log('✅ SW registrado: ', registration);

                // --- 🧩 NUEVO BLOQUE ---
                // Escucha mensajes del Service Worker (paso 2)
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data?.type === 'NEW_VERSION_AVAILABLE') {
                        console.log('🔄 Nueva versión disponible, recargando...');
                        mostrarAvisoActualizacion();
                    }
                });
                // --- FIN BLOQUE NUEVO ---

                // Detecta cuando hay un nuevo worker instalándose
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'activated') {
                            console.log('🔁 Nuevo SW activado, recargando...');
                            window.location.reload(); // recarga la página al activar el nuevo SW
                        }
                    });
                });
            })
            .catch((registrationError) => {
                console.error('❌ SW registration failed: ', registrationError);
            });
    });
}

// =============================
// 💾 Manejo del prompt de instalación
// =============================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPrompt();
});

function showInstallPrompt() {
    const installBanner = document.createElement('div');
    installBanner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 transform -translate-y-full transition-transform';
    installBanner.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <p class="font-medium">¿Instalar PradoBox?</p>
                <p class="text-sm opacity-90">Accede rápidamente desde tu pantalla de inicio</p>
            </div>
            <div class="flex space-x-2">
                <button id="installBtn" class="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium">Instalar</button>
                <button id="dismissBtn" class="text-white px-4 py-2 rounded text-sm">Después</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(installBanner);
    
    // Animación de entrada
    setTimeout(() => installBanner.classList.remove('-translate-y-full'), 100);
    
    // Instalar
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
        installBanner.remove();
    });
    
    // Cerrar
    document.getElementById('dismissBtn').addEventListener('click', () => installBanner.remove());
    
    // Auto-ocultar
    setTimeout(() => installBanner.remove(), 10000);
}

// =============================
// 🎉 App instalada correctamente
// =============================
window.addEventListener('appinstalled', () => {
    console.log('✅ App instalada correctamente');
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 left-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
    successDiv.textContent = '¡App instalada correctamente!';
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
});

// =============================
// 🔔 Notificación de actualización (controllerchange)
// =============================
window.addEventListener('controllerchange', () => {
    mostrarAvisoActualizacion();
});

// =============================
// 🧠 NUEVA FUNCIÓN UNIFICADA
// =============================
function mostrarAvisoActualizacion() {
    // Evita duplicados
    if (document.getElementById('updateBanner')) return;

    const updateDiv = document.createElement('div');
    updateDiv.id = 'updateBanner';
    updateDiv.className = 'fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50';
    updateDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <p class="font-medium">Hay una nueva versión disponible</p>
            <button id="updateBtn" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">
                Actualizar
            </button>
        </div>
    `;
    
    document.body.appendChild(updateDiv);

    document.getElementById('updateBtn').addEventListener('click', () => {
        updateDiv.remove();
        window.location.reload(true);
    });

    // Auto-ocultar después de 20s (opcional)
    setTimeout(() => {
        if (updateDiv.parentNode) updateDiv.remove();
    }, 20000);
}
