// Utility Functions

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toFixed(2);
}

// Format date
function formatDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Format date time
function formatDateTime(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Convert number to words
function numberToWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convert(n) {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
        if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
        if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
        if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
        return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    }

    const parts = num.toString().split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parts[1] ? parseInt(parts[1]) : 0;

    let result = convert(integerPart) + ' Rupees';
    if (decimalPart > 0) {
        result += ' and ' + convert(decimalPart) + ' Paise';
    }
    return result;
}

// Local Storage
const storage = {
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    get(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    },
    remove(key) {
        localStorage.removeItem(key);
    },
    clear() {
        localStorage.clear();
    }
};

// Calculate invoice totals
function calculateInvoiceTotals(items) {
    let subtotal = 0;
    items.forEach(item => {
        subtotal += (item.quantity * item.unitPrice);
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    return { subtotal, tax, total };
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Hash password (simple)
function hashPassword(pwd) {
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
        const char = pwd.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}