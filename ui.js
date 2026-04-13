// UI Functions

// Switch screen
function switchScreen(screenName) {
    document.querySelectorAll('[class*="screen"]').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });

    const screen = document.getElementById(screenName + '-screen');
    if (screen) {
        screen.classList.add('active');
        screen.classList.remove('hidden');
    }

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const navItem = document.querySelector(`[data-screen="${screenName}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'invoices': 'Invoices',
        'inventory': 'Inventory',
        'customers': 'Customers',
        'settings': 'Settings'
    };
    document.getElementById('screen-title').textContent = titles[screenName] || 'FM BIZ';
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// Open modal
function openModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Set theme
function setTheme(theme) {
    document.documentElement.className = theme;
    storage.set('theme', theme);
    
    // Update active theme button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-theme="${theme}"]`)?.classList.add('active');
}

// Set UI Style
function setUIStyle(style) {
    storage.set('uiStyle', style);
    refreshUI();
}

// Set Language
function setLanguage(lang) {
    storage.set('language', lang);
    applyLanguage(lang);
}

// Apply language translations
function applyLanguage(lang) {
    if (lang === 'hi') {
        // Simple Hindi translation
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = translations[lang]?.[key] || el.textContent;
        });
    }
}

// Toggle notifications
function toggleNotifications() {
    showToast('No new notifications', 'info');
}

// Toggle user menu
function toggleUserMenu() {
    showToast('Profile menu opened', 'info');
}

// Refresh UI
function refreshUI() {
    // Re-render all screens
    loadDashboard();
    loadInvoices();
    loadInventory();
    loadCustomers();
}

// Change MPIN
function changeMPIN() {
    const currentMPIN = prompt('Enter current MPIN:');
    if (!currentMPIN) return;

    const storedMPIN = storage.get('mpin');
    if (hashPassword(currentMPIN) !== storedMPIN) {
        showToast('Incorrect MPIN', 'error');
        return;
    }

    const newMPIN = prompt('Enter new MPIN (4 digits):');
    if (!newMPIN || newMPIN.length < 4) {
        showToast('MPIN must be at least 4 digits', 'error');
        return;
    }

    const confirmMPIN = prompt('Confirm new MPIN:');
    if (newMPIN !== confirmMPIN) {
        showToast('MPINs do not match', 'error');
        return;
    }

    storage.set('mpin', hashPassword(newMPIN));
    showToast('MPIN changed successfully', 'success');
}

// Export data
async function exportData() {
    const allStores = ['customers', 'products', 'services', 'invoices', 'invoice_items', 'payments', 'expenses', 'vendors'];
    const exportData = {};

    for (const store of allStores) {
        exportData[store] = await db.getAll(store);
    }

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fm-biz-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    showToast('Data exported successfully', 'success');
}

// Import data
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                
                for (const storeName in importedData) {
                    await db.clear(storeName);
                    for (const item of importedData[storeName]) {
                        await db.put(storeName, item);
                    }
                }

                showToast('Data imported successfully', 'success');
                refreshUI();
            } catch (err) {
                showToast('Error importing data: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Print invoice
function printInvoice() {
    window.print();
}

// Translations
const translations = {
    hi: {
        'dashboard': 'डैशबोर्ड',
        'invoices': 'चालान',
        'inventory': 'सूची',
        'customers': 'ग्राहकों',
        'settings': 'सेटिंग्स'
    }
};