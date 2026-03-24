---
name: herencia-90-catalogo
description: >
  Skill para gestionar el catálogo web de HERENCIA 90, una tienda de camisetas de fútbol
  retro y actuales en Colombia. Incluye procesamiento de imágenes (remoción de fondo),
  gestión de productos vía JSON, generación del sitio estático, y deploy a GitHub Pages.
  Usar cuando el usuario quiera: agregar/editar/eliminar productos, procesar fotos nuevas,
  actualizar precios o tallas, o hacer cambios al diseño del catálogo.
---

# HERENCIA 90 — Catálogo Web

## Contexto del proyecto

HERENCIA 90 es una tienda colombiana de camisetas de fútbol (retro, actuales y edición especial).
Vende por Instagram, TikTok y WhatsApp. Este proyecto es su catálogo web público,
hospedado gratis en GitHub Pages.

- **Público**: Colombia
- **Moneda**: COP (pesos colombianos)
- **Idioma del sitio**: Español
- **Canal de venta**: WhatsApp (la web es vitrina, no procesa pagos)
- **Volumen**: ~20 referencias, ~60 productos con variantes de talla
- **Actualización**: Frecuente (diaria o por horas cuando llega inventario nuevo)

## Estructura de carpetas

```
HERENCIA-90/
├── logos/                        ← Logos de la marca en PNG sin fondo
│   ├── logo-principal.png
│   ├── logo-blanco.png
│   └── logo-negro.png
│
├── catalogo-proveedor/           ← Fotos ORIGINALES del proveedor (CON fondo)
│   ├── alemania-retro-1990/
│   │   ├── foto1.jpg
│   │   ├── foto2.jpg
│   │   └── foto3.jpg
│   ├── inter-milan-away-2024/
│   │   └── ...
│   └── ...
│
├── estilos-referencia/           ← Capturas/ejemplos del estilo visual deseado
│   └── ...
│
├── web/                          ← CARPETA QUE SE SUBE A GITHUB PAGES
│   ├── index.html                ← Sitio completo (single-file con JS inline)
│   ├── productos.json            ← Base de datos de productos
│   ├── img/                      ← Fotos PROCESADAS (sin fondo, optimizadas)
│   │   ├── alemania-retro-1990-1.png
│   │   ├── alemania-retro-1990-2.png
│   │   └── ...
│   └── logos/                    ← Logos copiados para la web
│       └── ...
│
├── scripts/
│   ├── remover-fondos.py         ← Procesa fotos del proveedor → web/img/
│   ├── agregar-producto.py       ← CLI para agregar productos al JSON
│   └── optimizar-imagenes.py     ← Comprime imágenes para web
│
├── SKILL.md                      ← Este archivo
└── README.md
```

## Archivo productos.json

Este es el corazón del catálogo. El HTML lee este archivo y renderiza todo dinámicamente.
El usuario NUNCA debería editar el HTML para cambiar productos.

### Estructura:

```json
{
  "config": {
    "nombre_tienda": "HERENCIA 90",
    "whatsapp": "57300XXXXXXX",
    "instagram": "@herencia90",
    "tiktok": "@herencia90",
    "moneda": "COP",
    "mensaje_whatsapp": "Hola! Me interesa la camiseta {producto} en talla {talla}. ¿Está disponible?"
  },
  "categorias": [
    { "id": "retro", "nombre": "Retro / Clásicas" },
    { "id": "actuales", "nombre": "Temporada Actual" },
    { "id": "especial", "nombre": "Edición Especial" }
  ],
  "productos": [
    {
      "id": "alemania-retro-1990",
      "nombre": "Alemania",
      "año": "1990",
      "tipo": "Home",
      "categoria": "retro",
      "precio": 85000,
      "tallas": {
        "S": true,
        "M": true,
        "L": true,
        "XL": true,
        "2XL": false,
        "3XL": false,
        "4XL": false
      },
      "imagenes": [
        "img/alemania-retro-1990-1.png",
        "img/alemania-retro-1990-2.png",
        "img/alemania-retro-1990-3.png"
      ],
      "destacado": true,
      "disponible": true,
      "nuevo": false
    }
  ]
}
```

### Reglas del JSON:
- `id`: kebab-case, formato `{equipo}-{tipo}-{año}` o similar único
- `tallas`: objeto con booleanos (true = disponible, false = agotada)
- `imagenes`: array de paths relativos a la carpeta web/
- `disponible`: false oculta el producto del catálogo
- `destacado`: true lo muestra primero o en sección especial
- `nuevo`: true le pone badge de "Nuevo" en el catálogo
- Precios en COP sin decimales

## Scripts

### 1. remover-fondos.py
Usa la librería `rembg` para remover fondos de las fotos del proveedor.

```bash
# Instalar dependencia
pip install rembg[cpu] pillow

# Uso: procesa TODA la carpeta del proveedor
python scripts/remover-fondos.py

# Uso: procesa solo una subcarpeta específica
python scripts/remover-fondos.py --carpeta "alemania-retro-1990"
```

**Comportamiento:**
- Lee de `catalogo-proveedor/{carpeta}/`
- Remueve el fondo de cada imagen
- Guarda en `web/img/{carpeta}-{n}.png` (formato kebab-case, numeradas)
- Convierte a PNG con transparencia
- Redimensiona a máximo 800px de ancho (mantiene proporción)
- Comprime con calidad óptima para web
- NO reprocesa imágenes que ya existen en `web/img/` (usar --force para forzar)

### 2. agregar-producto.py
CLI interactivo para agregar productos al JSON sin editarlo manualmente.

```bash
python scripts/agregar-producto.py
```

**Flujo:**
1. Pregunta nombre del equipo, año, tipo (home/away/third), categoría
2. Pregunta precio en COP
3. Pregunta tallas disponibles (checkboxes o lista)
4. Auto-detecta imágenes en `web/img/` que coincidan con el ID
5. Agrega el producto a `productos.json`
6. Muestra confirmación con preview

### 3. optimizar-imagenes.py
Comprime todas las imágenes de `web/img/` para carga rápida.

```bash
python scripts/optimizar-imagenes.py
```

## Diseño del sitio web (index.html)

### Principios:
- **Single-file**: Todo en un solo HTML (CSS + JS inline). Más fácil de mantener.
- **Datos externos**: Los productos se cargan de `productos.json` via fetch.
- **Mobile-first**: La mayoría de clientes vienen de Instagram/TikTok en celular.
- **Estilo premium/oscuro**: Fondo oscuro, tipografía limpia, fotos destacadas.
- **Rápido**: Lazy loading de imágenes, CSS mínimo, sin frameworks pesados.
- **Sin dependencias externas** excepto Google Fonts si se necesita.

### Funcionalidades del HTML:
1. **Header**: Logo + nombre + links a redes sociales
2. **Filtro por categoría**: Botones/tabs para retro, actuales, especial, y "todos"
3. **Grid de productos**: Cards con imagen principal, nombre, año, precio
4. **Modal/detalle de producto**: Al hacer clic en una card se abre un detalle con:
   - Galería de las 3 fotos (con navegación)
   - Nombre completo + año + tipo
   - Precio en COP formateado (ej: $85.000)
   - Selector de talla (tallas agotadas deshabilitadas)
   - Botón "Pedir por WhatsApp" que abre wa.me con mensaje pre-armado
5. **Badge "Nuevo"**: Para productos marcados como nuevo
6. **Badge "Agotado"**: Para tallas no disponibles
7. **Búsqueda**: Input para filtrar por nombre de equipo
8. **Footer**: WhatsApp, Instagram, TikTok, "Powered by Herencia 90"

### Estilo visual:
- Consultar la carpeta `estilos-referencia/` para el estilo que el usuario quiere
- En general: fondo oscuro (#0a0a0a o similar), cards con bordes sutiles,
  tipografía sans-serif moderna, hover effects suaves, transiciones CSS
- Las fotos de camisetas SIN FONDO sobre cards oscuras se ven premium
- Formato de precio colombiano: $85.000 (punto como separador de miles)

### WhatsApp deeplink:
```
https://wa.me/{whatsapp}?text={mensaje_codificado}
```
El mensaje se construye dinámicamente con el nombre del producto y la talla seleccionada.

## Flujo de trabajo para el usuario

### Agregar productos nuevos:
1. Meter fotos del proveedor en `catalogo-proveedor/{nombre-equipo-año}/`
2. Correr `python scripts/remover-fondos.py`
3. Correr `python scripts/agregar-producto.py` (o editar productos.json directo)
4. `git add . && git commit -m "Nuevo: {producto}" && git push`
5. Esperar ~1 minuto → web actualizada

### Actualizar tallas/disponibilidad:
1. Abrir `web/productos.json`
2. Buscar el producto por nombre
3. Cambiar `tallas` o `disponible`
4. `git add . && git commit -m "Stock: {producto}" && git push`

### Cambiar precios:
1. Abrir `web/productos.json`
2. Cambiar el campo `precio`
3. `git push`

### Quitar un producto:
1. En `web/productos.json`, cambiar `"disponible": false`
2. `git push`
3. (No es necesario borrar las imágenes)

## Configuración de GitHub Pages

### Setup inicial:
1. Crear repo en GitHub (puede ser público o privado con Pages habilitado)
2. En el repo: Settings → Pages
3. Source: "Deploy from a branch"
4. Branch: `main`, Folder: `/web`   ← IMPORTANTE: la carpeta /web, no la raíz
5. Guardar. En ~2 minutos estará en: `https://{usuario}.github.io/herencia-90/`

### Dominio personalizado (opcional, después):
- Comprar dominio (ej: herencia90.co) por ~$50.000 COP/año
- En GitHub Pages: Custom domain → poner el dominio
- Configurar DNS del dominio apuntando a GitHub

## Reglas para Claude Code

### Al agregar/modificar productos:
- SIEMPRE editar `productos.json`, NUNCA editar el HTML para cambiar productos
- Validar que el ID del producto sea único
- Validar que las rutas de imágenes existan en `web/img/`
- Formatear el JSON con indentación de 2 espacios
- Mantener el orden: destacados primero, luego por categoría, luego por nombre

### Al modificar el diseño:
- Consultar `estilos-referencia/` antes de hacer cambios visuales
- Mantener el diseño mobile-first
- NO agregar frameworks CSS (Bootstrap, Tailwind, etc.) — CSS vanilla
- NO agregar frameworks JS (React, Vue, etc.) — JS vanilla
- Probar que el filtro de categorías siga funcionando
- Probar que el modal de producto abra correctamente
- Probar que el link de WhatsApp se genere bien

### Al procesar imágenes:
- Usar rembg para remoción de fondo
- Output siempre en PNG con transparencia
- Máximo 800px de ancho
- Nombres en kebab-case: `{equipo}-{variante}-{año}-{n}.png`
- NO sobreescribir imágenes existentes sin --force

### Comandos útiles:
```bash
# Procesar fotos nuevas
python scripts/remover-fondos.py

# Agregar producto interactivo
python scripts/agregar-producto.py

# Optimizar imágenes
python scripts/optimizar-imagenes.py

# Deploy rápido
git add . && git commit -m "Actualización catálogo" && git push

# Ver el sitio local (para probar antes de subir)
cd web && python -m http.server 8000
# Abrir http://localhost:8000
```
