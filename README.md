# AdAI V9 — Análise real por Instagram, site e prints

Versão do AdAI em modo copiloto, sem depender da aprovação/publicação automática da Meta.

## Fluxo principal
1. Cadastro/login
2. Análise da marca por uma das entradas:
   - Instagram + prints do perfil/feed
   - Site público
   - Prints da marca
   - Preenchimento manual como alternativa
3. Processamento visual com progresso e mensagens rotativas
4. Diagnóstico salvo no Supabase: posicionamento, oferta, público, dores, diferenciais, oportunidades e ângulos de anúncio
5. A análise salva é aplicada automaticamente na criação da campanha
6. Montagem do plano: objetivo, destino, orçamento, região e criativo
7. Plano final com público, configuração, copies e passo a passo para publicar manualmente no Meta Ads

## IA
- A análise multimodal usa imagens inline no Gemini quando a chave está disponível.
- O código tenta modelos alternativos quando um modelo está indisponível ou sem cota.
- Se todos falharem, o fluxo continua com uma análise básica de reserva, sem inventar métricas ou dados externos.

A integração Meta automática anterior continua preservada no projeto para uma futura Fase 2, mas não é necessária para o fluxo principal.
