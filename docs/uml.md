Diagrama de Casos de Uso
Ator: Usuário

Casos de uso:

- Iniciar conversa
- Informar contexto (almoço/jantar)
- Receber sugestão
- Avaliar sugestão (👍 ou 👎)
- Receber nova sugestão

Diagrama de Estados (ESSENCIAL)
[Início]
   ↓
Saudação
   ↓
Aguardando tipo de refeição
   ↓
(Almoço ou Jantar)
   ↓
Gerar sugestão
   ↓
Aguardando feedback
   ↓        ↓
👍          👎
↓           ↓
Salvar      Nova sugestão
preferência ↓
   ↓     Gerar nova sugestão
[Fim ou reinício]

Diagrama de Sequência
Usuário → Bot: "Oi"
Bot → Usuário: Pergunta refeição

Usuário → Bot: "Almoço"
Bot → Usuário: Sugestão

Usuário → Bot: 👍
Bot → Sistema: Salva preferência
Bot → Usuário: Confirma aprendizado

Diagrama de Classes
Classe Usuario
- nome
- estado
- contexto
- preferencias[]

Classe Bot
- processarMensagem()

Classe Sugestao
- nome
- tipo