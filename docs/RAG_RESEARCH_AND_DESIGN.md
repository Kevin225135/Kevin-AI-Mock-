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
4. Retrieval should be hybrid. pgvector explicitly recommends combining vector
   similarity with PostgreSQL full-text search and using reciprocal-rank fusion
   or a reranker. The current V1 implements the lexical/taxonomy layer and keeps
   an interface that can accept vector scores later.
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

## Next retrieval layer

The interfaces are intentionally ready for a V2 hybrid retriever:

1. Install pgvector in the deployment PostgreSQL instance.
2. Embed resume evidence and competency definitions with one pinned multilingual
   embedding model.
3. Combine lexical rank and cosine rank with reciprocal-rank fusion.
4. Rerank the top 20 candidates and pass at most 4-6 evidence chunks to the
   generator.
5. Evaluate Recall@5, grounded-question rate, cross-user isolation, follow-up
   relevance, duplicate rate and retrieval P95 before enabling it by default.
