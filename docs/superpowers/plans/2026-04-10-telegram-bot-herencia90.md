# Herencia 90 — Bot de Telegram "H90 Assistant"

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear un bot de Telegram personalizado para Herencia 90 que permite registrar ventas, gastos, consultar inventario y generar reportes directamente desde el chat.

**Architecture:** Un Vercel Function (`api/telegram.js`) recibe los webhooks de Telegram, parsea los mensajes en español, y lee/escribe en Supabase usando la service role key. El bot responde con confirmaciones y reportes formateados. No hay base de datos adicional — todo usa las tablas `transacciones` y `productos` ya existentes.

**Tech Stack:** Vercel Functions (Node.js), Supabase JS SDK v2, Telegram Bot API (via fetch), @supabase/supabase-js

---

## Pre-requisitos manuales (el usuario hace esto antes de ejecutar el plan)

### 1. Crear el bot en Telegram
- Abre Telegram → busca `@BotFather` → escribe `/newbot`
- Nombre del bot: `H90 Assistant`
- Username: `herencia90_bot` (o lo que esté disponible)
- BotFather te da un **TOKEN** — guárdalo (ej: `7123456789:AAF...`)

### 2. Obtener la Service Role Key de Supabase
- Supabase → Settings → API → `service_role` key (la secreta, no la anon)
- Esta key permite escribir en la DB sin restricciones de RLS

### 3. Agregar variables de entorno en Vercel
- Vercel → proyecto `herencia90-tienda` → Settings → Environment Variables
- Agregar:
  - `TELEGRAM_TOKEN` = el token de BotFather
  - `SUPABASE_URL` = `https://nlnrdtcgbdkzfzwnsffp.supabase.co`
  - `SUPABASE_SERVICE_KEY` = la service role key
  - `TELEGRAM_CHAT_ID` = tu chat ID personal (lo obtienes escribiéndole a `@userinfobot` en Telegram)

---

## Archivos que se crean/modifican

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `api/telegram.js` | Crear | Webhook endpoint — recibe updates de Telegram |
| `api/lib/supabase.js` | Crear | Cliente Supabase server-side con service key |
| `api/lib/parser.js` | Crear | Parsea mensajes en español a comandos estructurados |
| `api/lib/commands.js` | Crear | Handlers de cada comando |
| `api/lib/telegram.js` | Crear | Helper para enviar mensajes a Telegram |
| `vercel.json` | Modificar | Agregar la Function al routing |
| `.gitignore` | Modificar | Asegurar que .env no se suba |

---

## Task 1: Estructura base + cliente Supabase server-side

**Files:**
- Create: `api/lib/supabase.js`
- Create: `api/lib/telegram.js`
- Modify: `vercel.json`

- [ ] **Step 1: Crear `api/lib/supabase.js`**

```javascript
// api/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
```

- [ ] **Step 2: Crear `api/lib/telegram.js`**

```javascript
// api/lib/telegram.js
const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export async function sendMessage(chatId, text, parseMode = 'Markdown') {
  await fetch(`${BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode })
  });
}

export async function setWebhook(url) {
  const res = await fetch(`${BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  return res.json();
}
```

- [ ] **Step 3: Actualizar `vercel.json` para incluir las Functions**

Reemplazar el `vercel.json` existente con:

```json
{
  "version": 2,
  "functions": {
    "api/*.js": {
      "runtime": "@vercel/node@3"
    }
  },
  "builds": [
    {
      "src": "web/**",
      "use": "@vercel/static"
    }
  ],
  "headers": [
    {
      "source": "/(.*).html",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate" }
      ]
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/", "dest": "/web/index.html" },
    { "src": "/admin", "dest": "/web/admin.html" },
    { "src": "/admin.html", "dest": "/web/admin.html" },
    { "src": "/login", "dest": "/web/login.html" },
    { "src": "/login.html", "dest": "/web/login.html" },
    { "src": "/(.*)", "dest": "/web/$1" }
  ]
}
```

- [ ] **Step 4: Crear `package.json` en la raíz (necesario para Vercel Functions)**

```json
{
  "name": "herencia90-tienda",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.49.4"
  }
}
```

- [ ] **Step 5: Commit**
```bash
git add api/ vercel.json package.json
git commit -m "feat: estructura base bot Telegram con cliente Supabase server-side"
git push alejo main
```

---

## Task 2: Parser de comandos en español

**Files:**
- Create: `api/lib/parser.js`

El parser convierte mensajes de texto libre en español a objetos de comando estructurados.

- [ ] **Step 1: Crear `api/lib/parser.js`**

```javascript
// api/lib/parser.js

const CATEGORIAS_GASTO = {
  'envio': 'Envíos Nacionales',
  'envíos': 'Envíos Nacionales',
  'caja': 'Material Empaques',
  'cajas': 'Material Empaques',
  'empaque': 'Material Empaques',
  'publicidad': 'Publicidad Pauta',
  'pauta': 'Publicidad Pauta',
  'comision': 'Comisión / PayPal',
  'comisión': 'Comisión / PayPal',
  'paypal': 'Comisión / PayPal',
  'varios': 'Varios',
  'otro': 'Varios'
};

const TRM_DEFAULT = 3714;

export function parseMessage(text) {
  const raw = text.trim().toLowerCase();

  // AYUDA
  if (raw === 'ayuda' || raw === '/ayuda' || raw === '/help' || raw === '/start') {
    return { cmd: 'ayuda' };
  }

  // CAJA
  if (raw === 'caja' || raw === '/caja') {
    return { cmd: 'caja' };
  }

  // RESUMEN
  if (raw === 'resumen' || raw === '/resumen') {
    return { cmd: 'resumen' };
  }

  // TOP VENTAS
  if (raw.startsWith('top') || raw === '/top') {
    return { cmd: 'top' };
  }

  // VENTAS HOY / MES
  if (raw.startsWith('ventas')) {
    const periodo = raw.includes('hoy') ? 'hoy' : raw.includes('mes') ? 'mes' : 'todo';
    return { cmd: 'ventas', periodo };
  }

  // STOCK [producto]
  if (raw.startsWith('stock') || raw.startsWith('/stock')) {
    const busqueda = raw.replace(/^\/?(stock)\s*/i, '').trim();
    return { cmd: 'stock', busqueda: busqueda || null };
  }

  // PEDIDO [descripcion]
  if (raw.startsWith('pedido') || raw.startsWith('/pedido')) {
    const desc = text.replace(/^\/?(pedido)\s*/i, '').trim();
    return { cmd: 'pedido', descripcion: desc };
  }

  // PENDIENTES
  if (raw === 'pendientes' || raw === '/pendientes') {
    return { cmd: 'pendientes' };
  }

  // VENTA [equipo] [talla] [precio] [costo?]
  // Ej: "venta colombia L 90000"
  // Ej: "venta real madrid negra L 100000 costo 13.44"
  const ventaMatch = raw.match(/^\/?(venta|vendí|vendi)\s+(.+)/i);
  if (ventaMatch) {
    const resto = text.replace(/^\/?(venta|vendí|vendi)\s+/i, '').trim();
    const tallaMatch = resto.match(/\b(XS|S|M|L|XL|XXL)\b/i);
    const precioMatch = resto.match(/\b(\d{4,7})\b/);
    const costoMatch = resto.match(/costo\s+([\d.]+)/i);
    const talla = tallaMatch ? tallaMatch[1].toUpperCase() : 'M';
    const precio = precioMatch ? parseInt(precioMatch[1]) : null;
    const costoUsd = costoMatch ? parseFloat(costoMatch[1]) : 10.44;
    const equipo = resto
      .replace(/\b(XS|S|M|L|XL|XXL)\b/i, '')
      .replace(/\b\d{4,7}\b/, '')
      .replace(/costo\s+[\d.]+/i, '')
      .trim();
    if (!precio) return { cmd: 'error', msg: 'No entendí el precio. Ej: `venta colombia L 90000`' };
    return { cmd: 'venta', equipo, talla, precio, costoUsd };
  }

  // GASTO [categoria] [descripcion] [monto]
  // Ej: "gasto envio cajas medianas 22000"
  const gastoMatch = raw.match(/^\/?(gasto|gasté|gaste)\s+(.+)/i);
  if (gastoMatch) {
    const resto = text.replace(/^\/?(gasto|gasté|gaste)\s+/i, '').trim();
    const montoMatch = resto.match(/\b(\d{3,9})\b/);
    const monto = montoMatch ? parseInt(montoMatch[1]) : null;
    if (!monto) return { cmd: 'error', msg: 'No entendí el monto. Ej: `gasto envio cajas 22000`' };
    const descripcion = resto.replace(/\b\d{3,9}\b/, '').trim();
    const palabras = descripcion.toLowerCase().split(/\s+/);
    let categoria = 'Varios';
    for (const p of palabras) {
      if (CATEGORIAS_GASTO[p]) { categoria = CATEGORIAS_GASTO[p]; break; }
    }
    return { cmd: 'gasto', categoria, descripcion, monto };
  }

  return { cmd: 'desconocido', msg: text };
}
```

- [ ] **Step 2: Commit**
```bash
git add api/lib/parser.js
git commit -m "feat: parser de comandos en español para bot Telegram"
git push alejo main
```

---

## Task 3: Handlers de comandos

**Files:**
- Create: `api/lib/commands.js`

- [ ] **Step 1: Crear `api/lib/commands.js`**

```javascript
// api/lib/commands.js
import { db } from './supabase.js';

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const today = () => new Date().toISOString().split('T')[0];
const thisMonth = () => today().substring(0, 7);

export async function handleAyuda() {
  return `🏆 *H90 Assistant — Herencia 90*\n\n` +
    `*Registrar:*\n` +
    `• \`venta colombia L 90000\`\n` +
    `• \`venta real madrid negra L 100000 costo 13.44\`\n` +
    `• \`gasto envio cajas 22000\`\n` +
    `• \`gasto publicidad instagram 50000\`\n\n` +
    `*Consultar:*\n` +
    `• \`caja\` — saldo actual\n` +
    `• \`stock colombia\` — inventario de un equipo\n` +
    `• \`ventas hoy\` / \`ventas mes\`\n` +
    `• \`resumen\` — resumen del mes\n` +
    `• \`top\` — camisetas más vendidas\n` +
    `• \`pendientes\` — pedidos sin enviar\n\n` +
    `*Pedidos:*\n` +
    `• \`pedido Juan García - Colombia L - Bogotá\``;
}

export async function handleCaja() {
  const { data } = await db.from('transacciones').select('tipo, monto');
  const ingresos = data.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0);
  const gastos = data.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0);
  const caja = ingresos - gastos;
  return `💵 *Caja actual:* ${fmt.format(caja)}\n📈 Ingresos totales: ${fmt.format(ingresos)}\n📉 Gastos totales: ${fmt.format(gastos)}`;
}

export async function handleVenta({ equipo, talla, precio, costoUsd }) {
  const trm = 3714;
  const trans = {
    id: Date.now(),
    tipo: 'ingreso',
    categoria: 'Venta de Producto',
    fecha: today(),
    monto: precio,
    usd_amount: precio / trm,
    trm,
    descripcion: `Camiseta ${equipo} talla ${talla} $${fmt.format(precio)}`,
    costo_usd_asociado: costoUsd
  };
  const { error } = await db.from('transacciones').insert(trans);
  if (error) return `❌ Error guardando venta: ${error.message}`;

  // Descontar stock
  const { data: prods } = await db.from('productos')
    .select('id, equipo, tallas')
    .ilike('equipo', `%${equipo}%`);

  if (prods && prods.length === 1) {
    const prod = prods[0];
    const tallas = prod.tallas;
    if (tallas[talla] > 0) {
      tallas[talla] = tallas[talla] - 1;
      await db.from('productos').update({ tallas }).eq('id', prod.id);
      const alerta = tallas[talla] === 0 ? `\n⚠️ *Stock talla ${talla} agotado*` : 
                     tallas[talla] <= 2 ? `\n⚡ Solo quedan ${tallas[talla]} en talla ${talla}` : '';
      return `✅ *Venta registrada*\n📦 ${prod.equipo} — Talla ${talla}\n💰 ${fmt.format(precio)}${alerta}`;
    }
  }

  return `✅ *Venta registrada*\n📦 ${equipo} — Talla ${talla}\n💰 ${fmt.format(precio)}\n_(stock no actualizado — producto no identificado exactamente)_`;
}

export async function handleGasto({ categoria, descripcion, monto }) {
  const trans = {
    id: Date.now(),
    tipo: 'gasto',
    categoria,
    fecha: today(),
    monto,
    usd_amount: monto / 3714,
    trm: 3714,
    descripcion,
    costo_usd_asociado: 0
  };
  const { error } = await db.from('transacciones').insert(trans);
  if (error) return `❌ Error guardando gasto: ${error.message}`;
  return `✅ *Gasto registrado*\n📁 ${categoria}\n📝 ${descripcion}\n💸 -${fmt.format(monto)}`;
}

export async function handleStock({ busqueda }) {
  let query = db.from('productos').select('equipo, tallas, precio, costo_usd');
  if (busqueda) query = query.ilike('equipo', `%${busqueda}%`);
  const { data } = await query.order('equipo');
  if (!data || data.length === 0) return `❌ No encontré productos con "${busqueda}"`;
  
  let msg = busqueda ? `📦 *Stock — "${busqueda}":*\n\n` : `📦 *Inventario completo:*\n\n`;
  data.forEach(p => {
    const t = p.tallas;
    const total = (t.S||0) + (t.M||0) + (t.L||0) + (t.XL||0);
    const emoji = total === 0 ? '🔴' : total <= 3 ? '🟡' : '🟢';
    msg += `${emoji} *${p.equipo}*\n`;
    msg += `   S:${t.S||0} M:${t.M||0} L:${t.L||0} XL:${t.XL||0} | Total: ${total}\n`;
  });
  return msg;
}

export async function handleVentas({ periodo }) {
  let query = db.from('transacciones').select('*').eq('tipo', 'ingreso').eq('categoria', 'Venta de Producto');
  const hoy = today();
  const mes = thisMonth();
  if (periodo === 'hoy') query = query.eq('fecha', hoy);
  else if (periodo === 'mes') query = query.like('fecha', `${mes}%`);
  
  const { data } = await query.order('fecha', { ascending: false });
  if (!data || data.length === 0) return `📊 No hay ventas registradas ${periodo === 'hoy' ? 'hoy' : periodo === 'mes' ? 'este mes' : ''}.`;
  
  const total = data.reduce((s, t) => s + Number(t.monto), 0);
  const ganancia = data.reduce((s, t) => s + Number(t.monto) - (Number(t.costo_usd_asociado) * Number(t.trm)), 0);
  
  let msg = `📊 *Ventas ${periodo === 'hoy' ? 'de hoy' : periodo === 'mes' ? 'del mes' : 'totales'}:*\n\n`;
  data.slice(0, 10).forEach(t => {
    msg += `• ${t.descripcion} — ${fmt.format(t.monto)}\n`;
  });
  if (data.length > 10) msg += `_...y ${data.length - 10} más_\n`;
  msg += `\n💰 *Total vendido:* ${fmt.format(total)}`;
  msg += `\n💎 *Ganancia neta:* ${fmt.format(ganancia)}`;
  return msg;
}

export async function handleResumen() {
  const mes = thisMonth();
  const { data } = await db.from('transacciones').select('*').like('fecha', `${mes}%`);
  if (!data || data.length === 0) return `📋 No hay transacciones este mes.`;
  
  const ingresos = data.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + Number(t.monto), 0);
  const gastos = data.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.monto), 0);
  const ventas = data.filter(t => t.tipo === 'ingreso' && t.categoria === 'Venta de Producto');
  const totalVentas = ventas.reduce((s, t) => s + Number(t.monto), 0);
  const ganancia = ventas.reduce((s, t) => s + Number(t.monto) - (Number(t.costo_usd_asociado) * Number(t.trm)), 0);
  
  const [y, m] = mes.split('-');
  const nombreMes = new Date(y, m-1).toLocaleString('es-CO', { month: 'long', year: 'numeric' });
  
  return `📋 *Resumen ${nombreMes}*\n\n` +
    `📈 Ingresos totales: ${fmt.format(ingresos)}\n` +
    `📉 Gastos totales: ${fmt.format(gastos)}\n` +
    `💰 Saldo del mes: ${fmt.format(ingresos - gastos)}\n\n` +
    `👕 Ventas de camisetas: ${ventas.length} unidades\n` +
    `💵 Total vendido: ${fmt.format(totalVentas)}\n` +
    `💎 Ganancia neta: ${fmt.format(ganancia)}`;
}

export async function handleTop() {
  const { data } = await db.from('transacciones')
    .select('descripcion, monto')
    .eq('tipo', 'ingreso')
    .eq('categoria', 'Venta de Producto');
  
  if (!data || data.length === 0) return '📊 No hay ventas registradas aún.';
  
  const conteo = {};
  data.forEach(t => {
    const key = t.descripcion.split(' talla ')[0].replace('Camiseta ', '');
    conteo[key] = (conteo[key] || 0) + 1;
  });
  
  const sorted = Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5);
  let msg = '🏆 *Top camisetas más vendidas:*\n\n';
  sorted.forEach(([nombre, cant], i) => {
    const medallas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    msg += `${medallas[i]} ${nombre}: ${cant} unidad${cant > 1 ? 'es' : ''}\n`;
  });
  return msg;
}

export async function handlePedido({ descripcion }) {
  const trans = {
    id: Date.now(),
    tipo: 'gasto',
    categoria: 'Envíos Nacionales',
    fecha: today(),
    monto: 0,
    usd_amount: 0,
    trm: 3714,
    descripcion: `[PENDIENTE] ${descripcion}`,
    costo_usd_asociado: 0
  };
  const { error } = await db.from('transacciones').insert(trans);
  if (error) return `❌ Error: ${error.message}`;
  return `📦 *Pedido registrado como pendiente:*\n${descripcion}\n\nCuando lo envíes, regístralo con \`gasto envio [valor]\``;
}

export async function handlePendientes() {
  const { data } = await db.from('transacciones')
    .select('fecha, descripcion')
    .like('descripcion', '[PENDIENTE]%')
    .order('fecha', { ascending: false });
  
  if (!data || data.length === 0) return '✅ No hay pedidos pendientes.';
  let msg = '📦 *Pedidos pendientes:*\n\n';
  data.forEach(t => { msg += `• ${t.fecha} — ${t.descripcion.replace('[PENDIENTE] ', '')}\n`; });
  return msg;
}
```

- [ ] **Step 2: Commit**
```bash
git add api/lib/commands.js
git commit -m "feat: handlers de todos los comandos del bot Herencia 90"
git push alejo main
```

---

## Task 4: Webhook principal

**Files:**
- Create: `api/telegram.js`

- [ ] **Step 1: Crear `api/telegram.js`**

```javascript
// api/telegram.js
import { sendMessage } from './lib/telegram.js';
import { parseMessage } from './lib/parser.js';
import {
  handleAyuda, handleCaja, handleVenta, handleGasto,
  handleStock, handleVentas, handleResumen, handleTop,
  handlePedido, handlePendientes
} from './lib/commands.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const { message } = req.body;
    if (!message || !message.text) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text;

    // Solo responder al chat ID autorizado
    const allowedChat = process.env.TELEGRAM_CHAT_ID;
    if (allowedChat && String(chatId) !== String(allowedChat)) {
      await sendMessage(chatId, '⛔ No estás autorizado para usar este bot.');
      return res.status(200).json({ ok: true });
    }

    const parsed = parseMessage(text);
    let reply;

    switch (parsed.cmd) {
      case 'ayuda':     reply = await handleAyuda(); break;
      case 'caja':      reply = await handleCaja(); break;
      case 'venta':     reply = await handleVenta(parsed); break;
      case 'gasto':     reply = await handleGasto(parsed); break;
      case 'stock':     reply = await handleStock(parsed); break;
      case 'ventas':    reply = await handleVentas(parsed); break;
      case 'resumen':   reply = await handleResumen(); break;
      case 'top':       reply = await handleTop(); break;
      case 'pedido':    reply = await handlePedido(parsed); break;
      case 'pendientes':reply = await handlePendientes(); break;
      case 'error':     reply = `❌ ${parsed.msg}`; break;
      default:
        reply = `🤔 No entendí ese comando.\nEscribe *ayuda* para ver lo que puedo hacer.`;
    }

    await sendMessage(chatId, reply);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Bot error:', err);
    return res.status(200).json({ ok: true });
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add api/telegram.js
git commit -m "feat: webhook principal del bot Telegram Herencia 90"
git push alejo main
```

---

## Task 5: Registrar el webhook con Telegram

Después del deploy, hay que decirle a Telegram a qué URL enviar los mensajes.

- [ ] **Step 1: Esperar que Vercel termine el deploy**

Verificar en el dashboard de Vercel que el deployment diga "Ready".

- [ ] **Step 2: Registrar el webhook**

Abrir en el navegador esta URL (reemplazar TOKEN con el token real de BotFather):

```
https://api.telegram.org/botTU_TOKEN_AQUI/setWebhook?url=https://herencia90-tienda-git-main-alejomoreno28s-projects.vercel.app/api/telegram
```

Debe responder: `{"ok":true,"result":true,"description":"Webhook was set"}`

- [ ] **Step 3: Verificar que funciona**

Abrir Telegram → buscar tu bot → escribir `ayuda`

Debe responder con el menú completo de comandos.

- [ ] **Step 4: Probar cada comando**

```
caja
stock colombia
ventas mes
resumen
venta colombia L 90000
gasto envio prueba 5000
top
```

---

## Task 6: Mensaje de bienvenida personalizado con marca Herencia 90

- [ ] **Step 1: Configurar el perfil del bot en BotFather**

En Telegram → @BotFather:
- `/setdescription` → seleccionar el bot → pegar:
  `🏆 Asistente privado de Herencia 90. Registra ventas, gastos y consulta el inventario al instante.`
- `/setuserpic` → subir el logo de Herencia 90 (el archivo `web/img/logo.webp`)
- `/setcommands` → pegar:
```
ayuda - Ver todos los comandos
caja - Ver saldo actual
stock - Consultar inventario
ventas - Ver ventas del día o mes
resumen - Resumen financiero del mes
top - Camisetas más vendidas
pendientes - Pedidos sin enviar
```

---

## Notas de seguridad

- El bot solo responde al `TELEGRAM_CHAT_ID` configurado — nadie más puede usarlo aunque conozca el link del bot.
- La `SUPABASE_SERVICE_KEY` nunca va al frontend ni al repositorio — solo existe como variable de entorno en Vercel.
- Agregar `SUPABASE_SERVICE_KEY` al `.gitignore` si se usa un `.env` local para pruebas.

## Comandos de referencia rápida

| Escribir | Resultado |
|---|---|
| `ayuda` | Menú completo |
| `caja` | Saldo actual |
| `venta colombia L 90000` | Registra venta + descuenta stock |
| `venta real madrid negra L 100000 costo 13.44` | Venta con costo personalizado |
| `gasto envio cajas 22000` | Registra gasto |
| `gasto publicidad instagram 50000` | Gasto publicidad |
| `stock colombia` | Stock de camisetas de Colombia |
| `stock` | Todo el inventario |
| `ventas hoy` | Ventas de hoy |
| `ventas mes` | Ventas del mes |
| `resumen` | Resumen financiero del mes |
| `top` | Top 5 camisetas más vendidas |
| `pedido Juan García - Colombia L` | Registra pedido pendiente |
| `pendientes` | Lista pedidos sin enviar |
