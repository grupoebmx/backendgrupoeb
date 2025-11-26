require('dotenv').config();
const express= require ('express');
const app = express();
const cors = require ('cors');
app.use (cors());
app.use(express.json());
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');



const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fieldSize: 20 * 1024 * 1024, 
    fileSize: 10 * 1024 * 1024  
  }
});



const db= require ('./connection');


if (!process.env.JWT_SECRET) {
  console.error('ERROR CRÍTICO: JWT_SECRET no está definido en .env');
  process.exit(1); 
}

const JWT_SECRET = process.env.JWT_SECRET;



app.post("/api/auth/login", async (req, res) => {
  try {
    const { correo, contrasenia } = req.body;

    if (!correo || !contrasenia) {
      return res.status(400).json({ message: "Usuario y contraseña son requeridos" });
    }

    const resultado = await db.query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const usuario = resultado.rows[0];
    const passwordValido = await bcrypt.compare(contrasenia, usuario.contrasenia);

    if (!passwordValido) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    // Usar JWT_SECRET del .env
    const token = jwt.sign(
      { 
        id: usuario.id, 
        correo: usuario.correo,
        rol: usuario.rol 
      },
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    res.json({
      message: "Login exitoso",
      token,
      usuario: {
        id: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});


const verificarToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(403).json({ message: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET); 
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};


app.post("/api/usuarios/insertar", async (req, res) => {
  try {
    const { correo, contrasenia, rol, numeroEmpleado, nombre, apellido } = req.body;

    // Validaciones básicas
    if (!correo || !contrasenia || !nombre || !apellido) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    // Verificar si el correo ya existe
    const existe = await db.query("SELECT * FROM usuarios WHERE correo = $1", [correo]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: "El correo ya está registrado" });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(contrasenia, salt);

    // Si numeroEmpleado no viene, se asigna null
    const numeroEmpleadoFinal = numeroEmpleado || null;

    // Insertar usuario
    const usuarioInsertado = await db.query(
      `INSERT INTO usuarios (correo, contrasenia, rol, numeroEmpleado, nombre, apellido)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, correo, rol, numeroEmpleado, nombre, apellido`,
      [correo, hashPassword, rol || 'usuario', numeroEmpleadoFinal, nombre, apellido]
    );

    res.json({
      message: "Usuario insertado correctamente",
      usuario: usuarioInsertado.rows[0],
    });

  } catch (error) {
    console.error("Error al insertar usuario:", error);
    res.status(500).send("Error en el servidor");
  }
});

// Insertar clientes 

app.post("/api/clientes/insertar", async (req, res) => {
    let {
        nombreEmpresa,
        impresion,
        razonSocial,
        rfc,
        email,
        telefono,
        regimen,
        cfdi,
        estado,
        colonia,
        cp,
        calle,
        numeroExterior,
        numeroInterior
    } = req.body;

    // Convertir a números o null si vienen vacíos o nulos
    telefono = telefono ? Number(telefono) : null;
    cp = cp ? Number(cp) : null;
    numeroExterior = numeroExterior ? Number(numeroExterior) : null;
    numeroInterior = numeroInterior ? Number(numeroInterior) : null;

    try {
        const clienteInsertado = await db.query(
            `INSERT INTO clientes 
            (nombre_empresa, impresion, razon_social, rfc, email, telefono, regimen, cfdi, estado, colonia, cp, calle, num_ext, num_int)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *`,
            [
                nombreEmpresa,
                impresion,
                razonSocial,
                rfc,
                email,
                telefono,
                regimen,
                cfdi,
                estado,
                colonia,
                cp,
                calle,
                numeroExterior,
                numeroInterior
            ]
        );
        res.json(clienteInsertado.rows);
    } catch (error) {
        console.error("Error al insertar cliente:", error);
        res.status(500).send("Error en el servidor");
    }
});


//Insertar productos 

app.post("/api/productos/insertar", upload.fields([
  { name: 'imagenFinal' },
  { name: 'imagenGrabado' },
  { name: 'imagen' },
  { name: 'imagenSuaje' }
]), async (req, res) => {
  try {
    const {
     grabado, num_cliente, clave_material, suajesNumsuaje, clave,
      fecha, descripcion, tipo, producto, guia, anchoInt, largoInt, altoInt, ceja,
      anchoCarton, largoCarton, marcas, pegado,
      ancho_suaje, largo_suaje, corto_sep, largo_sep, satClaveProductoServicio, satClaveUnidad, empaque,
      paqX,cantidad, tintas
    } = req.body;

    const parseNumber = (value) => (value !== '' && value !== undefined ? parseFloat(value) : null);

    
    const suajesNumsuajeNum = parseNumber(suajesNumsuaje);
    const anchoIntNum = parseNumber(anchoInt);
    const largoIntNum = parseNumber(largoInt);
    const altoIntNum = parseNumber(altoInt);
    const cejaNum = parseNumber(ceja);
    const anchoCartonNum = parseNumber(anchoCarton);
    const largoCartonNum = parseNumber(largoCarton);
    const ancho_suajeNum = parseNumber(ancho_suaje);
    const largo_suajeNum = parseNumber(largo_suaje);
    const corto_sepNum = parseNumber(corto_sep);
    const largo_sepNum = parseNumber(largo_sep);
    const cantidadNum = parseNumber(cantidad);
    

   
    const imagenFinal = req.files['imagenFinal'] ? req.files['imagenFinal'][0].buffer : null;
    const imagenGrabado = req.files['imagenGrabado'] ? req.files['imagenGrabado'][0].buffer : null;
    const imagen = req.files['imagen'] ? req.files['imagen'][0].buffer : null;
    const imagenSuaje = req.files['imagenSuaje'] ? req.files['imagenSuaje'][0].buffer : null;

    
    const productoinsertado = await db.query(
      `INSERT INTO productos (
        imagen_suaje, alto_int, ceja, ancho_carton, largo_carton,
        imagen_final, imagen_grabado, ancho_suaje, largo_suaje,
        corto_sep, largo_sep, imagen, suajes_num_suaje, fecha,
        ancho_int, largo_int, grabado, clientes_num_cliente,
        marcas, clave, pegado, descripcion, tipo, producto, guia,
        clave_material, satclaveproductoservicio, satclaveunidad, empaque, paquete, cantidad_tarima
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
      ) RETURNING identificador`,
      [
        imagenSuaje, altoIntNum, cejaNum, anchoCartonNum, largoCartonNum,
        imagenFinal, imagenGrabado, ancho_suajeNum, largo_suajeNum,
        corto_sepNum, largo_sepNum, imagen, suajesNumsuajeNum, fecha,
        anchoIntNum, largoIntNum, grabado, num_cliente,
        marcas, clave, pegado, descripcion, tipo, producto, guia,
        clave_material, satClaveProductoServicio, satClaveUnidad, empaque, paqX, cantidadNum
      ]
    );

    const id_producto = productoinsertado.rows[0].identificador; 

    
    if (id_producto) {
      const tintasArray = JSON.parse(tintas || '[]');
      for (let id_tinta of tintasArray) {
        const idTintaNum = parseNumber(id_tinta);
        if (idTintaNum !== null) {
          await db.query(
            `INSERT INTO producto_tinta (id_producto, id_tinta) VALUES ($1, $2)`,
            [id_producto, idTintaNum]
          );
        }
      }
    }

    res.json({ message: 'Producto insertado correctamente', producto: productoinsertado.rows[0] });

  } catch (error) {
    console.error("Error al insertar producto:", error);
    res.status(500).send("Error en el servidor");
  }
});


app.post("/api/cotizaciones/insertar", async (req, res) => {
  try {
    const { num_cliente, fecha, productos } = req.body;

    // Validar datos mínimos
    if (!num_cliente || !productos || productos.length === 0) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }


    // 1️⃣ Insertar cabecera en cotizaciones
    const resultCotizacion = await db.query(
      `INSERT INTO cotizaciones (num_cliente, fecha)
       VALUES ($1, $2)
       RETURNING id`,
      [num_cliente, fecha || new Date()]
    );

    const idCotizacion = resultCotizacion.rows[0].id;

    // 2️⃣ Insertar cada producto en detalle_cotizaciones
    const insertDetalleQuery = `
      INSERT INTO detalle_cotizaciones (
        id_cotizacion, id_producto, cantidad,
        precio_carton, precio_tintas, precio_maquina, precio_pegado,
        precio_fijos, precio_utilidad, precio_otros, precio_envio,
        precio_venta, precio_final
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
    `;

    for (const p of productos) {
      await db.query(insertDetalleQuery, [
        idCotizacion,
        p.idProducto,
        parseFloat(p.cantidad) || 0,
        parseFloat(p.totalCarton) || 0,
        parseFloat(p.precioTintas) || 0,
        parseFloat(p.precioMaquina) || 0,
        parseFloat(p.precioPegadoFinal) || 0,
        parseFloat(p.fijosCalculada) || 0,
        parseFloat(p.utilidadCalculada) || 0,
        parseFloat(p.otros) || 0,
        parseFloat(p.envioCalculada) || 0,
        parseFloat(p.precioVenta) || 0,
        parseFloat(p.precioFinal) || 0
      ]);
    }

    // 3️⃣ Respuesta final
    res.json({
      message: "Cotización y detalles insertados correctamente",
      idCotizacion,
    
    });

  } catch (error) {
    console.error("❌ Error al insertar cotización:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});

app.post("/api/pedidos/insertar", async (req, res) => {
  try {
    const {
      num_cliente,
      fecha,
      observaciones,
      anticipo,
      iva,
      total,
      metodoPago,
      entrega,
      condicionesPago,
      status,
      subtotal,
      formaPago,
      numeroIdentificacion,
      productos
    } = req.body;

    // Validar datos mínimos
    if (!num_cliente || !productos || productos.length === 0) {
      return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // 1️⃣ Insertar pedido
    const resultPedido = await db.query(
      `INSERT INTO pedidos (
         num_cliente, fecha, observaciones, iva, total,
         entrega, condiciones_pago, subtotal, status, numeroIdentificacion
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING no_pedido`,
      [
        num_cliente,
        fecha || new Date(),
        observaciones || "",
        parseFloat(iva) || 0,
        parseFloat(total) || 0,
        entrega || "",
        condicionesPago || "",
        parseFloat(subtotal) || 0,
        status || "Autorizado",
        numeroIdentificacion || ""
      ]
    );

    const no_pedido = resultPedido.rows[0].no_pedido;

    // 2️⃣ Insertar detalle de productos
    for (const p of productos) {
      await db.query(
        `INSERT INTO pedido_detalle (id_pedido, id_producto, cantidad, importe)
         VALUES ($1, $2, $3, $4)`,
        [no_pedido, p.idProducto, p.cantidad, parseFloat(p.importe) || 0]
      );
    }

    // 3️⃣ Registrar pago inicial (anticipo)
    if (anticipo && parseFloat(anticipo) > 0) {
      await db.query(
        `INSERT INTO pagos (no_pedido, fecha_pago, monto, metodo_pago, forma_pago)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          no_pedido,
          new Date(),
          parseFloat(anticipo),
          metodoPago || "Efectivo",
          formaPago || "Anticipo"
        ]
      );
    }

   
    res.json({
      message: "Pedido, detalle y pago registrados correctamente",
      no_pedido
    });

  } catch (error) {
    console.error("❌ Error al insertar pedido:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});


// Insertar Matriales 
app.post("/api/materiales/insertar", async (req, res) => {
  let { clave, material, tipo, flauta, resistencia, precio, tipo_material, calibre, peso } = req.body;

 
  resistencia = resistencia === '' ? null : Number(resistencia);
  precio = precio === '' ? null : Number(precio);
  calibre = calibre === '' ? null : Number(calibre);
  peso = peso === '' ? null : Number(peso);

  try {
    await db.query(
      `INSERT INTO materiales 
        (clave, material, tipo, flauta, resistencia, precio, tipo_material, calibre, peso)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [clave, material, tipo, flauta, resistencia, precio, tipo_material, calibre, peso]
    );
    res.send("Material insertado correctamente");
  } catch (error) {
    console.error("Error al insertar:", error);
    res.status(500).send("Error en el servidor");
  }
});


//insertatr vehiculo
app.post("/api/vehiculos/insertar", async (req, res) => {
    const {idVehiculos, procesoIdEnvio , marcaModelo, placa} = req.body;
    try {
        const vehiculoinsertar = await db.query(
            "INSERT INTO vehiculos (idvehiculos, proceso_id_envio , marca_modelo, placa) VALUES ($1, $2, $3, $4) RETURNING *",
          [idVehiculos, procesoIdEnvio , marcaModelo, placa]
          );
        res.json(vehiculoinsertar.rows);
    } catch (error) {
        console.error("Error al insertar:", error);
        res.send("Error en el servidor");
    }
});

// Insertar proveedores 
app.post("/api/proveedor/insertar", async (req, res) => {
    const { nombre, ejecutivo_ventas, correo, categoria, telefono, estado, colonia, cp, calle, numero_exterior, numero_interior, rfc, cuenta_bancaria, banco, clabe, beneficiario } = req.body;
    try {
        const proveedorinsertado = await db.query(
            "INSERT INTO proveedores (nombre, ejecutivo_ventas, correo, categoria, telefono, estado, colonia, cp, calle, numero_exterior, numero_interior, rfc, cuenta_bancaria, banco, clabe, beneficiario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *",
            [nombre, ejecutivo_ventas, correo, categoria, telefono, estado, colonia, cp, calle, numero_exterior, numero_interior, rfc, cuenta_bancaria, banco, clabe, beneficiario]
        );
        res.json(proveedorinsertado.rows);
    } catch (error) {
        console.error("Error al insertar:", error);
        res.send("Error en el servidor");
    }
});

// Insertar tinta
app.post("/api/tintas/insertar", async (req, res) => {
    const { gcmi, nombre_tinta } = req.body;
    try {
        const tintaInsertada = await db.query(
            "INSERT INTO tintas (gcmi, nombre_tinta) VALUES ($1, $2) RETURNING *",
            [gcmi, nombre_tinta]
        );
        res.json(tintaInsertada.rows);
    } catch (error) {
        console.error("Error al insertar tinta:", error);
        res.send("Error en el servidor");
    }
});

app.post("/api/utilidad/calcular", async (req, res) => {
  try {
    const { area, cantidad } = req.body;

    if (!area || !cantidad) {
      return res.status(400).json({ message: "Faltan parámetros (area o cantidad)" });
    }

   
    const categoriaQuery = `
      SELECT id, nombre
      FROM categoria_cajas
      WHERE $1 BETWEEN area_min AND area_max
      LIMIT 1
    `;
    const categoriaResult = await db.query(categoriaQuery, [area]);
    const categoria = categoriaResult.rows[0];

    if (!categoria) {
      return res.status(404).json({ message: "No se encontró categoría para el área" });
    }

    // 2️⃣ Buscar todas las utilidades de esa categoría
    const utilidadesQuery = `
      SELECT rango, precio
      FROM utilidades
      WHERE categoria_id = $1
    `;
    const utilidadesResult = await db.query(utilidadesQuery, [categoria.id]);
    const utilidades = utilidadesResult.rows;

    // 3️⃣ Determinar el rango correcto según la cantidad
    let precioUtilidad = 0;
    let rangoSeleccionado = "";

    for (const u of utilidades) {
      const rango = u.rango.trim();

      if (rango.startsWith("<")) {
        const max = parseInt(rango.replace("<", ""));
        if (cantidad < max) {
          precioUtilidad = parseFloat(u.precio);
          rangoSeleccionado = rango;
          break;
        }
      } else if (rango.startsWith(">=")) {
        const min = parseInt(rango.replace(">=", ""));
        if (cantidad >= min) {
          precioUtilidad = parseFloat(u.precio);
          rangoSeleccionado = rango;
          break;
        }
      } else if (rango.includes("-")) {
        const [min, max] = rango.split("-").map(n => parseInt(n));
        if (cantidad >= min && cantidad <= max) {
          precioUtilidad = parseFloat(u.precio);
          rangoSeleccionado = rango;
          break;
        }
      }
    }

    // 4️⃣ Responder al frontend
    res.json({
      categoria: categoria.nombre,
      rango: rangoSeleccionado,
      precioUtilidad,
    });

  } catch (error) {
    console.error("Error al calcular utilidad:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
});

app.post("/api/ordenes/insertar", async (req, res) => {
  try {
    const { id_pedido, id_proveedor, total_orden, fecha, subtotal, iva, materiales } = req.body;

    // Validar datos obligatorios
    if (!id_pedido || !id_proveedor || !materiales || !materiales.length) {
      return res.status(400).json({ 
        message: "Faltan datos obligatorios",
        detalles: {
          id_pedido: !!id_pedido,
          id_proveedor: !!id_proveedor,
          materiales: !!materiales && materiales.length > 0
        }
      });
    }

    // 🔥 CONVERTIR FECHA DE DD/MM/YYYY A YYYY-MM-DD
    let fechaFormateada = fecha;
    if (fecha && fecha.includes('/')) {
      const partes = fecha.split('/');
      fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
    }

    console.log('📦 Datos recibidos:', {
      id_pedido,
      id_proveedor,
      fecha_original: fecha,
      fecha_formateada: fechaFormateada,
      total_materiales: materiales.length
    });

    // 1️⃣ Verificar que el pedido existe
    const pedidoExiste = await db.query(
      'SELECT id FROM pedidos WHERE id = $1',
      [id_pedido]
    );

    if (pedidoExiste.rows.length === 0) {
      return res.status(404).json({ 
        message: `El pedido ${id_pedido} no existe en la base de datos` 
      });
    }

    // 2️⃣ Verificar que el proveedor existe
    const proveedorExiste = await db.query(
      'SELECT idproveedores FROM proveedores WHERE idproveedores = $1',
      [id_proveedor]
    );

    if (proveedorExiste.rows.length === 0) {
      return res.status(404).json({ 
        message: `El proveedor ${id_proveedor} no existe en la base de datos` 
      });
    }

    // 3️⃣ Verificar que no exista ya una orden para este pedido
    const ordenExiste = await db.query(
      'SELECT id FROM orden_compra WHERE no_pedido = $1',
      [id_pedido]
    );

    if (ordenExiste.rows.length > 0) {
      return res.status(409).json({ 
        message: `Ya existe una orden de compra para el pedido ${id_pedido}`,
        id_orden_existente: ordenExiste.rows[0].id
      });
    }

    // 4️⃣ Insertar la orden de compra
    const resultOrden = await db.query(
      `INSERT INTO orden_compra (no_pedido, id_proveedor, total_orden, status, fecha, subtotal, iva)
       VALUES ($1, $2, $3, 'Realizada', $4, $5, $6)
       RETURNING id`,
      [
        id_pedido, 
        id_proveedor, 
        parseFloat(total_orden) || 0, 
        fechaFormateada, 
        parseFloat(subtotal) || 0, 
        parseFloat(iva) || 0
      ]
    );

    const idOrden = resultOrden.rows[0].id;
    console.log('✅ Orden creada con ID:', idOrden);

    // 5️⃣ Verificar que todos los productos existen
    for (const item of materiales) {
      const productoExiste = await db.query(
        'SELECT id FROM productos WHERE id = $1',
        [item.id_producto]
      );

      if (productoExiste.rows.length === 0) {
        // Revertir la inserción de la orden
        await db.query('DELETE FROM orden_compra WHERE id = $1', [idOrden]);
        
        return res.status(404).json({ 
          message: `El producto ${item.id_producto} no existe en la base de datos` 
        });
      }
    }

    // 6️⃣ Insertar los detalles de la orden
    const insertPromises = materiales.map((item) =>
      db.query(
        `INSERT INTO orden_detalle
         (id_orden, id_producto, area, precio_metro, precio_unitario, piezas, total_producto)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          idOrden,
          item.id_producto,
          parseFloat(item.area) || 0,
          parseFloat(item.precio_m2) || 0,
          parseFloat(item.precio_unitario) || 0,
          parseInt(item.piezas) || 0,
          parseFloat(item.total) || 0,
        ]
      )
    );

    await Promise.all(insertPromises);
    console.log('✅ Detalles insertados correctamente');

    // Respuesta final
    res.json({
      message: "Orden de compra registrada correctamente y marcada como 'Realizada'",
      idOrden,
      pedido: id_pedido,
      proveedor: id_proveedor,
      total: total_orden
    });

  } catch (error) {
    console.error("❌ Error al insertar orden de compra:", error);
    console.error("Stack:", error.stack);
    
    res.status(500).json({ 
      message: "Error en el servidor", 
      error: error.message,
      codigo: error.code,
      detalle: error.detail
    });
  }
});


app.post('/api/pagos', async (req, res) => {
  const { no_pedido, fecha_pago, monto, metodo_pago, forma_pago } = req.body;

  if (!no_pedido || !fecha_pago || !monto || !metodo_pago || !forma_pago) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  try {
    // ===================================
    // 1. OBTENER TOTAL DEL PEDIDO ORIGINAL
    // ===================================
    const pedidoQuery = `
      SELECT total::numeric AS total
      FROM pedidos
      WHERE no_pedido = $1
    `;
    const pedidoResult = await db.query(pedidoQuery, [no_pedido]);
    
    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    const totalOriginal = Number(pedidoResult.rows[0].total);

    // ===================================
    // 2. VERIFICAR SI HAY PRODUCTOS EN ALMACÉN
    // ===================================
    const productosQuery = `
      SELECT 
        d.cantidad as cantidad_pedido,
        d.importe,
        COALESCE(pa.cantidad::numeric, 0) as cantidad_almacen
      FROM pedido_detalle d
      LEFT JOIN orden_produccion op ON op.no_pedido_id = $1 
                                    AND op.producto_identificador = d.id_producto
                                    AND op.eliminada = false
      LEFT JOIN proceso_almacen pa ON pa.id_proceso_almacen = op.proceso_almacen_id
      WHERE d.id_pedido = $1
    `;
    
    const productosResult = await db.query(productosQuery, [no_pedido]);
    
    const tieneProductosEnAlmacen = productosResult.rows.some(
      p => Number(p.cantidad_almacen) > 0
    );

    let totalParaValidar = totalOriginal;

    // Si hay productos en almacén, recalcular el total
    if (tieneProductosEnAlmacen) {
      let totalRecalculado = 0;
      
      productosResult.rows.forEach(producto => {
        const cantidadPedido = Number(producto.cantidad_pedido) || 0;
        const cantidadAlmacen = Number(producto.cantidad_almacen) || 0;
        const importeOriginal = Number(producto.importe) || 0;
        
        const precioUnitario = cantidadPedido > 0 ? importeOriginal / cantidadPedido : 0;
        const nuevoImporte = precioUnitario * cantidadAlmacen;
        
        totalRecalculado += nuevoImporte;
      });

      const iva = totalRecalculado * 0.16;
      totalParaValidar = totalRecalculado + iva;
    }

    // ===================================
    // 3. OBTENER SUMA DE PAGOS ACTUALES
    // ===================================
    const sumaPagosQuery = `
      SELECT COALESCE(SUM(monto::numeric), 0) AS total_pagado
      FROM pagos
      WHERE no_pedido = $1
    `;
    const sumaResult = await db.query(sumaPagosQuery, [no_pedido]);
    const totalPagadoActual = Number(sumaResult.rows[0].total_pagado) || 0;

    // ===================================
    // 4. VALIDAR QUE EL NUEVO PAGO NO EXCEDA EL TOTAL
    // ===================================
    const nuevoTotalPagado = totalPagadoActual + Number(monto);
    
    if (nuevoTotalPagado > totalParaValidar) {
      return res.status(400).json({ 
        message: 'El monto excede el total del pedido',
        total: totalParaValidar.toFixed(2),
        pagado_actual: totalPagadoActual.toFixed(2),
        saldo_disponible: (totalParaValidar - totalPagadoActual).toFixed(2),
        monto_intentado: Number(monto).toFixed(2),
        tiene_productos_almacen: tieneProductosEnAlmacen
      });
    }

    // ===================================
    // 5. INSERTAR EL PAGO
    // ===================================
    const insertPagoQuery = `
      INSERT INTO pagos (no_pedido, fecha_pago, monto, metodo_pago, forma_pago)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const pagoResult = await db.query(insertPagoQuery, [
      no_pedido, 
      fecha_pago, 
      monto, 
      metodo_pago, 
      forma_pago
    ]);
    const pagoInsertado = pagoResult.rows[0];

    // ===================================
    // 6. ACTUALIZAR STATUS SI SE ALCANZA EL 50%
    // ===================================
    if (nuevoTotalPagado >= totalParaValidar * 0.5) {
      const updateStatusQuery = `
        UPDATE pedidos
        SET status = 'Autorizado'
        WHERE no_pedido = $1
      `;
      await db.query(updateStatusQuery, [no_pedido]);
    }

    // ===================================
    // 7. RESPUESTA
    // ===================================
    res.status(201).json({ 
      message: 'Pago registrado correctamente', 
      pago: pagoInsertado,
      total_referencia: totalParaValidar.toFixed(2),
      total_pagado: nuevoTotalPagado.toFixed(2),
      saldo_pendiente: (totalParaValidar - nuevoTotalPagado).toFixed(2),
      tiene_productos_almacen: tieneProductosEnAlmacen,
      nota: tieneProductosEnAlmacen 
        ? 'Total calculado con base en productos en almacén' 
        : 'Total calculado con base en pedido original (productos aún no en almacén)'
    });

  } catch (error) {
    console.error('❌ Error al insertar pago:', error);
    res.status(500).json({ message: 'Error al insertar pago' });
  }
});

app.post("/api/facturacion-envio/insertar", async (req, res) => {
    const {
        numero_pedido,
        razon_social_facturacion,
        rfc_facturacion,
        email_facturacion,
        cp_facturacion,
        uso_cfdi,
        metodo_pago,
        forma_pago,
        nombre_destinatario,
        razon_social_destinatario,
        rfc_destinatario,
        telefono_destinatario,
        domicilio_destinatario,
        colonia_destinatario,
        ciudad_destinatario,
        estado_destinatario,
        cp_destinatario,
        email_destinatario,
        paqueteria,
        tipo_entrega,
        nota
    } = req.body;
    
    console.log('Datos recibidos en servidor:', req.body);
    
    try {
        const facturacionInsertada = await db.query(
            "INSERT INTO facturacion_envio (numero_pedido, razon_social_facturacion, rfc_facturacion, email_facturacion, cp_facturacion, uso_cfdi, metodo_pago, forma_pago, nombre_destinatario, razon_social_destinatario, rfc_destinatario, telefono_destinatario, domicilio_destinatario, colonia_destinatario, ciudad_destinatario, estado_destinatario, cp_destinatario, email_destinatario, paqueteria, tipo_entrega, nota, nombre_producto) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) RETURNING *",
            [
                numero_pedido,
                razon_social_facturacion,
                rfc_facturacion,
                email_facturacion,
                cp_facturacion,
                uso_cfdi,
                metodo_pago,
                forma_pago,
                nombre_destinatario,
                razon_social_destinatario,
                rfc_destinatario,
                telefono_destinatario,
                domicilio_destinatario,
                colonia_destinatario,
                ciudad_destinatario,
                estado_destinatario,
                cp_destinatario,
                email_destinatario,
                paqueteria,
                tipo_entrega,
                nota,
                '' // nombre_producto vacío
            ]
        );
        console.log('Insertado correctamente:', facturacionInsertada.rows[0]);
        res.json(facturacionInsertada.rows);
    } catch (error) {
        console.error("Error al insertar:", error);
        
        // DEVOLVER JSON EN LUGAR DE TEXTO PLANO
        res.status(500).json({ 
            error: "Error en el servidor",
            message: error.message 
        });
    }
});


app.post('/api/ordenproduccion/limpiar-completadas', async (req, res) => {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    
    console.log('🗑️ Marcando órdenes completadas como eliminadas:', fechaLimite);

    // Usando await db.query como mencionaste
    const result = await db.query(
      `UPDATE orden_produccion 
       SET eliminada = true 
       WHERE estado_detallado = 'Completada' 
       AND fecha_completada < $1 
       AND eliminada = false`,
      [fechaLimite]
    );

    console.log(`✅ Órdenes marcadas como eliminadas: ${result.rowCount}`);
    
    res.json({
      success: true,
      message: `Se marcaron ${result.rowCount} órdenes completadas como eliminadas`,
      eliminadas: result.rowCount
    });

  } catch (error) {
    console.error('❌ Error al limpiar órdenes completadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

app.post("/api/recepcion/insertar", async (req, res) => {
  const {
    cantidadRecibida,
    calidadMedidaCarton,
    calidadrecistencia,
    certificadoCalidad,
    autorizacionRecepcion,
    autorizacionPlaneacion,
    estado,
    no_orden, // Nuevo: número de orden de producción
    id_producto // Nuevo: ID del producto
  } = req.body;

  try {
    // 1️⃣ Insertar proceso de recepción
    const query = `
      INSERT INTO proceso_recepcion (
        cantidad_recibida,
        calidad_medida_carton,
        calidad_resistencia,
        certificado_calidad,
        autorizacion_recepcion,
        autorizacion_planeacion,
        estado
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_proceso_recepcion;
    `;

    const valores = [
      cantidadRecibida,
      calidadMedidaCarton,
      calidadrecistencia,
      certificadoCalidad,
      autorizacionRecepcion,
      autorizacionPlaneacion,
      estado
    ];

    const resultado = await db.query(query, valores);
    const idProcesoRecepcion = resultado.rows[0].id_proceso_recepcion;

    // 2️⃣ Actualizar orden de producción con el ID del proceso
    if (no_orden && idProcesoRecepcion) {
      await db.query(
        `UPDATE orden_produccion 
         SET proceso_recepcion_id = $1 
         WHERE no_orden = $2`,
        [idProcesoRecepcion, no_orden]
      );
    }

 
    res.json({
      ...resultado.rows[0],
      mensaje: 'Recepción guardada y orden actualizada exitosamente'
    });

  } catch (error) {
    console.error("❌ Error al insertar recepción:", error);
    res.status(500).send("Error en el servidor");
  }
});


app.post("/api/impresion/insertar", async (req, res) => {
  const {
    cantidadImpresion, 
    calidadTono, 
    calidadMedidas, 
    autorizacionImpresion, 
    merma, 
    totalEntregadas,
    firmaOperador, 
    estado,
    no_orden, // Nuevo
    id_producto // Nuevo
  } = req.body;
  
  try {
    const cantidadValidada = isNaN(cantidadImpresion) ? 0 : parseInt(cantidadImpresion);
    const mermaValidada = isNaN(merma) ? 0 : parseFloat(merma);
    const totalValidado = isNaN(totalEntregadas) ? 0 : parseInt(totalEntregadas);

    // 1️⃣ Insertar proceso de impresión
    const impresionResult = await db.query(
      `INSERT INTO proceso_impresion 
       (cantidad_impresion, calidad_tono, calidad_medidas, autorizacion_impresion, merma, total_entregadas, firma_operador, estado) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id_proceso_impresion`,
      [cantidadValidada, calidadTono, calidadMedidas, autorizacionImpresion, mermaValidada, totalValidado, firmaOperador, estado]
    );

    const idProcesoImpresion = impresionResult.rows[0].id_proceso_impresion;

    // 2️⃣ Actualizar orden de producción
    if (no_orden && idProcesoImpresion) {
      await db.query(
        `UPDATE orden_produccion 
         SET proceso_impresion_id = $1 
         WHERE no_orden = $2`,
        [idProcesoImpresion, no_orden]
      );
    }

   

    res.json({
      ...impresionResult.rows[0],
      mensaje: 'Impresión guardada y orden actualizada exitosamente'
    });

  } catch (error) {
    console.error("Error al insertar impresión:", error);
    res.status(500).send("Error en el servidor");
  }
});




app.post("/api/procesosuaje/insertar", async (req, res) => {
  const {
    calidadMedidas, 
    calidadCuadre, 
    suaje,
    calidadMarca, 
    autorizacionSuaje,
    merma, 
    totalEntregadas, 
    firmaOperador, 
    estado,
    no_orden,
    cantidadsuaje, // ✅ Ya está incluido
  } = req.body;
  
  try {
    const mermaValidada = isNaN(merma) ? 0 : parseFloat(merma);
    const totalValidado = isNaN(totalEntregadas) ? 0 : parseInt(totalEntregadas);
    const cantidadSuajeValidada = isNaN(cantidadsuaje) ? 0 : parseInt(cantidadsuaje); // ✅ Validar cantidadsuaje

    // 1️⃣ Insertar proceso de suaje
    const suajeResult = await db.query(
      `INSERT INTO proceso_suaje 
       (calidad_medidas, calidad_cuadre, suaje, calidad_marca, autorizacion_suaje, merma, total_entregadas, firma_operador, estado, cantidadsuaje) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id_proceso_suaje`,
      [calidadMedidas, calidadCuadre, suaje, calidadMarca, autorizacionSuaje, mermaValidada, totalValidado, firmaOperador, estado, cantidadSuajeValidada] // ✅ Pasar cantidadsuaje
    );

    const idProcesoSuaje = suajeResult.rows[0].id_proceso_suaje;

    // 2️⃣ Actualizar orden de producción
    if (no_orden && idProcesoSuaje) {
      await db.query(
        `UPDATE orden_produccion 
         SET proceso_suaje_id = $1 
         WHERE no_orden = $2`,
        [idProcesoSuaje, no_orden]
      );
    }

    res.json({
      ...suajeResult.rows[0],
      mensaje: 'Suaje guardado y orden actualizada exitosamente'
    });

  } catch (error) {
    console.error("Error al insertar suaje:", error);
    res.status(500).send("Error en el servidor");
  }
});
app.post('/api/pegado/insertar', async (req, res) => {
  try {
    const {
      cantidadPegado,
      tipoPegado,
      calidadCuadre,
      calidadDesgarre,
      calidadMarcas,
      autorizacionPegado,
      firmaOperador,
      merma,
      totalEntregadas,
      estado,
      no_orden, // Nuevo
      id_producto // Nuevo
    } = req.body;

    console.log('📦 Datos recibidos para pegado:', req.body);

    // 1️⃣ Insertar proceso de pegado
    const query = `
      INSERT INTO proceso_pegado (
        cantidad_pegado, 
        tipo_pegado, 
        calidad_cuadre, 
        calidad_desgarre, 
        calidad_marcas, 
        autorizacion_pegado, 
        firma_operador, 
        merma, 
        total_entregadas, 
        estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id_pegado
    `;

    const values = [
      cantidadPegado || 0,
      tipoPegado || '',
      calidadCuadre || '',
      calidadDesgarre || '',
      calidadMarcas || '',
      autorizacionPegado || 'no',
      firmaOperador || 'no',
      merma || 0,
      totalEntregadas || 0,
      estado || 'completado'
    ];

    const result = await db.query(query, values);
    const idProcesoPegado = result.rows[0].id_pegado;

    // 2️⃣ Actualizar orden de producción
    if (no_orden && idProcesoPegado) {
      await db.query(
        `UPDATE orden_produccion 
         SET proceso_pegado_id = $1 
         WHERE no_orden = $2`,
        [idProcesoPegado, no_orden]
      );
    }


   

    console.log('✅ Pegado insertado correctamente, ID:', idProcesoPegado);

    res.json([{
      id_proceso_pegado: idProcesoPegado,
      mensaje: 'Pegado guardado y orden actualizada exitosamente'
    }]);

  } catch (error) {
    console.error('❌ Error al guardar pegado:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      detalle: error.message,
      tabla: 'proceso_pegado'
    });
  }
});

app.post('/api/armado/insertar', async (req, res) => {
  try {
    const {
      cantidad_armado,
      cantidad_entregado,
      autorizacion_ac,
      firma_operador,
      merma,
      total_entregadas,
      estado,
      no_orden, // Nuevo
      id_producto // Nuevo
    } = req.body;

    // Validar campos requeridos
    if (!cantidad_armado || !cantidad_entregado) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        detalle: 'cantidad_armado y cantidad_entregado son obligatorios'
      });
    }

    // 1️⃣ Insertar proceso de armado
    const query = `
      INSERT INTO proceso_armado (
        cantidad_recibida,
        total_entregadas,
        autorizacion,
        firma_operador,
        estado,
        merma
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING idproceso_armado
    `;

    const values = [
      cantidad_armado,
      total_entregadas || cantidad_entregado,
      autorizacion_ac || 'no',
      firma_operador || 'no',
      estado || 'completado',
      merma || 0
    ];

    const result = await db.query(query, values);
    const idProcesoArmado = result.rows[0].idproceso_armado;

    // 2️⃣ Actualizar orden de producción
    if (no_orden && idProcesoArmado) {
      await db.query(
        `UPDATE orden_produccion 
         SET proceso_armado_id = $1 
         WHERE no_orden = $2`,
        [idProcesoArmado, no_orden]
      );
    }

    

    res.json({
      success: true,
      id_proceso_armado: idProcesoArmado,
      mensaje: 'Proceso de armado guardado y orden actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al insertar proceso de armado:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
});

app.post("/api/procesoalmacen/insertar", async (req, res) => {
    const { no_orden, id_producto, cantidad, tarimas, tipo_armado, autorizacion_almacen } = req.body;
    
    try {
        // Convertir el array de tarimas a formato "1/240, 2/120"
        const tarimasConcatenadas = tarimas.map((tarima, index) => {
            return `${index + 1}/${tarima.cantidad}`;
        }).join(', ');

        const procesoalmaceninsertar = await db.query(
            "INSERT INTO proceso_almacen (cantidad, tarimas, tipo_armado, autorizacion_almacen) VALUES ($1, $2, $3, $4) RETURNING *",
            [cantidad, tarimasConcatenadas, tipo_armado, autorizacion_almacen]
        );

        const idProcesoAlmacen = procesoalmaceninsertar.rows[0].id_proceso_almacen;

        // 2️⃣ Actualizar orden de producción
        if (no_orden && idProcesoAlmacen) {
            await db.query(
                `UPDATE orden_produccion 
                 SET proceso_almacen_id = $1 
                 WHERE no_orden = $2`,
                [idProcesoAlmacen, no_orden]
            );
        }
        
        res.json({
            success: true,
            id_proceso_almacen: idProcesoAlmacen,
            mensaje: "Proceso de almacén guardado exitosamente",
            tarimas_guardadas: tarimasConcatenadas
        });
        
    } catch (error) {
        console.error("Error al insertar:", error);
        res.status(500).json({
            success: false,
            error: "Error en el servidor"
        });
    }
});


app.post("/api/calidad/insertar", async (req, res) => {
    const {
        certificado, 
        etiquetas, 
        revision, 
        autorizacionCalidad, 
        autorizacionAdministracion,
        estado,
        no_orden
    } = req.body;
    
    try {
        // Insertar en proceso_calidad (sin enviar el ID, se genera automáticamente)
        const calidadinsertar = await db.query(
            "INSERT INTO proceso_calidad (certificado, etiquetas, revision, autorizacion_calidad, autorizacion_administracion, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [certificado, etiquetas, revision, autorizacionCalidad, autorizacionAdministracion, estado]
        );

        const idProcesoCalidad = calidadinsertar.rows[0].idproceso_calidad;

        // Actualizar orden de producción si se proporciona no_orden
        if (no_orden && idProcesoCalidad) {
            await db.query(
                `UPDATE orden_produccion 
                 SET proceso_calidad_id = $1 
                 WHERE no_orden = $2`,
                [idProcesoCalidad, no_orden]
            );
        }
        
        res.json({
            success: true,
            id_proceso_calidad: idProcesoCalidad,
            mensaje: "Proceso de calidad guardado exitosamente",
            datos: calidadinsertar.rows[0]
        });
        
    } catch (error) {
        console.error("Error al insertar:", error);
        res.status(500).json({
            success: false,
            error: "Error en el servidor: " + error.message
        });
    }
});

app.post("/api/envio/insertar", async (req, res) => {
  const {
    operador, 
    observaciones, 
    totalEnvio, 
    vehiculo, 
    estado,
    merma,
    no_orden,
    id_producto
  } = req.body;
  
  try {
    const mermaValidada = isNaN(merma) ? 0 : parseFloat(merma);
    const totalValidado = isNaN(totalEnvio) ? 0 : parseInt(totalEnvio);

    // 1️⃣ Insertar proceso de envío
    const envioResult = await db.query(
      `INSERT INTO proceso_envio 
       (operador, observaciones, total_envio, vehiculo, estado, merma) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id_proceso_envio`,
      [operador, observaciones, totalValidado, vehiculo, estado, mermaValidada]
    );

    const idProcesoEnvio = envioResult.rows[0].id_proceso_envio;

    // 2️⃣ Actualizar orden de producción
    if (no_orden && idProcesoEnvio) {
      await db.query(
        `UPDATE orden_produccion 
         SET proceso_envio_id = $1 
         WHERE no_orden = $2`,
        [idProcesoEnvio, no_orden]
      );
    }

    res.json({
      id_proceso_envio: idProcesoEnvio,
      mensaje: 'Envío guardado y orden actualizada exitosamente'
    });

  } catch (error) {
    console.error("Error al insertar envío:", error);
    res.status(500).send("Error en el servidor");
  }
});

app.post('/api/auth/validar-usuario', async (req, res) => {
  try {
    const { numeroEmpleado, contrasenia } = req.body;

    console.log('🔐 Validando credenciales para:', numeroEmpleado);

    // Validación básica
    if (!numeroEmpleado || !contrasenia) {
      return res.status(400).json({ 
        valido: false, 
        error: 'Número de empleado y contraseña requeridos' 
      });
    }

    // Buscar usuario en la base de datos
    const result = await db.query(
      'SELECT id, correo, contrasenia, rol, numeroempleado, nombre, apellido FROM usuarios WHERE numeroempleado = $1', 
      [numeroEmpleado]
    );

    if (result.rows.length === 0) {
      console.log('❌ Usuario no encontrado:', numeroEmpleado);
      return res.status(404).json({ 
        valido: false, 
        error: 'Usuario no encontrado' 
      });
    }

    const usuario = result.rows[0];
    console.log('👤 Usuario encontrado:', usuario.nombre);

    // Verificar contraseña con bcrypt
    const contraseniaValida = await bcrypt.compare(contrasenia, usuario.contrasenia);

    console.log('🔑 Resultado verificación contraseña:', contraseniaValida);

    if (!contraseniaValida) {
      return res.status(401).json({ 
        valido: false, 
        error: 'Contraseña incorrecta' 
      });
    }

    // Éxito - devolver usuario sin contraseña
    const { contrasenia: _, ...usuarioSinPassword } = usuario;
    
    console.log('✅ Credenciales válidas para:', usuario.nombre);
    
    res.json({
      valido: true,
      usuario: usuarioSinPassword
    });

  } catch (error) {
    console.error('💥 Error en validación:', error);
    res.status(500).json({ 
      valido: false, 
      error: 'Error interno del servidor' 
    });
  }
});

app.post("/api/ordenproduccion/insertar", async (req, res) => {
  const {
    procesoRecepcionId,
    procesoSuajeId,
    procesoArmadoId,
    procesoEnvioId,
    procesoPegadoId,
    procesoImpresionId,
    procesoCalidadId,
    procesoAlmacenId,
    productoIdentificador,
    fecha,
    estado,
    noPedidoId,
  } = req.body;

  try {
    const lastResult = await db.query(`
      SELECT no_orden FROM orden_produccion
      ORDER BY no_orden DESC
      LIMIT 1
    `);

    let nextNumber = 1;
    if (lastResult.rows.length > 0) {
      const lastNo = lastResult.rows[0].no_orden;
      const lastNum = parseInt(lastNo.split("-")[1]);
      nextNumber = lastNum + 1;
    }

    const noOrden = `OP-${String(nextNumber).padStart(3, "0")}`;

    const result = await db.query(
      `
      INSERT INTO orden_produccion (
        no_orden,
        proceso_recepcion_id,
        proceso_suaje_id,
        proceso_armado_id,
        proceso_envio_id,
        proceso_pegado_id,
        proceso_impresion_id,
        proceso_calidad_id,
        proceso_almacen_id,
        producto_identificador,
        fecha,
        estado,
        no_pedido_id
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      RETURNING no_orden
      `,
      [
        noOrden || null,
        procesoRecepcionId || null,
        procesoSuajeId || null,
        procesoArmadoId || null,
        procesoEnvioId || null,
        procesoPegadoId || null,
        procesoImpresionId || null,
        procesoCalidadId || null,
        procesoAlmacenId || null,
        productoIdentificador || null,
        fecha || null,
        estado || null,
        noPedidoId || null,
      ]
    );

    res.json({ noOrden: result.rows[0].no_orden });
  } catch (error) {
    console.error("Error al insertar orden de producción:", error);
    res.status(500).json({ error: error.message });
  }
});


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Busqueda por id

app.get('/api/produccion/detalle/:no_orden', async (req, res) => {
  const { no_orden } = req.params;

  try {
    const query = `
      SELECT DISTINCT ON (p.identificador)
        op.producto_identificador AS id_producto,
        p.producto,
        p.ancho_carton,
        p.largo_carton,
        p.ancho_int,
        p.largo_int,
        p.alto_int,
        p.ceja,
        p.guia,
        p.tipo,
        p.marcas,
        p.grabado,
        p.cantidad_tarima,
        p.empaque,
        p.paquete,
        m.material,
        m.flauta,
        m.resistencia,
        pd.cantidad,
        od.piezas,
        ARRAY_AGG(DISTINCT t.gcmi) FILTER (WHERE t.gcmi IS NOT NULL) AS tintas
      FROM orden_produccion op
      JOIN pedidos ped
        ON op.no_pedido_id = ped.no_pedido
      JOIN pedido_detalle pd
        ON pd.id_pedido = ped.no_pedido
       AND pd.id_producto = op.producto_identificador
      JOIN productos p
        ON op.producto_identificador = p.identificador
      JOIN materiales m
        ON p.clave_material = m.clave
      LEFT JOIN orden_detalle od
        ON od.id_producto = op.producto_identificador
       AND od.id_orden IN (SELECT id FROM orden_compra WHERE no_pedido = ped.no_pedido)
      LEFT JOIN producto_tinta pt
        ON pt.id_producto = p.identificador
      LEFT JOIN tintas t
        ON pt.id_tinta = t.id_tinta
      WHERE op.no_orden = $1
      GROUP BY p.identificador, op.producto_identificador, p.producto, p.ancho_carton, 
               p.largo_carton, p.ancho_int, p.largo_int, p.alto_int, p.ceja, p.guia, 
               p.tipo, p.marcas, p.grabado, p.cantidad_tarima, m.material, m.flauta, 
               m.resistencia, pd.cantidad, od.piezas
      ORDER BY p.identificador ASC;
    `;

    const { rows } = await db.query(query, [no_orden]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró producto para esta orden' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener producto de la orden de producción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/produccion/info-pdf/:no_orden', async (req, res) => {
  const { no_orden } = req.params;

  // Validar parámetro
  if (!no_orden) {
    return res.status(400).json({ error: 'Número de orden requerido' });
  }

  try {
    console.log('📄 Buscando datos para PDF, orden:', no_orden);

    const query = `
      SELECT 
        op.no_orden,
        op.no_pedido_id,
        op.producto_identificador,
        p.producto,
        p.cantidad_tarima,
        c.razon_social
      FROM orden_produccion op
      JOIN productos p ON op.producto_identificador = p.identificador
      JOIN clientes c ON p.clientes_num_cliente = c.num_cliente
      WHERE op.no_orden = $1
      LIMIT 1;
    `;

    const { rows } = await db.query(query, [no_orden]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    res.json(rows[0]);
    
  } catch (error) {
    console.error('❌ Error en endpoint PDF:', error);
    res.status(500).json({ 
      error: 'Error del servidor',
      detalle: error.message 
    });
  }
});

app.get('/api/folios/calidad', async (req, res) => {
  try {
    // Obtener el siguiente valor de la secuencia
    const result = await db.query("SELECT nextval('folio_calidad_seq') as numero");
    const numero = result.rows[0].numero;

    // Formatear folio: CEC-001, CEC-002, etc. (usando backticks)
    const folio = `CEC-${numero.toString().padStart(3, '0')}`;

    // Guardar folio en la tabla
    await db.query("INSERT INTO folioCertificadoCalidad (folio) VALUES ($1)", [folio]);

    res.json({ folio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando folio' });
  }
});


app.get('/api/usuarios/rol/:rol', async (req, res) => {
    try {
        const { rol } = req.params;
        
        const usuarios = await db.query(
            'SELECT id, nombre, apellido, rol FROM usuarios WHERE rol = $1',
            [rol]
        );
        
        res.json({
            success: true,
            data: usuarios.rows || usuarios
        });
        
    } catch (error) {
        console.error('Error completo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener usuarios',
            error: error.message
        });
    }
});


app.get('/api/produccion/PDF/:no_orden', async (req, res) => {
  const { no_orden } = req.params;

  try {
    const query = `
      SELECT DISTINCT ON (p.identificador)
        op.no_orden,
        op.producto_identificador AS id_producto,
        op.no_pedido_id,
        p.producto,
        p.ancho_carton,
        p.largo_carton,
        p.ancho_int,
        p.largo_int,
        p.alto_int,
        p.ceja,
        p.guia,
        p.tipo,
        p.marcas,
        p.grabado,
        p.cantidad_tarima,
        p.empaque,
        p.paquete,
        m.material,
        m.flauta,
        m.resistencia,
        pd.cantidad,
        od.piezas,
        ARRAY_AGG(DISTINCT t.gcmi) FILTER (WHERE t.gcmi IS NOT NULL) AS tintas,
        ARRAY_AGG(DISTINCT t.nombre_tinta) FILTER (WHERE t.nombre_tinta IS NOT NULL) AS nombres_tintas
      FROM orden_produccion op
      JOIN pedidos ped
        ON op.no_pedido_id = ped.no_pedido
      JOIN pedido_detalle pd
        ON pd.id_pedido = ped.no_pedido
       AND pd.id_producto = op.producto_identificador
      JOIN productos p
        ON op.producto_identificador = p.identificador
      JOIN materiales m
        ON p.clave_material = m.clave
      LEFT JOIN orden_detalle od
        ON od.id_producto = op.producto_identificador
       AND od.id_orden IN (SELECT id FROM orden_compra WHERE no_pedido = ped.no_pedido)
      LEFT JOIN producto_tinta pt
        ON pt.id_producto = p.identificador
      LEFT JOIN tintas t
        ON pt.id_tinta = t.id_tinta
      WHERE op.no_orden = $1
      GROUP BY p.identificador, op.no_orden, op.producto_identificador, op.no_pedido_id, p.producto, p.ancho_carton, 
               p.largo_carton, p.ancho_int, p.largo_int, p.alto_int, p.ceja, p.guia, 
               p.tipo, p.marcas, p.grabado, p.cantidad_tarima, m.material, m.flauta, 
               m.resistencia, pd.cantidad, od.piezas
      ORDER BY p.identificador ASC;
    `;

    const { rows } = await db.query(query, [no_orden]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró producto para esta orden' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener producto de la orden de producción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get('/api/imagenes-orden/:no_orden', async (req, res) => {
  try {
    const { no_orden } = req.params;
    console.log(`🎯 EJECUTANDO endpoint /api/imagenes-orden para: ${no_orden}`);
    console.log(`🔍 URL completa: ${req.url}`);
    
    const query = `
      SELECT 
        p.imagen_final,
        p.imagen,
        p.imagen_suaje,
        p.imagen_grabado
      FROM productos p
      INNER JOIN orden_produccion op ON p.identificador = op.producto_identificador
      WHERE op.no_orden = $1
      LIMIT 1
    `;
    
    console.log(`📊 Ejecutando query para orden: ${no_orden}`);
    const result = await db.query(query, [no_orden]);
    
    if (result.rows.length === 0) {
      console.log(`❌ No se encontró producto para orden: ${no_orden}`);
      return res.status(404).json({ error: 'Producto no encontrado para esta orden' });
    }

    const producto = result.rows[0];
    
    console.log(`📦 Producto encontrado, procesando imágenes...`);
    
    const imagenes = {
      imagen_final: producto.imagen_final ? Buffer.from(producto.imagen_final).toString('base64') : null,
      imagen: producto.imagen ? Buffer.from(producto.imagen).toString('base64') : null,
      imagen_suaje: producto.imagen_suaje ? Buffer.from(producto.imagen_suaje).toString('base64') : null,
      imagen_grabado: producto.imagen_grabado ? Buffer.from(producto.imagen_grabado).toString('base64') : null
    };
    
    console.log(`✅ Imágenes procesadas para orden ${no_orden}`);
    console.log(`📏 Tamaños: Final=${imagenes.imagen_final?.length || 0}, Normal=${imagenes.imagen?.length || 0}, Suaje=${imagenes.imagen_suaje?.length || 0}`);
    
    res.json({
      ...imagenes,
      no_orden: no_orden
    });
    
  } catch (error) {
    console.error('💥 Error en /api/imagenes-orden:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      detalle: error.message 
    });
  }
});

app.get("/api/ordenproduccion/:no_orden", async (req, res) => {
  try {
    const { no_orden } = req.params;
    
    const query = `
      SELECT 
        op.*,
        pr.estado as estado_recepcion,
        pi.estado as estado_impresion,
        ps.estado as estado_suaje,
        pp.estado as estado_pegado,
        pa.estado as estado_armado,
        pc.estado as estado_calidad,
        pe.estado as estado_envio,
        p.producto as nombre_producto
      FROM orden_produccion op
      LEFT JOIN proceso_recepcion pr ON op.proceso_recepcion_id = pr.id_proceso_recepcion
      LEFT JOIN proceso_impresion pi ON op.proceso_impresion_id = pi.id_proceso_impresion
      LEFT JOIN proceso_suaje ps ON op.proceso_suaje_id = ps.id_proceso_suaje
      LEFT JOIN proceso_pegado pp ON op.proceso_pegado_id = pp.id_pegado
      LEFT JOIN proceso_armado pa ON op.proceso_armado_id = pa.idproceso_armado
      LEFT JOIN proceso_calidad pc ON op.proceso_calidad_id = pc.idproceso_calidad
      LEFT JOIN proceso_envio pe ON op.proceso_envio_id = pe.id_proceso_envio
      LEFT JOIN productos p ON op.producto_identificador = p.identificador
      WHERE op.no_orden = $1
    `;
    
    const result = await db.query(query, [no_orden]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error("Error al obtener orden:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

app.get('/api/PDFcompleto/:no_orden', async (req, res) => {
    try {
        const { no_orden } = req.params;
        
        const query = `
            SELECT 
                op.no_orden,
                -- Proceso Recepción
                pr.id_proceso_recepcion,
                pr.cantidad_recibida as recepcion_cantidad_recibida,
                pr.calidad_medida_carton as recepcion_calidad_medida_carton,
                pr.calidad_resistencia as recepcion_calidad_resistencia,
                pr.certificado_calidad as recepcion_certificado_calidad,
                pr.autorizacion_recepcion as recepcion_autorizacion_recepcion,
                pr.autorizacion_planeacion as recepcion_autorizacion_planeacion,
                pr.estado as recepcion_estado,
                
                -- Proceso Suaje
                ps.id_proceso_suaje,
                ps.calidad_medidas as suaje_calidad_medidas,
                ps.calidad_cuadre as suaje_calidad_cuadre,
                ps.suaje as suaje_suaje,
                ps.calidad_marca as suaje_calidad_marca,
                ps.autorizacion_suaje as suaje_autorizacion_suaje,
                ps.merma as suaje_merma,
                ps.total_entregadas as suaje_total_entregadas,
                ps.firma_operador as suaje_firma_operador,
                ps.estado as suaje_estado,
                ps.cantidadsuaje as suaje_cantidadsuaje,
                
                -- Proceso Armado
                pa.idproceso_armado,
                pa.cantidad_recibida as armado_cantidad_recibida,
                pa.autorizacion as armado_autorizacion,
                pa.total_entregadas as armado_total_entregadas,
                pa.firma_operador as armado_firma_operador,
                pa.estado as armado_estado,
                pa.merma as armado_merma,
                
                -- Proceso Envío
                penv.id_proceso_envio,
                penv.operador as envio_operador,
                penv.observaciones as envio_observaciones,
                penv.total_envio as envio_total_envio,
                penv.vehiculo as envio_vehiculo,
                penv.estado as envio_estado,
                penv.merma as envio_merma,
                
                -- Proceso Pegado
                pp.id_pegado,
                pp.cantidad_pegado as pegado_cantidad_pegado,
                pp.tipo_pegado as pegado_tipo_pegado,
                pp.calidad_cuadre as pegado_calidad_cuadre,
                pp.calidad_desgarre as pegado_calidad_desgarre,
                pp.calidad_marcas as pegado_calidad_marcas,
                pp.autorizacion_pegado as pegado_autorizacion_pegado,
                pp.firma_operador as pegado_firma_operador,
                pp.merma as pegado_merma,
                pp.total_entregadas as pegado_total_entregadas,
                pp.estado as pegado_estado,
                
                -- Proceso Impresión
                pi.id_proceso_impresion,
                pi.cantidad_impresion as impresion_cantidad_impresion,
                pi.calidad_tono as impresion_calidad_tono,
                pi.calidad_medidas as impresion_calidad_medidas,
                pi.autorizacion_impresion as impresion_autorizacion_impresion,
                pi.merma as impresion_merma,
                pi.total_entregadas as impresion_total_entregadas,
                pi.firma_operador as impresion_firma_operador,
                pi.estado as impresion_estado,
                
                -- Proceso Calidad
                pc.idproceso_calidad,
                pc.certificado as calidad_certificado,
                pc.etiquetas as calidad_etiquetas,
                pc.revision as calidad_revision,
                pc.autorizacion_calidad as calidad_autorizacion_calidad,
                pc.autorizacion_administracion as calidad_autorizacion_administracion,
                pc.estado as calidad_estado,
                
                -- Proceso Almacén
                palm.id_proceso_almacen,
                palm.cantidad as almacen_cantidad,
                palm.tarimas as almacen_tarimas,
                palm.tipo_armado as almacen_tipo_armado,
                palm.autorizacion_almacen as almacen_autorizacion_almacen
                
            FROM orden_produccion op
            LEFT JOIN proceso_recepcion pr ON op.proceso_recepcion_id = pr.id_proceso_recepcion
            LEFT JOIN proceso_suaje ps ON op.proceso_suaje_id = ps.id_proceso_suaje
            LEFT JOIN proceso_armado pa ON op.proceso_armado_id = pa.idproceso_armado
            LEFT JOIN proceso_envio penv ON op.proceso_envio_id = penv.id_proceso_envio
            LEFT JOIN proceso_pegado pp ON op.proceso_pegado_id = pp.id_pegado
            LEFT JOIN proceso_impresion pi ON op.proceso_impresion_id = pi.id_proceso_impresion
            LEFT JOIN proceso_calidad pc ON op.proceso_calidad_id = pc.idproceso_calidad
            LEFT JOIN proceso_almacen palm ON op.proceso_almacen_id = palm.id_proceso_almacen
            WHERE op.no_orden = $1;
        `;
        
        const results = await db.query(query, [no_orden]);
        
        if (results.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró la orden de producción'
            });
        }

        const data = results.rows[0];
        
        // Separar la información por tabla con los alias correctos
        const respuestaSeparada = {
            success: true,
            no_orden: data.no_orden,
            recepcion: {
                id_proceso_recepcion: data.id_proceso_recepcion,
                cantidad_recibida: data.recepcion_cantidad_recibida,
                calidad_medida_carton: data.recepcion_calidad_medida_carton,
                calidad_resistencia: data.recepcion_calidad_resistencia,
                certificado_calidad: data.recepcion_certificado_calidad,
                autorizacion_recepcion: data.recepcion_autorizacion_recepcion,
                autorizacion_planeacion: data.recepcion_autorizacion_planeacion,
                estado: data.recepcion_estado
            },
            suaje: {
                id_proceso_suaje: data.id_proceso_suaje,
                calidad_medidas: data.suaje_calidad_medidas,
                calidad_cuadre: data.suaje_calidad_cuadre,
                suaje: data.suaje_suaje,
                calidad_marca: data.suaje_calidad_marca,
                autorizacion_suaje: data.suaje_autorizacion_suaje,
                merma: data.suaje_merma,
                total_entregadas: data.suaje_total_entregadas,
                firma_operador: data.suaje_firma_operador,
                estado: data.suaje_estado,
                cantidadsuaje: data.suaje_cantidadsuaje
            },
            armado: {
                idproceso_armado: data.idproceso_armado,
                cantidad_recibida: data.armado_cantidad_recibida,
                autorizacion: data.armado_autorizacion,
                total_entregadas: data.armado_total_entregadas,
                firma_operador: data.armado_firma_operador,
                estado: data.armado_estado,
                merma: data.armado_merma
            },
            envio: {
                id_proceso_envio: data.id_proceso_envio,
                operador: data.envio_operador,
                observaciones: data.envio_observaciones,
                total_envio: data.envio_total_envio,
                vehiculo: data.envio_vehiculo,
                estado: data.envio_estado,
                merma: data.envio_merma
            },
            pegado: {
                id_pegado: data.id_pegado,
                cantidad_pegado: data.pegado_cantidad_pegado,
                tipo_pegado: data.pegado_tipo_pegado,
                calidad_cuerdre: data.pegado_calidad_cuerdre,
                calidad_desgarre: data.pegado_calidad_desgarre,
                calidad_marcas: data.pegado_calidad_marcas,
                autorizacion_pegado: data.pegado_autorizacion_pegado,
                firma_operador: data.pegado_firma_operador,
                merma: data.pegado_merma,
                total_entregadas: data.pegado_total_entregadas,
                estado: data.pegado_estado
            },
            impresion: {
                id_proceso_impresion: data.id_proceso_impresion,
                cantidad_impresion: data.impresion_cantidad_impresion,
                calidad_tono: data.impresion_calidad_tono,
                calidad_medidas: data.impresion_calidad_medidas,
                autorizacion_impresion: data.impresion_autorizacion_impresion,
                merma: data.impresion_merma,
                total_entregadas: data.impresion_total_entregadas,
                firma_operador: data.impresion_firma_operador,
                estado: data.impresion_estado
            },
            calidad: {
                idproceso_calidad: data.idproceso_calidad,
                certificado: data.calidad_certificado,
                etiquetas: data.calidad_etiquetas,
                revision: data.calidad_revision,
                autorizacion_calidad: data.calidad_autorizacion_calidad,
                autorizacion_administracion: data.calidad_autorizacion_administracion,
                estado: data.calidad_estado
            },
            almacen: {
                id_proceso_almacen: data.id_proceso_almacen,
                cantidad: data.almacen_cantidad,
                tarimas: data.almacen_tarimas,
                tipo_armado: data.almacen_tipo_armado,
                autorizacion_almacen: data.almacen_autorizacion_almacen
            }
        };
        
        res.json(respuestaSeparada);
        
    } catch (error) {
        console.error('Error en endpoint PDFcompleto:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

app.get('/api/produccion/PDF/:no_orden', async (req, res) => {
  const { no_orden } = req.params;

  try {
    const query = `
      SELECT DISTINCT ON (p.identificador)
        op.no_orden,
        op.producto_identificador AS id_producto,
        op.no_pedido_id,
        p.producto,
        p.ancho_carton,
        p.largo_carton,
        p.ancho_int,
        p.largo_int,
        p.alto_int,
        p.ceja,
        p.guia,
        p.tipo,
        p.marcas,
        p.grabado,
        p.cantidad_tarima,
        p.empaque,
        p.paquete,
        m.material,
        m.flauta,
        m.resistencia,
        pd.cantidad,
        od.piezas,
        ARRAY_AGG(DISTINCT t.gcmi) FILTER (WHERE t.gcmi IS NOT NULL) AS tintas,
        ARRAY_AGG(DISTINCT t.nombre_tinta) FILTER (WHERE t.nombre_tinta IS NOT NULL) AS nombres_tintas
      FROM orden_produccion op
      JOIN pedidos ped
        ON op.no_pedido_id = ped.no_pedido
      JOIN pedido_detalle pd
        ON pd.id_pedido = ped.no_pedido
       AND pd.id_producto = op.producto_identificador
      JOIN productos p
        ON op.producto_identificador = p.identificador
      JOIN materiales m
        ON p.clave_material = m.clave
      LEFT JOIN orden_detalle od
        ON od.id_producto = op.producto_identificador
       AND od.id_orden IN (SELECT id FROM orden_compra WHERE no_pedido = ped.no_pedido)
      LEFT JOIN producto_tinta pt
        ON pt.id_producto = p.identificador
      LEFT JOIN tintas t
        ON pt.id_tinta = t.id_tinta
      WHERE op.no_orden = $1
      GROUP BY p.identificador, op.no_orden, op.productos_identificador, op.no_pedido_id, p.producto, p.ancho_carton, 
               p.largo_carton, p.ancho_int, p.largo_int, p.alto_int, p.ceja, p.guia, 
               p.tipo, p.marcas, p.grabado, p.cantidad_tarima, m.material, m.flauta, 
               m.resistencia, pd.cantidad, od.piezas
      ORDER BY p.identificador ASC;
    `;

    const { rows } = await db.query(query, [no_orden]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró producto para esta orden' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener producto de la orden de producción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.get("/api/buscarTabla/:tabla", async (request, response) => {
    try {
        const { tabla } = request.params;
        console.log(`SELECT * FROM ${tabla}`);
        const resultado = await db.query(`SELECT * FROM ${tabla}`);
        console.log(resultado.rows);
        response.json(resultado.rows); 
    } catch (error) {
        console.log(error);
    }
});

app.get("/api/usuarios", async (req, res) => {
  try {
    const query = `
      SELECT id, correo, rol, contrasenia, numeroempleado, nombre, apellido 
      FROM usuarios
    `;

    const resultado = await db.query(query);

    res.json(resultado.rows);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});


app.get('/api/producto/catalogo', async (req, res) => {
  try {
    const query = `
  SELECT
    p.identificador,               
    c.nombre_empresa,
    c.impresion,
    p.fecha,
    p.descripcion,
    p.tipo,
    p.producto,
    p.ancho_int,
    p.largo_int,
    p.alto_int,
    p.satclaveproductoservicio,
    p.satclaveunidad,
    encode(p.imagen_final, 'base64') AS imagen_final_base64,
    m.tipo AS material_tipo
  FROM productos p
  INNER JOIN clientes c ON p.clientes_num_cliente = c.num_cliente
  INNER JOIN materiales m ON p.clave_material = m.clave
  ORDER BY p.fecha ASC;
`;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error al traer productos:', error);
    res.status(500).json({ error: 'Error al traer productos' });
  }
});

// Obtener todos los clientes
app.get("/api/clientes", async (req, res) => {
    try {
        const resultado = await db.query("SELECT * FROM clientes");
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).send("Error en el servidor");
    }
});

// Obtener todas las tintas
app.get("/api/tintas", async (req, res) => {
    try {
        const resultado = await db.query("SELECT * FROM tintas");
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener tintas:", error);
        res.status(500).send("Error en el servidor");
    }
});

// Obtener todos los materiales
app.get("/api/materiales", async (req, res) => {
    try {
        const resultado = await db.query("SELECT * FROM materiales");
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener materiales:", error);
        res.status(500).send("Error en el servidor");
        }
    });

// Obtener todos los productos
app.get("/api/productos", async (req, res) => {
    try {
        const resultado = await db.query("SELECT * FROM productos");
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).send("Error en el servidor");
    }
});

app.get("/api/porcentajeCantidad", async (req, res) => {
    try {
        const resultado = await db.query("SELECT * FROM porcentaje_cantidad");
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener porcentaje:", error);
        res.status(500).send("Error en el servidor");
    }
});


// Clientes
app.get("/api/clientes/:num_cliente", async (req, res) => {
    const { num_cliente } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM clientes WHERE num_cliente = $1", [num_cliente]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener cliente:", error);
        res.send("Error en el servidor");
    }
});

app.get("/api/productos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    
    const resultado = await db.query("SELECT * FROM productos WHERE identificador = $1", [id]);
    
    if (resultado.rows.length === 0) {
      return res.status(404).send("Producto no encontrado");
    }

    const producto = resultado.rows[0];

    
    const imagenFinal = producto.imagen_final ? Buffer.from(producto.imagen_final).toString('base64') : null;
    const imagenGrabado = producto.imagen_grabado ? Buffer.from(producto.imagen_grabado).toString('base64') : null;
    const imagenSuaje = producto.imagen_suaje ? Buffer.from(producto.imagen_suaje).toString('base64') : null;
    const imagenBase = producto.imagen ? Buffer.from(producto.imagen).toString('base64') : null;

    
    const productoJson = {
      ...producto,
      imagenFinal,
      imagenGrabado,
      imagenSuaje,
      imagenBase
    };

    res.json([productoJson]);

  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).send("Error en el servidor");
  }
});


app.get("/api/productos/tintas/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await db.query(
      `SELECT t.id_tinta, t.nombre_tinta, t.gcmi
       FROM producto_tinta pt
       JOIN tintas t ON pt.id_tinta = t.id_tinta
       JOIN productos p ON pt.id_producto = p.identificador
       WHERE p.identificador = $1
       ORDER BY t.id_tinta`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).send("No se encontraron tintas para este producto");
    }

    res.json(resultado.rows);

  } catch (error) {
    console.error("Error al obtener tintas del producto:", error);
    res.status(500).send("Error en el servidor");
  }
});

// Pedidos
app.get("/api/pedidos/:no_pedido", async (req, res) => {
    const { no_pedido } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM pedidos WHERE no_pedido = $1", [no_pedido]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener pedido:", error);
        res.send("Error en el servidor");
    }
});

// Domicilio_Proveedor
app.get("/api/domicilioproveedores/:iddomicilio_proveedor", async (req, res) => {
    const { iddomicilio_proveedor } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM domicilio_proveedor WHERE iddomicilio_proveedor = $1", [iddomicilio_proveedor]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener domicilio proveedor:", error);
        res.send("Error en el servidor");
    }
});

// Proveedores
app.get("/api/proveedor/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM proveedores WHERE idproveedores = $1", [id]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener proveedor:", error);
        res.send("Error en el servidor");
    }
});

// Grabados
app.get("/api/grabados/:idgrabados", async (req, res) => {
    const { idgrabados } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM grabados WHERE idgrabados = $1", [idgrabados]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener grabado:", error);
        res.send("Error en el servidor");
    }
});

// Materiales
app.get("/api/materiales/:clave", async (req, res) => {
    const { clave } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM materiales WHERE clave = $1", [clave]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener material:", error);
        res.send("Error en el servidor");
    }
});

// Operador
app.get("/api/operador/:idoperador", async (req, res) => {
    const { idoperador } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM operador WHERE idoperador = $1", [idoperador]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener operador:", error);
        res.send("Error en el servidor");
    }
});

// Orden Producción
app.get("/api/ordenproduccion/:no_orden", async (req, res) => {
    const { no_orden } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM orden_produccion WHERE no_orden = $1", [no_orden]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener orden de producción:", error);
        res.send("Error en el servidor");
    }
});

// Proceso Almacén
app.get("/api/procesoalmacen/:idproceso_almacen", async (req, res) => {
    const { idproceso_almacen } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_almacen WHERE idproceso_almacen = $1", [idproceso_almacen]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener proceso almacen:", error);
        res.send("Error en el servidor");
    }
});

// Calidad
app.get("/api/calidad/:idproceso_calidad", async (req, res) => {
    const { idproceso_calidad } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_calidad WHERE idproceso_calidad = $1", [idproceso_calidad]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener proceso calidad:", error);
        res.send("Error en el servidor");
    }
});

// Envio
app.get("/api/envio/:id_proceso_envio", async (req, res) => {
    const { id_proceso_envio } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_envio WHERE id_proceso_envio = $1", [id_proceso_envio]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener proceso envio:", error);
        res.send("Error en el servidor");
    }
});

// Impresion
app.get("/api/impresion/:id_proceso_impresion", async (req, res) => {
    const { id_proceso_impresion } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_impresion WHERE id_proceso_impresion = $1", [id_proceso_impresion]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener impresion:", error);
        res.send("Error en el servidor");
    }
});

// Pegado
app.get("/api/pegado/:id_pegado", async (req, res) => {
    const { id_pegado } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_pegado WHERE id_pegado = $1", [id_pegado]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener pegado:", error);
        res.send("Error en el servidor");
    }
});

// Recepcion
app.get("/api/recepcion/:id_proeso_recepcion", async (req, res) => {
    const { id_proeso_recepcion } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_recepcion WHERE id_proeso_recepcion = $1", [id_proeso_recepcion]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener recepcion:", error);
        res.send("Error en el servidor");
    }
});

// Proceso Suaje
app.get("/api/procesosuaje/:id_proeso_suaje", async (req, res) => {
    const { id_proeso_suaje } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM preceso_suaje WHERE id_proeso_suaje = $1", [id_proeso_suaje]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener proceso suaje:", error);
        res.send("Error en el servidor");
    }
});

// Suajes
app.get("/api/suajes/:num_suaje", async (req, res) => {
    const { num_suaje } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM suajes WHERE num_suaje = $1", [num_suaje]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener suaje:", error);
        res.send("Error en el servidor");
    }
});

// Vehiculos
app.get("/api/vehiculos/:idvehiculos", async (req, res) => {
    const { idvehiculos } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM vehiculos WHERE idvehiculos = $1", [idvehiculos]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener vehiculo:", error);
        res.send("Error en el servidor");
    }
});

// Obtener cotización por id
app.get('/api/buscarTabla/cotizaciones/:id', async (req, res) => {
  const { id } = req.params

  // Validar que sea un número válido
  const idNum = parseInt(id)
  if (isNaN(idNum)) {
    return res.status(400).json({ error: 'ID de cotización inválido' })
  }

  try {
    const resultado = await db.query('SELECT * FROM cotizaciones WHERE id = $1', [idNum])

    if (!resultado.rows || resultado.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró la cotización' })
    }

    res.json(resultado.rows[0])
  } catch (error) {
    console.error('Error al obtener la cotización:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
})


app.get('/api/buscarTabla/pedidos/:id', async (req, res) => {
  const { id } = req.params; // <-- ya no se convierte a número

  try {
    const resultado = await db.query(
      'SELECT * FROM pedidos WHERE no_pedido = $1',
      [id]
    );

    if (!resultado.rows || resultado.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró el pedido' });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error('Error al obtener el pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



app.get('/api/pedidos/:id/detalles', async (req, res) => {
  const { id } = req.params; // Ejemplo: "P-002"

  try {
    const query = `
      SELECT 
        pd.id_pedido,
        pd.id_producto,
        pd.cantidad,  

      
        p.ancho_carton,
        p.largo_carton,
        p.marcas,

        -- Campos de la tabla materiales
        m.clave,
        m.flauta,
        m.resistencia,
        m.material,
        m.precio

      FROM pedido_detalle pd
      JOIN productos p ON pd.id_producto = p.identificador
      JOIN materiales m ON p.clave_material = m.clave
      JOIN pedidos pe ON pd.id_pedido = pe.no_pedido
      WHERE pe.no_pedido = $1
    `;

    const { rows } = await db.query(query, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'No se encontraron productos asociados a este pedido' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener productos del pedido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});



app.get('/api/detalleCotizaciones/:id_cotizacion', async (req, res) => {
  const { id_cotizacion } = req.params;
  try {
    // Consulta principal para detalle de cotización + producto + material
    const resultado = await db.query(`
      SELECT 
        dc.id,
        dc.id_cotizacion,
        dc.id_producto,
        dc.cantidad,
        dc.precio_final,
        p.producto,
        CONCAT(p.largo_int, 'x', p.ancho_int, 'x', p.alto_int) AS medidas,
        m.tipo AS material_tipo,
        m.material AS material_nombre,
        m.resistencia,
        m.flauta AS material_flauta,
        m.calibre,
        m.peso
      FROM detalle_cotizaciones dc
      JOIN productos p ON dc.id_producto = p.identificador
      LEFT JOIN materiales m ON p.clave_material = m.clave
      WHERE dc.id_cotizacion = $1
    `, [id_cotizacion]);

    // Para cada producto, obtenemos las tintas
    const detalleConTintas = await Promise.all(resultado.rows.map(async (item) => {
      const { rows: tintas } = await db.query(`
        SELECT t.id_tinta, t.gcmi, t.nombre_tinta
        FROM producto_tinta pt
        JOIN tintas t ON pt.id_tinta = t.id_tinta
        WHERE pt.id_producto = $1
      `, [item.id_producto]);

      return {
        ...item,
        tintas
      };
    }));

    res.json(detalleConTintas);
  } catch (error) {
    console.error('Error al obtener detalle de cotización:', error);
    res.status(500).json({ error: 'Error al obtener detalle de cotización' });
  }
});

// GET /api/productos/por-cliente/:clienteId
app.get('/api/productos/por-cliente/:clienteId', async (req, res) => {
  const clienteId = req.params.clienteId?.trim().toUpperCase(); // limpiar y normalizar

  if (!clienteId) return res.json([]); // cliente no enviado → arreglo vacío

  try {
    const query = `
      SELECT *
      FROM productos
      WHERE TRIM(UPPER(clientes_num_cliente)) = $1
      ORDER BY producto ASC
    `;
    const { rows } = await db.query(query, [clienteId]);

    res.json(rows); // devuelve [] si no hay productos
  } catch (error) {
    console.error('Error al obtener productos por cliente:', error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});

app.get('/api/utilidades', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        c.nombre AS categoria,
        u.rango,
        u.precio
      FROM utilidades u
      INNER JOIN categoria_cajas c
        ON u.categoria_id = c.id
      ORDER BY u.categoria_id, u.id
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener utilidades:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

//obtener datos cotizacion 
app.get('/api/cotizaciones/detalle/:idCotizacion', async (req, res) => {
  try {
    const { idCotizacion } = req.params;

    const query = `
      SELECT 
        p.identificador as id_producto,
        p.producto,
        p.largo_int,
        p.ancho_int, 
        p.alto_int,
        p.clave_material,
        m.calibre,
        dc.cantidad,
        dc.precio_final AS precio_unitario,
        CONCAT(p.largo_int, ' x ', p.ancho_int, ' x ', p.alto_int) AS medidas,
        COALESCE(pt.cantidad_tintas, 0) AS tintas
      FROM detalle_cotizaciones dc
      INNER JOIN productos p ON dc.id_producto = p.identificador
      INNER JOIN materiales m ON p.clave_material = m.clave
      LEFT JOIN (
        SELECT id_producto, COUNT(*) as cantidad_tintas 
        FROM producto_tinta 
        GROUP BY id_producto
      ) pt ON p.identificador = pt.id_producto
      WHERE dc.id_cotizacion = $1
    `;

    const { rows } = await db.query(query, [idCotizacion]);
    res.json(rows);
  } catch (error) {
    console.error('Error al traer productos:', error);
    res.status(500).json({ error: 'Error al traer productos' });
  }
});

app.get('/api/detallePedidos/:id_pedido', async (req, res) => {
  const { id_pedido } = req.params;
  try {
    // Consulta principal: detalle de pedido + producto + material
    const resultado = await db.query(`
      SELECT 
        pd.id_pedido,
        pd.id_producto,
        pd.importe,
        p.producto,
        CONCAT(p.largo_int, 'x', p.ancho_int, 'x', p.alto_int) AS medidas,
        m.tipo AS material_tipo,
        m.material AS material_nombre,
        m.resistencia,
        m.flauta AS material_flauta,
        m.calibre,
        m.peso
      FROM pedido_detalle pd
      JOIN productos p ON pd.id_producto = p.identificador
      LEFT JOIN materiales m ON p.clave_material = m.clave
      WHERE pd.id_pedido = $1
    `, [id_pedido]);

    // Para cada producto, obtenemos las tintas
    const detalleConTintas = await Promise.all(resultado.rows.map(async (item) => {
      const { rows: tintas } = await db.query(`
        SELECT t.id_tinta, t.gcmi, t.nombre_tinta
        FROM producto_tinta pt
        JOIN tintas t ON pt.id_tinta = t.id_tinta
        WHERE pt.id_producto = $1
      `, [item.id_producto]);

      return {
        ...item,
        tintas
      };
    }));

    res.json(detalleConTintas);

  } catch (error) {
    console.error('Error al obtener detalle de pedido:', error);
    res.status(500).json({ error: 'Error al obtener detalle de pedido' });
  }
});

app.get('/api/productos/empresa/:num_cliente', async (req, res) => {
  const { num_cliente } = req.params;

  try {
    const query = `
      SELECT
        -- 🔹 Datos del producto
        p.identificador,
        p.grabado,
        p.clientes_num_cliente,
        p.suajes_num_suaje,
        p.clave,
        p.fecha,
        p.descripcion,
        p.tipo,
        p.producto,
        p.guia,
        p.ancho_int,
        p.largo_int,
        p.alto_int,
        p.ceja,
        p.ancho_carton,
        p.largo_carton,
        p.marcas,
        p.pegado,
        p.clave_material,
        p.ancho_suaje,
        p.largo_suaje,
        p.corto_sep,
        p.largo_sep,
        encode(p.imagen, 'base64') AS imagen_base64, 
      
        m.clave AS material_clave,
        m.tipo AS material_tipo,
        m.material AS nombre_material,
        m.resistencia AS material_resistencia,
        m.flauta AS material_flauta,
        m.tipo_material AS material_origen,
        m.calibre AS material_calibre,
        m.peso AS material_peso,
        m.precio AS material_precio,

        -- 🔹 Datos del cliente
        c.num_cliente AS cliente_id,
        c.nombre_empresa,
        c.impresion AS impresion_cliente,
        c.razon_social,
        c.rfc,
        c.email AS cliente_email,
        c.telefono AS cliente_telefono,
        c.regimen,
        c.estado,
        c.colonia,
        c.cp,
        c.calle,
        c.num_ext,
        c.num_int,
        c.cfdi

      FROM productos p
      INNER JOIN materiales m ON p.clave_material = m.clave
      INNER JOIN clientes c ON p.clientes_num_cliente = c.num_cliente
      WHERE p.clientes_num_cliente = $1
      ORDER BY p.identificador DESC;
    `;

    const result = await db.query(query, [num_cliente]);

    // Formatear los resultados para incluir la imagen en formato usable por <img>
    const productos = result.rows.map((p) => ({
      ...p,
      imagen: p.imagen_base64
        ? `data:image/jpeg;base64,${p.imagen_base64}`
        : null,
    }));

    res.json(productos);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ message: 'Error al obtener productos' });
  }
});

app.get("/api/ordenes/verificar/:no_pedido", async (req, res) => {
  try {
    const { no_pedido } = req.params;

    if (!no_pedido) {
      return res.status(400).json({ message: "Falta el número de pedido" });
    }

    // Buscar si ya existe una orden asociada a ese pedido
    const result = await db.query(
      `SELECT id FROM orden_compra WHERE no_pedido = $1 LIMIT 1`,
      [no_pedido]
    );

    if (result.rows.length > 0) {
      return res.json({
        existe: true,
        id_orden: result.rows[0].id
      });
    }

    res.json({ existe: false });
  } catch (error) {
    console.error("❌ Error al verificar orden de compra:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

app.get('/api/pedido-estado/:no_pedido', async (req, res) => {
  const { no_pedido } = req.params;
  
  try {
    // 1. Obtener pedido con totales originales
    const pedidoQuery = `
      SELECT 
        p.no_pedido, 
        p.num_cliente, 
        c.nombre_empresa, 
        c.regimen,
        p.fecha, 
        p.entrega, 
        p.observaciones, 
        P.numeroidentificacion,
        p.condiciones_pago, 
        p.subtotal::numeric AS subtotal, 
        p.iva::numeric AS iva, 
        p.total::numeric AS total,
        COALESCE(SUM(pg.monto::numeric), 0) AS pagado,
        (p.total::numeric - COALESCE(SUM(pg.monto::numeric), 0)) AS saldo_pendiente
      FROM pedidos p
      LEFT JOIN pagos pg ON TRIM(pg.no_pedido::text) = TRIM(p.no_pedido::text)
      LEFT JOIN clientes c ON c.num_cliente = p.num_cliente
      WHERE p.no_pedido = $1
      GROUP BY p.no_pedido, p.num_cliente, p.fecha, p.entrega, 
               p.observaciones, p.condiciones_pago, p.subtotal, 
               p.iva, p.total, c.nombre_empresa, c.regimen, P.numeroidentificacion
    `;
    
    const pedidoResult = await db.query(pedidoQuery, [no_pedido]);
    
    if (pedidoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    
    const pedido = pedidoResult.rows[0];

    // 2. Pagos del pedido
    const pagosQuery = `
      SELECT id_pago, no_pedido, fecha_pago, monto, metodo_pago, forma_pago
      FROM pagos
      WHERE no_pedido = $1
      ORDER BY fecha_pago DESC
    `;
    const pagosResult = await db.query(pagosQuery, [no_pedido]);
    pedido.pagos = pagosResult.rows;

    // 3. Productos con cantidad de almacén
    const productosQuery = `
      SELECT 
        d.id_producto, 
        d.cantidad as cantidad_pedido,
        d.importe::numeric as importe, 
        pr.producto, 
        pr. clave,
        pr.satclaveunidad,
        pr.satclaveproductoservicio,
        pr.ancho_int, 
        pr.largo_int, 
        pr.alto_int, 
        pr.clave_material,
        COALESCE(pa.cantidad::numeric, 0) as cantidad_almacen
      FROM pedido_detalle d
      JOIN productos pr ON pr.identificador = d.id_producto
      LEFT JOIN orden_produccion op ON op.no_pedido_id = $1 
                                    AND op.producto_identificador = d.id_producto
                                    AND op.eliminada = false
      LEFT JOIN proceso_almacen pa ON pa.id_proceso_almacen = op.proceso_almacen_id
      WHERE d.id_pedido = $1
    `;
    
    const productosResult = await db.query(productosQuery, [no_pedido]);
    
    // 4. Verificar si hay productos en almacén
    const tieneProductosEnAlmacen = productosResult.rows.some(
      p => Number(p.cantidad_almacen) > 0
    );

    // 5. SOLO RECALCULAR SI HAY PRODUCTOS EN ALMACÉN
    if (tieneProductosEnAlmacen) {
      let nuevoSubtotal = 0;
      
      const productosConRecalculo = productosResult.rows.map(producto => {
        const cantidadPedido = Number(producto.cantidad_pedido) || 0;
        const cantidadAlmacen = Number(producto.cantidad_almacen) || 0;
        const importeOriginal = Number(producto.importe) || 0;
        
        // Precio unitario
        const precioUnitario = cantidadPedido > 0 ? importeOriginal / cantidadPedido : 0;
        
        // Nuevo importe
        const nuevoImporte = precioUnitario * cantidadAlmacen;
        
        nuevoSubtotal += nuevoImporte;
        
        return {
          ...producto,
          cantidad_pedido: cantidadPedido,
          cantidad_almacen: cantidadAlmacen,
          precio_unitario: precioUnitario.toFixed(4),
          importe_recalculado: nuevoImporte.toFixed(2),
          importe_original: importeOriginal
        };
      });

      // Calcular IVA y total recalculados
      const nuevoIva = nuevoSubtotal * 0.16;
      const nuevoTotal = nuevoSubtotal + nuevoIva;
      const pagadoTotal = Number(pedido.pagado) || 0;
      const nuevoSaldoPendiente = nuevoTotal - pagadoTotal;

      // Guardar valores originales y actualizar con recalculados
      pedido.subtotal_original = Number(pedido.subtotal).toFixed(2);
      pedido.iva_original = Number(pedido.iva).toFixed(2);
      pedido.total_original = Number(pedido.total).toFixed(2);
      
      pedido.subtotal = nuevoSubtotal.toFixed(2);
      pedido.iva = nuevoIva.toFixed(2);
      pedido.total = nuevoTotal.toFixed(2);
      pedido.saldo_pendiente = nuevoSaldoPendiente.toFixed(2);
      pedido.productos = productosConRecalculo;
      
    } else {
      // ✅ SI NO HAY PRODUCTOS EN ALMACÉN, USAR VALORES ORIGINALES
      pedido.subtotal = Number(pedido.subtotal).toFixed(2);
      pedido.iva = Number(pedido.iva).toFixed(2);
      pedido.total = Number(pedido.total).toFixed(2);
      pedido.saldo_pendiente = Number(pedido.saldo_pendiente).toFixed(2);
      
      // Agregar información de productos sin recálculo
      pedido.productos = productosResult.rows.map(p => ({
        ...p,
        cantidad_pedido: Number(p.cantidad_pedido) || 0,
        cantidad_almacen: Number(p.cantidad_almacen) || 0,
        importe: Number(p.importe) || 0
      }));
    }

    pedido.puede_generar_pdf = tieneProductosEnAlmacen;

    res.json(pedido);
    
  } catch (error) {
    console.error('❌ Error al obtener estado de cuenta:', error);
    res.status(500).json({ message: 'Error al obtener estado de cuenta', error: error.message });
  }
});

app.get("/api/detalle_cotizaciones/:id_producto/:cantidad", async (req, res) => {
  try {
    const { id_producto, cantidad } = req.params;

    const query = `
      SELECT 
        precio_final
      FROM detalle_cotizaciones
      WHERE id_producto = $1 AND cantidad = $2
      LIMIT 1;
    `;

    const result = await db.query(query, [id_producto, cantidad]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No se encontró un precio_final para esa cantidad del producto.",
      });
    }

    res.json({ precio_final: result.rows[0].precio_final });
  } catch (error) {
    console.error("❌ Error al obtener precio_final:", error);
    res.status(500).json({ message: "Error al obtener precio_final" });
  }
});

app.get("/api/pedidos-pendientes", async (req, res) => {
  try {
    const query = `
      SELECT 
        p.no_pedido,
        p.total::numeric AS total,
        COALESCE(SUM(pg.monto::numeric), 0) AS pagado,
        (p.total::numeric - COALESCE(SUM(pg.monto::numeric), 0)) AS saldo_pendiente
      FROM pedidos p
      LEFT JOIN pagos pg ON TRIM(pg.no_pedido::text) = TRIM(p.no_pedido::text)
      GROUP BY p.no_pedido, p.total
      HAVING (p.total::numeric - COALESCE(SUM(pg.monto::numeric), 0)) > 0
      ORDER BY p.no_pedido;
    `;

    const result = await db.query(query);
    console.log("📦 Pedidos pendientes:", result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al obtener pedidos pendientes:", error);
    res.status(500).json({ message: "Error al obtener pedidos pendientes" });
  }
});


app.get ("/api/facturacion-envio/todos", async (req , res)=>{
    try{
const resultado= await db.query("Select* from facturacion_envio");
res.json(resultado.rows);
} catch (error) {
    console.error("Error al obtener personajes:", error);
    }
} );

app.get("/api/facturacion-envio/:numero_pedido", async (req, res) => {
    const { numero_pedido } = req.params;
    try {
        const resultado = await db.query("SELECT * FROM facturacion_envio WHERE numero_pedido = $1", [numero_pedido]);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener cliente:", error);
        res.send("Error en el servidor");
    }
});

app.get('/api/remision/:id_pedido', async (req, res) => {
    const { id_pedido } = req.params;

    try {
        const remision = await db.query(
            'SELECT * FROM facturacion_envio WHERE numero_pedido = $1',
            [id_pedido]
        );

        if (remision.rows.length === 0) {
            return res.status(404).json({ message: 'No existe remisión para este pedido' });
        }

        res.json(remision.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener remisión' });
    }
});


app.get('/api/tablero-produccion', async (req, res) => {
  try {
    const query = `
      SELECT 
        -- Información del Pedido
        p.no_pedido,
        p.num_cliente,
        oc.id AS orden_compra_id,
        p.fecha as fecha_pedido,
        p.status,
        
        -- Información del Producto
        pd.id_producto,
        pr.producto as nombre_producto,
        pr.clave as clave_producto,
        pd.cantidad as cantidad_pedido,
        pd.importe,
        
        -- Información de Orden de Producción
        op.no_orden,
        op.fecha as fecha_orden,
        op.estado_detallado as estado_orden,
        op.fecha_inicio,
        op.fecha_completada,
        
        -- Cantidades en cada proceso
        COALESCE(pr_rec.cantidad_recibida, 0) as cantidad_recepcion,
        COALESCE(pr_imp.total_entregadas, 0) as cantidad_impresion,
        COALESCE(pr_sua.total_entregadas, 0) as cantidad_suaje,
        COALESCE(pr_peg.total_entregadas, 0) as cantidad_pegado,
        COALESCE(pr_arm.total_entregadas, 0) as cantidad_armado,
        COALESCE(pr_alm.cantidad, 0) as cantidad_almacen,
        
        -- IDs de procesos (para edición futura si es necesario)
        op.proceso_recepcion_id,
        op.proceso_impresion_id,
        op.proceso_suaje_id,
        op.proceso_pegado_id,
        op.proceso_armado_id,
        op.proceso_almacen_id,
        
        -- Cliente
        c.nombre_empresa
        
      FROM pedidos p
      INNER JOIN pedido_detalle pd ON pd.id_pedido = p.no_pedido
      INNER JOIN productos pr ON pr.identificador = pd.id_producto

      LEFT JOIN LATERAL ( SELECT id FROM orden_compra  WHERE no_pedido = p.no_pedido ORDER BY fecha DESC LIMIT 1) oc ON true


      LEFT JOIN clientes c ON c.num_cliente = p.num_cliente
      LEFT JOIN orden_produccion op ON op.no_pedido_id = p.no_pedido 
                                     AND op.producto_identificador = pd.id_producto
                                     AND op.eliminada = false
      
      -- Joins con los procesos
      LEFT JOIN proceso_recepcion pr_rec ON pr_rec.id_proceso_recepcion = op.proceso_recepcion_id
      LEFT JOIN proceso_impresion pr_imp ON pr_imp.id_proceso_impresion = op.proceso_impresion_id
      LEFT JOIN proceso_suaje pr_sua ON pr_sua.id_proceso_suaje = op.proceso_suaje_id
      LEFT JOIN proceso_pegado pr_peg ON pr_peg.id_pegado = op.proceso_pegado_id
      LEFT JOIN proceso_armado pr_arm ON pr_arm.idproceso_armado = op.proceso_armado_id
      LEFT JOIN proceso_almacen pr_alm ON pr_alm.id_proceso_almacen = op.proceso_almacen_id
      
      WHERE p.status != 'Cancelado'
      ORDER BY p.fecha DESC, op.no_orden DESC
    `;
    
    const result = await db.query(query);
    
    // Procesar datos para agregar información adicional
    const datos = result.rows.map(row => ({
      ...row,
      // Calcular porcentaje de avance
      porcentaje_avance: calcularPorcentajeAvance(row),
      // Determinar si puede imprimir estado de cuenta
      puede_estado_cuenta: Number(row.cantidad_almacen) > 0,
      // Determinar si puede facturar
      puede_facturar: Number(row.cantidad_almacen) > 0 && row.status === 'Autorizado'
    }));
    
    res.json(datos);
    
  } catch (error) {
    console.error('❌ Error al obtener tablero de producción:', error);
    res.status(500).json({ message: 'Error al obtener tablero de producción', error: error.message });
  }
});

// Endpoint para obtener folio consecutivo
app.get('/api/folios/remision', async (req, res) => {
  try {
    // Obtener el siguiente valor de la secuencia
    const result = await db.query("SELECT nextval('folio_remision_seq') as numero");
    const numero = result.rows[0].numero;

    // Formatear folio: R-001, R-002, etc.
    const folio = `R-${numero.toString().padStart(3, '0')}`;

    // Guardar folio en la tabla
    await db.query("INSERT INTO remisiones (folio) VALUES ($1)", [folio]);

    res.json({ folio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando folio' });
  }
});

app.get('/api/folios/calidad', async (req, res) => {
  try {
    // Obtener el siguiente valor de la secuencia
    const result = await db.query("SELECT nextval('folio_calidad_seq') as numero");
    const numero = result.rows[0].numero;

    // Formatear folio: R-001, R-002, etc.
    const folio = `R-${numero.toString().padStart(3, '0')}`;

    // Guardar folio en la tabla
    await db.query("INSERT INTO folioCertificadoCalidad (folio) VALUES ($1)", [folio]);

    res.json({ folio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generando folio' });
  }
});


function calcularPorcentajeAvance(row) {
  const cantidadPedido = Number(row.cantidad_pedido) || 0;
  if (cantidadPedido === 0) return 0;
  
  const cantidadAlmacen = Number(row.cantidad_almacen) || 0;
  const porcentaje = (cantidadAlmacen / cantidadPedido) * 100;
  
  return Math.min(Math.round(porcentaje), 100);
}

app.get('/api/detallePedidos/:id_pedido', async (req, res) => {
  const { id_pedido } = req.params;
  try {
    const resultado = await db.query(`
      SELECT 
        pd.id_pedido,
        pd.id_producto,
        pd.importe,
        p.producto,
        CONCAT(p.largo_int, 'x', p.ancho_int, 'x', p.alto_int) AS medidas,
        m.tipo AS material_tipo,
        m.material AS material_nombre,
        m.resistencia,
        m.flauta AS material_flauta,
        m.calibre,
        m.peso
      FROM pedido_detalle pd
      JOIN productos p ON pd.id_producto = p.identificador
      LEFT JOIN materiales m ON p.clave_material = m.clave
      WHERE pd.id_pedido = $1
    `, [id_pedido]);

    const detalleConTintas = await Promise.all(resultado.rows.map(async (item) => {
      const { rows: tintas } = await db.query(`
        SELECT t.id_tinta, t.gcmi, t.nombre_tinta
        FROM producto_tinta pt
        JOIN tintas t ON pt.id_tinta = t.id_tinta
        WHERE pt.id_producto = $1
      `, [item.id_producto]);

      return {
        ...item,
        tintas
      };
    }));

    res.json(detalleConTintas);

  } catch (error) {
    console.error('Error al obtener detalle de pedido:', error);
    res.status(500).json({ error: 'Error al obtener detalle de pedido' });
  }
});


app.get("/api/produccion/verificar/:no_pedido/:id_producto", async (req, res) => {
  try {
    const { no_pedido, id_producto } = req.params;

    if (!no_pedido || !id_producto) {
      return res.status(400).json({ message: "Faltan parámetros" });
    }

    const result = await db.query(
      `SELECT no_orden FROM orden_produccion
       WHERE no_pedido_id = $1 AND producto_identificador = $2
       LIMIT 1`,
      [no_pedido, id_producto]
    );

    if (result.rows.length > 0) {
      return res.json({
        existe: true,
        id_orden: result.rows[0].no_orden,
      });
    }

    res.json({ existe: false });
  } catch (error) {
    console.error("❌ Error al verificar orden de producción:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});



//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// Actualizar Clientes
app.put("/api/clientes/actualizar/:num_cliente", async (req, res) => {
    const { num_cliente } = req.params;
    const { nombre_empresa, impresion, razon_social, rfc, email, telefono, regimen, cfdi, estado, colonia, cp, calle, num_ext, num_int } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE clientes SET nombre_empresa=$1, impresion=$2, razon_social=$3, rfc=$4, email=$5, telefono=$6, regimen=$7, cfdi=$8, estado=$9, colonia=$10, cp=$11, calle=$12, num_ext=$13, num_int=$14 WHERE num_cliente=$15 RETURNING *",
            [nombre_empresa, impresion, razon_social, rfc, email, telefono, regimen, cfdi, estado, colonia, cp, calle, num_ext, num_int, num_cliente]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar cliente:", error);
        res.send("Error en el servidor");
    }
});

app.put("/api/porcentajeCantidad/actualizar/:id", async (req, res) => {
  const { id } = req.params;
  const { porcentaje } = req.body;

  try {
    const resultado = await db.query(
      "UPDATE porcentaje_cantidad SET porcentaje = $1 WHERE id = $2 RETURNING *",
      [porcentaje, id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).send("No se encontró el porcentaje con ese ID");
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar porcentaje:", error);
    res.status(500).send("Error en el servidor");
  }
});

app.put("/api/general/actualizar/:tabla/:id", async (req, res) => {
  const { tabla, id } = req.params;
  const { precio } = req.body;

  
  const tablasPermitidas = [
    "tinta_cantidad",
    "maquina_cantidad",
    "pegado_cantidad",
    "envio_cantidad",
    "fijos_cantidad",
    "utilidades"
  ];

  if (!tablasPermitidas.includes(tabla)) {
    return res.status(400).send("Tabla no permitida");
  }

  try {
    const query = `UPDATE ${tabla} SET precio = $1 WHERE id = $2 RETURNING *`;
    const resultado = await db.query(query, [precio, id]);

    if (resultado.rowCount === 0) {
      return res.status(404).send("No se encontró el registro con ese ID");
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar precio:", error);
    res.status(500).send("Error en el servidor");
  }
});


// Actualizar Productos

app.put("/api/productos/actualizar/:identificador", upload.fields([
  { name: 'imagenFinal' },
  { name: 'imagenGrabado' },
  { name: 'imagenBase' },
  { name: 'imagenSuaje' }
]), async (req, res) => {
  const { identificador } = req.params;

  try {
    const {
      grabado, num_cliente, clave_material, suajes_num_suaje,
      fecha, descripcion, tipo, producto, guia,
      ancho_int, largo_int, alto_int, ceja,
      ancho_carton, largo_carton, marcas, pegado,
      ancho_suaje, largo_suaje, corto_sep, largo_sep,satclaveproductoservicio, satclaveunidad, empaque, paqX, cantidad, tintas
    } = req.body;

    // Función para convertir a número o null
    const parseNumber = value => (value !== '' && value !== undefined ? parseFloat(value) : null);

    // Preparar campos a actualizar
    const camposActualizar = {
      grabado,
      num_cliente,
      clave_material,
      suajes_num_suaje: parseNumber(suajes_num_suaje),
      fecha,
      descripcion,
      tipo,
      producto,
      guia,
      ancho_int: parseNumber(ancho_int),
      largo_int: parseNumber(largo_int),
      alto_int: parseNumber(alto_int),
      ceja: parseNumber(ceja),
      ancho_carton: parseNumber(ancho_carton),
      largo_carton: parseNumber(largo_carton),
      marcas,
      pegado,
      ancho_suaje: parseNumber(ancho_suaje),
      largo_suaje: parseNumber(largo_suaje),
      corto_sep: parseNumber(corto_sep),
      largo_sep: parseNumber(largo_sep),
      satclaveproductoservicio,
      satclaveunidad,
      empaque,
      paquete: paqX,
      cantidad_tarima: parseNumber(cantidad)
    };

    // Manejo opcional de imágenes
    if (req.files['imagenFinal']) camposActualizar.imagen_final = req.files['imagenFinal'][0].buffer;
    if (req.files['imagenGrabado']) camposActualizar.imagen_grabado = req.files['imagenGrabado'][0].buffer;
    if (req.files['imagenBase']) camposActualizar.imagen = req.files['imagenBase'][0].buffer;
    if (req.files['imagenSuaje']) camposActualizar.imagen_suaje = req.files['imagenSuaje'][0].buffer;

    // Eliminar campos undefined
    Object.keys(camposActualizar).forEach(key => {
      if (camposActualizar[key] === undefined) delete camposActualizar[key];
    });

    // Construir query dinámico
    const keys = Object.keys(camposActualizar);
    if (keys.length > 0) {
      const values = Object.values(camposActualizar);
      const setString = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      await db.query(`UPDATE productos SET ${setString} WHERE identificador = $${keys.length + 1}`, [...values, identificador]);
    }

    // Actualizar tintas (solo si se envían)
    if (tintas !== undefined) {
      const tintasArray = JSON.parse(tintas);
      if (Array.isArray(tintasArray)) {
        // Primero eliminar las existentes
        await db.query('DELETE FROM producto_tinta WHERE id_producto = $1', [identificador]);

        // Insertar nuevas
        for (let id_tinta of tintasArray) {
          const idTintaNum = parseNumber(id_tinta);
          if (idTintaNum !== null) {
            await db.query('INSERT INTO producto_tinta (id_producto, id_tinta) VALUES ($1, $2)', [identificador, idTintaNum]);
          }
        }
      }
    }

    // ✅ Solo se envía la respuesta una vez
    res.json({ message: 'Producto actualizado correctamente' });

  } catch (error) {
    console.error("Error al actualizar producto:", error);

    // Evitar enviar respuesta si ya se envió
    if (!res.headersSent) {
      res.status(500).json({ error: "Error en el servidor al actualizar producto" });
    }
  }
});


app.put("/api/proveedores/actualizar/:idproveedores", async (req, res) => {
    const { idproveedores } = req.params;
    const { nombre, ejecutivo_ventas, correo, categoria, telefono, estado, colonia, cp, calle, numero_exterior, numero_interior, rfc, cuenta_bancaria, banco, clabe, beneficiario } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE proveedores SET nombre=$1, ejecutivo_ventas=$2, correo=$3, categoria=$4, telefono=$5, estado=$6, colonia=$7, cp=$8, calle=$9, numero_exterior=$10, numero_interior=$11, rfc=$12, cuenta_bancaria=$13, banco=$14, clabe=$15, beneficiario=$16 WHERE idproveedores=$17 RETURNING *",
            [nombre, ejecutivo_ventas, correo, categoria, telefono, estado, colonia, cp, calle, numero_exterior, numero_interior, rfc, cuenta_bancaria, banco, clabe, beneficiario, idproveedores]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar proveedor:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Grabados

app.put("/api/grabados/:idgrabados", async (req, res) => {
    const { idgrabados } = req.params;
    const { numSuaje, tintas, imagenGrabado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE grabados SET num_suaje=$1, tintas=$2, imagen_grabado=$3 WHERE idgrabados=$4 RETURNING *",
            [numSuaje, tintas, imagenGrabado, idgrabados]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar grabado:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Materiales

app.put("/api/materiales/:clave", async (req, res) => {
  const { clave } = req.params;
  const {
    material,
    tipo,
    flauta,
    resistencia,
    precio,
    tipo_material,
    calibre,
    peso
  } = req.body;

  // Validación básica (puedes ajustar según qué campos sean obligatorios)
  if (!material || !tipo || !flauta || !resistencia || precio === undefined) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  try {
    const resultado = await db.query(
      `UPDATE materiales 
       SET material=$1, tipo=$2, flauta=$3, resistencia=$4, precio=$5,
           tipo_material=$6, calibre=$7, peso=$8
       WHERE clave=$9 RETURNING *`,
      [material, tipo, flauta, resistencia, precio, tipo_material, calibre, peso, clave]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Material no encontrado" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error("Error al actualizar material:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});


// Actualizar Operador

app.put("/api/operador/:idoperador", async (req, res) => {
    const { idoperador } = req.params;
    const { nombre, puesto } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE operador SET nombre=$1, puesto=$2 WHERE idoperador=$3 RETURNING *",
            [nombre, puesto, idoperador]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar operador:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Orden Producción

app.put("/api/ordenproduccion/:no_orden", async (req, res) => {
    const { no_orden } = req.params;
    const { procesoRecepcionId, procesoSuajeId, procesoArmadoId, procesoEnvioId, procesoPegadoId, procesoImpresionId, procesoCalidadId, procesoAlmacenId, productoIdentificador, fecha, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE orden_produccion SET proceso_recepcion_id=$1, proceso_suaje_id=$2, proceso_armado_id=$3, proceso_envio_id=$4, proceso_pegado_id=$5, proceso_impresion_id=$6, proceso_calidad_id=$7, proceso_almacen_id=$8, producto_identificador=$9, fecha=$10, estado=$11 WHERE no_orden=$12 RETURNING *",
            [procesoRecepcionId, procesoSuajeId, procesoArmadoId, procesoEnvioId, procesoPegadoId, procesoImpresionId, procesoCalidadId, procesoAlmacenId, productoIdentificador, fecha, estado, no_orden]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar orden producción:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Proceso Almacén

app.put("/api/procesoalmacen/:idproceso_almacen", async (req, res) => {
    const { idproceso_almacen } = req.params;
    const { tipoArmado, cantidad } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_almacen SET tipo_armado=$1, cantidad=$2 WHERE idproceso_almacen=$3 RETURNING *",
            [tipoArmado, cantidad, idproceso_almacen]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar proceso almacen:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Calidad

app.put("/api/calidad/:idproceso_calidad", async (req, res) => {
    const { idproceso_calidad } = req.params;
    const { certificado, etiquetas, revision, autorizacionCalidad, autorizacionAdamistracion, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_calidad SET certificado=$1, etiquetas=$2, revision=$3, autorizacion_calidad=$4, autorizacion_administracion=$5, estado=$6 WHERE idproceso_calidad=$7 RETURNING *",
            [certificado, etiquetas, revision, autorizacionCalidad, autorizacionAdamistracion, estado, idproceso_calidad]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar calidad:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Envio

app.put("/api/envio/:id_proceso_envio", async (req, res) => {
    const { id_proceso_envio } = req.params;
    const { operadorIdOperador, operador, observaciones, totalEnvio, vehiculo, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_envio SET operador_idoperador=$1, operador=$2, observaciones=$3, total_envio=$4, vehiculo=$5, estado=$6 WHERE id_proceso_envio=$7 RETURNING *",
            [operadorIdOperador, operador, observaciones, totalEnvio, vehiculo, estado, id_proceso_envio]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar envio:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Impresion

app.put("/api/impresion/:id_proceso_impresion", async (req, res) => {
    const { id_proceso_impresion } = req.params;
    const { cantidadImpresion, calidadTono, calidadMedidas, autorizacionImpresion, merma, totalEntrgadas, firmaOperador, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_impresion SET cantidad_impresion=$1, calidad_tono=$2, calidad_medidas=$3, autorizacion_impresion=$4, merma=$5, total_entrgadas=$6, firma_operador=$7, estado=$8 WHERE id_proceso_impresion=$9 RETURNING *",
            [cantidadImpresion, calidadTono, calidadMedidas, autorizacionImpresion, merma, totalEntrgadas, firmaOperador, estado, id_proceso_impresion]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar impresion:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Pegado
app.put("/api/pegado/:id_pegado", async (req, res) => {
    const { id_pegado } = req.params;
    const { calidadCuadre, calidadDesagarre, calidadMarcas, autorizacionPegado, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_pegado SET calidad_cuadre=$1, calidad_desagarre=$2, calidad_marcas=$3, autorizacion_pegado=$4, estado=$5 WHERE id_pegado=$6 RETURNING *",
            [calidadCuadre, calidadDesagarre, calidadMarcas, autorizacionPegado, estado, id_pegado]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar pegado:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Recepcion

app.put("/api/recepcion/:id_proceso_recepcion", async (req, res) => {
    const { id_proceso_recepcion } = req.params;
    const { cantidadRecibida, calidadMedidaCarton, calidadrecistencia, certificadoCalidad, autorizacionRecepcion, autorizacionPlaneacion, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_recepcion SET cantidad_recibida=$1, calidad_medida_carton=$2, calidadrecistencia=$3, certificado_calidad=$4, autorizacion_recepcion=$5, autorizacion_planeacion=$6, estado=$7 WHERE id_proceso_recepcion=$8 RETURNING *",
            [cantidadRecibida, calidadMedidaCarton, calidadrecistencia, certificadoCalidad, autorizacionRecepcion, autorizacionPlaneacion, estado, id_proceso_recepcion]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar recepcion:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Proceso Suaje
app.put("/api/procesosuaje/:id_proceso_suaje", async (req, res) => {
    const { id_proceso_suaje } = req.params;
    const { operadorIdOperador, calidadMedidas, calidadCuadre, calidadMarca, autorizacionSuaje, merma, totalEntrgadas, firmaOperador, estado } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE preceso_suaje SET operador_id_operador=$1, calidad_medidas=$2, calidad_cuadre=$3, calidad_marca=$4, autorizacion_suaje=$5, merma=$6, total_entrgadas=$7, firma_operador=$8, estado=$9 WHERE id_proceso_suaje=$10 RETURNING *",
            [operadorIdOperador, calidadMedidas, calidadCuadre, calidadMarca, autorizacionSuaje, merma, totalEntrgadas, firmaOperador, estado, id_proceso_suaje]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar proceso suaje:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Suajes

app.put("/api/suajes/:num_suaje", async (req, res) => {
    const { num_suaje } = req.params;
    const { anchoSuaje, largoSuaje, resistencia } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE suajes SET ancho_suaje=$1, largo_suaje=$2, resistencia=$3 WHERE num_suaje=$4 RETURNING *",
            [anchoSuaje, largoSuaje, resistencia, num_suaje]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar suaje:", error);
        res.send("Error en el servidor");
    }
});


// Actualizar Vehiculos

app.put("/api/vehiculos/:idvehiculos", async (req, res) => {
    const { idvehiculos } = req.params;
    const { procesoIdEnvio, marcaModelo, placa } = req.body;
    try {
        const resultado = await db.query(
            "UPDATE vehiculos SET proceso_id_envio=$1, marca_modelo=$2, placa=$3 WHERE idvehiculos=$4 RETURNING *",
            [procesoIdEnvio, marcaModelo, placa, idvehiculos]
        );
        res.json(resultado.rows[0]);
    } catch (error) {
        console.error("Error al actualizar vehiculo:", error);
        res.send("Error en el servidor");
    }
});

app.put('/api/categoria_cajas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { area_min, area_max } = req.body;
    const query = `
      UPDATE categoria_cajas
      SET area_min = $1, area_max = $2
      WHERE id = $3
      RETURNING *;
    `;
    const result = await db.query(query, [area_min, area_max, id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar caja:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.put("/api/facturacion-envio/actualizar/:numero_pedido", async (req, res) => {
    const { numero_pedido } = req.params;
    const {
        razon_social_facturacion,
        rfc_facturacion,
        email_facturacion,
        cp_facturacion,
        uso_cfdi,
        metodo_pago,
        forma_pago,
        nombre_destinatario,
        rfc_destinatario,
        telefono_destinatario,
        email_destinatario,
        domicilio_destinatario,
        colonia_destinatario,
        ciudad_destinatario,
        estado_destinatario,
        cp_destinatario,
        nombre_producto,
        paqueteria,
        cantidad,
    } = req.body;
    
    try {
        const resultado = await db.query(
            `UPDATE facturacion_envio SET 
                razon_social_facturacion=$1, rfc_facturacion=$2, email_facturacion=$3, 
                cp_facturacion=$4, uso_cfdi=$5, metodo_pago=$6, forma_pago=$7, 
                nombre_destinatario=$8, 
                rfc_destinatario=$9, telefono_destinatario=$10, email_destinatario=$11, 
                domicilio_destinatario=$12, colonia_destinatario=$13, ciudad_destinatario=$14, 
                estado_destinatario=$15, cp_destinatario=$16, nombre_producto=$17, paqueteria=$18, cantidad=$19
             WHERE numero_pedido=$20 RETURNING *`,
            [
                razon_social_facturacion,
                rfc_facturacion,
                email_facturacion,
                cp_facturacion,
                uso_cfdi,
                metodo_pago,
                forma_pago,
                nombre_destinatario,
                rfc_destinatario,
                telefono_destinatario,
                email_destinatario,
                domicilio_destinatario,
                colonia_destinatario,
                ciudad_destinatario,
                estado_destinatario,
                cp_destinatario,
                nombre_producto,
                paqueteria,
                cantidad,
                numero_pedido  // This should be $20
            ]
        );

        // Don't forget to send a response
        if (resultado.rows.length > 0) {
            res.json({ success: true, data: resultado.rows[0] });
        } else {
            res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }
        
    } catch (error) {
        console.error('Error al actualizar facturación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, rol, numeroempleado, nombre, apellido } = req.body;

    const query = `
      UPDATE usuarios
      SET correo = $1, rol = $2, numeroempleado = $3, nombre = $4, apellido = $5
      WHERE id = $6
    `;

    const valores = [correo, rol, numeroempleado, nombre, apellido, id];

    await db.query(query, valores);

    res.json({ mensaje: "Usuario actualizado correctamente" });

  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

app.put("/api/usuarios/:id/cambiar-contrasenia", async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaContrasenia } = req.body;
    
    
    const salt = await bcrypt.genSalt(10);
    const contrasenaCifrada = await bcrypt.hash(nuevaContrasenia, salt);
    
    const query = `
      UPDATE usuarios 
      SET contrasenia = $1 
      WHERE id = $2
    `;
    
    await db.query(query, [contrasenaCifrada, id]);
    res.json({ mensaje: "Contraseña actualizada" });
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    res.status(500).json({ error: "Error al actualizar contraseña" });
  }
});


app.put('/api/ordenproduccion/:no_orden/completar', async (req, res) => {
  try {
    const { no_orden } = req.params;
    
    const result = await db.query(
      `UPDATE orden_produccion 
       SET estado_detallado = 'Completada', 
           fecha_completada = NOW() 
       WHERE no_orden = $1 
       RETURNING *`,
      [no_orden]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    }

    res.json({
      success: true,
      message: 'Orden marcada como completada',
      orden: result.rows[0]
    });

  } catch (error) {
    console.error('Error al completar orden:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// DELETE por ID 

app.delete("/api/clientes/borrar/:num_cliente", async (req, res) => {
    const { num_cliente } = req.params;
    try {
        const result = await db.query("DELETE FROM clientes WHERE num_cliente = $1", [num_cliente]);
        if (result.rowCount === 0) {
            return res.status(404).send("Cliente no encontrado");
        }
        res.status(200).send("Cliente eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar cliente:", error);
        res.status(500).send("Error en el servidor");
    }
});


// Productos
app.delete("/api/productos/:identificador", async (req, res) => {
    const { identificador } = req.params;
    try {
        await db.query("DELETE FROM productos WHERE identificador = $1", [identificador]);
        res.send("Producto eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        if (error.code === "23503") { 
      res.status(409).send(
        "No se puede eliminar este producto porque está siendo usado en otra parte"
      );
    } else {
      res.status(500).send("Error en el servidor");
    }
    }
});

// Pedidos
app.delete("/api/pedidos/:no_pedido", async (req, res) => {
    const { no_pedido } = req.params;
    try {
        await db.query("DELETE FROM pedidos WHERE no_pedido = $1", [no_pedido]);
        res.send("Pedido eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar pedido:", error);
        res.send("Error en el servidor");
    }
});


// Proveedores
app.delete("/api/proveedores/borrar/:idproveedores", async (req, res) => {
    const { idproveedores } = req.params;
    try {
        await db.query("DELETE FROM proveedores WHERE idproveedores = $1", [idproveedores]);
        res.send("Proveedor eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proveedor:", error);
        res.send("Error en el servidor");
    }
});


// Materiales
app.delete("/api/materiales/borrar/:clave", async (req, res) => {
  const { clave } = req.params;
  try {
    await db.query("DELETE FROM materiales WHERE clave = $1", [clave]);
    res.status(200).send("Material eliminado correctamente");
  } catch (error) {
    console.error("Error al eliminar material:", error);

    if (error.code === "23503") { // FK violation
      res.status(409).send(
        "No se puede eliminar este material porque está siendo usado en otra parte"
      );
    } else {
      res.status(500).send("Error en el servidor");
    }
  }
});


// Operador
app.delete("/api/operador/:idoperador", async (req, res) => {
    const { idoperador } = req.params;
    try {
        await db.query("DELETE FROM operador WHERE idoperador = $1", [idoperador]);
        res.send("Operador eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar operador:", error);
        res.send("Error en el servidor");
    }
});

// Orden Producción
app.delete("/api/ordenproduccion/:no_orden", async (req, res) => {
    const { no_orden } = req.params;
    try {
        await db.query("DELETE FROM orden_produccion WHERE no_orden = $1", [no_orden]);
        res.send("Orden de producción eliminada correctamente");
    } catch (error) {
        console.error("Error al eliminar orden de producción:", error);
        res.send("Error en el servidor");
    }
});

// Proceso Almacén
app.delete("/api/procesoalmacen/:idproceso_almacen", async (req, res) => {
    const { idproceso_almacen } = req.params;
    try {
        await db.query("DELETE FROM preceso_almacen WHERE idproceso_almacen = $1", [idproceso_almacen]);
        res.send("Proceso almacén eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proceso almacén:", error);
        res.send("Error en el servidor");
    }
});

// Calidad
app.delete("/api/calidad/:idproceso_calidad", async (req, res) => {
    const { idproceso_calidad } = req.params;
    try {
        await db.query("DELETE FROM preceso_calidad WHERE idproceso_calidad = $1", [idproceso_calidad]);
        res.send("Proceso calidad eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proceso calidad:", error);
        res.send("Error en el servidor");
    }
});

// Envio
app.delete("/api/envio/:id_proceso_envio", async (req, res) => {
    const { id_proceso_envio } = req.params;
    try {
        await db.query("DELETE FROM preceso_envio WHERE id_proceso_envio = $1", [id_proceso_envio]);
        res.send("Proceso envío eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proceso envío:", error);
        res.send("Error en el servidor");
    }
});

// Impresion
app.delete("/api/impresion/:id_proceso_impresion", async (req, res) => {
    const { id_proceso_impresion } = req.params;
    try {
        await db.query("DELETE FROM preceso_impresion WHERE id_proceso_impresion = $1", [id_proceso_impresion]);
        res.send("Proceso impresión eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proceso impresión:", error);
        res.send("Error en el servidor");
    }
});

// Pegado
app.delete("/api/pegado/:id_pegado", async (req, res) => {
    const { id_pegado } = req.params;
    try {
        await db.query("DELETE FROM preceso_pegado WHERE id_pegado = $1", [id_pegado]);
        res.send("Proceso pegado eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proceso pegado:", error);
        res.send("Error en el servidor");
    }
});

// Recepcion
app.delete("/api/recepcion/:id_proeso_recepcion", async (req, res) => {
    const { id_proeso_recepcion } = req.params;
    try {
        await db.query("DELETE FROM preceso_recepcion WHERE id_proeso_recepcion = $1", [id_proeso_recepcion]);
        res.send("Recepción eliminada correctamente");
    } catch (error) {
        console.error("Error al eliminar recepción:", error);
        res.send("Error en el servidor");
    }
});

// Proceso Suaje
app.delete("/api/procesosuaje/:id_proeso_suaje", async (req, res) => {
    const { id_proeso_suaje } = req.params;
    try {
        await db.query("DELETE FROM preceso_suaje WHERE id_proeso_suaje = $1", [id_proeso_suaje]);
        res.send("Proceso suaje eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar proceso suaje:", error);
        res.send("Error en el servidor");
    }
});

// Suajes
app.delete("/api/suajes/:num_suaje", async (req, res) => {
    const { num_suaje } = req.params;
    try {
        await db.query("DELETE FROM suajes WHERE num_suaje = $1", [num_suaje]);
        res.send("Suaje eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar suaje:", error);
        res.send("Error en el servidor");
    }
});

// Vehiculos
app.delete("/api/vehiculos/:idvehiculos", async (req, res) => {
    const { idvehiculos } = req.params;
    try {
        await db.query("DELETE FROM vehiculos WHERE idvehiculos = $1", [idvehiculos]);
        res.send("Vehículo eliminado correctamente");
    } catch (error) {
        console.error("Error al eliminar vehículo:", error);
        res.send("Error en el servidor");
    }
});

app.delete("/api/tintas/borrar/:id_tinta", async (req, res) => {
    const { id_tinta } = req.params;
    try {
        await db.query("DELETE FROM tintas WHERE id_tinta = $1", [id_tinta]);
        res.send("Tinta eliminada correctamente");
    } catch (error) {
        console.error("Error al eliminar tinta:", error);
        res.send("Error en el servidor");
    }
});

app.delete("/api/cotizaciones/borrar/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Ejecutar la eliminación en la tabla cotizaciones
        const result = await db.query("DELETE FROM cotizaciones WHERE id = $1", [id]);

        // Puedes comprobar si se eliminó alguna fila
        if (result.rowCount === 0) {
            return res.status(404).send("Cotización no encontrada");
        }

        res.send("Cotización eliminada correctamente");
    } catch (error) {
        console.error("Error al eliminar cotización:", error);
        res.status(500).send("Error en el servidor");
    }
});

app.delete("/api/facturacion-envio/eliminar/:numero_pedido", async (req, res) => {
  const { numero_pedido } = req.params;
  try {
    await db.query("DELETE FROM facturacion_envio WHERE numero_pedido = $1", [numero_pedido]);
    res.status(200).json({ mensaje: "facturacion eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

app.delete("/api/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = `DELETE FROM usuarios WHERE id = $1`;
    await db.query(query, [id]);

    res.json({ mensaje: "Usuario eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});


/**
 * DELETE /api/limpiar-pedidos-completados
 * Elimina permanentemente pedidos con órdenes de producción completadas hace más de 7 días
 * incluyendo todas sus relaciones en cascada
 */
app.delete('/api/limpiar-pedidos-completados', async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🔍 Iniciando limpieza de pedidos con órdenes completadas antiguas...');
    
    // Calcular fecha límite (7 días atrás)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    const fechaLimiteISO = fechaLimite.toISOString().split('T')[0];
    
    console.log(`📅 Fecha límite: ${fechaLimiteISO}`);
    
    // 1. IDENTIFICAR ÓRDENES DE PRODUCCIÓN COMPLETADAS ANTIGUAS
    const [ordenesCompletadas] = await connection.query(`
      SELECT 
        op.no_orden,
        op.no_pedido_id,
        op.producto_identificador,
        op.estado_detallado,
        op.fecha_completada,
        op.proceso_recepcion_id,
        op.proceso_impresion_id,
        op.proceso_suaje_id,
        op.proceso_pegado_id,
        op.proceso_armado_id,
        op.proceso_almacen_id,
        op.proceso_calidad_id,
        op.proceso_envio_id,
        p.no_pedido,
        p.status as pedido_status
      FROM orden_produccion op
      INNER JOIN pedidos p ON p.no_pedido = op.no_pedido_id
      WHERE op.estado_detallado = 'Completada'
        AND op.eliminada = false
        AND op.fecha_completada < ?
      ORDER BY op.fecha_completada ASC
    `, [fechaLimiteISO]);
    
    if (ordenesCompletadas.length === 0) {
      await connection.commit();
      console.log('✅ No hay órdenes de producción completadas antiguas para eliminar');
      return res.json({ 
        success: true, 
        eliminados: 0,
        mensaje: 'No hay órdenes de producción completadas con más de 7 días',
        ordenes: []
      });
    }
    
    console.log(`📦 Órdenes completadas antiguas encontradas: ${ordenesCompletadas.length}`);
    
    // 2. AGRUPAR INFORMACIÓN PARA ELIMINACIÓN
    const idsOrdenesProduccion = ordenesCompletadas.map(op => op.no_orden);
    const pedidosAfectados = [...new Set(ordenesCompletadas.map(op => op.no_pedido_id))];
    
    // Recopilar IDs de procesos
    const idsRecepcion = ordenesCompletadas.map(op => op.proceso_recepcion_id).filter(Boolean);
    const idsImpresion = ordenesCompletadas.map(op => op.proceso_impresion_id).filter(Boolean);
    const idsSuaje = ordenesCompletadas.map(op => op.proceso_suaje_id).filter(Boolean);
    const idsPegado = ordenesCompletadas.map(op => op.proceso_pegado_id).filter(Boolean);
    const idsArmado = ordenesCompletadas.map(op => op.proceso_armado_id).filter(Boolean);
    const idsAlmacen = ordenesCompletadas.map(op => op.proceso_almacen_id).filter(Boolean);
    const idsCalidad = ordenesCompletadas.map(op => op.proceso_calidad_id).filter(Boolean);
    const idsEnvio = ordenesCompletadas.map(op => op.proceso_envio_id).filter(Boolean);
    
    console.log(`🏭 Órdenes de producción a eliminar: ${idsOrdenesProduccion.length}`);
    console.log(`📋 Pedidos afectados: ${pedidosAfectados.length}`);
    
    // 3. VERIFICAR SI HAY OTRAS ÓRDENES ACTIVAS PARA LOS MISMOS PEDIDOS
    const [ordenesActivasPorPedido] = await connection.query(`
      SELECT no_pedido_id, COUNT(*) as total_ordenes
      FROM orden_produccion
      WHERE no_pedido_id IN (?)
        AND no_orden NOT IN (?)
        AND eliminada = false
      GROUP BY no_pedido_id
    `, [pedidosAfectados, idsOrdenesProduccion]);
    
    // Pedidos que se pueden eliminar completamente (sin otras órdenes)
    const pedidosConOtrasOrdenes = new Set(
      ordenesActivasPorPedido.map(o => o.no_pedido_id)
    );
    
    const pedidosAEliminarCompleto = pedidosAfectados.filter(
      p => !pedidosConOtrasOrdenes.has(p)
    );
    
    console.log(`🗑️ Pedidos a eliminar completo: ${pedidosAEliminarCompleto.length}`);
    console.log(`⚠️ Pedidos con otras órdenes activas (solo se eliminarán órdenes específicas): ${pedidosConOtrasOrdenes.size}`);
    
    // 4. ELIMINAR EN CASCADA (ORDEN IMPORTANTE)
    
    // 4.1 Eliminar procesos
    if (idsAlmacen.length > 0) {
      await connection.query('DELETE FROM proceso_almacen WHERE id_proceso_almacen IN (?)', [idsAlmacen]);
      console.log(`✅ Eliminados ${idsAlmacen.length} registros de proceso_almacen`);
    }
    
    if (idsEnvio.length > 0) {
      await connection.query('DELETE FROM proceso_envio WHERE id_proceso_envio IN (?)', [idsEnvio]);
      console.log(`✅ Eliminados ${idsEnvio.length} registros de proceso_envio`);
    }
    
    if (idsCalidad.length > 0) {
      await connection.query('DELETE FROM proceso_calidad WHERE id_proceso_calidad IN (?)', [idsCalidad]);
      console.log(`✅ Eliminados ${idsCalidad.length} registros de proceso_calidad`);
    }
    
    if (idsArmado.length > 0) {
      await connection.query('DELETE FROM proceso_armado WHERE idproceso_armado IN (?)', [idsArmado]);
      console.log(`✅ Eliminados ${idsArmado.length} registros de proceso_armado`);
    }
    
    if (idsPegado.length > 0) {
      await connection.query('DELETE FROM proceso_pegado WHERE id_pegado IN (?)', [idsPegado]);
      console.log(`✅ Eliminados ${idsPegado.length} registros de proceso_pegado`);
    }
    
    if (idsSuaje.length > 0) {
      await connection.query('DELETE FROM proceso_suaje WHERE id_proceso_suaje IN (?)', [idsSuaje]);
      console.log(`✅ Eliminados ${idsSuaje.length} registros de proceso_suaje`);
    }
    
    if (idsImpresion.length > 0) {
      await connection.query('DELETE FROM proceso_impresion WHERE id_proceso_impresion IN (?)', [idsImpresion]);
      console.log(`✅ Eliminados ${idsImpresion.length} registros de proceso_impresion`);
    }
    
    if (idsRecepcion.length > 0) {
      await connection.query('DELETE FROM proceso_recepcion WHERE id_proceso_recepcion IN (?)', [idsRecepcion]);
      console.log(`✅ Eliminados ${idsRecepcion.length} registros de proceso_recepcion`);
    }
    
    // 4.2 Eliminar órdenes de producción completadas
    const [resultOrdenesProduccion] = await connection.query(
      'DELETE FROM orden_produccion WHERE no_orden IN (?)', 
      [idsOrdenesProduccion]
    );
    console.log(`✅ Eliminadas ${resultOrdenesProduccion.affectedRows} órdenes de producción`);
    
    // 4.3 SOLO si el pedido no tiene otras órdenes, eliminar datos relacionados
    
    let resultPagos = { affectedRows: 0 };
    let resultOrdenesCompra = { affectedRows: 0 };
    let resultDetalles = { affectedRows: 0 };
    let resultPedidos = { affectedRows: 0 };
    
    if (pedidosAEliminarCompleto.length > 0) {
      
      // Eliminar pagos
      [resultPagos] = await connection.query(
        'DELETE FROM pagos WHERE numero_pedido IN (?)', 
        [pedidosAEliminarCompleto]
      );
      if (resultPagos.affectedRows > 0) {
        console.log(`✅ Eliminados ${resultPagos.affectedRows} pagos`);
      }
      
      // Eliminar órdenes de compra
      [resultOrdenesCompra] = await connection.query(
        'DELETE FROM orden_compra WHERE no_pedido IN (?)', 
        [pedidosAEliminarCompleto]
      );
      if (resultOrdenesCompra.affectedRows > 0) {
        console.log(`✅ Eliminadas ${resultOrdenesCompra.affectedRows} órdenes de compra`);
      }
      
      // Eliminar detalles de pedidos
      [resultDetalles] = await connection.query(
        'DELETE FROM pedido_detalle WHERE id_pedido IN (?)', 
        [pedidosAEliminarCompleto]
      );
      console.log(`✅ Eliminados ${resultDetalles.affectedRows} detalles de pedidos`);
      
      // Eliminar pedidos
      [resultPedidos] = await connection.query(
        'DELETE FROM pedidos WHERE no_pedido IN (?)', 
        [pedidosAEliminarCompleto]
      );
      console.log(`✅ Eliminados ${resultPedidos.affectedRows} pedidos principales`);
    }
    
    // Commit de la transacción
    await connection.commit();
    
    console.log('✅ Limpieza completada exitosamente');
    
    res.json({
      success: true,
      eliminados: ordenesCompletadas.length,
      ordenes: ordenesCompletadas.map(op => ({
        no_orden: op.no_orden,
        no_pedido: op.no_pedido_id,
        producto: op.producto_identificador,
        fecha_completada: op.fecha_completada,
        estado: op.estado
      })),
      mensaje: `Se eliminaron ${ordenesCompletadas.length} orden(es) de producción completada(s) con más de 7 días`,
      detalle: {
        ordenesProduccion: resultOrdenesProduccion.affectedRows,
        pedidosEliminadosCompleto: pedidosAEliminarCompleto.length,
        pedidosConOtrasOrdenes: pedidosConOtrasOrdenes.size,
        procesos: {
          recepcion: idsRecepcion.length,
          impresion: idsImpresion.length,
          suaje: idsSuaje.length,
          pegado: idsPegado.length,
          armado: idsArmado.length,
          almacen: idsAlmacen.length,
          calidad: idsCalidad.length,
          envio: idsEnvio.length
        },
        pedidos: resultPedidos.affectedRows,
        detalles: resultDetalles.affectedRows,
        pagos: resultPagos.affectedRows,
        facturacion: resultFacturacion.affectedRows,
        ordenesCompra: resultOrdenesCompra.affectedRows
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error al limpiar órdenes completadas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar órdenes de producción completadas antiguas',
      detalle: error.message
    });
  } finally {
    connection.release();
  }
});



app.listen(3000,(err)=>{
    console.log("Si escucha el puerto 3000");
})