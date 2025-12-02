import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// MongoDB Connection with better error handling
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 30000);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('Conectado a MongoDB Atlas');
  } catch (err) {
    console.error('Error conectando a MongoDB:', err.message);
    console.error('Verifica:');
    console.error('1. Tu IP está en la whitelist de MongoDB Atlas');
    console.error('2. Las credenciales son correctas');
    console.error('3. El nombre del cluster es correcto');
    process.exit(1);
  }
};

connectDB();

// Excuse Schema
const excuseSchema = new mongoose.Schema({
  situation: String,
  absurdityLevel: Number,
  socialContext: String,
  excuse: String,
  imageUrl: String,
  timestamp: { type: Date, default: Date.now },
  temperature: Number,
  roomId: String,
  playerName: String,
  votes: { type: Number, default: 0 },
  votedBy: [String]
});

const Excuse = mongoose.model('Excuse', excuseSchema);

// Battle Schema
const battleSchema = new mongoose.Schema({
  roomId: String,
  challenger: String,
  challenged: String,
  level: Number,
  theme: String,
  status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
  challengerExcuse: {
    excuseId: String,
    excuse: String,
    situation: String,
    imageUrl: String,
    timestamp: Date
  },
  challengedExcuse: {
    excuseId: String,
    excuse: String,
    situation: String,
    imageUrl: String,
    timestamp: Date
  },
  winner: String,
  judgeAnalysis: String,
  createdAt: { type: Date, default: Date.now }
});

const Battle = mongoose.model('Battle', battleSchema);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate random battle theme
const generateBattleTheme = async (level) => {
  try {
    const themeModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const themePrompt = `Genera UNA SOLA situación absurda para una batalla de excusas. Nivel de absurdidad: ${level}/5.
    
La situación debe ser:
- Una frase corta (máximo 15 palabras)
- En español
- Problemática que requiera una excusa
- Adecuada al nivel de absurdidad ${level}

Ejemplos según nivel:
Nivel 0-1: "Llegaste 2 horas tarde a una reunión importante"
Nivel 2-3: "Tu carro apareció en el techo del edificio"
Nivel 4-5: "Despertaste en Marte sin saber cómo llegaste ahí"

Responde SOLO con la situación, sin explicaciones.`;

    const result = await themeModel.generateContent(themePrompt);
    const theme = result.response.text().trim().replace(/["']/g, '');
    
    return theme;
  } catch (error) {
    console.error('Error generating theme:', error.message);
    return `Llegaste tarde a un evento importante (nivel ${level})`;
  }
};

// Generate image for excuse using Imagen
const generateExcuseImage = async (excuse, absurdityLevel) => {
  try {
    const imageModel = genAI.getGenerativeModel({ 
      model: "models/gemini-2.5-flash-image"
    });
    
    const imagePrompt = `Create an image: A humorous comic-style illustration of "${excuse}". Absurdity level ${absurdityLevel}/5. Vibrant colors, exaggerated cartoon, funny visual scene.`;
    
    const result = await imageModel.generateContent(imagePrompt);
    
    const response = await result.response;
    
    // Extract image data if available
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    
    console.log('No image data in response');
    return null;
    
  } catch (error) {
    console.error('Error generating image:', error.message);
    return null;
  }
};

// Absurdity level prompts
const getPromptForLevel = (level) => {
  const prompts = {
    '-1': {
      context: 'Eres un asistente que genera excusas extremadamente creíbles y profesionales.',
      tone: 'Tu excusa debe sonar completamente razonable y seria, como si fuera una explicación legítima.',
      instruction: 'Genera una excusa breve y realista que cualquier persona creería sin dudar.'
    },
    '0': {
      context: 'Eres un generador de excusas cotidianas y comunes.',
      tone: 'La excusa debe ser creíble pero un poco conveniente.',
      instruction: 'Crea una excusa normal que la gente usa frecuentemente en la vida diaria.'
    },
    '1': {
      context: 'Eres un creador de excusas con un toque de exageración.',
      tone: 'La excusa debe ser algo improbable pero no imposible.',
      instruction: 'Inventa una excusa que suene un poco exagerada pero que técnicamente podría suceder.'
    },
    '2': {
      context: 'Eres un inventor de excusas bastante absurdas.',
      tone: 'La excusa debe ser claramente inventada y divertida.',
      instruction: 'Genera una excusa ridícula e improbable que haga reír por su absurdidad.'
    },
    '3': {
      context: 'Eres un maestro de las excusas surrealistas y bizarras.',
      tone: 'La excusa debe incluir elementos completamente absurdos e inesperados.',
      instruction: 'Crea una excusa totalmente descabellada con situaciones imposibles pero entretenidas.'
    },
    '4': {
      context: 'Eres un generador de excusas de ciencia ficción y fantasía.',
      tone: 'La excusa debe involucrar fenómenos sobrenaturales o tecnológicos imposibles.',
      instruction: 'Inventa una excusa que incluya aliens, viajes en el tiempo, magia o tecnología futurista.'
    },
    '5': {
      context: 'Eres un creador de excusas cósmicas e interdimensionales.',
      tone: 'La excusa debe trascender la realidad conocida y ser completamente demencial.',
      instruction: 'Genera la excusa más absurda, cósmica e imposible que puedas imaginar, involucrando múltiples dimensiones, paradojas temporales y eventos imposibles.'
    }
  };

  return prompts[level.toString()] || prompts['2'];
};

// Calculate temperature based on absurdity level
const getTemperature = (level) => {
  const temperatures = {
    '-1': 0.3,
    '0': 0.5,
    '1': 0.7,
    '2': 0.9,
    '3': 1.1,
    '4': 1.3,
    '5': 1.5
  };
  return temperatures[level.toString()] || 0.9;
};

// Generate excuse endpoint
app.post('/api/generate-excuse', async (req, res) => {
  try {
    const { situation, absurdityLevel, socialContext, roomId, playerName } = req.body;

    if (!situation) {
      return res.status(400).json({ error: 'La situación es requerida' });
    }

    const level = Math.max(-1, Math.min(5, absurdityLevel || 2));
    const temperature = getTemperature(level);
    const promptConfig = getPromptForLevel(level);

    // Build structured prompt
    const fullPrompt = `${promptConfig.context}

${promptConfig.tone}

${promptConfig.instruction}

Situación: ${situation}
${socialContext ? `Contexto social: ${socialContext}` : ''}

Genera SOLO la excusa, sin explicaciones adicionales. Máximo 3-4 oraciones.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 200,
      }
    });

    const result = await model.generateContent(fullPrompt);
    const excuse = result.response.text();

    // Generate image (optional, non-blocking)
    let imageUrl = null;
    if (level >= 2) {
      try {
        imageUrl = await generateExcuseImage(excuse, level);
      } catch (imageError) {
        console.log('No se pudo generar imagen, continuando sin ella:', imageError.message);
      }
    }

    // Save to MongoDB
    const savedExcuse = await Excuse.create({
      situation,
      absurdityLevel: level,
      socialContext: socialContext || '',
      excuse,
      imageUrl,
      temperature,
      roomId: roomId || null,
      playerName: playerName || 'Anónimo'
    });

    // Emit to room if in collaborative mode
    if (roomId) {
      io.to(roomId).emit('new-excuse', {
        _id: savedExcuse._id.toString(),
        id: savedExcuse._id.toString(),
        excuse,
        absurdityLevel: level,
        playerName: playerName || 'Anónimo',
        timestamp: savedExcuse.timestamp,
        votes: 0,
        imageUrl: savedExcuse.imageUrl
      });
    }

    res.json({
      success: true,
      excuse,
      imageUrl,
      metadata: {
        absurdityLevel: level,
        temperature,
        socialContext: socialContext || 'ninguno',
        timestamp: savedExcuse.timestamp,
        id: savedExcuse._id
      }
    });

  } catch (error) {
    console.error('Error generando excusa:', error);
    res.status(500).json({ 
      error: 'Error al generar la excusa',
      details: error.message 
    });
  }
});

// Get excuse history
app.get('/api/excuses', async (req, res) => {
  try {
    const { roomId, limit = 20 } = req.query;
    const query = roomId ? { roomId } : {};
    
    const excuses = await Excuse.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json({ success: true, excuses });
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
});

// Vote for excuse in collaborative mode
app.post('/api/vote/:id', async (req, res) => {
  try {
    const { playerName } = req.body;
    const excuse = await Excuse.findById(req.params.id);
    
    if (!excuse) {
      return res.status(404).json({ error: 'Excusa no encontrada' });
    }

    // Check if player already voted
    if (excuse.votedBy.includes(playerName)) {
      return res.status(400).json({ error: 'Ya votaste por esta excusa' });
    }

    // Add vote
    excuse.votes += 1;
    excuse.votedBy.push(playerName);
    await excuse.save();

    // Emit vote update to room
    if (excuse.roomId) {
      io.to(excuse.roomId).emit('vote-update', {
        excuseId: excuse._id,
        votes: excuse.votes,
        playerName
      });
    }

    res.json({ success: true, votes: excuse.votes });
  } catch (error) {
    console.error('Error votando:', error);
    res.status(500).json({ error: 'Error al votar' });
  }
});

// Get room leaderboard
app.get('/api/leaderboard/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const excuses = await Excuse.find({ roomId })
      .sort({ votes: -1 })
      .limit(10);
    
    res.json({ success: true, leaderboard: excuses });
  } catch (error) {
    console.error('Error obteniendo leaderboard:', error);
    res.status(500).json({ error: 'Error al obtener el leaderboard' });
  }
});

// Start battle challenge
app.post('/api/battle/start', async (req, res) => {
  try {
    const { roomId, challenger, challenged, level } = req.body;

    // Generate random theme for the battle
    const theme = await generateBattleTheme(level);

    const battle = new Battle({
      roomId,
      challenger,
      challenged,
      level,
      theme,
      status: 'pending'
    });
    
    await battle.save();

    io.to(roomId).emit('battle-started', {
      battleId: battle._id,
      challenger,
      challenged,
      level,
      theme,
      message: `¡${challenger} desafió a ${challenged} a una batalla de nivel ${level}! Tema: "${theme}"`
    });

    res.json({ success: true, battleId: battle._id });
  } catch (error) {
    console.error('Error iniciando batalla:', error);
    res.status(500).json({ error: 'Error al iniciar batalla' });
  }
});

// Submit excuse for battle
app.post('/api/battle/submit', async (req, res) => {
  try {
    const { battleId, playerName, excuseId } = req.body;

    const battle = await Battle.findById(battleId);
    if (!battle) {
      return res.status(404).json({ error: 'Batalla no encontrada' });
    }

    const excuse = await Excuse.findById(excuseId);
    if (!excuse) {
      return res.status(404).json({ error: 'Excusa no encontrada' });
    }

    const excuseData = {
      excuseId: excuse._id,
      excuse: excuse.excuse,
      situation: excuse.situation,
      imageUrl: excuse.imageUrl,
      timestamp: new Date()
    };

    if (playerName === battle.challenger) {
      battle.challengerExcuse = excuseData;
    } else if (playerName === battle.challenged) {
      battle.challengedExcuse = excuseData;
    } else {
      return res.status(400).json({ error: 'No eres parte de esta batalla' });
    }

    // If both submitted, judge the battle
    if (battle.challengerExcuse.excuse && battle.challengedExcuse.excuse) {
      battle.status = 'active';
      await battle.save();

      // Judge battle with Gemini
      const winner = await judgeBattle(battle);
      
      io.to(battle.roomId).emit('battle-completed', {
        battleId: battle._id,
        winner,
        analysis: battle.judgeAnalysis,
        challengerExcuse: battle.challengerExcuse.excuse,
        challengedExcuse: battle.challengedExcuse.excuse
      });

      return res.json({ success: true, winner, analysis: battle.judgeAnalysis });
    }

    await battle.save();
    
    io.to(battle.roomId).emit('battle-excuse-submitted', {
      battleId: battle._id,
      playerName,
      waitingFor: playerName === battle.challenger ? battle.challenged : battle.challenger
    });

    res.json({ success: true, message: 'Excusa enviada, esperando al oponente' });
  } catch (error) {
    console.error('Error enviando excusa de batalla:', error);
    res.status(500).json({ error: 'Error al enviar excusa' });
  }
});

// Judge battle with Gemini 2.0 Flash
const judgeBattle = async (battle) => {
  try {
    const judgeModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const judgePrompt = `Eres un juez experto en excusas absurdas. Debes analizar estas dos excusas y determinar cuál es MÁS ABSURDA y CREATIVA.

BATALLA DE NIVEL ${battle.level}/5
TEMA DE LA BATALLA: "${battle.theme}"

Participante: ${battle.challenger}
Situación que excusó: "${battle.challengerExcuse.situation}"
Excusa generada: "${battle.challengerExcuse.excuse}"

Participante: ${battle.challenged}
Situación que excusó: "${battle.challengedExcuse.situation}"
Excusa generada: "${battle.challengedExcuse.excuse}"

Analiza cada participante considerando:
1. ¿Qué tan relacionada está su situación con el tema de la batalla?
2. ¿Qué tan absurda y creativa es la excusa generada? (0-10)
3. ¿Qué tan coherente es la excusa con la situación que escribió? (0-10)
4. Factor sorpresa e imaginación (0-10)
5. Adaptación al nivel de absurdidad requerido (${battle.level}/5)

Responde en formato JSON:
{
  "winner": "${battle.challenger}" o "${battle.challenged}",
  "reason": "explicación detallada de por qué ganó, mencionando tanto la situación que escribió como la excusa generada (máximo 150 palabras)",
  "scores": {
    "${battle.challenger}": { 
      "themeRelevance": 0-10, 
      "absurdity": 0-10, 
      "creativity": 0-10,
      "coherence": 0-10
    },
    "${battle.challenged}": { 
      "themeRelevance": 0-10, 
      "absurdity": 0-10, 
      "creativity": 0-10,
      "coherence": 0-10
    }
  }
}`;

    const result = await judgeModel.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: judgePrompt }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      }
    });

    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const judgeResult = JSON.parse(jsonMatch[0]);
      
      battle.winner = judgeResult.winner;
      battle.judgeAnalysis = JSON.stringify(judgeResult);
      battle.status = 'completed';
      await battle.save();
      
      return judgeResult.winner;
    }
    
    throw new Error('No se pudo parsear la respuesta del juez');
    
  } catch (error) {
    console.error('Error juzgando batalla:', error);
    // Default to random winner
    const winner = Math.random() > 0.5 ? battle.challenger : battle.challenged;
    battle.winner = winner;
    battle.judgeAnalysis = JSON.stringify({ error: 'Error en el juicio', winner });
    battle.status = 'completed';
    await battle.save();
    return winner;
  }
};

// Export excuse to .txt
app.get('/api/export/:id', async (req, res) => {
  try {
    const excuse = await Excuse.findById(req.params.id);
    
    if (!excuse) {
      return res.status(404).json({ error: 'Excusa no encontrada' });
    }

    const content = `
═══════════════════════════════════════
    GENERADOR DE EXCUSAS ABSURDAS
═══════════════════════════════════════

Fecha: ${new Date(excuse.timestamp).toLocaleString('es-ES')}
Jugador: ${excuse.playerName}

SITUACIÓN:
${excuse.situation}

${excuse.socialContext ? ` CONTEXTO SOCIAL:\n${excuse.socialContext}\n\n` : ''}
💡 EXCUSA GENERADA:
${excuse.excuse}

METADATOS:
• Nivel de Absurdidad: ${excuse.absurdityLevel}/5
• Temperatura IA: ${excuse.temperature}
• ID: ${excuse._id}
${excuse.roomId ? `• Sala Colaborativa: ${excuse.roomId}` : ''}

═══════════════════════════════════════
Generado con IA - Google Gemini 2.0 Flash
    `;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="excusa_${excuse._id}.txt"`);
    res.send(content);

  } catch (error) {
    console.error('Error exportando excusa:', error);
    res.status(500).json({ error: 'Error al exportar la excusa' });
  }
});

// WebSocket for collaborative mode
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('join-room', ({ roomId, playerName }) => {
    socket.join(roomId);
    socket.playerName = playerName;
    socket.roomId = roomId;
    
    io.to(roomId).emit('player-joined', { 
      playerName, 
      message: `${playerName} se unió a la sala` 
    });
    
    console.log(`${playerName} se unió a la sala: ${roomId}`);
  });

  socket.on('send-challenge', ({ roomId, challenger, target, level }) => {
    io.to(roomId).emit('challenge-received', {
      challenger,
      target,
      requiredLevel: level,
      message: `${challenger} reta a ${target} a crear una excusa de nivel ${level}!`
    });
  });

  socket.on('vote-excuse', async ({ excuseId, playerName, roomId }) => {
    try {
      const excuse = await Excuse.findById(excuseId);
      if (excuse && !excuse.votedBy.includes(playerName)) {
        excuse.votes += 1;
        excuse.votedBy.push(playerName);
        await excuse.save();
        
        io.to(roomId).emit('vote-update', {
          excuseId,
          votes: excuse.votes,
          playerName,
          excuseOwner: excuse.playerName
        });
      }
    } catch (error) {
      console.error('Error votando:', error);
    }
  });

  socket.on('start-battle', async ({ roomId, challenger, challenged, level }) => {
    try {
      // Generate random theme
      const theme = await generateBattleTheme(level);
      
      const battle = new Battle({
        roomId,
        challenger,
        challenged,
        level,
        theme,
        status: 'pending'
      });
      
      await battle.save();

      io.to(roomId).emit('battle-created', {
        battleId: battle._id.toString(),
        challenger,
        challenged,
        level,
        theme,
        message: `¡${challenger} desafió a ${challenged} a una batalla de nivel ${level}! Tema: "${theme}"`
      });
    } catch (error) {
      console.error('Error iniciando batalla:', error);
    }
  });

  socket.on('submit-battle-excuse', async ({ battleId, playerName, excuseId }) => {
    try {
      const battle = await Battle.findById(battleId);
      if (!battle) return;

      const excuse = await Excuse.findById(excuseId);
      if (!excuse) return;

      const excuseData = {
        excuseId: excuse._id,
        excuse: excuse.excuse,
        situation: excuse.situation,
        imageUrl: excuse.imageUrl,
        timestamp: new Date()
      };

      if (playerName === battle.challenger) {
        battle.challengerExcuse = excuseData;
      } else if (playerName === battle.challenged) {
        battle.challengedExcuse = excuseData;
      }

      // If both submitted, judge
      if (battle.challengerExcuse.excuse && battle.challengedExcuse.excuse) {
        battle.status = 'active';
        await battle.save();

        const winner = await judgeBattle(battle);
        
        io.to(battle.roomId).emit('battle-judged', {
          battleId: battle._id.toString(),
          winner,
          analysis: JSON.parse(battle.judgeAnalysis),
          challengerExcuse: battle.challengerExcuse.excuse,
          challengedExcuse: battle.challengedExcuse.excuse,
          challengerSituation: battle.challengerExcuse.situation,
          challengedSituation: battle.challengedExcuse.situation
        });
      } else {
        await battle.save();
        const waitingFor = playerName === battle.challenger ? battle.challenged : battle.challenger;
        
        io.to(battle.roomId).emit('battle-excuse-received', {
          battleId: battle._id.toString(),
          submittedBy: playerName,
          waitingFor
        });
      }
    } catch (error) {
      console.error('Error submitting battle excuse:', error);
    }
  });

  socket.on('leave-room', () => {
    if (socket.roomId) {
      io.to(socket.roomId).emit('player-left', { 
        playerName: socket.playerName,
        message: `${socket.playerName} salió de la sala` 
      });
      socket.leave(socket.roomId);
    }
  });

  socket.on('disconnect', () => {
    if (socket.roomId) {
      io.to(socket.roomId).emit('player-left', { 
        playerName: socket.playerName,
        message: `${socket.playerName} se desconectó` 
      });
    }
    console.log('Usuario desconectado:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '🎭 Generador de Excusas Absurdas API',
    timestamp: new Date()
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
