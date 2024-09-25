const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios'); // Import for making HTTP requests
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cors());

const MODEL_NAME = "gemini-1.5-flash"; 
const API_KEY = process.env.API_KEY;

// URL del webhook
const WEBHOOK_URL = "";

const prompt_iatomica = `
Serás el asistente virtual de \"IAtomica\", una agencia de IA que ofrece servicios.
Siempre da un mensaje de bienvenida a IAtomica. Respuestas cortas por favor.
Por favor responde con el texto formateado y uso adecuado de saltos de linea. Tambien utiliza bastante los emojis.
La idea es que sirvas de ejemplo de chatbot para poder mostrar a clientes, aquí te dejo más en detalle de que se trata IAtomica:
En IAtomica, nos especializamos en integrar soluciones de inteligencia artificial que transforman y 
optimizan tus procesos empresariales.Nuestro objetivo es llevar a tu negocio al siguiente nivel, 
maximizando la eficiencia y minimizando los costos a través de la automatización y la tecnología avanzada. 
Descubre cómo nuestros servicios pueden revolucionar tu operación.
Impulsa tu negocio hoy mismo
La transformación digital no tiene por qué ser complicada. Con IAtomica, es rápida, eficiente y orientada a resultados.
Contáctanos para descubrir cómo podemos llevar tu empresa al siguiente nivel. Estamos listos para ayudarte a automatizar, optimizar y revolucionar tu negocio.
Encuentra las soluciones para tu industria, sea cual sea.
Automatización de procesos
Optimizamos tareas repetitivas en tu empresa, ahorrando tiempo y recursos, permitiendo que tu equipo se enfoque en actividades de mayor valor.
Chat bot
Implementamos chatbots que mejoran la atención al cliente, resolviendo consultas en tiempo real y automatizando interacciones comunes para optimizar la experiencia del usuario.
Agentes IA
Desarrollamos agentes inteligentes que toman decisiones y ejecutan tareas complejas de manera autónoma, impulsando la productividad y eficiencia en distintas áreas de tu negocio.
Sobre Nosotros
Somos un equipo apasionado por la tecnología y el impacto que puede generar en las empresas. Nos especializamos en ofrecer soluciones de inteligencia artificial y automatización para Pymes que buscan adaptarse y crecer en un entorno digital en constante evolución.
Nuestra filosofía es simple: combinamos innovación, rapidez y expertise para transformar los negocios. Creemos que la tecnología debe ser una herramienta accesible y poderosa para todos, sin importar el tamaño de la empresa. Es por eso que trabajamos de cerca con nuestros clientes, creando estrategias personalizadas que se adaptan a sus necesidades y objetivos.
¿Listo para transformar tu empresa?
En IAtomica, creemos que el futuro pertenece a quienes están dispuestos a evolucionar. Si buscas optimizar tus procesos, implementar soluciones de IA o llevar tu empresa a un nuevo nivel de eficiencia, estamos aquí para hacerlo realidad.
Optimizar tus procesos: Aumenta la eficiencia y reduce costos con soluciones personalizadas.
Implementar IA de forma accesible: Desde automatización hasta análisis avanzado, llevamos la inteligencia artificial a tu empresa.
Acelerar tu crecimiento: Transformamos tu negocio para que pueda escalar más rápido y con menos fricción.
Agenda una reunión con nosotros.
`

const prompt = `
Serás el asistente virtual de \"Virtuoso La Plata\". 
Las respuestas tienen que estar bien formateadas con saltos de linea. Incluye bastantes emojis en tus respuestas.
Da un mensaje de bienvenida diciendo bienvenido a Virtuoso sin más información que un comentario de bienvenida. 
Te envío información de contacto para comentar:\n
\n# Dirección 71 entre 17 y 18\n# Teléfono 2216335888\n
# Horarios\nJueves a Domingo de 19 a 21hs\n\n
#Platos principales\nCachopo asturiano\nGambas al ajillo\nPizza\nEmpanadas de carne frita\n\n
#Postres\nFlan con dulce de leche\nHelado\nBrownie con helado\nMousse de pistacho\nCrambel de manzana\n\n
El idioma de todas tus respuestas será español. Para hacer una reserva se solicita el nombre, cantidad de comensales, fecha y hora. 
Al confirmar la reserva debes decir 'Reserva confirmada: \n Nombre: {el nombre del usuario} \n Fecha: {la fecha con la hora} \n Comensales: {la cantidad de personas}
`

// Historial de la conversación en memoria
let chatHistory = [
      {
        role: "user",
        text: prompt_iatomica ,
      },
      {
        role: "model",
        text: "¡Bienvenido a Virtuoso La Plata! ¿En qué puedo ayudarte hoy?" ,
      }
];

async function runChat(userInput) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 1000,
  };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  // Formateamos el historial para que Gemini lo procese correctamente
  const formattedHistory = chatHistory.map(entry => ({
    role: entry.role,
    parts: [{ text: entry.text }]
  }));

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: formattedHistory,  // Enviamos todo el historial
  });

  // Enviamos el mensaje del usuario a Gemini
  const result = await chat.sendMessage(userInput);

  const response = result.response.text();

  console.log(response);

  // Añadimos el mensaje del usuario y la respuesta de Gemini al historial
  chatHistory.push({ role: "user", text: userInput });
  chatHistory.push({ role: "model", text: response });

  // Si Gemini responde "Reserva confirmada", enviamos la reserva al webhook
  if (response.toLowerCase().includes("reserva confirmada")) {
    const reservationDetails = {
      message: response.toLowerCase(), // Aquí puedes reemplazar con datos dinámicos
    };

    const queryParams = new URLSearchParams(reservationDetails).toString();

    try {
      await axios.post(`${WEBHOOK_URL}?${queryParams}`);
      console.log('Reserva enviada al webhook:', reservationDetails);
    } catch (error) {
      console.error('Error al enviar la reserva al webhook:', error);
    }
  }

  return response;
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.get('/loader.gif', (req, res) => {
  res.sendFile(__dirname + '/loader.gif');
});

app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    console.log('incoming /chat req', userInput);
    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const response = await runChat(userInput);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
