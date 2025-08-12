const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG = `https://api.telegram.org/bot${TOKEN}`;

export default async (req, res) => {
  const url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers.host}/api/bot`;
  const r = await fetch(`${TG}/setWebhook`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ url })
  }).then(r=>r.json());
  res.status(200).json(r);
};
