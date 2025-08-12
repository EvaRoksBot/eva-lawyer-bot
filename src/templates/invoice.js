export function renderInvoice({ invoice_number, invoice_date, supplier_name, supplier_inn, supplier_kpp, buyer_name, buyer_inn, buyer_kpp, items }) {
  const rows = items.map((i, idx) => `${idx+1}. ${i.name}  ${i.qty} ${i.unit||""}  ${i.price}  ${i.qty*i.price}`).join("\n");
  const total = items.reduce((s,i)=>s+i.qty*i.price,0);
  return `Счёт на оплату № ${invoice_number} от ${invoice_date}

Поставщик: ${supplier_name}, ИНН ${supplier_inn}, КПП ${supplier_kpp}
Покупатель: ${buyer_name}, ИНН ${buyer_inn}, КПП ${buyer_kpp}

${rows}

Итого: ${total} руб.`;
}
