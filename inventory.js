// Inventory Management

async function loadInventory() {
    const products = await db.getAll('products');
    const list = document.getElementById('inventory-list');

    if (products.length === 0) {
        list.innerHTML = '<p class="empty-state">No products found</p>';
        return;
    }

    list.innerHTML = products.map(product => `
        <div class="product-card glass">
            <div class="invoice-item-header">
                <div>
                    <div class="invoice-item-number">${product.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        ${product.category} • ₹${product.salePrice.toFixed(2)}
                    </div>
                </div>
                <div class="invoice-item-status ${product.stock < product.minStock ? 'status-draft' : 'status-completed'}">
                    Stock: ${product.stock}
                </div>
            </div>
            <div class="invoice-item-meta" style="margin-top: 12px;">
                <button class="btn btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
                <button class="btn btn-secondary" onclick="deleteProduct('${product.id}')">Delete</button>
            </div>
        </div>
    `).join('');

    updateProductSelectors();
}

function openAddProduct() {
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-form').onsubmit = saveProduct;
    openModal('product-modal');
}

function editProduct(id) {
    showToast('Edit functionality coming soon', 'info');
}

async function deleteProduct(id) {
    if (confirm('Are you sure?')) {
        await db.delete('products', id);
        showToast('Product deleted', 'success');
        loadInventory();
    }
}

function saveProduct(e) {
    e.preventDefault();
    
    const product = {
        id: generateId(),
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category-modal').value,
        stock: parseInt(document.getElementById('product-stock').value) || 0,
        purchasePrice: parseFloat(document.getElementById('product-purchase-price').value) || 0,
        salePrice: parseFloat(document.getElementById('product-sale-price').value),
        minStock: parseInt(document.getElementById('product-min-stock').value) || 5,
        createdAt: new Date().toISOString()
    };

    db.add('products', product);
    showToast('Product added successfully', 'success');
    closeModal('product-modal');
    loadInventory();
}

async function updateProductSelectors() {
    const products = await db.getAll('products');
    const selector = document.getElementById('item-name');
    
    if (!selector) return;

    const currentValue = selector.value;
    selector.innerHTML = '<option value="">Select Item</option>';
    
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
            id: product.id,
            name: product.name,
            price: product.salePrice,
            type: 'product'
        });
        option.textContent = `${product.name} (₹${product.salePrice.toFixed(2)})`;
        selector.appendChild(option);
    });
    
    selector.value = currentValue;
}

async function loadItemsByType() {
    const type = document.getElementById('item-type').value;
    const itemSelector = document.getElementById('item-name');

    if (type === 'product') {
        const products = await db.getAll('products');
        itemSelector.innerHTML = '<option value="">Select Product</option>';
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                id: product.id,
                name: product.name,
                price: product.salePrice,
                type: 'product'
            });
            option.textContent = `${product.name} (₹${product.salePrice.toFixed(2)})`;
            itemSelector.appendChild(option);
        });
    } else if (type === 'service') {
        const services = await db.getAll('services');
        itemSelector.innerHTML = '<option value="">Select Service</option>';
        
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                id: service.id,
                name: service.serviceName,
                price: service.price,
                type: 'service'
            });
            option.textContent = `${service.serviceName} (₹${service.price.toFixed(2)})`;
            itemSelector.appendChild(option);
        });
    }
}

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.toLowerCase();
            const products = await db.getAll('products');
            const filtered = products.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            );

            const list = document.getElementById('inventory-list');
            if (filtered.length === 0) {
                list.innerHTML = '<p class="empty-state">No products found</p>';
                return;
            }

            list.innerHTML = filtered.map(product => `
                <div class="product-card glass">
                    <div class="invoice-item-header">
                        <div>
                            <div class="invoice-item-number">${product.name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                ${product.category} • ₹${product.salePrice.toFixed(2)}
                            </div>
                        </div>
                        <div class="invoice-item-status ${product.stock < product.minStock ? 'status-draft' : 'status-completed'}">
                            Stock: ${product.stock}
                        </div>
                    </div>
                    <div class="invoice-item-meta" style="margin-top: 12px;">
                        <button class="btn btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
                        <button class="btn btn-secondary" onclick="deleteProduct('${product.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }, 300));
    }
});