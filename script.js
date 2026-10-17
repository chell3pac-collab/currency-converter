const API_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';

let fromCurrencySelect, toCurrencySelect, fromAmountInput, toAmountInput, swapBtn;
let fromCurrencyBtn, toCurrencyBtn;
let ratesDateSpan, ratesBody;

let ratesData = null;
let currentView = ''; // 'table' или 'cards' — отслеживаем текущий вид

function formatNumberWithSpaces(value) {
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly === '') return '';
  return new Intl.NumberFormat('ru-RU').format(digitsOnly);
}

function getPureNumber(value) {
  return parseFloat(value.replace(/\s/g, ''));
}

document.addEventListener('DOMContentLoaded', () => {
  fromCurrencySelect = document.getElementById('fromCurrency');
  toCurrencySelect = document.getElementById('toCurrency');
  fromAmountInput = document.getElementById('fromAmount');
  toAmountInput = document.getElementById('toAmount');
  swapBtn = document.getElementById('swapCurrencies');

  fromCurrencyBtn = document.querySelector('.converter__group_from .converter__btn');
  toCurrencyBtn = document.querySelector('.converter__group_to .converter__btn');

  ratesDateSpan = document.querySelector('#rates-title span');
  ratesBody = document.getElementById('rates-body');

  if (!fromCurrencySelect || !toCurrencySelect) {
    console.error('Не найдены элементы селектов!');
    return;
  }

  if (fromAmountInput) {
    fromAmountInput.addEventListener('input', (e) => {
      const rawValue = e.target.value;
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;

      e.target.value = formatNumberWithSpaces(rawValue);
      e.target.setSelectionRange(start, end);

      calculate();
    });
  }

  fromCurrencySelect.addEventListener('change', calculate);
  toCurrencySelect.addEventListener('change', calculate);

  if (swapBtn) {
    swapBtn.addEventListener('click', swapCurrencies);
  }

  if (fromCurrencyBtn) {
    fromCurrencyBtn.addEventListener('click', () => openDropdown(fromCurrencySelect));
  }
  if (toCurrencyBtn) {
    toCurrencyBtn.addEventListener('click', () => openDropdown(toCurrencySelect));
  }

  init();
});

// Дебаунс для resize — чтобы не дёргать функцию 100 раз за секунду
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    checkAndAdaptTable();
  }, 150);
});

function openDropdown(select) {
  if (typeof select.showPicker === 'function') {
    try {
      select.showPicker();
    } catch (e) {
      select.size = select.size === 1 ? select.options.length : 1;
      select.focus();
    }
  } else {
    select.size = select.size === 1 ? select.options.length : 1;
    if (select.size > 1) select.focus();
  }
}

async function init() {
  try {
    const response = await fetch(API_URL);
    ratesData = await response.json();
    populateCurrencies();
    buildRatesRows();       // Строим строки один раз
    checkAndAdaptTable();   // Проверяем вид при загрузке
    setDefaultValues();
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
  }
}

function populateCurrencies() {
  const rubOptionFrom = new Option('Российский рубль RUB', 'RUB');
  const rubOptionTo = new Option('Российский рубль RUB', 'RUB');
  fromCurrencySelect.add(rubOptionFrom);
  toCurrencySelect.add(rubOptionTo);

  const currencies = Object.values(ratesData.Valute);

  currencies.forEach(currency => {
    const optionFrom = new Option(`${currency.Name} ${currency.CharCode}`, currency.CharCode);
    fromCurrencySelect.add(optionFrom);

    const optionTo = new Option(`${currency.Name} ${currency.CharCode}`, currency.CharCode);
    toCurrencySelect.add(optionTo);
  });
}

// Строит строки таблицы (без вызова checkAndAdaptTable внутри!)
function buildRatesRows() {
  if (!ratesBody || !ratesDateSpan) return;

  const currencies = Object.values(ratesData.Valute);
  const date = new Date(ratesData.Date);
  ratesDateSpan.textContent = date.toLocaleDateString('ru-RU');

  ratesBody.innerHTML = '';

  currencies.forEach(currency => {
    const row = document.createElement('tr');
    row.setAttribute('data-char-code', currency.CharCode);
    row.setAttribute('data-unit', currency.Nominal);
    row.setAttribute('data-name', currency.Name);
    row.setAttribute('data-rate', currency.Value.toFixed(4));
    row.setAttribute('data-flag-src', getCurrencyFlagSrc(currency.CharCode));
    row.className = 'rates__row';

    const flagHtml = getCurrencyFlag(currency.CharCode);

    row.innerHTML = `
      <td class="rates__cell rates__cell_code">
        ${flagHtml}
        <span>${currency.CharCode}</span>
      </td>
      <td class="rates__cell rates__cell_unit">
        ${currency.Nominal}
      </td>
      <td class="rates__cell rates__cell_name">
        ${currency.Name}
      </td>
      <td class="rates__cell rates__cell_rate">
        ${currency.Value.toFixed(4)}
      </td>
    `;
    ratesBody.appendChild(row);
  });
}

function getCurrencyFlagSrc(charCode) {
  const noFlag = ['XDR'];
  if (noFlag.includes(charCode)) return '';
  const countryCode = charCode.slice(0, 2).toLowerCase();
  return `https://flagcdn.com/${countryCode}.svg`;
}

// Главная функция адаптации — НЕ вызывает buildRatesRows!
function checkAndAdaptTable() {
  if (!ratesData) return; // Данные ещё не загружены

  const isTablet = window.innerWidth <= 1024;

  // Перерисовываем ТОЛЬКО если вид изменился
  if (isTablet && currentView !== 'cards') {
    renderCardsView();
    currentView = 'cards';
  } else if (!isTablet && currentView !== 'table') {
    renderTableView();
    currentView = 'table';
  }
}

function renderCardsView() {
  const tbody = document.getElementById('rates-body');
  if (!tbody) return;

  // ВАЖНО: Не берем данные из .rates__row, берем из ratesData.Valute
  const currencies = Object.values(ratesData.Valute);
  
  let html = '';

  currencies.forEach((currency, index) => {
    // Здесь данные гарантированно есть, так как мы берем их из API ответа
    const code = currency.CharCode;
    const unit = currency.Nominal;
    const name = currency.Name;
    const rate = currency.Value.toFixed(4);
    const flagSrc = getCurrencyFlagSrc(code);

    html += `
      <tr class="rates__row-card" data-char-code="${code}" data-unit="${unit}" data-name="${name}" data-rate="${rate}" data-flag-src="${flagSrc}">
        <td colspan="4" class="rates__card-wrapper">
          <div class="rates__card">
            <div class="rates__card-row">
              <span class="rates__label">Код</span>
              <div class="rates__wrapper-flag">
                ${flagSrc ? `<img src="${flagSrc}" alt="${code}" class="currency-flag">` : '<span class="flag-fallback">💱</span>'}
                <span class="rates__value rates__value-first">${code}</span>
              </div>
            </div>
            <div class="rates__card-row">
              <span class="rates__label">Единица</span>
              <span class="rates__value">${unit}</span>
            </div>
            <div class="rates__card-row">
              <span class="rates__label">Валюта</span>
              <span class="rates__value rates__value-text">${name}</span>
            </div>
            <div class="rates__card-row">
              <span class="rates__label">Курс базовой валюты</span>
              <span class="rates__value rates__value-last">${rate}</span>
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function renderTableView() {
  // Просто перестраиваем таблицу из чистых данных
  buildRatesRows();
}

function getCurrencyFlag(charCode) {
  const noFlag = ['XDR'];
  if (noFlag.includes(charCode)) {
    return '<span class="flag-fallback" aria-hidden="true">💱</span>';
  }

  const countryCode = charCode.slice(0, 2).toLowerCase();

  return `<img 
    class="currency-flag" 
    src="https://flagcdn.com/${countryCode}.svg" 
    alt="${charCode}" 
    width="20" 
    height="14"
    loading="lazy"
  >`;
}

function setDefaultValues() {
  fromCurrencySelect.value = 'RUB';
  toCurrencySelect.value = 'EUR';
  fromAmountInput.value = formatNumberWithSpaces('5000');
  calculate();
}

function calculate() {
  const fromCode = fromCurrencySelect.value;
  const toCode = toCurrencySelect.value;
  const amountStr = fromAmountInput.value;

  if (!amountStr) {
    toAmountInput.value = '';
    return;
  }

  const amount = getPureNumber(amountStr);
  if (isNaN(amount) || amount <= 0) {
    toAmountInput.value = '';
    return;
  }

  const fromRate = getRate(fromCode);
  const toRate = getRate(toCode);

  const result = (amount * fromRate) / toRate;
  toAmountInput.value = result.toFixed(4);
}

function getRate(code) {
  if (code === 'RUB') return 1;
  const currency = ratesData.Valute[code];
  return currency ? currency.Value / currency.Nominal : 0;
}

function swapCurrencies() {
  const tempCode = fromCurrencySelect.value;
  fromCurrencySelect.value = toCurrencySelect.value;
  toCurrencySelect.value = tempCode;

  const tempAmount = fromAmountInput.value;
  fromAmountInput.value = toAmountInput.value;
  toAmountInput.value = tempAmount;

  calculate();
}
