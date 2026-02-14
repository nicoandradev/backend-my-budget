-- Mejora las instrucciones de extracción para incluir formato de transferencias (Origen, Destino, Monto)
UPDATE bank_email_configs
SET extraction_instructions = 'Extrae TODAS las transacciones del correo y devuelve un array JSON con cada transacción.

Incluye tanto compras/comercios como TRANSFERENCIAS. Para transferencias con formato Origen/Destino/Monto:
- merchant: usa el "Nombre y Apellido" de la sección Destino (beneficiario)
- amount: el valor de Monto como número (quita $ y puntos, ej. $2.000 → 2000)
- date: YYYY-MM-DD (usa la fecha del correo si no está en el cuerpo)
- category: "Otros"
- type: "expense" para transferencias salientes

Para compras/comercios: merchant (nombre del comercio), amount (número sin símbolos), date (YYYY-MM-DD), category (Deporte, Ropa, Recreacional, TC, Cursos, Supermercado, Transporte, Vacaciones, Ahorros, Salud, Hogar, Otros), type (expense o income).

Si no encuentras transacciones válidas, devuelve [].',
    updated_at = NOW()
WHERE bank_name = 'Banco de Chile';
