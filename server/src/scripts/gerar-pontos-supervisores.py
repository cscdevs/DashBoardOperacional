#!/usr/bin/env python3
"""
Gera os "pontos de apoio" dos supervisores (1 ponto por supervisor) a partir da
planilha SUPERVISAO carro.xlsx, geocodificando o endereço em lat/lng.

IMPORTANTE (privacidade): a saída JSON guarda APENAS nome, placa e coordenada —
nunca o endereço textual nem o CPF. O dado é sensível; trate como interno.

Uso:
    python src/scripts/gerar-pontos-supervisores.py "..\\SUPERVISAO  carro.xlsx"

Saída: server/src/shared/pontos-supervisores.json
Cache: server/src/shared/.pontos-geocache.json  (evita re-geocodificar)

Requer: openpyxl (a geocodificação usa só a stdlib via Nominatim/OSM).
"""
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

import openpyxl

AQUI = Path(__file__).resolve().parent
SHARED = AQUI.parent / "shared"
SAIDA = SHARED / "pontos-supervisores.json"
CACHE = SHARED / ".pontos-geocache.json"
USER_AGENT = "PlataformaRelatorios/1.0 (eduardo.pirani@admapoio.com.br)"


def limpar_endereco(txt):
    """Normaliza o endereço livre da planilha para uma busca melhor no Nominatim."""
    s = str(txt or "")
    s = s.split("/")[0]  # 1º trecho (descarta "/ GARAGEM ...", "/ 2º endereço")
    s = re.sub(r"\bCEP\b[:\s]*", " ", s, flags=re.I)
    s = re.sub(r"\bRUA\b[:\s]*", "Rua ", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip(" ,;")
    return s


def extrair_cep(txt):
    m = re.search(r"(\d{5})-?(\d{3})", str(txt or ""))
    return f"{m.group(1)}-{m.group(2)}" if m else ""


def nominatim(params):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.loads(r.read().decode("utf-8"))
    if isinstance(data, list) and data:
        return [float(data[0]["lat"]), float(data[0]["lon"])]
    return None


def geocodificar(endereco):
    """Tenta texto livre (com CEP) e, se falhar, só o CEP. Retorna [lat,lng] ou None."""
    base = {"format": "jsonv2", "limit": "1"}
    cep = extrair_cep(endereco)
    q = limpar_endereco(endereco) + ", Brasil"
    tentativas = [{**base, "q": q}]
    if cep:
        tentativas.append({**base, "country": "Brazil", "postalcode": cep})
    for i, p in enumerate(tentativas):
        if i:
            time.sleep(1.1)
        try:
            coord = nominatim(p)
            if coord:
                return coord
        except Exception as e:  # noqa: BLE001
            print("   ! erro:", e)
    return None


def main():
    if len(sys.argv) < 2:
        sys.exit("Uso: python gerar-pontos-supervisores.py \"caminho/SUPERVISAO  carro.xlsx\"")
    xlsx = sys.argv[1]

    cache = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))

    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    ws = wb.active
    linhas = list(ws.iter_rows(values_only=True))

    # Acha a linha de cabeçalho (Funcionário/Placa/Endereço).
    cab_idx = next(
        (i for i, r in enumerate(linhas)
         if r and any("FUNCION" in str(c or "").upper() for c in r)),
        0,
    )
    cab = [str(c or "").strip().upper() for c in linhas[cab_idx]]

    def col(*nomes):
        for n in nomes:
            for i, c in enumerate(cab):
                if c.startswith(n):
                    return i
        return None

    iNome = col("FUNCION")
    iPlaca = col("PLACA")
    iEnd = col("ENDERE")

    pontos = []
    for row in linhas[cab_idx + 1:]:
        if not row or not row[iNome]:
            continue
        nome = str(row[iNome]).strip()
        placa = str(row[iPlaca] or "").strip() if iPlaca is not None else ""
        endereco = row[iEnd] if iEnd is not None else ""
        chave = str(endereco).strip().upper()

        if chave in cache:
            coord = cache[chave]
        else:
            print(f"geocodificando: {nome} ...")
            coord = geocodificar(endereco)
            cache[chave] = coord
            CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
            time.sleep(1.1)

        if coord:
            pontos.append({"nome": nome, "placa": placa, "coordinates": coord})
        else:
            print(f"   x SEM coordenada: {nome}")

    SAIDA.write_text(json.dumps(pontos, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"\nOK -> {SAIDA}")
    print(f"  pontos geocodificados: {len(pontos)}")


if __name__ == "__main__":
    main()