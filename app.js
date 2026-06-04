/* ==========================================================================
   STELLAR PORTFOLIO TRACKER - DYNAMIC CONTROLLER (app.js - INR Version)
   ========================================================================== */

// 1. Initial Hardcoded Prices Dictionary (INR, ₹)
let STOCK_PRICES = {
    "RELIANCE": 2900.00,
    "TCS": 3850.00,
    "INFY": 1450.00,
    "HDFCBANK": 1520.00,
    "ICICIBANK": 1120.00,
    "BHARTIARTL": 1380.00,
    "SBIN": 830.00,
    "LT": 3550.00,
    "ITC": 430.00,
    "TATAMOTORS": 960.00
};

// 2. Pre-seeded User Holdings (symbol -> quantity)
let holdings = {
    "TCS": 15,
    "RELIANCE": 10,
    "INFY": 25,
    "SBIN": 50
};

// Colors palette list for visual allocation slices
const PIE_COLORS = [
    "hsl(195, 100%, 48%)", // Cyan
    "hsl(270, 95%, 68%)",  // Purple
    "hsl(145, 80%, 45%)",  // Green
    "hsl(38, 92%, 50%)",   // Yellow / Orange
    "hsl(355, 85%, 60%)",  // Red / Rose
    "hsl(170, 90%, 40%)",  // Teal
    "hsl(220, 95%, 65%)",  // Blue
    "hsl(315, 90%, 60%)",  // Pink
    "hsl(85, 75%, 45%)",   // Lime
    "hsl(25, 90%, 55%)"    // Copper
];

// DOM Selectors
const selectStock = document.getElementById("select-stock");
const inputQty = document.getElementById("input-qty");
const formHolding = document.getElementById("form-holding");
const portfolioList = document.getElementById("portfolio-list");
const emptyState = document.getElementById("empty-state");

const valTotalPortfolio = document.getElementById("val-total-portfolio");
const valTotalAssets = document.getElementById("val-total-assets");
const valTopAsset = document.getElementById("val-top-asset");
const valTopAssetPct = document.getElementById("val-top-asset-pct");

const btnManagePrices = document.getElementById("btn-manage-prices");
const modalPrices = document.getElementById("modal-prices");
const btnCloseModal = document.getElementById("btn-close-modal");
const formDictPrice = document.getElementById("form-dict-price");
const dictTickerInput = document.getElementById("dict-ticker");
const dictPriceInput = document.getElementById("dict-price");
const dictPricesList = document.getElementById("dict-prices-list");

const btnExportCsv = document.getElementById("btn-export-csv");
const btnExportTxt = document.getElementById("btn-export-txt");

const donutChart = document.getElementById("donut-chart");
const chartCenterVal = document.getElementById("chart-center-val");
const legendContainer = document.getElementById("chart-legend-container");
const toast = document.getElementById("toast");

/* ==========================================================================
   Core Calculations & Render Engines
   ========================================================================== */

/**
 * Format helper for INR currency representation using Indian numbering system
 * Produces ₹1,50,000.00 instead of $150,000.00
 */
function formatCurrency(val) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
}

/**
 * Re-populate dropdown select elements with supported tickers from state dictionary
 */
function updateSelectDropdown() {
    const selectedVal = selectStock.value;
    selectStock.innerHTML = '<option value="" disabled selected>Choose a stock...</option>';
    
    // Sort keys alphabetically
    Object.keys(STOCK_PRICES).sort().forEach(ticker => {
        const option = document.createElement("option");
        option.value = ticker;
        option.textContent = `${ticker} (${formatCurrency(STOCK_PRICES[ticker])})`;
        selectStock.appendChild(option);
    });

    if (selectedVal && STOCK_PRICES[selectedVal]) {
        selectStock.value = selectedVal;
    }
}

/**
 * Recalculate portfolio metrics and render UI sections (table, donut chart, stats)
 */
function renderPortfolio() {
    let items = [];
    let totalValue = 0.0;

    // 1. Basic Arithmetic: value = quantity * price
    for (let ticker in holdings) {
        const qty = holdings[ticker];
        if (qty > 0) {
            const price = STOCK_PRICES[ticker] || 0.0;
            const value = qty * price;
            totalValue += value;
            items.push({ ticker, qty, price, value });
        }
    }

    // 2. Calculate allocation percentages
    items.forEach(item => {
        item.allocation = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
    });

    // Sort items by total value descending
    items.sort((a, b) => b.value - a.value);

    // 3. Render Top Metrics
    valTotalPortfolio.textContent = formatCurrency(totalValue);
    chartCenterVal.textContent = formatCurrency(totalValue);
    valTotalAssets.textContent = items.length.toString();

    if (items.length > 0) {
        valTopAsset.textContent = items[0].ticker;
        valTopAssetPct.textContent = `${items[0].allocation.toFixed(1)}% of portfolio`;
        emptyState.style.display = "none";
        portfolioList.parentElement.style.display = "table";
    } else {
        valTopAsset.textContent = "—";
        valTopAssetPct.textContent = "0% of total allocation";
        emptyState.style.display = "flex";
        portfolioList.parentElement.style.display = "none";
    }

    // 4. Render Table Rows
    portfolioList.innerHTML = "";
    items.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="font-weight: 700; color: var(--primary);">${item.ticker}</td>
            <td>${parseFloat(item.qty.toFixed(4))}</td>
            <td class="num-col">${formatCurrency(item.price)}</td>
            <td class="num-col val-col">${formatCurrency(item.value)}</td>
            <td class="num-col" style="font-weight: 600;">${item.allocation.toFixed(1)}%</td>
            <td class="action-col">
                <button class="btn-delete" onclick="removeHolding('${item.ticker}')" title="Remove holding">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        portfolioList.appendChild(row);
    });

    // 5. Draw Donut Chart SVG and Legends
    renderDonutChart(items, totalValue);
}

/**
 * Draws the SVG donut segments and details legend list
 */
function renderDonutChart(items, totalValue) {
    // Clear dynamic segments (keep only the background track circle)
    const backgroundCircle = donutChart.querySelector("circle");
    donutChart.innerHTML = "";
    donutChart.appendChild(backgroundCircle);
    legendContainer.innerHTML = "";

    if (items.length === 0 || totalValue === 0) {
        // Render simple empty visual indicator
        legendContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No holdings to visualize.</p>';
        return;
    }

    const radius = 40;
    const circumference = 2 * Math.PI * radius; // Approx 251.327
    let cumulativePercent = 0;

    items.forEach((item, index) => {
        const color = PIE_COLORS[index % PIE_COLORS.length];
        
        // 1. Create SVG circle segment
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const dashArray = `${(item.allocation / 100) * circumference} ${circumference}`;
        const dashOffset = -((cumulativePercent / 100) * circumference);

        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", "50");
        circle.setAttribute("r", radius.toString());
        circle.setAttribute("fill", "transparent");
        circle.setAttribute("stroke", color);
        circle.setAttribute("stroke-width", "8");
        circle.setAttribute("stroke-dasharray", dashArray);
        circle.setAttribute("stroke-dashoffset", dashOffset.toString());
        circle.style.transition = "stroke-dashoffset 0.8s ease-in-out";

        donutChart.appendChild(circle);
        cumulativePercent += item.allocation;

        // 2. Create Legend Item
        const legendItem = document.createElement("div");
        legendItem.className = "chart-legend-item";
        legendItem.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background-color: ${color};"></span>
                <span class="legend-name">${item.ticker}</span>
            </div>
            <span class="legend-pct">${item.allocation.toFixed(1)}%</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}

/**
 * Render editable listing inside the Market Prices modal
 */
function renderPricesDictionary() {
    dictPricesList.innerHTML = "";
    
    // Sort keys alphabetically
    Object.keys(STOCK_PRICES).sort().forEach(ticker => {
        const li = document.createElement("li");
        li.className = "dict-price-item";
        li.innerHTML = `
            <span class="dict-item-symbol">${ticker}</span>
            <span class="dict-item-price">${formatCurrency(STOCK_PRICES[ticker])}</span>
        `;
        dictPricesList.appendChild(li);
    });
}

/* ==========================================================================
   Interaction Handlers & Events
   ========================================================================== */

/**
 * Exposes remove functionality for item action buttons
 */
window.removeHolding = function(ticker) {
    if (holdings[ticker]) {
        delete holdings[ticker];
        showToast(`Removed ${ticker} holdings`);
        renderPortfolio();
    }
};

/**
 * Toast feedback banner trigger
 */
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("active");
    setTimeout(() => {
        toast.classList.remove("active");
    }, 2500);
}

// 1. Handle Executing Transactions (Buy / Sell)
formHolding.addEventListener("submit", function(e) {
    e.preventDefault();
    const ticker = selectStock.value;
    const qty = parseFloat(inputQty.value);
    const action = document.getElementById("select-action").value;

    if (!ticker) {
        showToast("Please choose a valid stock ticker.");
        return;
    }

    if (isNaN(qty) || qty <= 0) {
        showToast("Quantity must be a positive number.");
        return;
    }

    if (action === "buy") {
        holdings[ticker] = (holdings[ticker] || 0) + qty;
        showToast(`Successfully bought ${parseFloat(qty.toFixed(4))} shares of ${ticker}!`);
    } else if (action === "sell") {
        const owned = holdings[ticker] || 0;
        if (owned <= 0) {
            showToast(`You do not own any shares of ${ticker}.`);
            return;
        }
        if (qty > owned) {
            showToast(`Insufficient shares! You only own ${parseFloat(owned.toFixed(4))} shares.`);
            return;
        }
        
        holdings[ticker] = owned - qty;
        
        // Wipe key from holdings if quantity is zeroed out
        if (holdings[ticker] <= 0.0001) {
            delete holdings[ticker];
            showToast(`Sold all shares of ${ticker}!`);
        } else {
            showToast(`Successfully sold ${parseFloat(qty.toFixed(4))} shares of ${ticker}!`);
        }
    }

    inputQty.value = "";
    renderPortfolio();
});

// 2. Dictionary Modal management
btnManagePrices.addEventListener("click", () => {
    renderPricesDictionary();
    modalPrices.classList.add("active");
});

btnCloseModal.addEventListener("click", () => {
    modalPrices.classList.remove("active");
});

modalPrices.addEventListener("click", (e) => {
    if (e.target === modalPrices) {
        modalPrices.classList.remove("active");
    }
});

// 3. Dictionary Price Save
formDictPrice.addEventListener("submit", function(e) {
    e.preventDefault();
    const ticker = dictTickerInput.value.trim().toUpperCase();
    const price = parseFloat(dictPriceInput.value);

    if (!ticker) return;
    if (isNaN(price) || price <= 0) {
        showToast("Price must be a valid positive number.");
        return;
    }

    // Add or update dictionary
    STOCK_PRICES[ticker] = price;
    
    // Refresh DOM targets
    updateSelectDropdown();
    renderPricesDictionary();
    renderPortfolio();
    
    showToast(`Saved ${ticker} price: ${formatCurrency(price)}`);
    
    // Clear inputs
    dictTickerInput.value = "";
    dictPriceInput.value = "";
});

// 4. Exporter Engines (CSV & TXT)
btnExportCsv.addEventListener("click", () => {
    let csv = "Ticker,Quantity,Market Price (INR),Current Value (INR),Allocation (%)\n";
    let items = [];
    let totalValue = 0.0;

    for (let ticker in holdings) {
        const qty = holdings[ticker];
        if (qty > 0) {
            const price = STOCK_PRICES[ticker] || 0.0;
            const value = qty * price;
            totalValue += value;
            items.push({ ticker, qty, price, value });
        }
    }

    items.forEach(item => {
        const alloc = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
        csv += `${item.ticker},${item.qty.toFixed(4)},${item.price.toFixed(2)},${item.value.toFixed(2)},${alloc.toFixed(2)}\n`;
    });

    csv += `\nTOTAL,,,${totalValue.toFixed(2)},100.00\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "stellar_portfolio_inr.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded portfolio CSV successfully!");
});

btnExportTxt.addEventListener("click", () => {
    let txt = "========================================================================\n";
    txt    += "               STELLAR PORTFOLIO INVESTMENT REPORT (INR)                \n";
    txt    += "========================================================================\n\n";
    txt    += `Date generated: ${new Date().toLocaleString()}\n\n`;

    txt    += `${"Ticker".padEnd(12)} | ${"Quantity".padEnd(12)} | ${"Market Price (₹)".padEnd(18)} | ${"Current Value (₹)".padEnd(18)} | ${"Allocation".padEnd(10)}\n`;
    txt    += "-".repeat(80) + "\n";

    let items = [];
    let totalValue = 0.0;

    for (let ticker in holdings) {
        const qty = holdings[ticker];
        if (qty > 0) {
            const price = STOCK_PRICES[ticker] || 0.0;
            const value = qty * price;
            totalValue += value;
            items.push({ ticker, qty, price, value });
        }
    }

    items.sort((a, b) => b.value - a.value).forEach(item => {
        const alloc = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
        txt += `${item.ticker.padEnd(12)} | ` +
               `${parseFloat(item.qty.toFixed(4)).toString().padEnd(12)} | ` +
               `${formatCurrency(item.price).padStart(18)} | ` +
               `${formatCurrency(item.value).padStart(18)} | ` +
               `${alloc.toFixed(1).padStart(8)}%\n`;
    });

    txt    += "-".repeat(80) + "\n";
    txt    += `${"TOTAL PORTFOLIO VALUE:".padEnd(45)} ${formatCurrency(totalValue).padStart(22)} | 100.0%\n`;
    txt    += "========================================================================\n";

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "stellar_portfolio_inr.txt");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded portfolio TXT report!");
});

/* ==========================================================================
   Initialization Sequence
   ========================================================================== */
function init() {
    updateSelectDropdown();
    renderPortfolio();
}

// Kick off
init();
