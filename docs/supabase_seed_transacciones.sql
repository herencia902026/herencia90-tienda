-- Insertar transacciones históricas de Herencia 90
-- Ejecutar en Supabase SQL Editor

INSERT INTO transacciones (id, tipo, categoria, fecha, monto, usd_amount, trm, descripcion, costo_usd_asociado) VALUES
(1774968510954, 'gasto',   'Envíos Nacionales',          '2026-04-01', 22000,  6.01,  3661, 'ENVIO CAJAS', 0),
(1774968510955, 'ingreso', 'Venta de Producto',           '2026-03-31', 100000, 27.25, 3670, 'Camiseta Real Madrid negra L $100,000', 27.25),
(1774968510956, 'ingreso', 'Venta de Producto',           '2026-03-31', 90000,  24.52, 3670, 'Camiseta Real Madrid azul L $90,000', 24.52),
(1774968510957, 'gasto',   'Material Empaques',           '2026-03-31', 55000,  14.99, 3670, 'Compra 22 cajas', 0),
(1774968510958, 'ingreso', 'Venta de Producto',           '2026-03-31', 88000,  23.98, 3670, 'Camiseta Barcelona 2026 hombre talla L', 23.98),
(1774968510959, 'ingreso', 'Venta de Producto',           '2026-03-31', 90000,  24.52, 3670, 'Camiseta Arsenal M', 24.52),
(1774968510960, 'ingreso', 'Venta de Producto',           '2026-03-31', 80000,  21.80, 3670, 'camiseta selección colombia mujer 2026 talla M', 21.80),
(1774968510961, 'ingreso', 'Venta de Producto',           '2026-03-31', 70000,  19.07, 3670, '1 camiseta selección colombia hombre 2026 talla L $70,000 (precio en combo 2x150mil)', 19.07);
