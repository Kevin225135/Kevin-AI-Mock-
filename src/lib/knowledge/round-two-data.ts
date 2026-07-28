import type { KnowledgeSeed } from "./seed-data";

type Topic = {
  zh: string; en: string; category: string; keywords: string[];
  frameworkZh: string; frameworkEn: string; sourceTitle: string; sourceUrl: string;
};

const ibTopics: Topic[] = [
  ["三大财务报表", "three financial statements", "财务会计", ["三大报表", "three statements"], "从净利润、非现金项目、营运资本、资本开支和融资活动解释勾稽关系。", "Link net income, non-cash items, working capital, capex, and financing.", "SEC: Statement of Cash Flows", "https://www.sec.gov/newsroom/speeches-statements/munter-statement-cash-flows-120423"],
  ["收入确认与利润质量", "revenue recognition and earnings quality", "财务会计", ["收入确认", "earnings quality"], "区分会计确认、现金回收、一次性项目和可持续利润。", "Separate accounting recognition, cash collection, one-offs, and sustainable earnings.", "O*NET: Financial and Investment Analysts", "https://www.onetonline.org/link/details/13-2051.00"],
  ["营运资本", "working capital", "财务会计", ["营运资本", "working capital"], "分析应收、存货、应付变化对现金流和经营效率的影响。", "Analyze receivables, inventory, and payables for cash-flow and operating impact.", "SEC: Statement of Cash Flows", "https://www.sec.gov/newsroom/speeches-statements/munter-statement-cash-flows-120423"],
  ["企业价值与股权价值", "enterprise value and equity value", "估值", ["EV", "equity value"], "明确资产对应的现金流、资本提供者和净债务桥接。", "Match assets to cash flows and capital providers, then build the net-debt bridge.", "CFA: Market-Based Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/market-based-valuation-price-enterprise-value-multiples"],
  ["DCF估值", "discounted cash flow valuation", "估值", ["DCF", "自由现金流"], "建立经营预测、自由现金流、折现率、终值和敏感性分析。", "Build operating forecasts, free cash flow, discount rate, terminal value, and sensitivities.", "NYU Stern: DCF and Relative Valuation", "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/littlebook/reconcilingdcfandrelative.htm"],
  ["WACC与资本成本", "WACC and cost of capital", "估值", ["WACC", "cost of capital"], "解释无风险利率、Beta、风险溢价、债务成本和资本结构权重。", "Explain the risk-free rate, beta, risk premium, debt cost, and capital weights.", "CFA: Private Company Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/private-company-valuation"],
  ["可比公司估值", "comparable company valuation", "估值", ["comps", "EV EBITDA"], "按商业模式、增长、利润率、地域和风险筛选可比公司并统一口径。", "Select peers by business model, growth, margin, geography, and risk with consistent definitions.", "CFA: Market-Based Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/market-based-valuation-price-enterprise-value-multiples"],
  ["先例交易估值", "precedent transaction valuation", "估值", ["precedent transactions", "control premium"], "调整控制权溢价、协同预期、交易周期和样本可比性。", "Adjust for control premium, expected synergies, deal cycle, and sample comparability.", "FINRA: Series 79", "https://www.finra.org/registration-exams-ce/qualification-exams/series79"],
  ["并购模型", "M&A modeling", "并购", ["M&A", "accretion dilution"], "拆解收购价、融资方式、协同、购买价分摊及增厚摊薄。", "Decompose purchase price, financing, synergies, purchase accounting, and accretion/dilution.", "FINRA: Series 79", "https://www.finra.org/registration-exams-ce/qualification-exams/series79"],
  ["杠杆收购", "leveraged buyout", "并购", ["LBO", "IRR", "leverage"], "从进入估值、债务容量、现金流偿债、退出倍数和IRR构建回报。", "Build returns from entry value, debt capacity, cash paydown, exit multiple, and IRR.", "O*NET: Financial and Investment Analysts", "https://www.onetonline.org/link/details/13-2051.00"],
  ["IPO与股票承销", "IPO and equity underwriting", "资本市场", ["IPO", "underwriting"], "覆盖上市准备、尽调、申报、路演、簿记定价和稳定市场。", "Cover readiness, diligence, filing, roadshow, bookbuilding, pricing, and stabilization.", "FINRA: Business Model Definitions", "https://www.finra.org/rules-guidance/key-topics/finra-examination-risk-monitoring-programs/business-model-segment-definitions"],
  ["债券与信用分析", "debt and credit analysis", "资本市场", ["债券", "credit", "covenant"], "评估杠杆、覆盖率、现金流、担保、契约和再融资风险。", "Assess leverage, coverage, cash flow, security, covenants, and refinancing risk.", "FINRA: Business Model Definitions", "https://www.finra.org/rules-guidance/key-topics/finra-examination-risk-monitoring-programs/business-model-segment-definitions"],
  ["行业与市场分析", "industry and market analysis", "行业研究", ["市场规模", "industry analysis"], "用市场规模、竞争格局、单位经济、周期和监管形成投资判断。", "Form a view from market size, competition, unit economics, cycles, and regulation.", "O*NET: Financial and Investment Analysts", "https://www.onetonline.org/link/details/13-2051.00"],
  ["银行业分析", "banking-sector analysis", "行业研究", ["NIM", "NPL", "CET1"], "关注净息差、资产质量、拨备、资本充足率和流动性。", "Focus on net interest margin, asset quality, provisions, capital, and liquidity.", "O*NET: Financial and Investment Analysts", "https://www.onetonline.org/link/details/13-2051.00"],
  ["科技与SaaS指标", "technology and SaaS metrics", "行业研究", ["ARR", "NRR", "CAC", "LTV"], "连接ARR、留存、获客成本、毛利率与现金消耗。", "Connect ARR, retention, acquisition cost, gross margin, and cash burn.", "CFA: Market-Based Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/market-based-valuation-price-enterprise-value-multiples"],
  ["交易流程与尽调", "deal process and due diligence", "交易执行", ["尽调", "due diligence"], "明确工作流、责任人、数据室、关键风险、验证程序和结论升级。", "Define workflow, ownership, data room, key risks, verification, and escalation.", "FINRA: Series 79", "https://www.finra.org/registration-exams-ce/qualification-exams/series79"],
  ["Pitchbook与客户表达", "pitchbook and client communication", "交易执行", ["pitchbook", "client presentation"], "保证数据可追溯、故事线清晰、建议可执行且风险充分披露。", "Keep data traceable, narrative clear, recommendations actionable, and risks disclosed.", "O*NET: Financial and Investment Analysts", "https://www.onetonline.org/link/details/13-2051.00"],
  ["A股发行上市", "A-share issuance and listing", "中国资本市场", ["A股", "注册制", "科创板", "创业板"], "区分板块定位、上市标准、审核注册、发行定价和持续监管。", "Distinguish board positioning, listing tests, review/registration, pricing, and ongoing regulation.", "SSE Listing Rules 2026", "https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/mainipo/c/c_20260424_10816589.shtml"],
  ["港股发行上市", "Hong Kong listing", "香港资本市场", ["港股", "HKEX", "Chapter 8", "18C"], "比较财务测试、上市资格、保荐人、公众持股、基石投资和持续义务。", "Compare financial tests, eligibility, sponsors, public float, cornerstone investors, and ongoing duties.", "HKEX Listing Rules", "https://en-rules.hkex.com.hk/entiresection/2301"],
  ["职业判断与合规", "professional judgment and compliance", "职业能力", ["合规", "conflict", "ethics"], "识别利益冲突、信息隔离、重大性、记录留痕和升级机制。", "Identify conflicts, information barriers, materiality, documentation, and escalation.", "FINRA: Series 79", "https://www.finra.org/registration-exams-ce/qualification-exams/series79"]
].map(([zh,en,category,keywords,frameworkZh,frameworkEn,sourceTitle,sourceUrl]) => ({zh,en,category,keywords,frameworkZh,frameworkEn,sourceTitle,sourceUrl})) as Topic[];

const angles = [
  ["定义并说明核心逻辑", "Define it and explain the core logic"],
  ["用一个简化数字案例说明", "Explain it with a simplified numerical example"],
  ["说明最关键的三个输入", "Identify the three most important inputs"],
  ["说明常见错误和修正方法", "Describe common mistakes and how to fix them"],
  ["说明对估值或交易决策的影响", "Explain its impact on valuation or deal decisions"],
  ["比较两种常用方法", "Compare two commonly used approaches"],
  ["说明如何进行敏感性分析", "Explain how to run sensitivity analysis"],
  ["说明如何验证数据可靠性", "Explain how to validate data reliability"],
  ["从买方角度分析", "Analyze it from a buyer's perspective"],
  ["从卖方角度分析", "Analyze it from a seller's perspective"],
  ["从投资者角度分析", "Analyze it from an investor's perspective"],
  ["从监管与合规角度分析", "Analyze it from a regulatory and compliance perspective"],
  ["给出压力情景下的处理方式", "Explain the approach under a downside scenario"],
  ["说明行业差异如何改变结论", "Explain how sector differences change the conclusion"],
  ["说明市场周期变化的影响", "Explain the impact of a changing market cycle"],
  ["说明应在模型中如何呈现", "Explain how it should appear in a model"],
  ["说明应在客户材料中如何表达", "Explain how it should be presented to a client"],
  ["列出尽调时需要追问的问题", "List the follow-up questions needed in diligence"],
  ["给出面试中的结构化回答框架", "Give a structured interview-answer framework"],
  ["结合一个失败案例说明复盘重点", "Use a failure scenario to explain retrospective lessons"]
];

export const investmentBanking400: KnowledgeSeed[] = ibTopics.flatMap((topic, topicIndex) =>
  angles.map(([angleZh, angleEn], angleIndex) => ({
    slug: `ib400-${String(topicIndex + 1).padStart(2, "0")}-${String(angleIndex + 1).padStart(2, "0")}`,
    domain: "INVESTMENT_BANKING",
    category: `投行400问·${topic.category}`,
    titleZh: `第 ${topicIndex * 20 + angleIndex + 1} 问：${topic.zh}`,
    titleEn: `Question ${topicIndex * 20 + angleIndex + 1}: ${topic.en}`,
    summaryZh: `关于${topic.zh}，请${angleZh}。`,
    summaryEn: `For ${topic.en}, ${angleEn.toLowerCase()}.`,
    contentZh: `参考框架：${topic.frameworkZh} 回答需明确假设、计算口径、风险与结论，不应只背诵公式。`,
    contentEn: `Answer framework: ${topic.frameworkEn} State assumptions, definitions, risks, and conclusions instead of only reciting formulas.`,
    keywords: [...topic.keywords, angleZh],
    competencies: ["investment-banking-400", topic.category],
    sourceTitle: topic.sourceTitle,
    sourceUrl: topic.sourceUrl,
    researchRound: 2
  }))
);

function entry(
  slug: string, domain: KnowledgeSeed["domain"], category: string,
  titleZh: string, titleEn: string, summaryZh: string, summaryEn: string,
  keywords: string[], sourceTitle: string, sourceUrl: string
): KnowledgeSeed {
  return { slug, domain, category, titleZh, titleEn, summaryZh, summaryEn,
    contentZh: `${summaryZh} 使用时应核对适用板块、公司阶段、规则版本和数据截至日期。`,
    contentEn: `${summaryEn} Verify the applicable board, company stage, rule version, and data cutoff before use.`,
    keywords, competencies: [category], sourceTitle, sourceUrl, researchRound: 2 };
}

export const roundTwoKnowledge: KnowledgeSeed[] = [
  entry("cn-mainboard-rules-2026", "INVESTMENT_BANKING", "A/H股·上市规则", "A股主板上市与持续监管（2026）", "A-share Main Board listing and ongoing duties (2026)", "主板规则覆盖上市、信息披露、停复牌、风险警示和退市；申报时需以交易所现行规则逐项核对。", "Main Board rules cover listing, disclosure, suspension, risk warnings, and delisting; filings require a current-rule checklist.", ["A股", "主板", "上市规则"], "SSE Main Board Listing Rules (Apr 2026)", "https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/mainipo/c/c_20260424_10816589.shtml"),
  entry("cn-star-rules-2026", "INVESTMENT_BANKING", "A/H股·上市规则", "科创板定位与上市规则（2026）", "STAR Market positioning and listing rules (2026)", "科创板强调硬科技属性并设置多套上市标准，需同时论证板块定位、技术先进性、商业化和风险披露。", "STAR Market uses multiple listing tests and requires evidence on hard-tech positioning, technology, commercialization, and risks.", ["科创板", "硬科技", "第五套标准"], "SSE STAR Listing Rules (Apr 2026)", "https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/staripo/c/c_20260424_10816592.shtml"),
  entry("cn-ai-star-standard-2026", "INVESTMENT_BANKING", "A/H股·上市规则", "AI大模型企业科创板第五套标准", "Fifth STAR listing standard for foundation-model companies", "2026年指引明确大模型自主研发、模型服务或应用企业适用第五套标准时的技术、阶段成果、市场空间、商业化和合规核查重点。", "The 2026 guidance details technology, milestones, market space, commercialization, and compliance checks for foundation-model issuers using the fifth test.", ["AI大模型", "科创板", "第五套上市标准"], "SSE Guidance No.10 (Jun 2026)", "https://www.sse.com.cn/lawandrules/sselawsrules2025/stocks/review/firstepisode/c/c_20260617_10822578.shtml"),
  entry("cn-chinext-rules-2026", "INVESTMENT_BANKING", "A/H股·上市规则", "创业板上市规则与改革（2026）", "ChiNext listing rules and reform (2026)", "创业板服务创新成长企业，2026年改革涉及上市标准、发行定价与科技企业支持机制。", "ChiNext serves innovative growth companies; 2026 reforms address listing tests, IPO pricing, and support for technology issuers.", ["创业板", "上市标准", "发行定价"], "SZSE ChiNext Listing Rules (2026)", "https://docs.static.szse.cn/www/lawrules/rule/stock/W020260424688875101057.pdf"),
  entry("hk-mainboard-ch8", "INVESTMENT_BANKING", "A/H股·上市规则", "港股主板第8章上市资格", "HKEX Main Board Chapter 8 eligibility", "主板上市资格需结合财务测试、管理层与所有权连续性、公众持股和市值等要求判断，并关注特殊章节的额外条件。", "Main Board eligibility combines financial tests, management and ownership continuity, public float, market capitalization, and any specialist-chapter conditions.", ["港股", "Chapter 8", "public float"], "HKEX Listing Rules Chapter 8", "https://en-rules.hkex.com.hk/entiresection/2301"),
  entry("hk-18c", "INVESTMENT_BANKING", "A/H股·上市规则", "港股18C特专科技公司", "HKEX Chapter 18C specialist technology companies", "18C为特专科技公司提供专门上市路径，关注商业化状态、估值、研发投入、资深投资者和披露要求。", "Chapter 18C provides a route for specialist technology companies, focusing on commercialization, valuation, R&D, sophisticated investors, and disclosure.", ["18C", "特专科技", "HKEX"], "HKEX Chapter 18C", "https://en-rules.hkex.com.hk/entiresection/2301"),
  entry("ah-market-h1-2026", "INVESTMENT_BANKING", "A/H股·市场动态", "香港市场2026年上半年概览", "Hong Kong market H1 2026 snapshot", "截至2026年6月底，港股上半年日均成交2,830亿港元，87宗上市募资2,102亿港元；科技、AI和互联互通是重要驱动力。", "At end-June 2026, H1 ADT was HK$283.0bn and 87 listings raised HK$210.2bn; technology, AI, and Stock Connect were important drivers.", ["港股市场", "IPO", "ADT", "2026 H1"], "HKEX: Hong Kong Markets H1 2026", "https://www.hkexgroup.com/Media-Centre/Insight/Insight/2026/HKEX-Insight/Hong-Kong-Markets-H1-2026-Update?sc_lang=en"),
  entry("a-share-trading-rule-2026", "INVESTMENT_BANKING", "A/H股·市场动态", "A股交易机制2026年调整", "A-share trading mechanism changes in 2026", "上交所2026年交易规则将盘后固定价格交易扩至全部A股和ETF，并调整基金收盘机制及主板风险警示股票涨跌幅。", "The 2026 SSE rules extend after-hours fixed-price trading to all A shares and ETFs and adjust fund closing and risk-warning price limits.", ["A股", "盘后固定价格", "交易规则"], "SSE Trading Rules Update (Apr 2026)", "https://www.sse.com.cn/aboutus/mediacenter/hotandd/c/c_20260424_10816474.shtml"),

  entry("aipm-workflow", "AI_PRODUCT_MANAGER", "AI产品·全流程", "AI产品端到端工作流", "End-to-end AI product workflow", "从问题定义、可行性验证、数据与评估集、原型、模型与系统设计、灰度上线、监控到复盘形成闭环。", "Create a loop from problem framing and feasibility through data/evals, prototyping, model/system design, rollout, monitoring, and retrospective.", ["AI产品流程", "workflow", "MVP"], "Google PAIR Guidebook", "https://pair.withgoogle.com/guidebook-v2/"),
  entry("aipm-badcase", "AI_PRODUCT_MANAGER", "AI产品·全流程", "BadCase驱动迭代", "Bad-case-driven iteration", "把生产失败按意图、检索、推理、工具、输出、安全和体验归因，沉淀为可复现样本、修复策略和回归测试。", "Attribute production failures to intent, retrieval, reasoning, tools, output, safety, or UX, then turn them into reproducible samples, fixes, and regression tests.", ["badcase", "错误归因", "回归测试"], "Apple Evaluations", "https://developer.apple.com/documentation/evaluations"),
  entry("aipm-capability-design", "AI_PRODUCT_MANAGER", "AI产品·全流程", "AI能力设计与边界", "AI capability design and boundaries", "用用户任务定义能力单元，明确输入、输出、工具、状态、失败模式、置信阈值和人工接管。", "Define capability units around user tasks with inputs, outputs, tools, state, failure modes, confidence thresholds, and human handoff.", ["AI能力", "tool use", "human handoff"], "Google PAIR Guidebook", "https://pair.withgoogle.com/guidebook-v2/"),
  entry("aipm-model-selection", "AI_PRODUCT_MANAGER", "AI产品·全流程", "模型选型方法", "Model selection method", "以任务级评估比较质量、延迟、成本、上下文、工具调用、结构化输出、安全和部署约束，而非只看通用榜单。", "Compare task-level quality, latency, cost, context, tool use, structured output, safety, and deployment constraints rather than relying on generic leaderboards.", ["模型选型", "model selection", "latency", "cost"], "OpenAI Evals", "https://github.com/openai/evals"),
  entry("aipm-accuracy", "AI_PRODUCT_MANAGER", "AI产品·全流程", "提升AI系统精确率的方法树", "Method tree for improving AI-system accuracy", "先定位错误层，再选择数据清洗、提示优化、检索、工具、约束解码、模型升级、微调或人工复核，最后用冻结评估集验证。", "Localize the error layer, then choose data cleaning, prompting, retrieval, tools, constrained output, model upgrade, fine-tuning, or review, and verify on a frozen eval set.", ["精确率", "prompt", "RAG", "fine-tuning"], "OpenAI Evals", "https://github.com/openai/evals"),
  entry("aipm-skills", "AI_PRODUCT_MANAGER", "AI产品·全流程", "Skills与可复用能力模块", "Skills and reusable capability modules", "Skill应封装明确触发条件、流程、工具权限、输入输出契约、边界、失败恢复和评估用例。", "A skill packages triggers, workflow, tool permissions, I/O contracts, boundaries, recovery, and evaluation cases.", ["skills", "agent", "tool permissions"], "NIST AI RMF Core", "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/"),
  entry("aipm-dataset", "AI_PRODUCT_MANAGER", "AI产品·数据集", "AI评估数据集建立", "Building AI evaluation datasets", "数据集应覆盖正常、困难、边界、安全和历史BadCase，保留来源、标签规范、版本、切分与泄漏检查。", "Datasets should cover normal, hard, boundary, safety, and historical bad cases with provenance, labeling rules, versions, splits, and leakage checks.", ["数据集", "golden set", "labeling", "eval"], "MLflow: Evaluation Datasets", "https://mlflow.org/docs/latest/genai/datasets/"),
  entry("ai-transformer", "AI_PRODUCT_MANAGER", "AI基础知识", "Transformer与大语言模型基础", "Transformer and LLM fundamentals", "理解token、embedding、attention、上下文窗口、预训练、指令微调和推理阶段，有助于判断能力与限制。", "Understanding tokens, embeddings, attention, context windows, pretraining, instruction tuning, and inference clarifies capabilities and limits.", ["Transformer", "token", "attention", "LLM"], "NIST Generative AI Profile", "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence"),
  entry("ai-rag-agents", "AI_PRODUCT_MANAGER", "AI基础知识", "RAG、工具调用与Agent", "RAG, tool use, and agents", "RAG提供外部证据，工具调用执行结构化动作，Agent通过状态和策略组织多步任务；三者解决的问题不同。", "RAG supplies external evidence, tools perform structured actions, and agents organize multi-step work through state and policy; they solve different problems.", ["RAG", "tool calling", "agent"], "Retrieval-Augmented Generation Paper", "https://arxiv.org/abs/2005.11401"),
  entry("ai-eval-metrics", "AI_PRODUCT_MANAGER", "AI基础知识", "生成式AI评估指标", "Generative-AI evaluation metrics", "同时衡量任务正确性、忠实度、相关性、安全、延迟、成本与用户结果，并通过切片发现平均分掩盖的问题。", "Measure correctness, faithfulness, relevance, safety, latency, cost, and user outcomes, using slices to expose failures hidden by averages.", ["评估指标", "faithfulness", "RAGAS"], "RAGAS", "https://aclanthology.org/2024.eacl-demo.16/"),
  entry("vibe-spec", "AI_PRODUCT_MANAGER", "Vibe Coding实操", "Vibe Coding：先写规格与验收", "Vibe coding: start with specs and acceptance tests", "把需求拆成用户故事、数据契约、边界条件和可执行验收测试，再让AI逐步实现和验证。", "Turn requirements into user stories, data contracts, edge cases, and executable acceptance tests before asking AI to implement and verify incrementally.", ["vibe coding", "spec", "acceptance test"], "GitHub Docs: About Copilot Coding Agent", "https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent"),
  entry("vibe-context", "AI_PRODUCT_MANAGER", "Vibe Coding实操", "Vibe Coding：上下文与任务切片", "Vibe coding: context and task slicing", "为AI提供架构、约束、相关文件和小而完整的任务，避免一次性修改过大导致漂移。", "Give AI the architecture, constraints, relevant files, and small complete tasks to reduce drift from oversized changes.", ["context", "task slicing", "repo instructions"], "GitHub Docs: Copilot Coding Agent", "https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent"),
  entry("vibe-verify", "AI_PRODUCT_MANAGER", "Vibe Coding实操", "Vibe Coding：测试、Diff与回滚", "Vibe coding: tests, diffs, and rollback", "每个增量都检查diff、运行类型检查和测试、验证真实页面，保留小提交并避免把敏感信息写入代码。", "For each increment, inspect the diff, run checks and tests, verify the real UI, keep commits small, and keep secrets out of code.", ["diff", "test", "rollback", "security"], "GitHub Docs: Responsible Use", "https://docs.github.com/en/copilot/responsible-use/copilot-coding-agent")
];
