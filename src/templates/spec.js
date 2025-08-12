export function renderSpec({ spec_number, contract_number, contract_date, items }) {
  const rows = items.map((i, idx) =>
    `${idx+1} | ${i.name} | ${i.unit} | ${i.qty} | ${i.price} | НДС ${i.vat}%`
  ).join("\n");
  return `Спецификация № ${spec_number}
к Договору поставки № ${contract_number} от ${contract_date}

№ | Наименование | Ед. | Кол-во | Цена | НДС
${rows}
`;
}
