-- Corrige a base já armazenada para usar somente as metas operacionais reais.
-- Os objetivos do Projeto ENSO não são critérios de classificação.

with criterios as (
  select
    id,
    case
      when upper(coalesce(tipo_operacao, '')) = 'ENTRADA'
        and upper(coalesce(documento, '')) <> 'DTA-S' then 110
      when indicador = 'CARREGAMENTO GERAL' then 40
      when indicador = 'DTA' then 110
      when indicador = 'DTA-S MARITIMO' then 150
      when indicador = 'DTA-S AEREO' then 100
      else null
    end as meta_real
  from public.operacoes
)
update public.operacoes as operacao
set
  meta_min = criterios.meta_real,
  status_meta = case
    when operacao.tempo_os_min is null then 'NÃO INFORMADO'
    when operacao.tempo_os_min <= criterios.meta_real then 'Dentro da Meta'
    else 'Fora da Meta'
  end
from criterios
where operacao.id = criterios.id
  and criterios.meta_real is not null;
