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
const monthsSelect = document.getElementById('months');
const withoutBtn = document.getElementById('withoutBtn');
const withBtn = document.getElementById('withBtn');

withoutBtn.onclick = () => {
  firstPayment = false;
  withoutBtn.classList.add('active');
  withBtn.classList.remove('active');
  calculate();
};

withBtn.onclick = () => {
  firstPayment = true;
  withBtn.classList.add('active');
  withoutBtn.classList.remove('active');
  calculate();
};

function money(value) {
  const rounded = Math.ceil(value / 10) * 10;
  return rounded.toLocaleString('ru-RU') + ' ₽';
}

function formatInput() {
  const digits = priceInput.value.replace(/\D/g, '');
  if (!digits) {
    priceInput.value = '';
    calculate();
    return;
  }
  priceInput.value = Number(digits).toLocaleString('ru-RU');
  calculate();
}

priceInput.addEventListener('input', formatInput);
monthsSelect.addEventListener('change', calculate);

function calculate(){
  const price = Number(priceInput.value.replace(/\D/g, '')) || 0;
  const months = Number(monthsSelect.value);
  const percent = firstPayment ? withFirstPayment[months] : withoutFirstPayment[months];
  let total = price * (1 + percent / 100);
  let down = firstPayment ? total * 0.25 : 0;
  let rest = total - down;

  // Округляем ежемесячный платеж вверх до 10 рублей
  const monthly = Math.ceil((rest / months) / 10) * 10;

  // Пересчитываем остаток и общую стоимость, чтобы все суммы совпадали
  rest = monthly * months;
  total = firstPayment ? rest + down : rest;

  document.getElementById('percent').textContent = percent + '%';
  document.getElementById('total').textContent = money(total);
  document.getElementById('down').textContent = money(down);
  document.getElementById('rest').textContent = money(rest);
  const monthlyEl = document.getElementById('monthly');
  if (monthlyEl) {
    monthlyEl.textContent = money(monthly);
  }
  document.getElementById('paymentBig').textContent = money(monthly);
}

calculate();

const whatsappBtn = document.getElementById('whatsappBtn');

if (whatsappBtn) {
  whatsappBtn.addEventListener('click', () => {
    const price = priceInput.value || '0';
    const months = monthsSelect.value;

    const text = `📋 *Расчёт NUR Invest*\n\n` +
      `💰 Стоимость товара: ${price} ₽\n` +
      `📆 Срок: ${months} мес.\n` +
      `📈 Наценка: ${document.getElementById('percent').textContent}\n` +
      `💵 Стоимость в рассрочку: ${document.getElementById('total').textContent}\n` +
      `💳 Первый взнос: ${document.getElementById('down').textContent}\n` +
      `📌 Остаток: ${document.getElementById('rest').textContent}\n\n` +
      `✅ Ежемесячный платёж: ${document.getElementById('paymentBig').textContent}`;

    window.open(
      `https://wa.me/79289999810?text=${encodeURIComponent(text)}`,
      '_blank'
    );
  });
}
