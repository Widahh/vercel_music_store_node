const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

// Cargar variables de entorno
require("dotenv").config();

const app = express();
app.use(express.json());

// Configuración de nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Desde variable de entorno
    pass: process.env.EMAIL_PASS, // Desde variable de entorno
  },
});

// Servir estáticos
app.use(express.static(path.join(__dirname, "src")));

// Obtener productos
app.get("/api/products", (req, res) => {
  const productsPath = path.join(__dirname, "src/assets/data/products.json");

  // Leer productos
  fs.readFile(productsPath, "utf-8", (err, data) =>
    err
      ? res.status(500).json({ error: "Error al obtener productos" })
      : res.json(JSON.parse(data))
  );
});

//---------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------

// Middleware para leer datos de formularios
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde src
app.use(express.static(path.join(__dirname, "src")));
app.use(express.json()); // leer JSON del body!
app.use(express.static("src")); // archivos estáticos (HTML, CSS, JS, etc.)

// RUTA POST /register
app.post("/api/register", (req, res) => {
  const usersPath = path.join(__dirname, "backend/data/users.json");
  const {
    nombre,
    apellidos,
    fechaNacimiento,
    telefono,
    pais,
    region,
    codigoPostal,
    direccion,
    email,
    emailConfirm,
    password,
    passwordConfirm,
  } = req.body;

  if (
    !nombre ||
    !apellidos ||
    !fechaNacimiento ||
    !telefono ||
    !pais ||
    !region ||
    !codigoPostal ||
    !direccion ||
    !email ||
    !emailConfirm ||
    !password ||
    !passwordConfirm
  ) {
    return res.status(400).send("Faltan campos por completar.");
  }

  if (email !== emailConfirm || password !== passwordConfirm) {
    return res.status(400).send("El email o la contraseña no coinciden.");
  }

  fs.readFile(usersPath, "utf-8", (err, data) => {
    if (err) {
      console.error("Error leyendo users.json:", err);
      return res.status(500).send("Error al leer los usuarios");
    }

    const usuarios = data ? JSON.parse(data) : [];

    if (usuarios.some((u) => u.email === email)) {
      return res.status(409).send("El email ya está registrado.");
    }

    usuarios.push({
      nombre,
      apellidos,
      fechaNacimiento,
      telefono,
      pais,
      region,
      codigoPostal,
      direccion,
      email,
      password,
    });

    fs.writeFile(usersPath, JSON.stringify(usuarios, null, 2), (err) => {
      if (err) return res.status(500).send("Error al guardar el usuario");
      res.status(200).json({ mensaje: "Usuario registrado correctamente" });
    });
  });
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "src/pages/index.html"));
});

// RUTA POST /login
app.post("/login", (req, res) => {
  const usersPath = path.join(__dirname, "backend/data/users.json");
  const { email, password } = req.body;

  fs.readFile(usersPath, "utf-8", (err, data) => {
    if (err) return res.status(500).send("Error al leer los usuarios");

    const usuarios = JSON.parse(data);
    const usuario = usuarios.find(
      (u) => u.email === email && u.password === password
    );

    if (!usuario) return res.status(401).send("Credenciales incorrectas");

    res.json({ mensaje: "Bienvenido", nombre: usuario.nombre });
  });
});
//---------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------

// Obtener carrito
app.get("/api/cart", (req, res) => {
  const cartsPath = path.join(__dirname, "backend/data/carts.json");
  const user = req.query.user || "guest";

  // Leer carritos
  fs.readFile(cartsPath, "utf-8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener carritos" });

    // Buscar carrito
    let carts = JSON.parse(data);
    const cart = carts.find((c) => c.user === user);

    // Devolver carrito
    res.json(cart || { user, items: [] });
  });
});

// Guardar carrito
app.post("/api/cart", (req, res) => {
  const cartsPath = path.join(__dirname, "backend/data/carts.json");
  const { user, items } = req.body;

  // Validar campos
  if (!user || !items || !Array.isArray(items))
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos: user, items" });

  // Leer carritos
  fs.readFile(cartsPath, "utf-8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener carritos" });

    // Actualizar o añadir carrito
    let carts = JSON.parse(data);
    const idx = carts.findIndex((c) => c.user === user);
    idx !== -1 ? (carts[idx].items = items) : carts.push({ user, items });

    // Guardar carrito
    fs.writeFile(cartsPath, JSON.stringify(carts, null, 2), "utf8", (err) =>
      err
        ? res.status(500).json({ error: "Error al guardar carrito" })
        : res.json({ mensaje: "Carrito guardado correctamente" })
    );
  });
});

// Redirigir raíz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "src/pages/index.html"));
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Guardado información de contacto

app.post("/api/contact", (req, res) => {
  const { nombre, email, asunto, mensaje, telefono } = req.body;

  // Validación básica
  if (!nombre || !email || !asunto || !mensaje)
    return res.status(400).json({ error: "Faltan campos por rellenar" });

  // Configurar email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Confirmación: Hemos recibido tu mensaje - ${asunto}`,
    text: `Hola ${nombre},\n\nGracias por contactarnos. Hemos recibido tu mensaje:\n\n"${mensaje}"\n\nNos pondremos en contacto contigo pronto.\n\nSaludos,\nEquipo Rat Pack Instruments`,
  };

  /* // Email para ti (administrador)
  const adminMailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER, // Tu email
    subject: `Nuevo mensaje de contacto: ${asunto}`,
    text: `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono || "No proporcionado"}\nMensaje: ${mensaje}\nFecha: ${new Date()}`,
  }; */

  // Enviar ambos emails
  transporter.sendMail(mailOptions, (emailError, info) => {
    if (emailError) {
      console.log("Error al enviar email al cliente:", emailError);
      return res.status(500).json({ error: "Error al enviar confirmación" });
    }

    // Enviar email al admin
    transporter.sendMail(adminMailOptions, (adminError) => {
      if (adminError) {
        console.log("Error al enviar email al admin:", adminError);
      }
    });

    res.json({ mensaje: "Mensaje recibido correctamente" });
  });
});


// Endpoint chatbot con productos reales
app.post("/api/chatbot", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Mensaje requerido" });
  }

  // Cargar productos reales de la tienda
  const productsPath = path.join(__dirname, "src/assets/data/products.json");
  let productsInfo = "";

  try {
    const productsData = fs.readFileSync(productsPath, "utf-8");
    const products = JSON.parse(productsData);

    // Crear resumen más inteligente con ofertas destacadas
    productsInfo = "\n=== PRODUCTOS DISPONIBLES EN TIENDA ===\n";

    // Separar productos por categoría y destacar ofertas
    const categories = {};
    products.forEach((product) => {
      if (!categories[product.category]) {
        categories[product.category] = [];
      }
      categories[product.category].push(product);
    });

    Object.keys(categories).forEach((category) => {
      productsInfo += `\n${category.toUpperCase()}:\n`;
      categories[category].forEach((product) => {
        const isOnOffer =
          product.offerPrice && product.offerPrice < product.price;
        const price = isOnOffer ? product.offerPrice : product.price;
        const offerText = isOnOffer ? ` (OFERTA! antes ${product.price}€)` : "";

        productsInfo += `• ${product.name}: ${price}€${offerText}\n`;
        if (product.description) {
          productsInfo += `  - ${product.description.substring(0, 80)}...\n`;
        }
      });
    });

    console.log("Productos procesados por categoría:", Object.keys(categories));
  } catch (error) {
    console.log("Error cargando productos:", error);
  }

  // Prompt engineering específico para Rat Pack Instruments
  const systemPrompt = `Eres Aria, el asistente virtual experto de "Rat Pack Instruments".

REGLAS IMPORTANTES:
- SIEMPRE consulta la lista de PRODUCTOS DISPONIBLES al final de este prompt
- Menciona productos específicos con precios exactos
- Si un producto tiene offerPrice, usa ese precio (está en oferta)
- Máximo 100 palabras por respuesta
- Siempre termina preguntando si necesita más ayuda

INFORMACIÓN ACTUALIZADA:
- Envíos GRATIS a partir de 50€
- Garantía extendida de 3 años
- Devoluciones hasta 30 días
- Pago en 3 cuotas sin intereses

EJEMPLOS DE RESPUESTAS IDEALES:
Usuario: "Guitarra para rock, 400€"
Aria: "Para rock te recomiendo la Guitarra Les Paul a 350€ (¡en oferta desde 650€!) 🎸 Perfecta para rock con pastillas humbucker potentes. También incluye funda y envío gratis. ¿Te interesa algún amplificador también?"

PRODUCTOS CON OFERTAS DESTACADAS:
${productsInfo}

IMPORTANTE: Al recomendar productos, siempre menciona:
1. Precio exacto (usa offerPrice si existe)
2. Por qué es bueno para su necesidad específica
3. Qué incluye o accesorios recomendados
4. Pregunta de seguimiento relevante`;

  console.log(
    "Prompt completo (últimos 500 chars):",
    systemPrompt.substring(systemPrompt.length - 500)
  );

  try {
    // Groq
    console.log("Enviando request a Groq...");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`, // Desde variable de entorno
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 120,
          temperature: 0.4,
          top_p: 0.8,
          stream: false,
        }),
      }
    );

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API Error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

    res.json({ reply: reply });
  } catch (error) {
    console.error("Error del chatbot Groq:", error);

    // Mensaje específico según el tipo de error
    let errorMessage =
      "Lo siento, no puedo responder ahora. Prueba nuestro formulario de contacto o llama al +34 900 123 456";

    if (error.message.includes("402")) {
      errorMessage =
        "Servicio temporalmente no disponible (límite alcanzado). Prueba nuestro formulario de contacto o llama al +34 900 123 456";
    } else if (error.message.includes("401")) {
      errorMessage =
        "Error de autenticación. Prueba nuestro formulario de contacto o llama al +34 900 123 456";
    }

    res.status(500).json({ error: errorMessage });
  }
});

module.exports = app;
