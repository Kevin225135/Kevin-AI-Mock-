import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outputPath =
  process.argv[2] ||
  path.resolve("docs", "AI_Mock_Interview_Coach_PM_Survey_Bilingual.docx");

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function runXml(text, { bold = false, italic = false, color = null, size = 21 } = {}) {
  let props = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
  if (bold) props += "<w:b/><w:bCs/>";
  if (italic) props += "<w:i/><w:iCs/>";
  if (color) props += `<w:color w:val="${color}"/>`;
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function paraXml(style, runs, { shading = null, before = null, after = null, left = 0 } = {}) {
  let pPr = "";
  if (style) pPr += `<w:pStyle w:val="${style}"/>`;
  if (before !== null || after !== null) {
    pPr += `<w:spacing w:before="${before ?? 0}" w:after="${after ?? 0}" w:line="300" w:lineRule="auto"/>`;
  }
  if (left > 0) pPr += `<w:ind w:left="${left}"/>`;
  if (shading) pPr += `<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.join("")}</w:p>`;
}

function textPara(style, text, options = {}) {
  return paraXml(style, [runXml(text, options)], {
    shading: options.shading,
    before: options.before,
    after: options.after,
    left: options.left ?? 0,
  });
}

const questions = [
  {
    q: "Q1. 你目前处于哪个求职阶段？ / What is your current job-search stage?（单选 / Single choice）",
    options: [
      "暑期实习准备 / Summer internship preparation",
      "校招准备 / Campus recruitment preparation",
      "转行求职 / Career transition",
      "社招跳槽 / Experienced hire job switch",
      "暂未开始准备 / Not actively preparing yet",
    ],
    pm: "PM 验证目的 / PM insight: 识别核心目标用户阶段，判断首批种子用户应优先覆盖校招、实习还是转行群体。",
  },
  {
    q: "Q2. 你的主要目标岗位或方向是？ / What roles or tracks are you mainly targeting?（可多选 / Multiple choice）",
    options: [
      "产品经理 / Product Management",
      "咨询 / Consulting",
      "投行或金融 / Investment Banking or Finance",
      "数据分析 / Data Analytics",
      "运营或市场 / Operations or Marketing",
      "技术岗位 / Engineering or Technical Roles",
      "其他 / Other: __________",
    ],
    pm: "PM 验证目的 / PM insight: 判断题库和 rubric 的优先级，确认 V1 是否应重点服务产品、咨询、金融等高面试强度赛道。",
  },
  {
    q: "Q3. 过去一个月，你主要用哪些方式准备面试？ / How have you prepared for interviews in the past month?（可多选 / Multiple choice）",
    options: [
      "自己看面经或题库 / Reading interview guides or question banks",
      "找同学、朋友、学长学姐 mock / Mock interviews with peers or alumni",
      "付费真人 mock / Paid human mock interview",
      "使用 ChatGPT 或其他通用 AI / Using ChatGPT or other general AI tools",
      "自己录音或写答案复盘 / Recording or writing answers for self-review",
      "几乎没有系统准备 / No structured preparation",
    ],
    pm: "PM 验证目的 / PM insight: 识别现有替代方案和用户真实行为，判断 AI Mock 的切入点是替代真人 mock 还是补充自练场景。",
  },
  {
    q: "Q4. 你对面试辅导或 mock 练习的需求强度如何？ / How strong is your need for interview coaching or mock practice?（单选 / Single choice）",
    options: [
      "非常强，近期很需要 / Very strong; I need it soon",
      "比较强，但还没找到合适方式 / Strong, but I have not found a good option",
      "一般，有面试前才需要 / Moderate; mostly before interviews",
      "较弱，偶尔练习即可 / Low; occasional practice is enough",
      "几乎不需要 / Almost no need",
    ],
    pm: "PM 验证目的 / PM insight: 验证需求强度，支撑“80% 有面试辅导需求”的核心假设。",
  },
  {
    q: "Q5. 如果真人 mock 的价格为 200-300 美元/小时，你的感受是？ / If a human mock interview costs USD 200-300 per hour, how do you feel about the price?（单选 / Single choice）",
    options: [
      "太贵，基本不会购买 / Too expensive; I would rarely or never buy it",
      "偏贵，只会在关键面试前购买 / Expensive; I would only buy it before critical interviews",
      "可以接受，但必须反馈质量很高 / Acceptable only if the feedback quality is very high",
      "价格不是主要问题 / Price is not my main concern",
      "不了解真人 mock 的价格 / I am not familiar with human mock pricing",
    ],
    pm: "PM 验证目的 / PM insight: 验证价格敏感度和 AI Mock 的低成本价值主张，支撑“90% 认为真人 mock 太贵”的假设。",
  },
  {
    q: "Q6. 你最希望 AI Mock 面试教练帮你解决哪些问题？ / What problems would you most want an AI Mock Interview Coach to solve?（最多选 3 项 / Choose up to 3）",
    options: [
      "指出具体扣分点 / Identify specific weaknesses",
      "给出结构化评分 / Provide structured scoring",
      "像真人一样追问 / Ask follow-up questions like a real interviewer",
      "提供更好的示范回答 / Provide stronger sample answers",
      "追踪多次练习后的进步 / Track improvement across sessions",
      "降低真人 mock 的费用和预约成本 / Reduce the cost and scheduling friction of human mocks",
    ],
    pm: "PM 验证目的 / PM insight: 排序 V1 功能优先级，判断应先做评分复盘、动态追问还是进步追踪。",
  },
  {
    q: "Q7. 如果 AI Mock 可以提供“题目 + 作答 + 多维评分 + 扣分依据 + 改进建议”，你愿意使用吗？ / If an AI Mock tool provides questions, answering, multi-dimensional scoring, evidence-based feedback, and improvement advice, would you use it?（单选 / Single choice）",
    options: [
      "非常愿意，会高频使用 / Very willing; I would use it frequently",
      "愿意，会在面试前使用 / Willing; I would use it before interviews",
      "可以试试，但要看反馈质量 / I would try it, depending on feedback quality",
      "兴趣不大 / Not very interested",
      "不会使用 / I would not use it",
    ],
    pm: "PM 验证目的 / PM insight: 验证 AI 方案接受度和早期转化意愿，判断 V1 是否有可用性验证价值。",
  },
  {
    q: "Q8. 什么因素最会影响你持续使用这类产品？ / What factors would most influence your continued use of this product?（最多选 3 项 / Choose up to 3）",
    options: [
      "反馈具体、可执行 / Feedback is specific and actionable",
      "评分可信、标准清晰 / Scoring is credible and transparent",
      "题目贴近目标岗位 / Questions are relevant to my target role",
      "能看到自己持续进步 / I can see measurable improvement",
      "响应快、使用方便 / Fast and easy to use",
      "价格合理 / Reasonable pricing",
      "隐私和简历内容安全 / Privacy and resume data security",
    ],
    pm: "PM 验证目的 / PM insight: 识别留存驱动因素，辅助定义 7 日回访率、报告查看率、反馈有用性评分等核心指标。",
  },
];

const bodyParts = [];
bodyParts.push(
  textPara("Title", "AI Mock 面试教练用户调研问卷 / AI Mock Interview Coach User Survey", {
    bold: true,
    color: "0B2545",
    size: 48,
  }),
);
bodyParts.push(
  textPara(
    "Subtitle",
    "产品经理版 · 中英文对照 · 预计填写时间 3-5 分钟 / PM Version · Bilingual · Estimated time: 3-5 minutes",
    { color: "526071", size: 21 },
  ),
);
bodyParts.push(textPara("Heading1", "问卷说明 / Survey Introduction", { bold: true, color: "2E74B5", size: 30 }));
bodyParts.push(
  textPara(
    "Normal",
    "本问卷用于验证 AI Mock 面试教练的用户需求、价格敏感度、AI 反馈接受度和核心功能优先级。问题以选项题为主，适合发给正在准备校招、实习、转行或高强度岗位面试的求职者。",
    { color: "172033", size: 21 },
  ),
);
bodyParts.push(
  textPara(
    "Normal",
    "This survey is designed to validate user needs, price sensitivity, acceptance of AI feedback, and feature priorities for an AI Mock Interview Coach. It is suitable for candidates preparing for internships, campus recruitment, career transitions, or high-intensity interview tracks.",
    { color: "172033", size: 21 },
  ),
);
bodyParts.push(
  textPara(
    "Callout",
    "建议样本量 / Suggested sample size: 50-100 responses + 8-12 follow-up interviews. 核心验证 / Core validation: mock demand, human mock pricing pain, AI feedback acceptance.",
    { color: "1F3A5F", size: 20, shading: "E8EEF5" },
  ),
);
bodyParts.push(textPara("Heading1", "问卷正文 / Questionnaire", { bold: true, color: "2E74B5", size: 30 }));

for (const item of questions) {
  bodyParts.push(textPara("Question", item.q, { bold: true, color: "111827", size: 22, shading: "EAF2FF" }));
  for (const option of item.options) {
    bodyParts.push(textPara("Option", `☐ ${option}`, { color: "172033", size: 21, left: 360 }));
  }
  bodyParts.push(textPara("Note", item.pm, { italic: true, color: "64748B", size: 18, left: 360 }));
}

bodyParts.push(textPara("Heading1", "补充说明 / Optional Notes", { bold: true, color: "2E74B5", size: 30 }));
bodyParts.push(
  textPara(
    "Normal",
    "如愿意接受后续 20-30 分钟访谈，请留下联系方式 / If you are open to a 20-30 minute follow-up interview, please leave your contact: ______________________________",
    { color: "172033", size: 21 },
  ),
);

const sectPr = `<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
  <w:cols w:space="708"/>
  <w:docGrid w:linePitch="360"/>
</w:sectPr>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 w15 wp14">
  <w:body>
    ${bodyParts.join("\n")}
    ${sectPr}
  </w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="172033"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="172033"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="160" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="48"/><w:szCs w:val="48"/><w:color w:val="0B2545"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="220" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="526071"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="200" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="30"/><w:szCs w:val="30"/><w:color w:val="2E74B5"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Question"><w:name w:val="Question"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100" w:line="300" w:lineRule="auto"/><w:shd w:val="clear" w:color="auto" w:fill="EAF2FF"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="111827"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Option"><w:name w:val="Option"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="70" w:line="300" w:lineRule="auto"/><w:ind w:left="360"/></w:pPr><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="172033"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Note"><w:name w:val="PM Note"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="140" w:line="280" w:lineRule="auto"/><w:ind w:left="360"/></w:pPr><w:rPr><w:i/><w:iCs/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="64748B"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Callout"><w:name w:val="Callout"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="80" w:after="180" w:line="300" w:lineRule="auto"/><w:shd w:val="clear" w:color="auto" w:fill="E8EEF5"/></w:pPr><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="1F3A5F"/></w:rPr></w:style>
</w:styles>`;

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>AI Mock 面试教练用户调研问卷</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-mock-survey-docx-"));
fs.mkdirSync(path.join(tmpRoot, "_rels"), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, "docProps"), { recursive: true });
fs.mkdirSync(path.join(tmpRoot, "word", "_rels"), { recursive: true });

fs.writeFileSync(path.join(tmpRoot, "[Content_Types].xml"), contentTypes, "utf8");
fs.writeFileSync(path.join(tmpRoot, "_rels", ".rels"), rootRels, "utf8");
fs.writeFileSync(path.join(tmpRoot, "docProps", "core.xml"), core, "utf8");
fs.writeFileSync(path.join(tmpRoot, "docProps", "app.xml"), app, "utf8");
fs.writeFileSync(path.join(tmpRoot, "word", "document.xml"), documentXml, "utf8");
fs.writeFileSync(path.join(tmpRoot, "word", "styles.xml"), stylesXml, "utf8");
fs.writeFileSync(path.join(tmpRoot, "word", "_rels", "document.xml.rels"), docRels, "utf8");

const outAbs = path.resolve(outputPath);
fs.mkdirSync(path.dirname(outAbs), { recursive: true });
if (fs.existsSync(outAbs)) fs.rmSync(outAbs, { force: true });
const zipPath = path.join(os.tmpdir(), `ai-mock-survey-${Date.now()}.zip`);
if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });

const psQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const command = `$ErrorActionPreference='Stop'; Compress-Archive -Path ${psQuote(path.join(tmpRoot, "*"))} -DestinationPath ${psQuote(zipPath)} -Force`;
const result = spawnSync(
  "powershell.exe",
  ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  throw new Error(`Compress-Archive failed:\n${result.stdout}\n${result.stderr}`);
}

fs.copyFileSync(zipPath, outAbs);
fs.rmSync(zipPath, { force: true });
fs.rmSync(tmpRoot, { recursive: true, force: true });

const stat = fs.statSync(outAbs);
console.log(`${outAbs}\n${stat.size} bytes`);
