// Invoice Management

let currentInvoice = {
    items: [],
    customerId: null,
    vehicleId: null
};

async function loadInvoices() {
    const invoices = await db.getAll('invoices');
    const list = document.getElementById('invoices-list');

    if (invoices.length === 0) {
        list.innerHTML = '<p class="empty-state">No invoices found</p>';
        return;
    }

    list.innerHTML = invoices.sort((a, b) => new Date(b.date) - new Date(a.date)).map(invoice => `
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

async function loadRecentInvoices() {
    const invoices = await db.getAll('invoices');
    const recent = invoices.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const list = document.getElementById('recent-invoices-list');

    if (recent.length === 0) {
        list.innerHTML = '<p class="empty-state">No invoices yet</p>';
        return;
    }

    list.innerHTML = recent.map(invoice => `
        <div class="invoice-item glass" onclick="viewInvoice('${invoice.id}')">
            <div class="invoice-item-header">
                <div class="invoice-item-number">${invoice.invoiceNumber}</div>
                <div class="invoice-item-status status-${invoice.status}">
                    ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </div>
            </div>
            <div class="invoice-item-meta">
                <span>${invoice.customerName}</span>
                <span>${formatCurrency(invoice.total)}</span>
            </div>
        </div>
    `).join('');
}

function openInvoiceCreate() {
    currentInvoice = {
        items: [],
        customerId: null,
        vehicleId: null
    };
    document.getElementById('invoice-form').reset();
    switchScreen('create-invoice');
    loadCustomers();
    renderInvoiceItems();
}

function openAddInvoiceItem() {
    document.getElementById('item-form').reset();
    loadItemsByType();
    openModal('item-modal');
}

function saveInvoiceItem(e) {
    e.preventDefault();

    const itemData = JSON.parse(document.getElementById('item-name').value);
    const qty = parseFloat(document.getElementById('item-qty').value);
    const unitPrice = parseFloat(document.getElementById('item-price').value);

    const item = {
        id: generateId(),
        ...itemData,
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: qty * unitPrice
    };

    currentInvoice.items.push(item);
    renderInvoiceItems();
    updateInvoiceTotals();
    closeModal('item-modal');
    showToast('Item added', 'success');
}

function renderInvoiceItems() {
    const list = document.getElementById('invoice-items-list');

    if (currentInvoice.items.length === 0) {
        list.innerHTML = `
            <div class="table-header">
                <div class="col-name">Item Name</div>
                <div class="col-qty">Qty</div>
                <div class="col-price">Price</div>
                <div class="col-total">Total</div>
                <div class="col-action">Action</div>
            </div>
            <p class="empty-state">No items added</p>
        `;
        return;
    }

    let html = `
        <div class="table-header">
            <div class="col-name">Item Name</div>
            <div class="col-qty">Qty</div>
            <div class="col-price">Price</div>
            <div class="col-total">Total</div>
            <div class="col-action">Action</div>
        </div>
    `;

    currentInvoice.items.forEach(item => {
        html += `
            <div class="table-row">
                <div class="col-name">${item.name}</div>
                <div class="col-qty">${item.quantity}</div>
                <div class="col-price">${formatCurrency(item.unitPrice)}</div>
                <div class="col-total">${formatCurrency(item.totalPrice)}</div>
                <div class="col-action">
                    <button class="btn btn-secondary" onclick="removeInvoiceItem('${item.id}')">Remove</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

function removeInvoiceItem(itemId) {
    currentInvoice.items = currentInvoice.items.filter(item => item.id !== itemId);
    renderInvoiceItems();
    updateInvoiceTotals();
    showToast('Item removed', 'success');
}

function updateInvoiceTotals() {
    const totals = calculateInvoiceTotals(currentInvoice.items);
    document.getElementById('invoice-subtotal').textContent = formatCurrency(totals.subtotal);
    document.getElementById('invoice-tax').textContent = formatCurrency(totals.tax);
    document.getElementById('invoice-total').textContent = formatCurrency(totals.total);
    document.getElementById('invoice-total-value').value = totals.total;
}

async function saveDraftInvoice() {
    if (!document.getElementById('invoice-customer').value) {
        showToast('Please select a customer', 'error');
        return;
    }

    if (currentInvoice.items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }

    const customer = await db.get('customers', document.getElementById('invoice-customer').value);
    const totals = calculateInvoiceTotals(currentInvoice.items);

    const invoice = {
        id: generateId(),
        invoiceNumber: 'INV-' + new Date().getTime().toString().slice(-6),
        customerId: customer.id,
        customerName: customer.name,
        vehicleId: document.getElementById('invoice-vehicle').value,
        date: new Date().toISOString(),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paidAmount: 0,
        dueAmount: totals.total,
        status: 'draft',
        notes: ''
    };

    await db.add('invoices', invoice);

    for (const item of currentInvoice.items) {
        await db.add('invoice_items', {
            id: generateId(),
            invoiceId: invoice.id,
            ...item
        });
    }

    showToast('Invoice saved as draft', 'success');
    switchScreen('invoices');
    loadInvoices();
}

async function finalizeInvoice() {
    if (!document.getElementById('invoice-customer').value) {
        showToast('Please select a customer', 'error');
        return;
    }

    if (currentInvoice.items.length === 0) {
        showToast('Please add at least one item', 'error');
        return;
    }

    const customer = await db.get('customers', document.getElementById('invoice-customer').value);
    const totals = calculateInvoiceTotals(currentInvoice.items);

    const invoice = {
        id: generateId(),
        invoiceNumber: 'INV-' + new Date().getTime().toString().slice(-6),
        customerId: customer.id,
        customerName: customer.name,
        vehicleId: document.getElementById('invoice-vehicle').value,
        date: new Date().toISOString(),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        paidAmount: 0,
        dueAmount: totals.total,
        status: 'completed',
        notes: ''
    };

    await db.add('invoices', invoice);

    for (const item of currentInvoice.items) {
        await db.add('invoice_items', {
            id: generateId(),
            invoiceId: invoice.id,
            ...item
        });
    }

    // Reduce stock for products
    for (const item of currentInvoice.items) {
        if (item.type === 'product') {
            const product = await db.get('products', item.id);
            if (product) {
                product.stock -= item.quantity;
                await db.put('products', product);
            }
        }
    }

    currentInvoiceData = invoice;
    showPreviewInvoice();
    loadInvoices();
}

let currentInvoiceData = null;

function showPreviewInvoice() {
    switchScreen('invoice-preview');
    generateInvoicePreview();
}

async function generateInvoicePreview() {
    if (!currentInvoiceData) return;

    const items = await db.query('invoice_items', 'invoiceId', currentInvoiceData.id);

    let itemsHtml = items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.totalPrice)}</td>
        </tr>
    `).join('');

    const preview = `
        <div class="invoice-header">
            <div class="invoice-title">TAX INVOICE</div>
            <div class="business-info">
                <strong>TANVEER AUTO ELECTRICIAN & CAR AC SPECIALIST</strong><br>
                Car Scanning & Diagnostic Services<br>
                Malegaon Road, Near Burhani Ice Factory<br>
                Dhule, Maharashtra 424001<br>
                <br>
                📞 7755937788 | 📧 tks33178@gmail.com<br>
            </div>
        </div>

        <div class="invoice-body">
            <div class="invoice-section">
                <div class="invoice-section-title">Invoice Details</div>
                <div class="invoice-section-content">
                    <strong>Invoice #:</strong> ${currentInvoiceData.invoiceNumber}<br>
                    <strong>Date:</strong> ${formatDate(currentInvoiceData.date)}<br>
                </div>
            </div>

            <div class="invoice-section">
                <div class="invoice-section-title">Customer Details</div>
                <div class="invoice-section-content">
                    <strong>${currentInvoiceData.customerName}</strong><br>
                </div>
            </div>

            <div style="margin-top: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f3f4f6; border: 1px solid #e5e7eb;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Item</th>
                            <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Qty</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Price</th>
                            <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 20px; text-align: right;">
                <table style="margin-left: auto; width: 300px;">
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Subtotal:</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatCurrency(currentInvoiceData.subtotal)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Tax (18%):</strong></td>
                        <td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">${formatCurrency(currentInvoiceData.tax)}</td>
                    </tr>
                    <tr style="background: #f3f4f6;">
                        <td style="padding: 12px; font-weight: bold; font-size: 16px;"><strong>TOTAL:</strong></td>
                        <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px;">${formatCurrency(currentInvoiceData.total)}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <p><strong>Amount in Words:</strong> ${numberToWords(Math.floor(currentInvoiceData.total))}</p>
            </div>
        </div>

        <div class="invoice-footer">
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <strong>Developed by:</strong><br>
            PRINCE INFOTECH DHULE<br>
            Pathan Fardeen Khan Shakil Khan<br>
            📞 +91 8788273897<br>
            📧 princeit.dh@gmail.com<br>
            <br>
            <strong>Design Partner:</strong> FM GRAPHICS (@fmgr.aphics)
        </div>
    `;

    document.getElementById('invoice-preview').innerHTML = preview;
}

async function generateInvoicePDF() {
    if (!currentInvoiceData) return;

    const element = document.getElementById('invoice-preview');
    const canvas = await html2canvas(element);
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF.jsPDF();
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${currentInvoiceData.invoiceNumber}.pdf`);
    
    showToast('PDF downloaded', 'success');
}

function openPaymentEntry() {
    document.getElementById('payment-total').value = formatCurrency(currentInvoiceData.total - currentInvoiceData.paidAmount);
    document.getElementById('payment-form').onsubmit = recordPayment;
    openModal('payment-modal');
}

async function recordPayment(e) {
    e.preventDefault();

    const payment = {
        id: generateId(),
        invoiceId: currentInvoiceData.id,
        amount: parseFloat(document.getElementById('payment-amount').value),
        method: document.getElementById('payment-method').value,
        notes: document.getElementById('payment-notes').value,
        date: new Date().toISOString()
    };

    await db.add('payments', payment);

    currentInvoiceData.paidAmount += payment.amount;
    currentInvoiceData.dueAmount = currentInvoiceData.total - currentInvoiceData.paidAmount;
    currentInvoiceData.status = currentInvoiceData.dueAmount <= 0 ? 'paid' : 'pending';

    await db.put('invoices', currentInvoiceData);

    showToast('Payment recorded', 'success');
    closeModal('payment-modal');
    generateInvoicePreview();
}

async function viewInvoice(invoiceId) {
    currentInvoiceData = await db.get('invoices', invoiceId);
    showPreviewInvoice();
}

// Connect form submissions
document.addEventListener('DOMContentLoaded', () => {
    const itemForm = document.getElementById('item-form');
    if (itemForm) {
        itemForm.onsubmit = saveInvoiceItem;
    }

    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.onsubmit = saveCustomer;
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.onsubmit = saveProduct;
    }
});