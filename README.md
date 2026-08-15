# AdAI V8.1 — Copiloto de campanhas

Versão que funciona sem depender da publicação automática pela Meta.

Fluxo principal:
1. Cadastro/login
2. Análise manual da marca com IA + fallback local
3. Tela de processamento da análise com mensagens rotativas e progresso visual
4. Montagem da campanha (objetivo, destino, orçamento, região e criativo)
5. Geração de plano persistido no Supabase
6. Tela de plano com público, configuração, 3 copies e passo a passo para publicação manual

A integração Meta existente foi preservada no código para uma Fase 2, mas não é necessária para o fluxo principal desta versão.
