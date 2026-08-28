export const defaultRubricVersion = {
  code: "v1_text_mock_rubric",
  version: 2,
  title: "V2 模块化文本 Mock Rubric",
  dimensions: {
    starCompleteness: {
      label: "回答完整度",
      scale: "1-5",
      anchors: {
        1: "缺少该题型所需的多数核心要素",
        3: "覆盖主要要素，但证据、边界或结果仍偏笼统",
        5: "完整覆盖该题型要求，证据清楚且没有关键缺口"
      }
    },
    logicStructure: {
      label: "逻辑结构",
      scale: "1-5",
      anchors: {
        1: "回答跳跃，主线不明确",
        3: "有基本结构，但层次或转折不够清晰",
        5: "先结论后论证，层次稳定，取舍明确"
      }
    },
    contentDepth: {
      label: "内容深度",
      scale: "1-5",
      anchors: {
        1: "停留在表面描述，缺少细节和判断",
        3: "有部分细节，但缺少权衡、数据或复盘",
        5: "能展示具体行动、业务理解、反思和可迁移能力"
      }
    },
    communication: {
      label: "表达清晰度",
      scale: "1-5",
      anchors: {
        1: "表达冗长或含糊，难以抓住重点",
        3: "表达基本清楚，但有重复或口径不稳",
        5: "语言简洁，重点突出，适合面试现场表达"
      }
    }
  }
} as const;
