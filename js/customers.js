// Customer Management

async function loadCustomers() {
    const customers = await db.getAll('customers');
    const list = document.getElementById('customers-list');

    if (customers.length === 0) {
        list.innerHTML = '<p class="empty-state">No customers found</p>';
        return;
    }

    list.innerHTML = customers.map(customer => `
        <div class="customer-card glass">
            <div class="invoice-item-header">
                <div class="invoice-item-number">${customer.name}</div>
                <div>
                    <button class="btn btn-secondary" onclick="editCustomer('${customer.id}')">Edit</button>
                    <button class="btn btn-secondary" onclick="deleteCustomer('${customer.id}')">Delete</button>
                </div>
            </div>
            <div class="invoice-item-meta">
                <span>📞 ${customer.mobile || 'N/A'}</span>
                <span>🚗 ${customer.vehicle || 'N/A'}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                ${customer.address || 'No address'}
            </div>
        </div>
    `).join('');

    updateCustomerSelectors();
}

function openAddCustomer() {
    document.getElementById('customer-modal-title').textContent = 'Add Customer';
    document.getElementById('customer-form').reset();
    document.getElementById('customer-form').onsubmit = saveCustomer;
    openModal('customer-modal');
}

function editCustomer(id) {
    // TODO: Implement edit functionality
    showToast('Edit functionality coming soon', 'info');
}

function deleteCustomer(id) {
    if (confirm('Are you sure?')) {
        db.delete('customers', id);
        showToast('Customer deleted', 'success');
        loadCustomers();
    }
}

function saveCustomer(e) {
    e.preventDefault();
    
    const customer = {
        id: generateId(),
        name: document.getElementById('customer-name').value,
        mobile: document.getElementById('customer-mobile').value,
        address: document.getElementById('customer-address').value,
        vehicle: document.getElementById('customer-vehicle').value,
        createdAt: new Date().toISOString()
    };

    db.add('customers', customer);
    showToast('Customer added successfully', 'success');
    closeModal('customer-modal');
    loadCustomers();
}

async function updateCustomerSelectors() {
    const customers = await db.getAll('customers');
    const selector = document.getElementById('invoice-customer');
    
    const currentValue = selector.value;
    selector.innerHTML = '<option value="">Select Customer</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        selector.appendChild(option);
    });
    
    selector.value = currentValue;
}

async function loadCustomerVehicles() {
    const customerId = document.getElementById('invoice-customer').value;
    const vehicleSelector = document.getElementById('invoice-vehicle');

    if (!customerId) {
        vehicleSelector.innerHTML = '<option value="">Select Vehicle</option>';
        return;
    }

    const customer = await db.get('customers', customerId);
    vehicleSelector.innerHTML = '<option value="">Select Vehicle</option>';
    
    if (customer && customer.vehicle) {
        const option = document.createElement('option');
        option.value = customer.vehicle;
        option.textContent = customer.vehicle;
        vehicleSelector.appendChild(option);
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.toLowerCase();
            const customers = await db.getAll('customers');
            const filtered = customers.filter(c => 
                c.name.toLowerCase().includes(query) ||
                c.mobile?.includes(query)
            );

            const list = document.getElementById('customers-list');
            if (filtered.length === 0) {
                list.innerHTML = '<p class="empty-state">No customers found</p>';
                return;
            }

            list.innerHTML = filtered.map(customer => `
                <div class="customer-card glass">
                    <div class="invoice-item-header">
                        <div class="invoice-item-number">${customer.name}</div>
                        <div>
                            <button class="btn btn-secondary" onclick="editCustomer('${customer.id}')">Edit</button>
                            <button class="btn btn-secondary" onclick="deleteCustomer('${customer.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="invoice-item-meta">
                        <span>📞 ${customer.mobile || 'N/A'}</span>
                        <span>🚗 ${customer.vehicle || 'N/A'}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                        ${customer.address || 'No address'}
                    </div>
                </div>
            `).join('');
        }, 300));
    }
});