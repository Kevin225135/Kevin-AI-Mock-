import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outputPath =
  process.argv[2] ||
  path.join(os.tmpdir(), "AI_Mock面试教练_深度访谈问题清单_中英文.docx");

const PAGE = {
  width: 12240,
  height: 15840,
  margin: 900,
  contentWidth: 10440,
};

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function run(text, { bold = false, italic = false, color = "172033", size = 20 } = {}) {
  let props = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/>`;
  if (bold) props += "<w:b/><w:bCs/>";
  if (italic) props += "<w:i/><w:iCs/>";
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function paragraph(runs, { before = 0, after = 80, line = 280, align = null, shading = null } = {}) {
  let pPr = `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
  if (align) pPr += `<w:jc w:val="${align}"/>`;
  if (shading) pPr += `<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.join("")}</w:p>`;
}

function text(text, options = {}) {
  return paragraph([run(text, options)], options);
}

function bullet(textValue) {
  return paragraph([run("• ", { bold: true, color: "2E74B5", size: 18 }), run(textValue, { size: 18 })], {
    after: 40,
    line: 245,
  });
}

function cell(content, { width, fill = null, span = null } = {}) {
  let tcPr = `<w:tcW w:w="${Math.round(width)}" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:start w:w="110" w:type="dxa"/><w:end w:w="110" w:type="dxa"/></w:tcMar>`;
  if (fill) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>`;
  if (span) tcPr += `<w:gridSpan w:val="${span}"/>`;
  return `<w:tc><w:tcPr>${tcPr}</w:tcPr>${content}</w:tc>`;
}

function row(cells) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function table(rows, widths) {
  const grid = widths.map((w) => `<w:gridCol w:w="${Math.round(w)}"/>`).join("");
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${PAGE.contentWidth}" w:type="dxa"/>
      <w:tblInd w:w="120" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid>${grid}</w:tblGrid>
    ${rows.join("\n")}
  </w:tbl>`;
}

function questionRows(questions) {
  const widths = [760, 3480, 3920, 2280];
  const rows = [
    row([
      cell(paragraph([run("#", { bold: true, color: "0F172A", size: 18 })], { after: 0, align: "center" }), {
        width: widths[0],
        fill: "E8EEF5",
      }),
      cell(paragraph([run("深度问题 / Deep Interview Question", { bold: true, color: "0F172A", size: 18 })], { after: 0 }), {
        width: widths[1],
        fill: "E8EEF5",
      }),
      cell(paragraph([run("建议追问 / Follow-up Probes", { bold: true, color: "0F172A", size: 18 })], { after: 0 }), {
        width: widths[2],
        fill: "E8EEF5",
      }),
      cell(paragraph([run("PM 目的 / PM Purpose", { bold: true, color: "0F172A", size: 18 })], { after: 0 }), {
        width: widths[3],
        fill: "E8EEF5",
      }),
    ]),
  ];

  for (const q of questions) {
    rows.push(
      row([
        cell(paragraph([run(String(q.no), { bold: true, color: "2E74B5", size: 19 })], { after: 0, align: "center" }), {
          width: widths[0],
        }),
        cell(
          paragraph(
            [
              run(q.zh, { bold: true, color: "111827", size: 18 }),
              run("\n" + q.en, { color: "374151", size: 17 }),
            ],
            { after: 0, line: 245 },
          ),
          { width: widths[1] },
        ),
        cell(
          paragraph(
            [
              run(q.probesZh, { color: "172033", size: 17 }),
              run("\n" + q.probesEn, { color: "526071", size: 16 }),
            ],
            { after: 0, line: 235 },
          ),
          { width: widths[2] },
        ),
        cell(
          paragraph(
            [
              run(q.pmZh, { color: "1F4D78", size: 17 }),
              run("\n" + q.pmEn, { color: "64748B", size: 16 }),
            ],
            { after: 0, line: 235 },
          ),
          { width: widths[3] },
        ),
      ]),
    );
  }

  return table(rows, widths);
}

const questions = [
  {
    no: 1,
    zh: "请从最近一次准备面试的经历开始讲起：你当时在准备什么岗位、什么阶段？",
    en: "Walk me through your most recent interview preparation: what role and stage were you preparing for?",
    probesZh: "目标岗位？距离面试还有多久？当时最焦虑什么？",
    probesEn: "Target role? Time before interview? Biggest anxiety at that moment?",
    pmZh: "确认用户背景与真实场景",
    pmEn: "Validate user segment and real context",
  },
  {
    no: 2,
    zh: "你通常会如何准备一场面试？请按真实顺序讲一下。",
    en: "How do you usually prepare for an interview? Please describe the actual sequence.",
    probesZh: "先看题库还是先写答案？会不会找人 mock？每次花多久？",
    probesEn: "Question banks first or answer drafting first? Any mock practice? Time spent?",
    pmZh: "理解现有行为路径",
    pmEn: "Understand current behavior flow",
  },
  {
    no: 3,
    zh: "回忆一次你觉得有帮助或没帮助的 mock / 自练，它为什么有效或无效？",
    en: "Recall one mock or self-practice session that felt useful or useless. Why did it work or fail?",
    probesZh: "谁给的反馈？反馈具体吗？你后来有没有改答案？",
    probesEn: "Who gave feedback? Was it specific? Did you revise your answer afterward?",
    pmZh: "拆解反馈价值来源",
    pmEn: "Identify what makes feedback valuable",
  },
  {
    no: 4,
    zh: "你练习完之后，通常怎么判断自己有没有进步？",
    en: "After practicing, how do you usually know whether you have improved?",
    probesZh: "有分数、记录或对比吗？还是靠感觉？你信不信这种判断？",
    probesEn: "Any score, record, or comparison? Or mostly gut feeling? Do you trust it?",
    pmZh: "验证进步追踪需求",
    pmEn: "Validate need for progress tracking",
  },
  {
    no: 5,
    zh: "如果真人 mock 是 200-300 美元/小时，你会在什么情况下购买？什么情况下不会？",
    en: "If a human mock interview costs USD 200-300 per hour, when would you buy it and when would you not?",
    probesZh: "可接受价格？final round 前会买吗？你期待它解决什么问题？",
    probesEn: "Acceptable price? Would you buy before final round? What outcome would justify it?",
    pmZh: "验证价格痛点与替代机会",
    pmEn: "Validate pricing pain and substitution opportunity",
  },
  {
    no: 6,
    zh: "你用过 ChatGPT 或其他 AI 准备面试吗？最有用和最没用的地方分别是什么？",
    en: "Have you used ChatGPT or other AI tools for interview prep? What was most and least useful?",
    probesZh: "反馈是否泛泛？是否会追问？是否记得历史弱点？",
    probesEn: "Was feedback generic? Did it ask follow-ups? Did it remember past weaknesses?",
    pmZh: "定位通用 AI 的缺口",
    pmEn: "Identify gaps in general AI tools",
  },
  {
    no: 7,
    zh: "如果 AI Mock 给你多维评分、扣分依据和改进建议，你会信任哪些部分？不信任哪些部分？",
    en: "If an AI Mock tool gives multi-dimensional scores, evidence, and improvement advice, which parts would you trust or distrust?",
    probesZh: "什么会让你觉得评分可信？什么会让你觉得它在胡说？",
    probesEn: "What would make the score credible? What would make it feel wrong or hallucinated?",
    pmZh: "验证信任机制",
    pmEn: "Validate trust mechanisms",
  },
  {
    no: 8,
    zh: "如果只能保留一个功能，你最想要：扣分点、结构化评分、追问、范例答案、进步追踪中的哪一个？为什么？",
    en: "If only one feature could remain, which would you choose: weaknesses, structured scoring, follow-ups, sample answers, or progress tracking? Why?",
    probesZh: "第二重要是什么？你愿意为哪个功能付费？",
    probesEn: "What is second most important? Which feature would you pay for?",
    pmZh: "确定 V1 功能优先级",
    pmEn: "Prioritize V1 features",
  },
  {
    no: 9,
    zh: "什么体验会让你在 7 天内再次使用 AI Mock？什么体验会让你立刻放弃？",
    en: "What experience would make you use AI Mock again within 7 days? What would make you abandon it immediately?",
    probesZh: "报告质量？题目贴合度？响应速度？隐私？价格？",
    probesEn: "Report quality? Role relevance? Speed? Privacy? Pricing?",
    pmZh: "识别留存驱动与流失风险",
    pmEn: "Identify retention drivers and churn risks",
  },
  {
    no: 10,
    zh: "想象一个理想的 AI 面试教练，从开始练习到结束复盘，它应该怎么帮助你？",
    en: "Imagine an ideal AI interview coach. From starting practice to reviewing results, how should it help you?",
    probesZh: "入口、提问、反馈、报告、下次推荐分别应该怎样？",
    probesEn: "What should the start, questions, feedback, report, and next recommendation look like?",
    pmZh: "提炼端到端产品机会",
    pmEn: "Synthesize end-to-end product opportunities",
  },
];

const body = [];
body.push(
  paragraph(
    [
      run("AI Mock 面试教练深度访谈问题清单", { bold: true, color: "0B2545", size: 36 }),
      run(" / Depth Interview Guide", { bold: true, color: "0B2545", size: 34 }),
    ],
    { after: 80, align: "center", line: 300 },
  ),
);
body.push(
  paragraph(
    [run("Based on User Survey · 中英文对照 · 不超过 10 题 · 建议访谈时长 20-30 分钟", { color: "526071", size: 20 })],
    { after: 120, align: "center", line: 260 },
  ),
);
body.push(
  table(
    [
      row([
        cell(
          paragraph(
            [
              run("使用说明 / How to use: ", { bold: true, color: "1F3A5F", size: 18 }),
              run(
                "先用 User Survey 做定量筛选，再用本提纲做半结构化访谈。不要机械逐题念完，可根据用户回答追问具体经历、原话和决策原因。",
                { color: "1F3A5F", size: 18 },
              ),
              run(
                "\nUse the User Survey for quantitative screening, then use this guide for semi-structured interviews. Follow the user's story and probe for concrete examples, quotes, and decision reasons.",
                { color: "1F3A5F", size: 17 },
              ),
            ],
            { after: 0, line: 250 },
          ),
          { width: PAGE.contentWidth, fill: "E8EEF5", span: 4 },
        ),
      ]),
    ],
    [PAGE.contentWidth],
  ),
);
body.push(text("访谈问题 / Interview Questions", { bold: true, color: "2E74B5", size: 28, before: 200, after: 100 }));
body.push(questionRows(questions));
body.push(text("记录建议 / Note-taking Tips", { bold: true, color: "2E74B5", size: 28, before: 220, after: 100 }));
body.push(bullet("优先记录用户原话，而不是只写总结。/ Capture direct quotes before summarizing."));
body.push(bullet("每个问题至少追问一次“能举个最近的例子吗？” / Ask at least once: can you give a recent example?"));
body.push(bullet("访谈后按需求强度、价格痛点、AI 信任度、V1 功能优先级四类做归因。/ After the interview, tag insights by demand intensity, pricing pain, AI trust, and V1 feature priority."));

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${body.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="${PAGE.width}" w:h="${PAGE.height}"/>
      <w:pgMar w:top="${PAGE.margin}" w:right="${PAGE.margin}" w:bottom="${PAGE.margin}" w:left="${PAGE.margin}" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:color w:val="172033"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="280" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="80" w:line="280" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:style>
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
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>AI Mock 面试教练深度访谈问题清单</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Codex</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion>
</Properties>`;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "depth-questions-docx-"));
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
const zipPath = path.join(os.tmpdir(), `depth-questions-${Date.now()}.zip`);
const psQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const command = `$ErrorActionPreference='Stop'; Compress-Archive -Path ${psQuote(path.join(tmpRoot, "*"))} -DestinationPath ${psQuote(zipPath)} -Force`;
const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
  encoding: "utf8",
});
if (result.status !== 0) throw new Error(`Compress-Archive failed:\n${result.stdout}\n${result.stderr}`);
fs.mkdirSync(path.dirname(outAbs), { recursive: true });
if (fs.existsSync(outAbs)) fs.rmSync(outAbs, { force: true });
fs.copyFileSync(zipPath, outAbs);
fs.rmSync(zipPath, { force: true });
fs.rmSync(tmpRoot, { recursive: true, force: true });
console.log(outAbs);
