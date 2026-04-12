const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export async function sendMessage(chatId, text, parseMode = 'Markdown') {
  await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}
