import type { Question } from "@/lib/domain/types";

const originalQuestionBank: Question[] = [
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

type RoleQuestionBank = Record<
  Question["targetRole"],
  Record<Question["module"], string[]>
>;

const roleQuestionBank: RoleQuestionBank = {
  "Investment Banking Analyst": {
    BEHAVIORAL: [
      "Tell me about a time you found an error in an important deliverable shortly before a deadline.",
      "Describe a situation where you had to manage competing requests from senior stakeholders.",
      "Tell me about a time you received difficult feedback and changed how you worked.",
      "Describe a team situation where you took ownership beyond your formal responsibilities."
    ],
    CV_RELATED: [
      "Which experience on your resume best demonstrates that you can succeed in investment banking, and why?",
      "Walk me through the most analytically demanding project on your resume.",
      "Which result on your resume would you defend most carefully under detailed questioning?",
      "What is the biggest gap between your resume and this role, and how are you closing it?"
    ],
    TECHNICAL: [
      "Walk me from revenue to free cash flow and explain the most important judgment points.",
      "How would you select comparable companies when no peer is a perfect match?",
      "Explain how an increase in working capital affects the three financial statements.",
      "How would you value a company with negative EBITDA but strong revenue growth?"
    ],
    MARKET: [
      "Choose a recent market development and explain its implications for deal activity.",
      "Which sector currently offers the strongest M&A rationale, and what could invalidate your view?",
      "How would a change in the yield curve affect valuation and financing conditions?",
      "Pitch one public company as a potential acquisition target and explain the strategic logic."
    ]
  },
  "Strategy Consultant": {
    BEHAVIORAL: [
      "Tell me about a time you brought structure to an ambiguous problem.",
      "Describe a conflict within a team and how you helped the group reach a decision.",
      "Tell me about a time your initial hypothesis was wrong and how you adjusted.",
      "Describe a situation where you influenced a stakeholder without formal authority."
    ],
    CV_RELATED: [
      "Which experience on your resume best demonstrates hypothesis-driven problem solving?",
      "Walk me through a project where your analysis changed a recommendation.",
      "Which resume achievement required the most stakeholder management?",
      "What part of your background gives you a distinctive consulting perspective?"
    ],
    TECHNICAL: [
      "A client's profits are falling despite revenue growth. How would you structure the diagnosis?",
      "How would you estimate the market size for a new urban mobility service?",
      "A manufacturer is considering entering a new country. How would you assess the decision?",
      "How would you determine whether a pricing change created sustainable value?"
    ],
    MARKET: [
      "Choose an industry undergoing structural change and identify where value is moving.",
      "Which macro trend will matter most to your target clients over the next two years?",
      "How would you assess whether generative AI is changing an industry's profit pool?",
      "Pick a recent corporate strategy move and evaluate whether it is likely to succeed."
    ]
  },
  "Product Manager": {
    BEHAVIORAL: [
      "Tell me about a time you made a product decision with incomplete data.",
      "Describe a conflict between user value, business goals, and engineering constraints.",
      "Tell me about a product failure and what you changed afterward.",
      "Describe a time you aligned several teams around a difficult priority decision."
    ],
    CV_RELATED: [
      "Which product decision on your resume had the clearest measurable user impact?",
      "Walk me through a project where you personally changed the product direction.",
      "Which metric on your resume is most meaningful, and how was it measured?",
      "What product skill is least visible on your resume, and what evidence supports it?"
    ],
    TECHNICAL: [
      "A product's activation rate dropped after onboarding was redesigned. How would you investigate?",
      "How would you define a north-star metric for a two-sided marketplace?",
      "Design an experiment to evaluate an AI-assisted workflow before a broad launch.",
      "How would you prioritize reliability work against a high-demand customer feature?"
    ],
    MARKET: [
      "Choose a product category where user behavior is changing and explain the opportunity.",
      "Which AI product trend is overestimated, and which supporting evidence would change your view?",
      "Evaluate the competitive position of a product you use frequently.",
      "How would you decide whether a successful domestic product can expand internationally?"
    ]
  },
  "Software Engineer": {
    BEHAVIORAL: [
      "Tell me about a time you improved engineering quality without slowing delivery.",
      "Describe a technical disagreement and how the team reached a decision.",
      "Tell me about a production incident you helped resolve and what changed afterward.",
      "Describe a time you mentored a teammate or raised the effectiveness of the team."
    ],
    CV_RELATED: [
      "Which project on your resume best demonstrates your engineering judgment?",
      "Walk me through the most difficult production issue represented on your resume.",
      "Which technical claim on your resume would you validate with metrics or code?",
      "What important engineering tradeoff is hidden behind one of your resume achievements?"
    ],
    TECHNICAL: [
      "Design a notification service that supports retries, ordering, and user preferences.",
      "How would you diagnose a sudden increase in API tail latency?",
      "Design data storage for a collaborative document editor.",
      "How would you migrate a high-traffic service without causing downtime?"
    ],
    MARKET: [
      "Which change in AI-assisted development will have the largest impact on engineering teams?",
      "How should an engineering organization evaluate build-versus-buy for a core platform?",
      "Which infrastructure trend is most likely to change software architecture over the next three years?",
      "How would you assess the technical credibility of a new developer-tool company?"
    ]
  }
};

const difficultyGuidance: Record<Question["difficulty"], {
  prefix: string;
  suffix: string;
}> = {
  EASY: {
    prefix: "Give a concise, structured answer. ",
    suffix: " Focus on the core framework and one concrete example."
  },
  MEDIUM: {
    prefix: "",
    suffix: " State your assumptions, reasoning, and the evidence you would use."
  },
  HARD: {
    prefix: "",
    suffix:
      " Address ambiguity, a meaningful trade-off, a rejected alternative, and how you would validate the outcome."
  }
};

const moduleExpectations: Record<Question["module"], string> = {
  BEHAVIORAL: "使用具体经历说明背景、个人行动、关键取舍、结果和复盘，避免只讲团队行为。",
  CV_RELATED: "引用简历中的具体事实，明确个人贡献、结果证据以及与目标岗位的关联。",
  TECHNICAL: "先给出结构化框架，再说明假设、关键判断、风险、替代方案和验证方法。",
  MARKET: "给出清晰观点、事实依据、传导机制、边界条件和可能推翻结论的信号。"
};

const roleIds: Record<Question["targetRole"], string> = {
  "Investment Banking Analyst": "ib",
  "Strategy Consultant": "consulting",
  "Product Manager": "pm",
  "Software Engineer": "swe"
};

const moduleIds: Record<Question["module"], string> = {
  BEHAVIORAL: "beh",
  CV_RELATED: "cv",
  TECHNICAL: "tech",
  MARKET: "market"
};

const difficultyIds: Record<Question["difficulty"], string> = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard"
};

const generatedQuestionBank: Question[] = Object.entries(roleQuestionBank).flatMap(
  ([targetRole, modules]) =>
    Object.entries(modules).flatMap(([module, prompts]) =>
      (Object.keys(difficultyGuidance) as Question["difficulty"][]).flatMap(
        (difficulty) =>
          prompts.map((prompt, index) => {
            const guidance = difficultyGuidance[difficulty];
            return {
              id: `${moduleIds[module as Question["module"]]}-${roleIds[targetRole]}-${difficultyIds[difficulty]}-${String(index + 1).padStart(2, "0")}`,
              module: module as Question["module"],
              targetRole,
              difficulty,
              prompt: `${guidance.prefix}${prompt}${guidance.suffix}`,
              expectation: moduleExpectations[module as Question["module"]]
            };
          })
      )
    )
);

export const questionBank: Question[] = [
  ...originalQuestionBank,
  ...generatedQuestionBank
];
