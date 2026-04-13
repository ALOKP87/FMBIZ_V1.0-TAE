// Reports & Analytics

async function loadDashboard() {
    const invoices = await db.getAll('invoices');
    const products = await db.getAll('products');
    const payments = await db.getAll('payments');

    // Calculate metrics
    const today = new Date().toDateString();
    const todayInvoices = invoices.filter(i => new Date(i.date).toDateString() === today);
    const todaySales = todayInvoices.reduce((sum, i) => sum + i.total, 0);
    
    const totalRevenue = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
    const pendingAmount = invoices.reduce((sum, i) => sum + i.dueAmount, 0);
    const lowStockItems = products.filter(p => p.stock < p.minStock).length;

    document.getElementById('today-sales').textContent = formatCurrency(todaySales);
    document.getElementById('total-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('pending-amount').textContent = formatCurrency(pendingAmount);
    document.getElementById('low-stock').textContent = lowStockItems;

    // Load charts
    loadRevenueChart(invoices);
    loadSalesChart(invoices);
    loadRecentInvoices();
}

function loadRevenueChart(invoices) {
    const ctx = document.getElementById('revenue-chart')?.getContext('2d');
    if (!ctx) return;

    // Group by date (last 7 days)
    const dates = {};
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates[date.toDateString()] = 0;
    }

    invoices.forEach(invoice => {
        const dateStr = new Date(invoice.date).toDateString();
        if (dateStr in dates) {
            dates[dateStr] += invoice.total;
        }
    });

    const labels = Object.keys(dates).map(d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
    const data = Object.values(dates);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue',
                data: data,
                borderColor: '#2563EB',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2563EB',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

function loadSalesChart(invoices) {
    const ctx = document.getElementById('sales-chart')?.getContext('2d');
    if (!ctx) return;

    // Count by status
    const statuses = { completed: 0, draft: 0, paid: 0 };
    invoices.forEach(i => {
        if (i.status in statuses) {
            statuses[i.status]++;
        }
    });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Draft', 'Paid'],
            datasets: [{
                data: [statuses.completed, statuses.draft, statuses.paid],
                backgroundColor: [
                    '#2563EB',
                    '#F59E0B',
                    '#10B981'
                ],
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}