require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// memória simples
let usuarios = {};

// normalizar texto (remove acento)
function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// gerar sugestão inteligente
function gerarSugestao(usuario) {

  const almocoLeve = [
    "🥗 Salada com frango grelhado",
    "🍛 Arroz + legumes + frango",
    "🥙 Wrap saudável"
  ];

  const almocoPesado = [
    "🥩 Carne + batata frita",
    "🍝 Macarrão à bolonhesa",
    "🍛 Feijoada"
  ];

  const jantarLeve = [
    "🥪 Sanduíche natural",
    "🥗 Salada leve",
    "🍲 Sopa"
  ];

  const jantarPesado = [
    "🍕 Pizza",
    "🍔 Hambúrguer",
    "🍗 Frango frito"
  ];

  // 🔥 usa perfil + contexto
  if (usuario.contexto === "almoco" && usuario.perfil === "leve") {
    return almocoLeve[Math.floor(Math.random() * almocoLeve.length)];
  }

  if (usuario.contexto === "almoco" && usuario.perfil === "pesado") {
    return almocoPesado[Math.floor(Math.random() * almocoPesado.length)];
  }

  if (usuario.contexto === "jantar" && usuario.perfil === "leve") {
    return jantarLeve[Math.floor(Math.random() * jantarLeve.length)];
  }

  if (usuario.contexto === "jantar" && usuario.perfil === "pesado") {
    return jantarPesado[Math.floor(Math.random() * jantarPesado.length)];
  }

  return "🍽️ Prato do dia";
}

// BOT PRINCIPAL
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  if (!texto) return;

  const textoNormalizado = normalizar(texto);

  // cria usuário
  if (!usuarios[chatId]) {
    usuarios[chatId] = {
      nome: msg.from.first_name,
      estado: "inicio",
      contexto: null,
      perfil: null,
      sugestaoAtual: null,
      preferencias: []
    };
  }

  const usuario = usuarios[chatId];

  // 👋 INÍCIO / SAUDAÇÃO
  if (
    textoNormalizado.includes("oi") ||
    textoNormalizado.includes("ola") ||
    textoNormalizado.includes("/start")
  ) {
    usuario.estado = "definindo_perfil";

    return bot.sendMessage(chatId, `
Fala, ${usuario.nome}! 👋  

Antes de começar… me conta 👇  

Você prefere comida mais *leve 🥗* ou *pesada 🍔*?
    `, { parse_mode: "Markdown" });
  }

  // 🧠 DEFINIR PERFIL
  if (usuario.estado === "definindo_perfil") {

    if (textoNormalizado.includes("leve")) {
      usuario.perfil = "leve";
    } else if (textoNormalizado.includes("pesad")) {
      usuario.perfil = "pesado";
    } else {
      return bot.sendMessage(chatId, "Responde com *leve* ou *pesado* 😄", {
        parse_mode: "Markdown"
      });
    }

    usuario.estado = "aguardando_refeicao";

    return bot.sendMessage(chatId, `
Boa! 👌  

Agora me diz… vai ser *almoço 🍛* ou *jantar 🍕*?
    `, { parse_mode: "Markdown" });
  }

  // 🍛 CONTEXTO
  if (usuario.estado === "aguardando_refeicao") {

    if (textoNormalizado.includes("almoc")) {
      usuario.contexto = "almoco";
    } else if (textoNormalizado.includes("jant")) {
      usuario.contexto = "jantar";
    } else {
      return bot.sendMessage(chatId, "Responde com *almoço* ou *jantar* 😄", {
        parse_mode: "Markdown"
      });
    }

    usuario.estado = "aguardando_feedback";

    const sugestao = gerarSugestao(usuario);
    usuario.sugestaoAtual = sugestao;

    return bot.sendMessage(chatId, `
Boa escolha! 👌  

Pensando no seu perfil *${usuario.perfil}* 👀  

${sugestao}

Curtiu?
    `, {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard: [["👍", "👎"]],
        resize_keyboard: true
      }
    });
  }

  // 👍 👎 FEEDBACK
  if (usuario.estado === "aguardando_feedback") {

    if (texto.includes("👍")) {

      usuario.preferencias.push({
        prato: usuario.sugestaoAtual,
        perfil: usuario.perfil,
        contexto: usuario.contexto
      });

      usuario.estado = "inicio";

      return bot.sendMessage(chatId, `
Boa! 😄  

Curtiu *${usuario.sugestaoAtual}* né? 👀  
Vou levar isso em conta nas próximas sugestões 🔥
      `, {
        parse_mode: "Markdown",
        reply_markup: { remove_keyboard: true }
      });
    }

    if (texto.includes("👎")) {

      const novaSugestao = gerarSugestao(usuario);
      usuario.sugestaoAtual = novaSugestao;

      return bot.sendMessage(chatId, `
Hmm… não foi dessa 😅  

Deixa eu tentar outra 👇  

${novaSugestao}

Agora foi?
      `);
    }

    return bot.sendMessage(chatId, "Responde com 👍 ou 👎");
  }

  // fallback
  bot.sendMessage(chatId, "Não entendi 😅 Tenta começar com 'oi'");
});