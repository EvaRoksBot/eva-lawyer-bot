const KEY = process.env.DADATA_API_KEY;
const BASE = "https://suggestions.dadata.ru/suggestions/api/4_1/rs";

async function dadata(path, payload) {
  const r = await fetch(`${BASE}/${path}`, {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Accept":"application/json",
      "Authorization": `Token ${KEY}`
    },
    body: JSON.stringify(payload)
  }).then(r=>r.json());
  return r?.suggestions || [];
}

export async function checkCounterparty(query) {
  const path = /^\d{10}(\d{2})?$/.test(query) ? "findById/party" : "suggest/party";
  const list = await dadata(path, { query });
  if (!list.length) return null;
  const it = list[0].data;
  const name = it.name?.short_with_opf || it.name?.full_with_opf || "—";
  const innkpp = `${it.inn || "—"} / ${it.kpp || "—"}`;
  const addr = it.address?.value || "—";
  const state = it.state?.status || "ACTIVE";
  return `🏢 ${name}
ИНН/КПП: ${innkpp}
Адрес: ${addr}
Статус: ${state}`;
}
