from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Optional


@dataclass
class Cliente:
    id_cliente: str
    nome: str
    alergias: List[str] = field(default_factory=list)
    objetivo_alimentacao: str = ""


@dataclass
class ItemCardapio:
    nome: str
    categoria: str  # almoço ou jantar
    ingredientes: List[str] = field(default_factory=list)


class MemoriaSemanal:
    """Armazena consumo semanal do cliente e histórico de cardápio da empresa."""

    def __init__(self) -> None:
        self.consumo_cliente: Dict[str, Dict[date, List[str]]] = {}
        self.cardapio_empresa: Dict[date, List[ItemCardapio]] = {}

    def registrar_consumo(self, id_cliente: str, dia: date, refeicao: str) -> None:
        self.consumo_cliente.setdefault(id_cliente, {}).setdefault(dia, []).append(refeicao)

    def registrar_cardapio_semanal(self, cardapio: Dict[date, List[ItemCardapio]]) -> None:
        """Recebe o histórico/cardápio semanal da empresa e guarda localmente."""
        for dia, itens in cardapio.items():
            self.cardapio_empresa[dia] = itens

    def obter_historico_cliente(self, id_cliente: str) -> Dict[date, List[str]]:
        return self.consumo_cliente.get(id_cliente, {})

    def sugerir_pedido(
        self,
        cliente: Cliente,
        dia: date,
        contexto_refeicao: str,
    ) -> List[str]:
        """Indica opções do cardápio com base em contexto, alergias e consumo prévio."""

        itens_do_dia = self.cardapio_empresa.get(dia, [])
        historico = self.obter_historico_cliente(cliente.id_cliente)
        refeicoes_ja_comidas = {
            item
            for refeicoes_dia in historico.values()
            for item in refeicoes_dia
        }

        sugestoes: List[str] = []
        for item in itens_do_dia:
            if item.categoria.lower() != contexto_refeicao.lower():
                continue

            ingredientes_lower = [i.lower() for i in item.ingredientes]
            if any(alergia.lower() in ingredientes_lower for alergia in cliente.alergias):
                continue

            if item.nome in refeicoes_ja_comidas:
                continue

            sugestoes.append(item.nome)

        return sugestoes


if __name__ == "__main__":
    memoria = MemoriaSemanal()
    cliente = Cliente(id_cliente="1", nome="João", alergias=["amendoim"], objetivo_alimentacao="Perder peso")

    hoje = date.today()
    memoria.registrar_consumo(cliente.id_cliente, hoje, "Frango grelhado")

    memoria.registrar_cardapio_semanal(
        {
            hoje: [
                ItemCardapio("Frango grelhado", "almoço", ["frango", "arroz", "salada"]),
                ItemCardapio("Peixe assado", "almoço", ["peixe", "batata", "legumes"]),
                ItemCardapio("Wrap de pasta de amendoim", "jantar", ["amendoim", "pão"]),
            ]
        }
    )

    print(memoria.sugerir_pedido(cliente, hoje, "almoço"))
