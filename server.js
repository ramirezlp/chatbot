const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios'); // Import for making HTTP requests

const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());

const MODEL_NAME = "gemini-1.5-flash"; 
const API_KEY =  process.env.API_KEY;

// URL del webhook
const WEBHOOK_URL = "";

// Historial de la conversación en memoria
let chatHistory = [
      {
        role: "user",
        text: "Serás el asistente virtual de \"Virtuoso La Plata\". Da un mensaje de bienvenida diciendo bienvenido a Virtuoso sin más información que un comentario de bienvenida. Te envío información de contacto para comentar:\n\n# Dirección 71 entre 17 y 18\n# Teléfono 2216335888\n# Horarios\nJueves a Domingo de 19 a 21hs\n\n#Platos principales\nCachopo asturiano\nGambas al ajillo\nPizza\nEmpanadas de carne frita\n\n#Postres\nFlan con dulce de leche\nHelado\nBrownie con helado\nMousse de pistacho\nCrambel de manzana\n\nEl idioma de todas tus respuestas será español. Para hacer una reserva se solicita el nombre, cantidad de comensales, fecha y hora. Al confirmar la reserva debes decir 'Reserva confirmada: \n Nombre: {el nombre del usuario} \n Fecha: {la fecha con la hora} \n Comensales: {la cantidad de personas}" ,
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
