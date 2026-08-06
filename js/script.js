(function () {
  'use strict';

  const withoutFirstPayment = {
    3: 16, 4: 19, 5: 23, 6: 26, 7: 30,
    8: 34, 9: 38, 10: 42, 11: 46, 12: 49
  };

  const withFirstPayment = {
    3: 15, 4: 18, 5: 20, 6: 21, 7: 23,
    8: 25, 9: 27, 10: 29, 11: 31, 12: 36
  };

  let firstPayment = false;

  const priceInput = document.getElementById('price');
  const priceError = document.getElementById('priceError');
  const monthsSelect = document.getElementById('months');
  const withoutBtn = document.getElementById('withoutBtn');
  const withBtn = document.getElementById('withBtn');
  const calcForm = document.getElementById('calcForm');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const scheduleToggleBtn = document.getElementById('scheduleToggleBtn');
  const scheduleWrap = document.getElementById('scheduleWrap');
  const scheduleBody = document.getElementById('scheduleBody');
  const pdfBtn = document.getElementById('pdfBtn');
  const pdfError = document.getElementById('pdfError');

  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Храним "сырые" (нецелые) значения, чтобы анимировать переход
  // от предыдущего результата к новому, а не просто дёргать текст.
  const prevValues = { monthly: 0, total: 0, down: 0, rest: 0 };
  const animGeneration = {};

  withoutBtn.addEventListener('click', () => {
    firstPayment = false;
    withoutBtn.classList.add('active');
    withoutBtn.setAttribute('aria-pressed', 'true');
    withBtn.classList.remove('active');
    withBtn.setAttribute('aria-pressed', 'false');
    calculate();
  });

  withBtn.addEventListener('click', () => {
    firstPayment = true;
    withBtn.classList.add('active');
    withBtn.setAttribute('aria-pressed', 'true');
    withoutBtn.classList.remove('active');
    withoutBtn.setAttribute('aria-pressed', 'false');
    calculate();
  });

  function money(value) {
    const rounded = Math.ceil(value / 10) * 10;
    return rounded.toLocaleString('ru-RU') + ' ₽';
  }

  function getPrice() {
    return Number(priceInput.value.replace(/\D/g, '')) || 0;
  }

  function clearPriceError() {
    priceInput.classList.remove('field-invalid');
    priceError.hidden = true;
  }

  function showPriceError() {
    priceInput.classList.add('field-invalid');
    priceError.hidden = false;
    priceInput.focus();
  }

  // Плавно "прокручивает" число от одного значения к другому.
  // Если пользователь предпочитает меньше анимации в системе — просто
  // ставим итоговое значение без анимации.
  function animateValue(id, from, to) {
    const el = document.getElementById(id);
    if (!el) return;

    if (prefersReducedMotion || from === to) {
      el.textContent = money(to);
      return;
    }

    const gen = (animGeneration[id] || 0) + 1;
    animGeneration[id] = gen;

    const duration = 400;
    const start = performance.now();

    function step(now) {
      if (animGeneration[id] !== gen) return; // отменено более новым расчётом
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const value = from + (to - from) * eased;
      el.textContent = money(Math.max(value, 0));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = money(to);
      }
    }

    requestAnimationFrame(step);
  }

  // Возвращает массив строк графика платежей: первый взнос (если есть)
  // сегодняшним числом, затем N равных ежемесячных платежей с датами.
  // Используется и для таблицы на странице, и для PDF-квитанции.
  function buildScheduleRows(months, monthly, down) {
    const rows = [];
    const today = new Date();

    if (firstPayment && down > 0) {
      rows.push({
        label: '—',
        date: today.toLocaleDateString('ru-RU'),
        amount: money(down),
        isDown: true
      });
    }

    for (let i = 1; i <= months; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
      rows.push({
        label: String(i),
        date: date.toLocaleDateString('ru-RU'),
        amount: money(monthly),
        isDown: false
      });
    }

    return rows;
  }

  function renderSchedule(months, monthly, down) {
    if (!scheduleBody) return;
    scheduleBody.innerHTML = '';
    buildScheduleRows(months, monthly, down).forEach((row) => {
      const tr = document.createElement('tr');
      if (row.isDown) tr.className = 'schedule-down';
      tr.innerHTML = `<td>${row.label}</td><td>${row.date}</td><td>${row.amount}</td>`;
      scheduleBody.appendChild(tr);
    });
  }

  // ===== PDF-квитанция =====

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Не удалось загрузить ' + src));
      document.head.appendChild(script);
    });
  }

  let html2canvasPromise = null;
  function ensureHtml2Canvas() {
    if (!html2canvasPromise) {
      html2canvasPromise = loadScriptOnce(
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
      );
    }
    return html2canvasPromise;
  }

  let pdfLibsPromise = null;
  function ensurePdfLibs() {
    if (!pdfLibsPromise) {
      pdfLibsPromise = Promise.all([
        ensureHtml2Canvas(),
        loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      ]);
    }
    return pdfLibsPromise;
  }

  // Строит скрытый (за пределами экрана) DOM-узел с расчётом — светлая
  // "квитанция", которую затем html2canvas превращает в картинку для PDF.
  // Cyrillic в jsPDF без встроенных шрифтов не рисуется, поэтому идём
  // через рендер реального HTML в canvas, а не через текстовые методы jsPDF.
  function buildReceiptElement() {
    const months = Number(monthsSelect.value);
    const percent = document.getElementById('percent').textContent;
    const priceFormatted = (priceInput.value || '0') + ' ₽';
    const { monthly, down, rest, total } = prevValues;
    const today = new Date().toLocaleDateString('ru-RU');

    const rowsHtml = buildScheduleRows(months, monthly, down)
      .map((row) => (
        `<tr${row.isDown ? ' class="pdf-row-down"' : ''}>` +
        `<td>${row.label}</td><td>${row.date}</td><td>${row.amount}</td></tr>`
      ))
      .join('');

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-receipt';
    wrapper.innerHTML = `
      <div class="pdf-header">
        <div class="pdf-logo-badge">N</div>
        <div>
          <div class="pdf-brand-title">NUR Invest</div>
          <div class="pdf-brand-tagline">Исламская рассрочка • Без процентов</div>
        </div>
      </div>
      <div class="pdf-meta">Расчёт от ${today}</div>
      <table class="pdf-summary">
        <tbody>
          <tr><td>Стоимость товара</td><td>${priceFormatted}</td></tr>
          <tr><td>Срок рассрочки</td><td>${months} мес.</td></tr>
          <tr><td>Способ оплаты</td><td>${firstPayment ? 'Первый взнос 25%' : 'Без первого взноса'}</td></tr>
          <tr><td>Наценка</td><td>${percent}</td></tr>
          <tr><td>Первый взнос</td><td>${money(down)}</td></tr>
          <tr><td>Остаток к оплате</td><td>${money(rest)}</td></tr>
          <tr class="pdf-highlight"><td>Ежемесячный платёж</td><td>${money(monthly)}</td></tr>
          <tr><td>Стоимость в рассрочку</td><td>${money(total)}</td></tr>
        </tbody>
      </table>
      <div class="pdf-schedule-title">График платежей</div>
      <table class="pdf-schedule">
        <thead><tr><th>№</th><th>Дата</th><th>Сумма</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="pdf-footer">
        <p class="pdf-phone">📞 +7 (928) 999-98-10</p>
        <p class="pdf-disclaimer">
          Расчёт носит предварительный характер и не является публичной офертой.
          Точные условия сделки фиксируются в договоре купли-продажи.
        </p>
      </div>
    `;
    document.body.appendChild(wrapper);
    return wrapper;
  }

  async function generatePdf() {
    if (!pdfBtn) return;
    const price = getPrice();
    if (price <= 0) {
      showPriceError();
      return;
    }
    clearPriceError();
    if (pdfError) pdfError.hidden = true;

    const originalHtml = pdfBtn.innerHTML;
    pdfBtn.disabled = true;
    pdfBtn.innerHTML =
      '<span class="btn-title">⏳ Готовим PDF…</span>' +
      '<span class="btn-subtitle">Это займёт пару секунд</span>';

    let receiptEl = null;
    try {
      await ensurePdfLibs();
      receiptEl = buildReceiptElement();

      const canvas = await window.html2canvas(receiptEl, {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - margin * 2;
      const contentHeightPerPage = pageHeight - margin * 2;
      const pxToMm = contentWidth / canvas.width;
      const pageHeightPx = contentHeightPerPage / pxToMm;

      let renderedPx = 0;
      let isFirstPage = true;

      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        pageCanvas
          .getContext('2d')
          .drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        if (!isFirstPage) pdf.addPage();
        pdf.addImage(
          pageCanvas.toDataURL('image/png'),
          'PNG',
          margin,
          margin,
          contentWidth,
          sliceHeightPx * pxToMm
        );

        renderedPx += sliceHeightPx;
        isFirstPage = false;
      }

      pdf.save('NUR-Invest-raschet.pdf');
    } catch (err) {
      if (pdfError) pdfError.hidden = false;
    } finally {
      if (receiptEl && receiptEl.parentNode) {
        receiptEl.parentNode.removeChild(receiptEl);
      }
      pdfBtn.disabled = false;
      pdfBtn.innerHTML = originalHtml;
    }
  }

  if (pdfBtn) {
    pdfBtn.addEventListener('click', generatePdf);
  }

  if (scheduleToggleBtn && scheduleWrap) {
    scheduleToggleBtn.addEventListener('click', () => {
      const expanded = scheduleToggleBtn.getAttribute('aria-expanded') === 'true';
      scheduleToggleBtn.setAttribute('aria-expanded', String(!expanded));
      scheduleWrap.hidden = expanded;
      scheduleToggleBtn.textContent = expanded
        ? '📅 Показать график платежей'
        : '📅 Скрыть график платежей';
    });
  }

  function formatInput() {
    const digits = priceInput.value.replace(/\D/g, '');
    if (!digits) {
      priceInput.value = '';
      calculate();
      return;
    }
    priceInput.value = Number(digits).toLocaleString('ru-RU');
    if (priceInput.classList.contains('field-invalid')) {
      clearPriceError();
    }
    calculate();
  }

  priceInput.addEventListener('input', formatInput);
  monthsSelect.addEventListener('change', calculate);

  function calculate() {
    const price = getPrice();
    const months = Number(monthsSelect.value);
    const percent = firstPayment ? withFirstPayment[months] : withoutFirstPayment[months];
    let total = price * (1 + percent / 100);
    // Первый взнос считается от стоимости товара, а не от итоговой
    // стоимости в рассрочку (в которую уже включена наценка).
    let down = firstPayment ? price * 0.25 : 0;
    let rest = total - down;

    // Округляем ежемесячный платеж вверх до 10 рублей
    const monthly = Math.ceil((rest / months) / 10) * 10;

    // Пересчитываем остаток и общую стоимость, чтобы все суммы совпадали
    rest = monthly * months;
    total = firstPayment ? rest + down : rest;

    document.getElementById('percent').textContent = percent + '%';

    animateValue('total', prevValues.total, total);
    animateValue('down', prevValues.down, down);
    animateValue('rest', prevValues.rest, rest);
    animateValue('paymentBig', prevValues.monthly, monthly);
    renderSchedule(months, monthly, down);

    prevValues.total = total;
    prevValues.down = down;
    prevValues.rest = rest;
    prevValues.monthly = monthly;
  }

  calculate();

  if (calcForm && whatsappBtn) {
    calcForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const price = getPrice();
      if (price <= 0) {
        showPriceError();
        return;
      }
      clearPriceError();

      const months = monthsSelect.value;
      const text = `Здравствуйте!\n\n` +
        `Я рассчитал рассрочку.\n\n` +
        `💰 Стоимость товара: ${priceInput.value} ₽\n` +
        `📆 Срок: ${months} мес.\n` +
        `💳 Первый взнос: ${document.getElementById('down').textContent}\n` +
        `✅ Ежемесячный платеж: ${document.getElementById('paymentBig').textContent}\n\n` +
        `Хочу оформить рассрочку.`;

      const win = window.open(
        `https://wa.me/79289999810?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer'
      );
      if (win) {
        win.opener = null;
      }
    });
  }
})();
