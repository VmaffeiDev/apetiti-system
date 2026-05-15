require('dotenv').config();
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TOKEN, { polling: true });
const usuarios = {};

const DB_DIR = path.join(__dirname, 'data');
const REFEICOES_DB = path.join(DB_DIR, 'refeicoes_semana.json');
const CARDAPIO_DB = path.join(DB_DIR, 'cardapio_semanal.json');
const FUNCIONARIOS_DB = path.join(DB_DIR, 'funcionarios.json');

function normalizar(texto = '') {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function lerJson(caminho, fallback) {
  try {
    return JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  } catch (_erro) {
    return fallback;
  }
}

function salvarJson(caminho, valor) {
  fs.writeFileSync(caminho, JSON.stringify(valor, null, 2));
}

function garantirEstruturaArquivos() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(REFEICOES_DB)) salvarJson(REFEICOES_DB, { refeicoes: [] });
  if (!fs.existsSync(CARDAPIO_DB)) salvarJson(CARDAPIO_DB, { atualizadoEm: null, semana: null, cardapio: [] });
  if (!fs.existsSync(FUNCIONARIOS_DB)) salvarJson(FUNCIONARIOS_DB, { funcionarios: [] });
}

function inicioDaSemanaISO(data = new Date()) {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  const diaSemana = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - diaSemana + 1);
  return d.toISOString().slice(0, 10);
}

function nomeObjetivoAmigavel(objetivo) {
  if (objetivo === 'emagrecer') return 'emagrecer';
  if (objetivo === 'manter_peso') return 'manter peso';
  if (objetivo === 'ganhar_massa') return 'ganhar massa';
  return 'não informado';
}

function extrairObjetivo(textoNormalizado) {
  const t = textoNormalizado.replace(/[^a-z0-9\s]/g, ' ');
  if (t === '1' || t.includes('emagrec') || t.includes('perder peso')) return 'emagrecer';
  if (t === '2' || t.includes('manter')) return 'manter_peso';
  if (t === '3' || t.includes('ganhar') || t.includes('massa')) return 'ganhar_massa';
  return null;
}

function parseCsvTexto(csvTexto) {
  const linhas = csvTexto.split(/\r?\n/).map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length < 2) return { erro: 'CSV inválido: precisa de cabeçalho e ao menos 1 linha.' };

  const separador = linhas[0].includes(';') ? ';' : ',';
  const cabecalho = linhas[0].split(separador).map((h) => normalizar(h));
  const idxDia = cabecalho.findIndex((h) => h.includes('dia'));
  const idxTipo = cabecalho.findIndex((h) => h.includes('tipo') || h.includes('refeicao'));
  const idxPrato = cabecalho.findIndex((h) => h.includes('prato') || h.includes('menu') || h.includes('item'));

  if (idxDia < 0 || idxTipo < 0 || idxPrato < 0) {
    return { erro: 'Cabeçalho inválido. Use: dia,tipo_refeicao,prato' };
  }

  const itens = [];
  for (let i = 1; i < linhas.length; i += 1) {
    const colunas = linhas[i].split(separador).map((c) => c.trim());
    if (!colunas[idxDia] || !colunas[idxTipo] || !colunas[idxPrato]) continue;
    itens.push({ dia: colunas[idxDia], tipoRefeicao: colunas[idxTipo], prato: colunas[idxPrato] });
  }

  if (itens.length === 0) return { erro: 'Nenhuma linha válida encontrada no CSV.' };
  return { itens };
}

async function notificarFuncionariosNovoCardapio(totalItens) {
  const banco = lerJson(FUNCIONARIOS_DB, { funcionarios: [] });
  const semana = inicioDaSemanaISO();
  const mensagem = `📢 *Novo cardápio semanal disponível!*\n\nSemana: *${semana}*\nTotal de refeições: *${totalItens}*\n\nDigite */cardapio_semana* para ver o cardápio.`;

  for (const funcionario of banco.funcionarios) {
    try {
      await bot.sendMessage(funcionario.chatId, mensagem, { parse_mode: 'Markdown' });
    } catch (_erro) {
      // evita quebrar o loop se um chat estiver indisponível
    }
  }
}

async function atualizarCardapioPorCsv(caminhoArquivo) {
  if (!fs.existsSync(caminhoArquivo)) return { erro: `Arquivo não encontrado: ${caminhoArquivo}` };

  const csvTexto = fs.readFileSync(caminhoArquivo, 'utf-8');
  const parsed = parseCsvTexto(csvTexto);
  if (parsed.erro) return parsed;

  salvarJson(CARDAPIO_DB, {
    atualizadoEm: new Date().toISOString(),
    semana: inicioDaSemanaISO(),
    cardapio: parsed.itens
  });

  await notificarFuncionariosNovoCardapio(parsed.itens.length);
  return { total: parsed.itens.length };
}

function registrarFuncionarioNoHistorico(usuario, chatId, telegramNome) {
  const banco = lerJson(FUNCIONARIOS_DB, { funcionarios: [] });
  const idx = banco.funcionarios.findIndex((f) => String(f.chatId) === String(chatId));
  const registro = {
    chatId,
    nomeCompleto: usuario.cadastro.nomeCompleto,
    nomeTelegram: telegramNome,
    idade: usuario.cadastro.idade,
    objetivo: usuario.cadastro.objetivo,
    aderiuEm: new Date().toISOString(),
    ativo: true
  };

  if (idx >= 0) banco.funcionarios[idx] = { ...banco.funcionarios[idx], ...registro };
  else banco.funcionarios.push(registro);

  salvarJson(FUNCIONARIOS_DB, banco);
}

function registrarRefeicao(usuario, chatId) {
  const banco = lerJson(REFEICOES_DB, { refeicoes: [] });
  banco.refeicoes.push({
    chatId,
    nome: usuario.cadastro.nomeCompleto || usuario.nome,
    semana: inicioDaSemanaISO(),
    dataISO: new Date().toISOString(),
    contexto: usuario.contexto,
    perfil: usuario.perfil,
    objetivo: usuario.cadastro.objetivo,
    prato: usuario.sugestaoAtual
  });
  salvarJson(REFEICOES_DB, banco);
}

function obterContextoPorHorario(data = new Date()) {
  const horaBrasil = Number(new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hour12: false
  }).format(data));

  if (horaBrasil >= 12 && horaBrasil <= 14) return 'almoco';
  if (horaBrasil >= 19 && horaBrasil <= 22) return 'jantar';
  return null;
}

function formatarCardapioSemana() {
  const banco = lerJson(CARDAPIO_DB, { cardapio: [] });
  const itens = banco.cardapio || [];
  if (itens.length === 0) return 'Ainda não temos cardápio semanal cadastrado. Use /importar_csv para atualizar.';
  const linhas = itens.map((item, i) => `${i + 1}. ${item.dia} - ${item.tipoRefeicao}: ${item.prato}`);
  return `📋 *Cardápio da semana*\n\n${linhas.join('\n')}`;
}

function gerarSugestao(usuario) {
  const cardapio = lerJson(CARDAPIO_DB, { cardapio: [] });
  const contexto = usuario.contexto === 'almoco' ? 'almoco' : 'jantar';
  const opcoesSemana = (cardapio.cardapio || []).filter((item) => normalizar(item.tipoRefeicao || '').includes(contexto));

  if (opcoesSemana.length > 0) {
    const escolhida = opcoesSemana[Math.floor(Math.random() * opcoesSemana.length)];
    return `📋 Cardápio da semana: ${escolhida.prato} (${escolhida.dia})`;
  }

  const almocoLeve = ['🥗 Salada com frango grelhado', '🍛 Arroz + legumes + frango', '🥙 Wrap saudável'];
  const almocoPesado = ['🥩 Carne + batata frita', '🍝 Macarrão à bolonhesa', '🍛 Feijoada'];
  const jantarLeve = ['🥪 Sanduíche natural', '🥗 Salada leve', '🍲 Sopa'];
  const jantarPesado = ['🍕 Pizza', '🍔 Hambúrguer', '🍗 Frango frito'];

  if (usuario.contexto === 'almoco' && usuario.perfil === 'leve') return almocoLeve[Math.floor(Math.random() * almocoLeve.length)];
  if (usuario.contexto === 'almoco' && usuario.perfil === 'pesado') return almocoPesado[Math.floor(Math.random() * almocoPesado.length)];
  if (usuario.contexto === 'jantar' && usuario.perfil === 'leve') return jantarLeve[Math.floor(Math.random() * jantarLeve.length)];
  if (usuario.contexto === 'jantar' && usuario.perfil === 'pesado') return jantarPesado[Math.floor(Math.random() * jantarPesado.length)];
  return '🍽️ Prato do dia';
}

garantirEstruturaArquivos();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;
  if (!texto) return;

  const textoNormalizado = normalizar(texto);

  if (textoNormalizado.startsWith('/importar_csv')) {
    const caminhoArquivo = texto.replace('/importar_csv', '').trim();
    if (!caminhoArquivo) return bot.sendMessage(chatId, 'Use: /importar_csv /caminho/arquivo.csv');

    const resultado = await atualizarCardapioPorCsv(caminhoArquivo);
    if (resultado.erro) return bot.sendMessage(chatId, `❌ ${resultado.erro}`);
    return bot.sendMessage(chatId, `✅ Cardápio atualizado com ${resultado.total} refeições. Todos os funcionários cadastrados foram notificados.`);
  }

  if (textoNormalizado === '/minhas_refeicoes') {
    const semana = inicioDaSemanaISO();
    const banco = lerJson(REFEICOES_DB, { refeicoes: [] });
    const minhas = banco.refeicoes.filter((r) => String(r.chatId) === String(chatId) && r.semana === semana);
    if (minhas.length === 0) return bot.sendMessage(chatId, 'Você ainda não registrou refeições nesta semana.');
    const resumo = minhas.map((r, i) => `${i + 1}. ${r.contexto} - ${r.prato}`).join('\n');
    return bot.sendMessage(chatId, `📅 Suas refeições da semana:\n${resumo}`);
  }

  if (textoNormalizado.includes('cardapio da semana') || textoNormalizado === '/cardapio_semana') {
    const cardapioTexto = formatarCardapioSemana();
    const contextoHorario = obterContextoPorHorario();
    if (contextoHorario === 'almoco') return bot.sendMessage(chatId, `${cardapioTexto}\n\n🕛 Agora é horário de *almoço*.`, { parse_mode: 'Markdown' });
    if (contextoHorario === 'jantar') return bot.sendMessage(chatId, `${cardapioTexto}\n\n🕖 Agora é horário de *jantar*.`, { parse_mode: 'Markdown' });
    return bot.sendMessage(chatId, `${cardapioTexto}\n\n⏰ Fora do horário padrão do Brasil (06h–16h almoço / 17h–23h jantar).`, { parse_mode: 'Markdown' });
  }

  if (!usuarios[chatId]) {
    usuarios[chatId] = {
      nome: msg.from.first_name,
      estado: 'cadastro_nome',
      cadastroConcluido: false,
      cadastro: { nomeCompleto: null, idade: null, objetivo: null },
      contexto: null,
      perfil: null,
      sugestaoAtual: null,
      preferencias: []
    };
    return bot.sendMessage(chatId, `Bem-vindo(a), ${usuarios[chatId].nome}! 👋\n\nQual é seu *nome completo*?`, { parse_mode: 'Markdown' });
  }

  const usuario = usuarios[chatId];

  if (usuario.estado === 'cadastro_nome') {
    if (texto.trim().length < 3) return bot.sendMessage(chatId, 'Me passa seu nome completo com pelo menos 3 letras 🙂');
    usuario.cadastro.nomeCompleto = texto.trim();
    usuario.estado = 'cadastro_idade';
    return bot.sendMessage(chatId, 'Perfeito! Agora me diz sua *idade*.', { parse_mode: 'Markdown' });
  }

  if (usuario.estado === 'cadastro_idade') {
    const idade = parseInt(textoNormalizado.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(idade) || idade < 10 || idade > 120) return bot.sendMessage(chatId, 'Me informa uma idade válida (entre 10 e 120).');
    usuario.cadastro.idade = idade;
    usuario.estado = 'cadastro_objetivo';
    return bot.sendMessage(chatId, 'Qual é seu *objetivo principal*?\n1) Emagrecer\n2) Manter peso\n3) Ganhar massa', { parse_mode: 'Markdown' });
  }

  if (usuario.estado === 'cadastro_objetivo') {
    const objetivo = extrairObjetivo(textoNormalizado);
    if (!objetivo) return bot.sendMessage(chatId, 'Responde com 1, 2 ou 3 (ou escreve seu objetivo). 😄');

    usuario.cadastro.objetivo = objetivo;
    usuario.cadastroConcluido = true;
    usuario.estado = 'definindo_perfil';
    registrarFuncionarioNoHistorico(usuario, chatId, msg.from.username || msg.from.first_name || 'sem_username');

    return bot.sendMessage(chatId, `Cadastro concluído! 🎉\n\n📌 Nome: *${usuario.cadastro.nomeCompleto}*\n📌 Idade: *${usuario.cadastro.idade}*\n📌 Objetivo: *${nomeObjetivoAmigavel(usuario.cadastro.objetivo)}*\n\nVocê já está no histórico de funcionários aderentes.\n\nAgora me diga se você prefere comida *leve 🥗* ou *pesada 🍔* para eu continuar.`, { parse_mode: 'Markdown' });
  }

  if (textoNormalizado.includes('oi') || textoNormalizado.includes('ola') || textoNormalizado.includes('/start')) {
    if (!usuario.cadastroConcluido) {
      usuario.estado = 'cadastro_nome';
      return bot.sendMessage(chatId, 'Vamos terminar seu cadastro primeiro 🙂 Qual é seu *nome completo*?', { parse_mode: 'Markdown' });
    }

    usuario.estado = 'definindo_perfil';
    return bot.sendMessage(chatId, 'Você prefere comida mais *leve 🥗* ou *pesada 🍔*?', { parse_mode: 'Markdown' });
  }

  if (usuario.estado === 'definindo_perfil') {
    if (textoNormalizado.includes('leve')) usuario.perfil = 'leve';
    else if (textoNormalizado.includes('pesad')) usuario.perfil = 'pesado';
    else return bot.sendMessage(chatId, 'Responde com *leve* ou *pesado* 😄', { parse_mode: 'Markdown' });

    const contextoHorario = obterContextoPorHorario();

    if (!contextoHorario) {
      usuario.estado = 'aguardando_refeicao';
      return bot.sendMessage(chatId, 'Não consegui identificar automaticamente se é almoço ou jantar neste horário. Me responde com *almoço* ou *jantar* 😄', { parse_mode: 'Markdown' });
    }

    usuario.contexto = contextoHorario;
    usuario.estado = 'aguardando_feedback';
    usuario.sugestaoAtual = gerarSugestao(usuario);

    const informeHorario = usuario.contexto === 'almoco'
      ? '🕛 Pelo horário atual do Brasil, vou considerar *almoço*.'
      : '🕖 Pelo horário atual do Brasil, vou considerar *jantar*.';

    return bot.sendMessage(chatId, `${informeHorario}\nSugestão: ${usuario.sugestaoAtual}\nCurtiu?`, {
      parse_mode: 'Markdown',
      reply_markup: { keyboard: [['👍', '👎']], resize_keyboard: true }
    });
  }

  if (usuario.estado === 'aguardando_refeicao') {
    if (textoNormalizado.includes('almoc')) usuario.contexto = 'almoco';
    else if (textoNormalizado.includes('jant')) usuario.contexto = 'jantar';
    else return bot.sendMessage(chatId, 'Responde com *almoço* ou *jantar* 😄', { parse_mode: 'Markdown' });

    usuario.estado = 'aguardando_feedback';
    usuario.sugestaoAtual = gerarSugestao(usuario);

    return bot.sendMessage(chatId, `Perfeito! Vou considerar *${usuario.contexto}*.\nSugestão: ${usuario.sugestaoAtual}\nCurtiu?`, {
      parse_mode: 'Markdown',
      reply_markup: { keyboard: [['👍', '👎']], resize_keyboard: true }
    });
  }

  if (usuario.estado === 'aguardando_feedback') {
    if (texto.includes('👍')) {
      usuario.preferencias.push({ prato: usuario.sugestaoAtual, perfil: usuario.perfil, contexto: usuario.contexto, objetivo: usuario.cadastro.objetivo });
      registrarRefeicao(usuario, chatId);
      usuario.estado = 'inicio';
      return bot.sendMessage(chatId, 'Boa! Refeição registrada no seu histórico semanal ✅', { reply_markup: { remove_keyboard: true } });
    }

    if (texto.includes('👎')) {
      usuario.sugestaoAtual = gerarSugestao(usuario);
      return bot.sendMessage(chatId, `Deixa eu tentar outra 👇\n${usuario.sugestaoAtual}\nAgora foi?`);
    }

    return bot.sendMessage(chatId, 'Responde com 👍 ou 👎');
  }

  return bot.sendMessage(chatId, "Não entendi 😅 Tenta começar com 'oi'");
});
