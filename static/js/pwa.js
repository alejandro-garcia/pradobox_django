// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Handle install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button or notification
    showInstallPrompt();
});

function showInstallPrompt() {
    // Create install notification
    const installBanner = document.createElement('div');
    installBanner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50 transform -translate-y-full transition-transform';
    installBanner.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <p class="font-medium">¿Instalar Cobranzas App?</p>
                <p class="text-sm opacity-90">Accede rápidamente desde tu pantalla de inicio</p>
            </div>
            <div class="flex space-x-2">
                <button id="installBtn" class="bg-white text-blue-600 px-4 py-2 rounded text-sm font-medium">Instalar</button>
                <button id="dismissBtn" class="text-white px-4 py-2 rounded text-sm">Después</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(installBanner);
    
    // Animate in
    setTimeout(() => {
        installBanner.classList.remove('-translate-y-full');
    }, 100);
    
    // Handle install button click
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
        }
        installBanner.remove();
    });
    
    // Handle dismiss button click
    document.getElementById('dismissBtn').addEventListener('click', () => {
        installBanner.remove();
    });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (installBanner.parentNode) {
            installBanner.remove();
        }
    }, 10000);
}

// Handle successful installation
window.addEventListener('appinstalled', (evt) => {
    console.log('App installed successfully');
    
    // Show success message
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 left-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50';
    successDiv.textContent = '¡App instalada correctamente!';
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
});

// Handle app updates
window.addEventListener('controllerchange', () => {
    // Show update notification
    const updateDiv = document.createElement('div');
    updateDiv.className = 'fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50';
    updateDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <p>Nueva versión disponible</p>
            <button onclick="window.location.reload()" class="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">Actualizar</button>
        </div>
    `;
    
    document.body.appendChild(updateDiv);
});