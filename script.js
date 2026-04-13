// script.js

// Initialize 13 months of empty data
const payrollData = Array.from({ length: 13 }, (_, i) => ({
    name: i === 12 ? "13th Month" : `Month ${i + 1}`,
    values: {
        basic: 0, housing: 0, transport: 0, other_allowance: 0,
        infra_stipend: 0, complexity_boost: 0, compliance_inc: 0,
        night_allw: 0, proj_prem: 0, perf_bonus: 0, overtime: 0, misc: 0,
        er_pension: 0, itf: 0, nsitf: 0
    }
}));

let activeIdx = 0;

function init() {
    const select = document.getElementById('monthSelect');
    payrollData.forEach((m, i) => {
        select.innerHTML += `<option value="${i}">${m.name}</option>`;
    });

    // Listen for any input change to update UI
    document.querySelectorAll('input').forEach(el => {
        el.addEventListener('input', updateCalcs);
    });
    
    updateCalcs();
}

function switchMonth() {
    activeIdx = document.getElementById('monthSelect').value;
    const current = payrollData[activeIdx].values;
    document.querySelectorAll('input').forEach(el => {
        el.value = current[el.dataset.key] || 0;
    });
    updateCalcs();
}

function updateCalcs() {
    const v = {};
    document.querySelectorAll('input').forEach(el => {
        v[el.dataset.key] = parseFloat(el.value) || 0;
    });

    // 1. Gross Calculation
    const gross = v.basic + v.housing + v.transport + v.other_allowance + 
                  v.infra_stipend + v.complexity_boost + v.compliance_inc +
                  v.night_allw + v.proj_prem + v.perf_bonus + v.overtime + v.misc;

    // 2. Statutory Deductions
    const pensionEE = (v.basic + v.housing + v.transport) * 0.08;
    
    // 3. Tax (CRA + Graduated)
    const cra = Math.max(16666.67, 0.01 * gross) + (0.2 * gross);
    const taxable = Math.max(0, gross - pensionEE - cra);
    const tax = calculatePAYE(taxable);

    // Update UI
    document.getElementById('res-gross').textContent = "₦" + gross.toLocaleString();
    document.getElementById('res-pension').textContent = "₦" + pensionEE.toLocaleString();
    document.getElementById('res-cra').textContent = "₦" + cra.toLocaleString();
    document.getElementById('res-tax').textContent = "₦" + tax.toLocaleString();
    document.getElementById('res-net').textContent = "₦" + (gross - tax - pensionEE).toLocaleString();
}

function calculatePAYE(income) {
    let tax = 0;
    const brackets = [
        { l: 25000, r: 0.07 }, { l: 25000, r: 0.11 }, { l: 41666, r: 0.15 },
        { l: 41666, r: 0.19 }, { l: 133333, r: 0.21 }, { l: Infinity, r: 0.24 }
    ];
    let rem = income;
    for (let b of brackets) {
        let chunk = Math.min(rem, b.l);
        tax += chunk * b.r;
        rem -= chunk;
        if (rem <= 0) break;
    }
    return tax;
}

function saveData() {
    const currentValues = {};
    document.querySelectorAll('input').forEach(el => {
        currentValues[el.dataset.key] = parseFloat(el.value) || 0;
    });
    payrollData[activeIdx].values = currentValues;
    renderSummary();
}

function renderSummary() {
    const body = document.getElementById('summaryBody');
    const foot = document.getElementById('summaryFoot');
    body.innerHTML = "";
    
    const totals = { gross: 0, tax: 0, net: 0 };
    const keys = Object.keys(payrollData[0].values);
    const columnTotals = {};
    keys.forEach(k => columnTotals[k] = 0);

    payrollData.forEach(m => {
        const v = m.values;
        // Check if month has data
        const rowGross = keys.filter(k => !['er_pension', 'itf', 'nsitf'].includes(k))
                             .reduce((sum, k) => sum + (v[k] || 0), 0);
        if (rowGross === 0 && v.er_pension === 0) return;

        const pen = ((v.basic || 0) + (v.housing || 0) + (v.transport || 0)) * 0.08;
        const cra = Math.max(16666.67, 0.01 * rowGross) + (0.2 * rowGross);
        const tax = calculatePAYE(Math.max(0, rowGross - pen - cra));
        const net = rowGross - tax - pen;

        let row = `<tr><td>${m.name}</td>`;
        keys.forEach(k => {
            row += `<td>${(v[k] || 0).toLocaleString()}</td>`;
            columnTotals[k] += (v[k] || 0);
        });
        row += `<td class="h-total">${rowGross.toLocaleString()}</td>
                <td class="h-total">${tax.toLocaleString()}</td>
                <td class="h-total">${net.toLocaleString()}</td></tr>`;
        body.innerHTML += row;

        totals.gross += rowGross; totals.tax += tax; totals.net += net;
    });

    // Footer
    let fRow = `<tr><td>ANNUAL</td>`;
    keys.forEach(k => fRow += `<td>${columnTotals[k].toLocaleString()}</td>`);
    fRow += `<td>${totals.gross.toLocaleString()}</td>
             <td>${totals.tax.toLocaleString()}</td>
             <td>${totals.net.toLocaleString()}</td></tr>`;
    foot.innerHTML = fRow;
}

init();