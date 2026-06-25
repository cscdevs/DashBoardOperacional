-- Viaturas EM USO no momento (Boletim Diário de Viagem em aberto).
--
-- Liga a placa do veículo (ATIVO.CODIGOATIVO) ao funcionário que está com ela
-- agora — esse funcionário é o supervisor. Usado para enriquecer a posição ao
-- vivo (API STC) com o nome do supervisor, cruzando pela PLACA.
--
-- DTHRFIM IS NULL = viagem ainda aberta (viatura fora, sem retorno registrado).
-- Sem JOIN com BDVITEM WITH (NOLOCK) de propósito: não precisamos de cliente/local/motivo
-- aqui (isso multiplicaria as linhas). Queremos 1 linha por BDV aberto.
SELECT
    RELFUNC.CODIGO            AS RE,
    ENTFUNC.NOMERESUMIDO      AS FUNCIONARIO,
    ENTEMPRESAFUNC.NOMERESUMIDO AS EMPRESA,
    ATIVO.CODIGOATIVO         AS PLACA,
    ATIVO.DESCRICAO           AS DESCRICAOVEICULO,
    BDV.DTHRINICIO,
    BDV.OBSSAIDA
FROM BDV WITH (NOLOCK) INNER JOIN RELACAOENTIDADE RELFUNC WITH (NOLOCK)
        ON BDV.FUNCIONARIO = RELFUNC.RELACAOENTIDADE
    INNER JOIN RELACAOENTIDADE RELEMPRESAFUNC WITH (NOLOCK)
        ON RELEMPRESAFUNC.RELACAOENTIDADE = RELFUNC.PAPEL2
    INNER JOIN ENTIDADE ENTEMPRESAFUNC WITH (NOLOCK)
        ON ENTEMPRESAFUNC.ENTIDADE = RELEMPRESAFUNC.PAPEL1
    INNER JOIN ENTIDADE ENTFUNC WITH (NOLOCK)
        ON RELFUNC.PAPEL1 = ENTFUNC.ENTIDADE
    INNER JOIN ATIVO WITH (NOLOCK) ON BDV.VEICULO = ATIVO.ATIVO
WHERE
    BDV.SITUACAOBDV > 0
    AND BDV.DTHRINICIO > '2025-11-01 00:00:00'
    AND BDV.DTHRFIM IS NULL
ORDER BY
    BDV.DTHRINICIO DESC;
