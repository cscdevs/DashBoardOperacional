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


def extrair_numero(txt):
    """Número do logradouro (1º número até 5 dígitos, ignorando o CEP)."""
    s = re.sub(r"\d{5}-?\d{3}", " ", str(txt or ""))
    m = re.search(r"\b(\d{1,5})\b", s)
    return m.group(1) if m else ""


def http_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def nominatim(params):
    data = http_json("https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode(params))
    if isinstance(data, list) and data:
        return [float(data[0]["lat"]), float(data[0]["lon"])]
    return None


def viacep(cep):
    """CEP -> {logradouro, bairro, localidade, uf} ou None (via ViaCEP)."""
    digs = re.sub(r"\D", "", cep)
    if len(digs) != 8:
        return None
    try:
        d = http_json(f"https://viacep.com.br/ws/{digs}/json/")
        return None if d.get("erro") else d
    except Exception:  # noqa: BLE001
        return None


def geocodificar(endereco):
    """
    Cascata robusta p/ endereços bagunçados, parando na 1ª que resolver:
      1) ViaCEP (CEP -> rua/bairro/cidade/UF) + Nominatim texto livre
      2) Nominatim estruturado (street/city/state) com o número
      3) Texto livre original
      4) Só o CEP (postalcode)
      5) Centro do bairro/cidade (ViaCEP)
    Retorna [lat,lng] ou None.
    """
    base = {"format": "jsonv2", "limit": "1"}
    seg = limpar_endereco(endereco)
    cep = extrair_cep(endereco)
    numero = extrair_numero(endereco)
    via = viacep(cep) if cep else None

    tentativas = []
    if via:
        rua = (via.get("logradouro") or "").strip()
        bairro = (via.get("bairro") or "").strip()
        cidade = (via.get("localidade") or "").strip()
        uf = (via.get("uf") or "").strip()
        ruaNum = f"{rua}, {numero}".strip(" ,")
        tentativas.append({**base, "q": ", ".join(x for x in [ruaNum, bairro, cidade, uf, "Brasil"] if x)})
        if rua and cidade:
            tentativas.append({**base, "country": "Brazil",
                               "street": f"{numero} {rua}".strip(), "city": cidade, "state": uf})
    tentativas.append({**base, "q": seg + ", Brasil"})
    if cep:
        tentativas.append({**base, "country": "Brazil", "postalcode": cep})
    if via and (via.get("bairro") or via.get("localidade")):
        tentativas.append({**base, "q": ", ".join(
            x for x in [via.get("bairro"), via.get("localidade"), via.get("uf"), "Brasil"] if x)})

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
        # Linhas "RESERVA/BASE" não são supervisores — ignora.
        if "RESERVA" in nome.upper() or nome.upper() == "BASE":
            continue
        placa = str(row[iPlaca] or "").strip() if iPlaca is not None else ""
        endereco = row[iEnd] if iEnd is not None else ""
        chave = str(endereco).strip().upper()

        # Usa o cache só quando tem coordenada; nulos (falhas anteriores) são
        # retentados com a cascata melhorada.
        if chave in cache and cache[chave]:
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