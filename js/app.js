// Main App Initialization

// Initialize app on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize database
        await db.init();

        // Load theme
        const savedTheme = storage.get('theme') || 'light-classic';
        setTheme(savedTheme);

        // Check MPIN
        const mpinSet = storage.get('mpin');

        if (!mpinSet) {
            // Show MPIN setup
            hideSplash();
            showScreen('mpin-setup-screen');
        } else {
            // Show MPIN unlock
            hideSplash();
            showScreen('mpin-unlock-screen');
        }

        // Setup event listeners
        setupEventListeners();

        // Load initial data
        await loadInventory();
        await loadCustomers();

    } catch (err) {
        console.error('App initialization error:', err);
        showToast('Error initializing app: ' + err.message, 'error');
    }
});

function hideSplash() {
    const splash = document.getElementById('splash-screen');
    setTimeout(() => {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.5s ease-out';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }, 1500);
}

function showScreen(screenId) {
    document.querySelectorAll('[id$="-screen"]').forEach(screen => {
        screen.classList.add('hidden');
        screen.classList.remove('active');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.remove('hidden');
        screen.classList.add('active');
    }
}

function setupEventListeners() {
    // MPIN Setup
    const mpinSetupForm = document.getElementById('mpin-setup-form');
    if (mpinSetupForm) {
        mpinSetupForm.onsubmit = (e) => {
            e.preventDefault();
            completeMpinSetup();
        };
    }

    // MPIN Unlock
    const mpinUnlockForm = document.getElementById('mpin-unlock-form');
    if (mpinUnlockForm) {
        mpinUnlockForm.onsubmit = (e) => {
            e.preventDefault();
            verifyMpin();
        };
    }

    // Invoice filters
    const invoiceSearch = document.getElementById('invoice-search');
    if (invoiceSearch) {
        invoiceSearch.addEventListener('input', debounce(filterInvoices, 300));
    }

    const invoiceStatusFilter = document.getElementById('invoice-status-filter');
    if (invoiceStatusFilter) {
        invoiceStatusFilter.addEventListener('change', filterInvoices);
    }

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        });
    });
}

function goToSecurityQuestions() {
    const newMpin = document.getElementById('new-mpin').value;
    const confirmMpin = document.getElementById('confirm-mpin').value;

    if (newMpin.length < 4) {
        showToast('MPIN must be at least 4 digits', 'error');
        return;
    }

    if (newMpin !== confirmMpin) {
        showToast('MPINs do not match', 'error');
        return;
    }

    document.getElementById('step-1').classList.add('hidden');
    document.getElementById('step-2').classList.remove('hidden');
}

function backToMpin() {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-1').classList.remove('hidden');
}

function completeMpinSetup(e) {
    const newMpin = document.getElementById('new-mpin').value;
    const q1 = document.getElementById('q1').value;
    const q2 = document.getElementById('q2').value;
    const q3 = document.getElementById('q3').value;

    if (!q1 || !q2 || !q3) {
        showToast('Please answer all security questions', 'error');
        return;
    }

    storage.set('mpin', hashPassword(newMpin));
    storage.set('securityQuestions', {
        q1: q1,
        q2: q2,
        q3: q3
    });

    showToast('Setup completed successfully!', 'success');
    
    setTimeout(() => {
        showMainApp();
    }, 1000);
}

function verifyMpin() {
    const mpin = document.getElementById('unlock-mpin').value;
    const storedMpin = storage.get('mpin');

    if (hashPassword(mpin) !== storedMpin) {
        showToast('Incorrect MPIN', 'error');
        document.getElementById('unlock-mpin').value = '';
        return;
    }

    showToast('Unlocked successfully!', 'success');
    setTimeout(() => {
        showMainApp();
    }, 500);
}

function showMainApp() {
    document.getElementById('mpin-setup-screen').classList.add('hidden');
    document.getElementById('mpin-unlock-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    loadDashboard();
    switchScreen('dashboard');
}

function showMpinRecovery() {
    document.getElementById('mpin-recovery').classList.remove('hidden');
}

async function filterInvoices() {
    const query = document.getElementById('invoice-search')?.value || '';
    const status = document.getElementById('invoice-status-filter')?.value || '';

    const invoices = await db.getAll('invoices');
    let filtered = invoices;

    if (query) {
        filtered = filtered.filter(i => 
            i.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
            i.customerName.toLowerCase().includes(query.toLowerCase())
        );
    }

    if (status) {
        filtered = filtered.filter(i => i.status === status);
    }

    const list = document.getElementById('invoices-list');
    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-state">No invoices found</p>';
        return;
    }

    list.innerHTML = filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).map(invoice => `
        <div class="invoice-item glass" onclick="viewInvoice('${invoice.id}')">
            <div class="invoice-item-header">
                <div class="invoice-item-number">${invoice.invoiceNumber}</div>
                <div class="invoice-item-status status-${invoice.status}">
                    ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </div>
            </div>
            <div class="invoice-item-meta">
                <span>${invoice.customerName}</span>
                <span>${formatDate(invoice.date)}</span>
                <span>${formatCurrency(invoice.total)}</span>
            </div>
        </div>
    `).join('');
}

// Add some sample data for testing
async function addSampleData() {
    try {
        // Add sample products
        const products = [
            { id: 'prod-1', name: 'Spark Plug', category: 'Electrical', stock: 45, purchasePrice: 150, salePrice: 250, minStock: 5 },
            { id: 'prod-2', name: 'Battery', category: 'Electrical', stock: 3, purchasePrice: 2500, salePrice: 3500, minStock: 2 },
            { id: 'prod-3', name: 'Alternator', category: 'Engine', stock: 2, purchasePrice: 6000, salePrice: 8000, minStock: 1 },
        ];

        for (const product of products) {
            const existing = await db.get('products', product.id);
            if (!existing) {
                await db.add('products', product);
            }
        }

        // Add sample customers
        const customers = [
            { id: 'cust-1', name: 'Rajesh Kumar', mobile: '9876543210', address: 'Dhule', vehicle: 'MH-01-1234' },
            { id: 'cust-2', name: 'Priya Sharma', mobile: '9123456789', address: 'Malegaon', vehicle: 'MH-02-5678' },
        ];

        for (const customer of customers) {
            const existing = await db.get('customers', customer.id);
            if (!existing) {
                await db.add('customers', customer);
            }
        }

        console.log('Sample data added');
    } catch (err) {
        console.error('Error adding sample data:', err);
    }
}

// Call this after setup
window.addSampleData = addSampleData;