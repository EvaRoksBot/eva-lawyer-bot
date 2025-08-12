export function renderContractSupply({ contract_number, city, date }) {
  return `Договор поставки № ${contract_number}
г. ${city} «${date}»

... (условия, ответственность, реквизиты сторон) ...
`;
}
