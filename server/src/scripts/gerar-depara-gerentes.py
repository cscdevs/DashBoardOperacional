#!/usr/bin/env python3
"""
Gera o de-para Área/Local -> Gerente a partir de um Excel exportado do BI.

O relatório "Geração de Cartão de Ponto" agrupa por GERENTE, mas o SQL Server
não traz essa informação — ela vem de uma planilha mantida fora do sistema.
Este script converte essa planilha no JSON consumido por
`server/src/shared/gerentes.js` em tempo de execução.

A planilha precisa ter (na 1ª aba, 1ª linha = cabeçalho) as colunas:
    EMPRESA | CLIENTE | LOCAL | AREASUPERVISAO | Gerente

A CHAVE é a combinação das 4 primeiras colunas — é a única que identifica o
gerente sem ambiguidade (Área sozinha, ou Cliente+Local, geram conflito).

Uso:
    python gerar-depara-gerentes.py "C:\\caminho\\para\\planilha.xlsx"
    python gerar-depara-gerentes.py planilha.xlsx --saida ../shared/gerentes.depara.json

Requer: openpyxl  (pip install openpyxl)
"""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

# Mesma normalização do server/src/shared/gerentes.js — precisa bater 1:1,
# senão a chave gerada aqui não casa com a chave montada em runtime.
def normalizar(texto):
    s = "" if texto is None else str(texto)
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # tira acentos
    s = re.sub(r"\s+", " ", s.strip())
    return s.upper()


def chave(empresa, cliente, local, area):
    return "|".join(normalizar(v) for v in (empresa, cliente, local, area))


def main():
    ap = argparse.ArgumentParser(description="Gera o de-para de gerentes (JSON) a partir do Excel.")
    ap.add_argument("excel", help="caminho do .xlsx com as colunas EMPRESA/CLIENTE/LOCAL/AREASUPERVISAO/Gerente")
    ap.add_argument(
        "--saida",
        default=str(Path(__file__).resolve().parent.parent / "shared" / "gerentes.depara.json"),
        help="caminho do JSON de saída (padrão: ../shared/gerentes.depara.json)",
    )
    args = ap.parse_args()

    wb = openpyxl.load_workbook(args.excel, read_only=True, data_only=True)
    ws = wb.active
    linhas = list(ws.iter_rows(values_only=True))
    if not linhas:
        sys.exit("Planilha vazia.")

    cab = [normalizar(c) for c in linhas[0]]
    try:
        iEmp = cab.index("EMPRESA")
        iCli = cab.index("CLIENTE")
        iLoc = cab.index("LOCAL")
        iArea = cab.index("AREASUPERVISAO")
        iGer = cab.index("GERENTE")
    except ValueError:
        sys.exit(f"Cabeçalho inesperado. Esperado EMPRESA/CLIENTE/LOCAL/AREASUPERVISAO/Gerente, achei: {linhas[0]}")

    mapa = {}
    conflitos = 0
    vazios = 0
    for row in linhas[1:]:
        if not row or not any(row):
            continue
        ger = (str(row[iGer]).strip() if row[iGer] is not None else "")
        if not ger:
            vazios += 1
            continue
        k = chave(row[iEmp], row[iCli], row[iLoc], row[iArea])
        if k in mapa and mapa[k] != ger:
            conflitos += 1
        mapa[k] = ger  # última ocorrência vence

    saida = Path(args.saida)
    saida.write_text(
        json.dumps(mapa, ensure_ascii=False, sort_keys=True, indent=0),
        encoding="utf-8",
    )

    gerentes = sorted(set(mapa.values()))
    print(f"OK -> {saida}")
    print(f"  chaves geradas : {len(mapa)}")
    print(f"  gerentes únicos: {len(gerentes)}")
    if vazios:
        print(f"  linhas ignoradas (sem gerente): {vazios}")
    if conflitos:
        print(f"  AVISO: {conflitos} chaves com gerente divergente (manteve a última).")


if __name__ == "__main__":
    main()
