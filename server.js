const express = require("express");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (TU CONFIGURACIÓN ORIGINAL)
app.use(express.static(path.join(__dirname, 'src')));

// Configuración de nodemailer
const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/pages/index.html'));
});

app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "src/pages/index.html"));
});

// Obtener productos
app.get("/api/products", (req, res) => {
  const productsPath = path.join(__dirname, "src/assets/data/products.json");

  fs.readFile(productsPath, "utf-8", (err, data) =>
    err
      ? res.status(500).json({ error: "Error al obtener productos" })
      : res.json(JSON.parse(data))
  );
});

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

// Obtener carrito
app.get("/api/cart", (req, res) => {
  const cartsPath = path.join(__dirname, "backend/data/carts.json");
  const user = req.query.user || "guest";

  fs.readFile(cartsPath, "utf-8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener carritos" });

    let carts = JSON.parse(data);
    const cart = carts.find((c) => c.user === user);

    res.json(cart || { user, items: [] });
  });
});

// Guardar carrito
app.post("/api/cart", (req, res) => {
  const cartsPath = path.join(__dirname, "backend/data/carts.json");
  const { user, items } = req.body;

  if (!user || !items || !Array.isArray(items))
    return res
      .status(400)
      .json({ error: "Faltan campos requeridos: user, items" });

  fs.readFile(cartsPath, "utf-8", (err, data) => {
    if (err)
      return res.status(500).json({ error: "Error al obtener carritos" });

    let carts = JSON.parse(data);
    const idx = carts.findIndex((c) => c.user === user);
    idx !== -1 ? (carts[idx].items = items) : carts.push({ user, items });

    fs.writeFile(cartsPath, JSON.stringify(carts, null, 2), "utf8", (err) =>
      err
        ? res.status(500).json({ error: "Error al guardar carrito" })
        : res.json({ mensaje: "Carrito guardado correctamente" })
    );
  });
});

// Guardado información de contacto
app.post("/api/contact", (req, res) => {
  const messagesPath = path.join(__dirname, "backend/data/messages.json");
  const { nombre, email, asunto, mensaje, telefono } = req.body;

  if (!nombre || !email || !asunto || !mensaje)
    return res.status(400).json({ error: "Faltan campos por rellenar" });

  fs.readFile(messagesPath, "utf-8", (err, data) => {
    let messages = [];
    if (!err && data) messages = JSON.parse(data);

    messages.push({
      nombre,
      email,
      asunto,
      mensaje,
      telefono,
      fecha: new Date(),
    });

    fs.writeFile(
      messagesPath,
      JSON.stringify(messages, null, 2),
      "utf8",
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Error al guardar mensaje" });
        }

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: `Confirmación: Hemos recibido tu mensaje - ${asunto}`,
          text: `Hola ${nombre},\n\nGracias por contactarnos. Hemos recibido tu mensaje:\n\n"${mensaje}"\n\nNos pondremos en contacto contigo pronto.\n\nSaludos,\nEquipo Rat Pack Instruments`,
        };

        transporter.sendMail(mailOptions, (emailError, info) => {
          if (emailError) {
            console.log("Error al enviar email:", emailError);
          } else {
            console.log("Email enviado:", info.response);
          }
        });

        res.json({ mensaje: "Mensaje recibido correctamente" });
      }
    );
  });
});

// Endpoint chatbot con productos reales
app.post("/api/chatbot", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Mensaje requerido" });
  }

  const productsPath = path.join(__dirname, "src/assets/data/products.json");
  let productsInfo = "";

  try {
    const productsData = fs.readFileSync(productsPath, "utf-8");
    const products = JSON.parse(productsData);

    productsInfo = "\n=== PRODUCTOS DISPONIBLES EN TIENDA ===\n";

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

  try {
    console.log("Enviando request a Groq...");

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
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

// Para desarrollo local
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

// Para Vercel
module.exports = app;
