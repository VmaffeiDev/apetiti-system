Desenvolver um sistema de recomendação de refeições via Telegram, capaz de interagir com o usuário por meio de diálogo contínuo, sugerindo opções de acordo com o contexto (almoço ou jantar) e aprendendo com as preferências do usuário.


## Novo requisito: cadastro inicial

Antes de iniciar as recomendações, o bot deve coletar um cadastro inicial do cliente com:

- dados básicos (nome, idade e telefone);
- objetivo com a alimentação;
- alergias ou restrições alimentares.

Detalhamento completo em `cadastro_inicial.md`.


## Novo requisito: identificar almoço ou jantar por horário

O sistema deve verificar o horário em que o cliente acessa e informar automaticamente o contexto:

- Se entrar às **12:00**, informar **almoço**.
- Se entrar às **21:00**, informar **jantar**.

Regra sugerida:
- 11:00 até 16:59 -> almoço
- 17:00 até 23:59 -> jantar
- 00:00 até 10:59 -> almoço (próximo período principal)

Implementação base disponível em `contexto_refeicao.py`.


## Novo requisito: memória semanal de consumo e cardápio

O sistema deve:

- guardar o que cada cliente comeu durante a semana;
- receber e armazenar o histórico/cardápio semanal enviado pela empresa;
- no momento do pedido, usar essas informações para indicar refeições mais adequadas.

Implementação base em `recomendacao_semanal.py`.
