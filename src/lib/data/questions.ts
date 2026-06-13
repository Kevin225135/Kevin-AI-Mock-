import type { Question } from "@/lib/domain/types";

export const questionBank: Question[] = [
  {
    id: "beh-ib-001",
    module: "BEHAVIORAL",
    targetRole: "Investment Banking Analyst",
    difficulty: "MEDIUM",
    prompt:
      "Tell me about a time you worked under intense deadline pressure and still protected the quality of your output.",
    expectation:
      "关注压力管理、质量控制、沟通升级、结果量化，避免只描述忙碌。"
  },
  {
    id: "beh-consulting-001",
    module: "BEHAVIORAL",
    targetRole: "Strategy Consultant",
    difficulty: "MEDIUM",
    prompt:
      "Describe a time you changed someone's mind with structured analysis rather than authority.",
    expectation:
      "关注结构化说服、利益相关方理解、证据选择、最终影响。"
  },
  {
    id: "beh-pm-001",
    module: "BEHAVIORAL",
    targetRole: "Product Manager",
    difficulty: "MEDIUM",
    prompt:
      "Tell me about a time you handled conflict between users, business stakeholders, and engineering constraints.",
    expectation:
      "关注用户价值、取舍逻辑、沟通机制、落地结果。"
  },
  {
    id: "beh-swe-001",
    module: "BEHAVIORAL",
    targetRole: "Software Engineer",
    difficulty: "MEDIUM",
    prompt:
      "Tell me about a time you found a serious bug late in a project and had to decide how to respond.",
    expectation:
      "关注风险判断、协作沟通、修复策略、复盘预防。"
  },
  {
    id: "cv-ib-001",
    module: "CV_RELATED",
    targetRole: "Investment Banking Analyst",
    difficulty: "EASY",
    prompt:
      "Walk me through your resume and highlight the experiences that best prepare you for investment banking.",
    expectation:
      "回答应有清晰主线，把经历映射到建模、抗压、沟通和交易兴趣。"
  },
  {
    id: "cv-consulting-001",
    module: "CV_RELATED",
    targetRole: "Strategy Consultant",
    difficulty: "EASY",
    prompt:
      "Walk me through your resume and explain why consulting is the natural next step.",
    expectation:
      "回答应把项目经历、问题拆解能力、商业兴趣和职业选择串成一条线。"
  },
  {
    id: "cv-pm-001",
    module: "CV_RELATED",
    targetRole: "Product Manager",
    difficulty: "EASY",
    prompt:
      "Choose one project from your CV and explain the product decision you are most proud of.",
    expectation:
      "关注用户问题、决策依据、替代方案、指标影响和个人贡献。"
  },
  {
    id: "cv-swe-001",
    module: "CV_RELATED",
    targetRole: "Software Engineer",
    difficulty: "EASY",
    prompt:
      "Pick the most technically challenging project on your resume and explain your specific contribution.",
    expectation:
      "关注技术难点、方案权衡、代码或架构贡献、结果和复盘。"
  },
  {
    id: "tech-ib-001",
    module: "TECHNICAL",
    targetRole: "Investment Banking Analyst",
    difficulty: "HARD",
    prompt:
      "If two companies have the same EBITDA but different growth profiles, how would you think about valuation differences?",
    expectation:
      "关注倍数驱动因素、增长、利润质量、风险、资本结构和可比性。"
  },
  {
    id: "tech-consulting-001",
    module: "TECHNICAL",
    targetRole: "Strategy Consultant",
    difficulty: "HARD",
    prompt:
      "A retailer's same-store sales are flat while total revenue is growing. How would you diagnose the situation?",
    expectation:
      "关注拆解树、门店扩张、客流、客单价、品类、渠道和竞争因素。"
  },
  {
    id: "tech-pm-001",
    module: "TECHNICAL",
    targetRole: "Product Manager",
    difficulty: "HARD",
    prompt:
      "A messaging app's daily active users are stable, but messages sent per user dropped 20%. How would you investigate?",
    expectation:
      "关注指标拆解、用户分群、漏斗、产品变更、外部因素和验证实验。"
  },
  {
    id: "tech-swe-001",
    module: "TECHNICAL",
    targetRole: "Software Engineer",
    difficulty: "HARD",
    prompt:
      "How would you design a rate limiter for an API used by both free and enterprise customers?",
    expectation:
      "关注限流算法、数据结构、分布式一致性、租户策略和降级体验。"
  },
  {
    id: "market-ib-001",
    module: "MARKET",
    targetRole: "Investment Banking Analyst",
    difficulty: "MEDIUM",
    prompt:
      "Pick one current macro factor and explain how it could affect M&A activity over the next year.",
    expectation:
      "关注利率、融资环境、估值预期、行业差异和交易动机。"
  },
  {
    id: "market-consulting-001",
    module: "MARKET",
    targetRole: "Strategy Consultant",
    difficulty: "MEDIUM",
    prompt:
      "Choose an industry facing structural change and explain where you would look for profit pool shifts.",
    expectation:
      "关注价值链、客户行为、成本结构、竞争格局和可验证假设。"
  },
  {
    id: "market-pm-001",
    module: "MARKET",
    targetRole: "Product Manager",
    difficulty: "MEDIUM",
    prompt:
      "Name one product trend you believe is overhyped and one that is underappreciated. Defend both views.",
    expectation:
      "关注用户需求、商业模式、技术成熟度、反例和判断边界。"
  },
  {
    id: "market-swe-001",
    module: "MARKET",
    targetRole: "Software Engineer",
    difficulty: "MEDIUM",
    prompt:
      "What engineering capability do you think will matter most for software teams as AI tooling becomes more common?",
    expectation:
      "关注系统性判断、团队协作、质量控制、安全性和长期效率。"
  }
];
