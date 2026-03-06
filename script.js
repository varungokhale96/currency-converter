const API_URL = "https://open.er-api.com/v6/latest/USD"; // Free open API
let exchangeRates = {};
let availableCurrencies = [];

// App State
let baseAmountInUSD = 1.0; 
let activeRows = [];

// DOM Elements
const listContainer = document.getElementById("currencies-list");
const addBtn = document.getElementById("add-currency-btn");
const lastUpdatedEl = document.getElementById("last-updated");
const template = document.getElementById("currency-row-template");

// Initial active currencies layout
const initialCurrencies = ["USD", "EUR", "GBP", "JPY"];

async function init() {
    await fetchRates();
    setupInitialRows();
    addBtn.addEventListener("click", () => addCurrencyRow());
}

async function fetchRates() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (data && data.rates) {
            exchangeRates = data.rates;
            availableCurrencies = Object.keys(data.rates).sort();
            
            const date = new Date(data.time_last_update_unix * 1000);
            lastUpdatedEl.textContent = `Rates updated: ${date.toLocaleString()}`;
        }
    } catch (error) {
        console.error("Error fetching rates:", error);
        lastUpdatedEl.textContent = "Error fetching rates. Please try again.";
        // Fallback dummy rates if offline
        exchangeRates = { USD: 1, EUR: 0.9, GBP: 0.75, JPY: 110, CAD: 1.25, AUD: 1.3 };
        availableCurrencies = Object.keys(exchangeRates);
    }
}

function setupInitialRows() {
    initialCurrencies.forEach(currency => {
        if (exchangeRates[currency]) {
            addCurrencyRow(currency);
        }
    });
    // Set an initial base amount so fields aren't completely empty
    baseAmountInUSD = 1; 
    updateAllRows(null);
}

function addCurrencyRow(currency = null) {
    if (!currency) {
        // Pick the first available currency that isn't already active
        const activeCurrencyCodes = activeRows.map(row => row.select.value);
        currency = availableCurrencies.find(c => !activeCurrencyCodes.includes(c)) || "USD";
    }

    const rowFragment = template.content.cloneNode(true);
    const rowEl = rowFragment.querySelector(".currency-row");
    const selectEl = rowFragment.querySelector(".currency-select");
    const inputEl = rowFragment.querySelector(".currency-input");
    const flagEl = rowFragment.querySelector(".flag-icon");
    const removeBtn = rowFragment.querySelector(".remove-btn");

    // Populate select options
    availableCurrencies.forEach(c => {
        const option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        if (c === currency) option.selected = true;
        selectEl.appendChild(option);
    });

    // Update flag initially
    updateFlag(flagEl, currency);

    const rowState = { rowEl, selectEl, inputEl, flagEl };
    activeRows.push(rowState);

    // Event Listeners
    inputEl.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) {
            baseAmountInUSD = 0;
        } else {
            const rowCurrencyRate = exchangeRates[selectEl.value];
            baseAmountInUSD = val / rowCurrencyRate; // Convert to base USD amount
        }
        updateAllRows(rowState); // Update all except the one typing
    });

    selectEl.addEventListener("change", (e) => {
        const newCurrency = e.target.value;
        updateFlag(flagEl, newCurrency);
        // Ensure its own value reflects the new currency based on global baseAmountInUSD
        updateRowValue(rowState);
    });

    removeBtn.addEventListener("click", () => {
        if (activeRows.length > 2) { // Ensure at least 2 rows remain
            listContainer.removeChild(rowEl);
            activeRows = activeRows.filter(r => r !== rowState);
        } else {
            // Optional visual shake or warning if trying to delete last 2
            rowEl.style.transform = "translateX(5px)";
            setTimeout(() => rowEl.style.transform = "translateX(-5px)", 50);
            setTimeout(() => rowEl.style.transform = "translateX(0)", 100);
        }
    });

    listContainer.appendChild(rowFragment);
    // If it's a new row added randomly, set its value to match current baseAmount
    updateRowValue(rowState);
}

// Update the specific row's input to match baseAmountInUSD
function updateRowValue(rowState) {
    const rate = exchangeRates[rowState.select.value];
    if (baseAmountInUSD === 0) {
        rowState.inputEl.value = "";
    } else {
        const calcValue = baseAmountInUSD * rate;
        // Format to a clean number string. Avoid showing e notation or too many decimals.
        // Convert to 2-4 decimal places conditionally
        const formatted = calcValue % 1 === 0 ? calcValue : parseFloat(calcValue.toFixed(4));
        rowState.inputEl.value = formatted;
    }
}

// Update all rows except the one currently focused/triggering the update
function updateAllRows(excludeRowState) {
    activeRows.forEach(row => {
        if (row !== excludeRowState) {
            updateRowValue(row);
        }
    });
}

function updateFlag(flagEl, currencyCode) {
    // We can use a free flag api for the icons
    // Use first two letters of currency code for country code usually (approximate)
    const countryCode = currencyCode.substring(0, 2).toLowerCase();
    flagEl.style.backgroundImage = `url(https://flagcdn.com/w40/${countryCode}.png)`;
}

// Start app
init();
