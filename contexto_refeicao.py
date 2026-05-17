from datetime import datetime


def identificar_contexto_refeicao(data_hora: datetime) -> str:
    """Retorna o contexto da refeição com base no horário de acesso.

    Regras:
    - 11:00 até 16:59 -> almoço
    - 17:00 até 23:59 -> jantar
    - 00:00 até 10:59 -> almoço (próximo período principal)
    """

    hora = data_hora.hour

    if 11 <= hora <= 16:
        return "almoço"
    if 17 <= hora <= 23:
        return "jantar"
    return "almoço"


def mensagem_contexto(data_hora: datetime) -> str:
    contexto = identificar_contexto_refeicao(data_hora)
    return f"Agora são {data_hora.strftime('%H:%M')}, então o contexto é {contexto}."


if __name__ == "__main__":
    exemplos = ["12:00", "21:00", "08:30"]
    for horario in exemplos:
        hora, minuto = map(int, horario.split(":"))
        dt = datetime.now().replace(hour=hora, minute=minuto, second=0, microsecond=0)
        print(mensagem_contexto(dt))
