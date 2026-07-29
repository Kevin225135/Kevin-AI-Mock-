# Interview RAG Research and Design

Date: 2026-07-28

## Research conclusions

1. RAG should retain provenance instead of relying on model memory alone. The
   original RAG paper frames retrieval as explicit non-parametric memory and
   reports more specific, diverse and factual generation than a parametric-only
   baseline.
2. Resume terms should be aligned to a maintained occupation-skill taxonomy.
   O*NET exposes occupation skills, knowledge, tasks and work activities. ESCO
   exposes multilingual occupation and skill concepts with stable identifiers.
3. Skill extraction should combine explicit matching with contextual evidence.
   Recent ACL work shows that multilingual ESCO alignment improves vacancy-CV
   matching, while LLM extraction is useful for complex mentions but should not
   be the only extraction path.
4. Retrieval is hybrid. It combines PostgreSQL full-text search with
   `text-embedding-v4` semantic similarity, reciprocal-rank fusion and a
   Qwen3 cross-encoder reranker.
5. Question generation and follow-up retrieval are separate queries. The first
   retrieves resume evidence and role competencies; the second retrieves
   evidence gaps from the user's answer.

## Sources

- RAG paper, NeurIPS 2020:
  https://papers.neurips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html
- O*NET database and content model:
  https://www.onetcenter.org/database.html
  https://www.onetcenter.org/content.html
- ESCO API:
  https://esco.ec.europa.eu/en/about-esco/escopedia/escopedia/esco-api
- Multilingual skill extraction with ESCO alignment, ACL 2025:
  https://aclanthology.org/2025.genaik-1.15/
- Rethinking Skill Extraction in the Job Market Domain, ACL 2024:
  https://aclanthology.org/2024.nlp4hr-1.3/
- pgvector hybrid search guidance:
  https://github.com/pgvector/pgvector
- PostgreSQL full-text ranking:
  https://www.postgresql.org/docs/17/textsearch-controls.html

## Implemented V1 workflow

### Question generation

1. Parse the resume into projects, roles, companies, skills and evidence lines.
2. Normalize bilingual aliases through the competency keyword library.
3. Filter competencies by target role and interview module.
4. Rank competencies using keyword hits and evidence-source quality.
5. Diversify results so one competency does not consume the full question set.
6. Generate a question grounded in the highest-ranked evidence.
7. Persist keywords, evidence, expected answer signals and a retrieval trace.

### Follow-up

1. Load the original question's retrieval context.
2. Match answer terms and evidence signals.
3. Separate numeric outcomes from validation or attribution evidence.
4. Produce `CLARIFY` for genuinely vague answers.
5. Produce `DEEPEN` for a specific missing signal.
6. Produce `CLOSE` when the expected signals are covered or two rounds are
   reached.
7. Persist covered signals, missing signals, the decision and latency.

## Guardrails

- Resume retrieval is always scoped through the owning user and resume.
- Generated questions store their evidence and cannot introduce unsupported
  resume facts.
- Retrieval traces cascade when the user, resume or session is deleted.
- A short answer with concrete ownership or numeric evidence is not treated as
  vague merely because of its length.
- Numeric output does not count as evidence that the metric was validated.
- If no taxonomy keyword is found, the system uses the strongest resume evidence
  as a controlled fallback instead of inventing an experience.

## Implemented hybrid retrieval layer

1. Knowledge documents and queries use the pinned multilingual
   `text-embedding-v4` model at 1,024 dimensions.
2. PostgreSQL GIN full-text results and cosine-similarity results are combined
   with reciprocal-rank fusion.
3. The top 60 candidates are reranked with `qwen3-rerank`; provider errors
   degrade to a deterministic local reranker without blocking an interview.
4. Results apply source-authority, expiry and freshness signals. Knowledge rows
   retain publish, expiry and last-verification metadata.
5. The current PostgreSQL deployment does not expose pgvector. Dense vectors
   therefore remain in `double precision[]` and cosine ranking runs in the
   application after database filtering. The provider boundary is ready for an
   ANN implementation when pgvector becomes available.
6. Run `npm run knowledge:reindex` after changing the embedding model or
   dimensions. All document and query vectors must use the same pinned model.

## Required retrieval evaluation

The next quality gate must measure Recall@5, NDCG@5, grounded-question rate,
cross-user isolation, follow-up relevance, duplicate rate and retrieval P95 on
a labeled bilingual query set before retrieval weights or models are changed.
