# Cadastro inicial do cliente

Este cadastro coleta os dados básicos do cliente para personalizar recomendações alimentares.

## Campos do cadastro

1. **Nome completo** (obrigatório)
2. **Idade** (obrigatório, inteiro positivo)
3. **Telefone** (obrigatório)
4. **Objetivo com a alimentação** (obrigatório)
   - Perder peso
   - Ganhar massa muscular
   - Manter peso
   - Melhorar energia/disposição
   - Reeducação alimentar
   - Outro (texto livre)
5. **Alergias ou restrições alimentares** (obrigatório)
   - Lista de alergias (ex.: lactose, glúten, amendoim)
   - Opção "Não possuo alergias"
6. **Observações adicionais** (opcional)

## Exemplo de estrutura (JSON)

```json
{
  "nome": "Maria Silva",
  "idade": 29,
  "telefone": "+55 11 99999-9999",
  "objetivo_alimentacao": "Perder peso",
  "alergias": ["Lactose", "Amendoim"],
  "observacoes": "Prefere refeições rápidas no jantar"
}
```

## Fluxo sugerido para o bot no Telegram

1. Perguntar nome, idade e telefone.
2. Perguntar o objetivo principal com a alimentação.
3. Perguntar alergias/restrições com confirmação.
4. Exibir resumo e pedir confirmação final.
5. Salvar cadastro para usar nas recomendações futuras.
