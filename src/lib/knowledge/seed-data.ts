export type KnowledgeSeed = {
  slug: string;
  domain: "INVESTMENT_BANKING" | "AI_PRODUCT_MANAGER";
  category: string;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  contentZh: string;
  contentEn: string;
  keywords: string[];
  competencies: string[];
  sourceTitle: string;
  sourceUrl: string;
  researchRound: number;
};

const ib = (
  slug: string, category: string, titleZh: string, titleEn: string,
  summaryZh: string, summaryEn: string, keywords: string[], sourceTitle: string,
  sourceUrl: string, researchRound: number
): KnowledgeSeed => ({
  slug: `ib-${slug}`, domain: "INVESTMENT_BANKING", category, titleZh, titleEn,
  summaryZh, summaryEn, contentZh: `${summaryZh} 面试回答应说明定义、计算逻辑、关键假设、敏感性与业务影响，并用可核验数字支撑结论。`,
  contentEn: `${summaryEn} A strong interview answer explains the definition, calculation, assumptions, sensitivities, business impact, and supporting numbers.`,
  keywords, competencies: ["financial-analysis", "valuation", "deal-judgment"],
  sourceTitle, sourceUrl, researchRound
});

const pm = (
  slug: string, category: string, titleZh: string, titleEn: string,
  summaryZh: string, summaryEn: string, keywords: string[], sourceTitle: string,
  sourceUrl: string, researchRound: number
): KnowledgeSeed => ({
  slug: `aipm-${slug}`, domain: "AI_PRODUCT_MANAGER", category, titleZh, titleEn,
  summaryZh, summaryEn, contentZh: `${summaryZh} 面试回答应交代用户问题、方案边界、评估方法、上线指标、风险控制与迭代闭环。`,
  contentEn: `${summaryEn} A strong interview answer covers the user problem, system boundary, evaluation, launch metrics, risk controls, and iteration loop.`,
  keywords, competencies: ["product-sense", "ai-evaluation", "responsible-ai"],
  sourceTitle, sourceUrl, researchRound
});

export const knowledgeSeeds: KnowledgeSeed[] = [
  ib("three-statements", "财务分析", "三大财务报表联动", "Three-statement linkage", "利润表、资产负债表和现金流量表通过净利润、营运资本、折旧、资本开支及融资活动相互连接。", "The income statement, balance sheet, and cash flow statement connect through net income, working capital, depreciation, capex, and financing.", ["三大报表", "现金流", "working capital", "three statements"], "SEC: The Statement of Cash Flows", "https://www.sec.gov/newsroom/speeches-statements/munter-statement-cash-flows-120423", 2),
  ib("cash-flow-quality", "财务分析", "现金流质量", "Cash-flow quality", "现金流质量关注利润是否转化为经营现金流，以及一次性项目、分类判断和营运资本变化是否扭曲表现。", "Cash-flow quality tests whether earnings convert into operating cash and whether one-offs, classification, or working-capital movements distort performance.", ["经营现金流", "利润质量", "free cash flow", "cash conversion"], "SEC: The Statement of Cash Flows", "https://www.sec.gov/newsroom/speeches-statements/munter-statement-cash-flows-120423", 2),
  ib("enterprise-equity-value", "估值", "企业价值与股权价值", "Enterprise value vs. equity value", "企业价值反映核心经营资产对全部资本提供者的价值；股权价值属于普通股股东，二者通过净债务等项目衔接。", "Enterprise value represents operating assets for all capital providers; equity value belongs to common shareholders, bridged mainly through net debt and other claims.", ["企业价值", "股权价值", "EV", "equity value", "net debt"], "CFA Institute: Market-Based Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/market-based-valuation-price-enterprise-value-multiples", 2),
  ib("dcf", "估值", "现金流折现估值", "Discounted cash flow", "DCF把预测自由现金流按与风险匹配的折现率折算为现值，核心敏感项是收入、利润率、WACC和终值。", "DCF discounts forecast free cash flows at a risk-consistent rate; revenue, margins, WACC, and terminal value are key sensitivities.", ["DCF", "现金流折现", "自由现金流", "discounted cash flow"], "NYU Stern: DCF and Relative Valuation", "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/littlebook/reconcilingdcfandrelative.htm", 2),
  ib("wacc", "估值", "加权平均资本成本", "Weighted average cost of capital", "WACC按市场价值权重组合股权和税后债务成本，用于折现面向全部资本提供者的自由现金流。", "WACC combines the cost of equity and after-tax debt using market-value weights and discounts cash flow available to all capital providers.", ["WACC", "资本成本", "cost of equity", "cost of debt"], "CFA Institute: Private Company Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/private-company-valuation", 2),
  ib("terminal-value", "估值", "终值与敏感性", "Terminal value and sensitivity", "终值可采用永续增长或退出倍数法，必须检查增长率、倍数和隐含回报是否与基本面一致。", "Terminal value may use perpetual growth or an exit multiple; growth, multiples, and implied returns must be checked against fundamentals.", ["终值", "永续增长", "exit multiple", "terminal value"], "NYU Stern: Valuation Introduction", "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/background/valintro.htm", 2),
  ib("comps", "估值", "可比公司分析", "Comparable company analysis", "可比公司法以业务模式、增长、利润率和风险筛选同业，再用一致口径的交易倍数形成估值区间。", "Trading comps select peers by business model, growth, margins, and risk, then apply consistently defined multiples to form a valuation range.", ["可比公司", "交易倍数", "EV EBITDA", "trading comps"], "CFA Institute: Market-Based Valuation", "https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/market-based-valuation-price-enterprise-value-multiples", 2),
  ib("precedents-ma", "交易执行", "先例交易与并购影响", "Precedent transactions and M&A impact", "先例交易反映控制权和市场周期；并购分析还需评估协同、融资、整合风险以及每股收益增厚或摊薄。", "Precedent deals reflect control and market cycles; M&A analysis also tests synergies, financing, integration risk, and EPS accretion or dilution.", ["先例交易", "并购", "协同效应", "accretion dilution", "M&A"], "FINRA: Series 79", "https://www.finra.org/registration-exams-ce/qualification-exams/series79", 2),
  ib("capital-markets", "交易执行", "资本募集与承销", "Capital raising and underwriting", "资本市场工作覆盖证券发行、承销、定价与投资者沟通，需要平衡发行人目标、市场窗口和执行风险。", "Capital-markets work covers issuance, underwriting, pricing, and investor communication, balancing issuer goals, market windows, and execution risk.", ["IPO", "承销", "发行", "underwriting", "capital raising"], "FINRA: Business Model Segment Definitions", "https://www.finra.org/rules-guidance/key-topics/finra-examination-risk-monitoring-programs/business-model-segment-definitions", 2),
  ib("deal-process", "职业能力", "交易流程与材料表达", "Deal process and presentation", "投行人员要在尽调、模型、估值、材料制作和客户沟通之间保持数据一致、版本可追溯与结论清晰。", "Bankers maintain consistency, traceability, and clear conclusions across diligence, modeling, valuation, materials, and client communication.", ["pitchbook", "尽职调查", "financial modeling", "client presentation"], "O*NET: Financial and Investment Analysts", "https://www.onetonline.org/link/details/13-2051.00", 1),

  pm("problem-selection", "产品策略", "AI问题选择与用户价值", "AI problem selection and user value", "先验证真实用户痛点和成功标准，再判断AI是否比规则、搜索或人工流程更合适。", "Validate the user problem and success criteria first, then determine whether AI is better than rules, search, or a human workflow.", ["用户价值", "问题定义", "product discovery", "AI use case"], "Google PAIR Guidebook", "https://pair.withgoogle.com/guidebook-v2/", 1),
  pm("metrics", "评估", "业务指标与模型指标", "Business and model metrics", "模型准确率不是产品成功本身；需把离线质量指标连接到任务成功率、留存、成本和用户满意度。", "Model accuracy is not product success; offline quality must connect to task success, retention, cost, and user satisfaction.", ["业务指标", "模型指标", "task success", "product metrics"], "Google: Measuring Success", "https://developers.google.com/machine-learning/managing-ml-projects/success", 3),
  pm("eval-design", "评估", "评估集与评分标准", "Evaluation sets and rubrics", "评估集应覆盖典型、困难和安全边界案例，并用清晰评分标准、人工标注与回归测试控制版本质量。", "Evaluation sets should cover common, difficult, and safety-boundary cases, using explicit rubrics, human labels, and regression tests.", ["evals", "评估集", "rubric", "golden dataset"], "OpenAI: Evals API", "https://platform.openai.com/docs/api-reference/evals/deleteRun?lang=python", 3),
  pm("offline-online", "评估", "离线评估与在线实验", "Offline evaluation and online experiments", "离线评估适合快速比较候选方案，在线实验验证真实行为影响；两者需共享版本、样本和指标口径。", "Offline evaluation compares candidates quickly; online experiments validate real behavior impact, with shared versioning, samples, and metric definitions.", ["离线评估", "在线实验", "A/B test", "offline evaluation"], "Google: Measuring Success", "https://developers.google.com/machine-learning/managing-ml-projects/success", 3),
  pm("grounding", "生成式AI", "幻觉、检索与事实落地", "Hallucination, retrieval, and grounding", "RAG通过检索证据约束生成，但仍需评估检索相关性、答案忠实度、引用覆盖和无答案策略。", "RAG grounds generation with retrieved evidence, but still requires tests for retrieval relevance, faithfulness, citation coverage, and abstention.", ["RAG", "幻觉", "grounding", "faithfulness", "retrieval"], "RAGAs: Automated Evaluation of RAG", "https://aclanthology.org/2024.eacl-demo.16/", 4),
  pm("human-loop", "体验与安全", "人在回路与升级机制", "Human review and escalation", "高风险或低置信任务应让用户审核、修正或升级给人工，并明确自动化边界和责任归属。", "High-risk or low-confidence tasks should support review, correction, or escalation to a human, with clear automation boundaries and ownership.", ["人在回路", "人工审核", "human in the loop", "escalation"], "Google PAIR: Feedback and Control", "https://pair.withgoogle.com/guidebook-v2/chapter/feedback-controls/", 3),
  pm("trust", "体验与安全", "可解释性与信任校准", "Explainability and calibrated trust", "解释应帮助用户采取正确行动而非制造虚假确定性，并结合置信提示、证据和模型局限校准信任。", "Explanations should help users act without creating false certainty, calibrating trust through confidence cues, evidence, and limitations.", ["可解释性", "信任", "explainability", "confidence"], "Google PAIR: Explainability and Trust", "https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/", 3),
  pm("failure", "体验与安全", "优雅失败与反馈控制", "Graceful failure and feedback control", "系统无法可靠回答时应承认不确定、请求补充、给出替代路径，并让用户纠正和撤销。", "When the system cannot answer reliably, it should express uncertainty, request context, offer alternatives, and let users correct or undo.", ["优雅失败", "拒答", "fallback", "user control"], "Google PAIR: Feedback and Control", "https://pair.withgoogle.com/guidebook-v2/chapter/feedback-controls/", 3),
  pm("quality-cost-latency", "工程权衡", "质量、成本与延迟", "Quality, cost, and latency", "模型、上下文和工具选择需要在任务质量、端到端延迟、吞吐、单位成本与可维护性之间权衡。", "Model, context, and tool choices trade off task quality, end-to-end latency, throughput, unit cost, and maintainability.", ["延迟", "成本", "quality", "latency", "token cost"], "Google: Measuring Success", "https://developers.google.com/machine-learning/managing-ml-projects/success", 3),
  pm("risk-lifecycle", "治理", "AI风险管理生命周期", "AI risk-management lifecycle", "NIST框架用治理、映射、测量和管理组织持续风险工作，把安全、公平、隐私和问责嵌入产品生命周期。", "NIST organizes continuous risk work through Govern, Map, Measure, and Manage, embedding safety, fairness, privacy, and accountability across the lifecycle.", ["NIST AI RMF", "治理", "Govern Map Measure Manage", "responsible AI"], "NIST AI Risk Management Framework", "https://airc.nist.gov/airmf-resources/airmf/5-sec-core/", 1),
  pm("security", "治理", "生成式AI安全与隐私", "Generative-AI security and privacy", "产品需识别提示注入、敏感数据泄露、越权工具调用与有害输出，并分层设计权限、过滤、监控和应急响应。", "Products should address prompt injection, sensitive-data leakage, unauthorized tool calls, and harmful outputs through layered permissions, filtering, monitoring, and incident response.", ["提示注入", "隐私", "prompt injection", "data leakage"], "NIST: Generative AI Profile", "https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence", 3),
  pm("terminology", "知识治理", "双语术语与同义词治理", "Bilingual terminology and aliases", "双语知识库应维护首选术语、同义词、定义边界、来源和版本，避免直译导致召回漂移。", "A bilingual knowledge base should maintain preferred terms, aliases, boundaries, sources, and versions to prevent retrieval drift from literal translation.", ["双语术语", "同义词", "preferred term", "taxonomy"], "ESCO Terminological Guidelines", "https://esco.ec.europa.eu/uk/about-esco/publications/publication/esco-terminological-guidelines", 5)
];
