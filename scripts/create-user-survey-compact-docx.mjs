import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outputPath = process.argv[2] || path.join(os.tmpdir(), "User Survey_2页优化版.docx");

const PAGE = {
  width: 11906, // A4 portrait
  height: 16838,
  margin: 720,
  contentWidth: 10466,
};

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function run(text, { bold = false, italic = false, color = "172033", size = 18 } = {}) {
  let props = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/>`;
  if (bold) props += "<w:b/><w:bCs/>";
  if (italic) props += "<w:i/><w:iCs/>";
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function paragraph(runs, { style = null, before = 0, after = 40, line = 240, align = null } = {}) {
  let pPr = "";
  if (style) pPr += `<w:pStyle w:val="${style}"/>`;
  if (align) pPr += `<w:jc w:val="${align}"/>`;
  pPr += `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.join("")}</w:p>`;
}

function cell(content, { width = PAGE.contentWidth / 2, shading = null, gridSpan = null, vAlign = "center" } = {}) {
  let tcPr = `<w:tcW w:w="${Math.round(width)}" w:type="dxa"/><w:vAlign w:val="${vAlign}"/><w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:start w:w="100" w:type="dxa"/><w:end w:w="100" w:type="dxa"/></w:tcMar>`;
  if (gridSpan) tcPr += `<w:gridSpan w:val="${gridSpan}"/>`;
  if (shading) tcPr += `<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`;
  return `<w:tc><w:tcPr>${tcPr}</w:tcPr>${content}</w:tc>`;
}

function row(cells) {
  return `<w:tr>${cells.join("")}</w:tr>`;
}

function table(rowsXml) {
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${PAGE.contentWidth}" w:type="dxa"/>
      <w:tblInd w:w="0" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="D6DAE3"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E5E7EB"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="70" w:type="dxa"/>
        <w:bottom w:w="70" w:type="dxa"/>
        <w:start w:w="100" w:type="dxa"/>
        <w:end w:w="100" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="${PAGE.contentWidth / 2}"/><w:gridCol w:w="${PAGE.contentWidth / 2}"/></w:tblGrid>
    ${rowsXml.join("\n")}
  </w:tbl>`;
}

function questionBlock(item) {
  const rows = [];
  rows.push(
    row([
      cell(paragraph([run(item.q, { bold: true, color: "0F172A", size: 17 })], { after: 20, line: 230 }), {
        width: PAGE.contentWidth,
        shading: "EAF2FF",
        gridSpan: 2,
      }),
    ]),
  );

  for (let i = 0; i < item.options.length; i += 2) {
    const left = paragraph([run(`☐ ${item.options[i]}`, { size: 16 })], { after: 10, line: 220 });
    const rightText = item.options[i + 1] || "";
    const right = paragraph([run(rightText ? `☐ ${rightText}` : "", { size: 16 })], { after: 10, line: 220 });
    rows.push(row([cell(left), cell(right)]));
  }

  rows.push(
    row([
      cell(paragraph([run(item.pm, { italic: true, color: "64748B", size: 14 })], { after: 0, line: 210 }), {
        width: PAGE.contentWidth,
        shading: "F8FAFC",
        gridSpan: 2,
      }),
    ]),
  );
  return table(rows);
}

function spacer(after = 45) {
  return paragraph([run("", { size: 2 })], { after, line: 20 });
}

function pageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
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
    pm: "PM insight: 核心用户阶段 / Target user stage",
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
    pm: "PM insight: 题库与 rubric 优先级 / Question bank and rubric priority",
  },
  {
    q: "Q3. 过去一个月，你主要用哪些方式准备面试？ / How have you prepared for interviews in the past month?（可多选 / Multiple choice）",
    options: [
      "自己看面经或题库 / Reading guides or question banks",
      "找同学、朋友、学长学姐 mock / Peer or alumni mock",
      "付费真人 mock / Paid human mock interview",
      "使用 ChatGPT 或其他通用 AI / ChatGPT or other AI tools",
      "自己录音或写答案复盘 / Self-recording or written review",
      "几乎没有系统准备 / No structured preparation",
    ],
    pm: "PM insight: 替代方案与真实行为 / Alternatives and actual behavior",
  },
  {
    q: "Q4. 你对面试辅导或 mock 练习的需求强度如何？ / How strong is your need for interview coaching or mock practice?（单选 / Single choice）",
    options: [
      "非常强，近期很需要 / Very strong; I need it soon",
      "比较强，但还没找到合适方式 / Strong; no good option yet",
      "一般，有面试前才需要 / Moderate; mostly before interviews",
      "较弱，偶尔练习即可 / Low; occasional practice is enough",
      "几乎不需要 / Almost no need",
    ],
    pm: "PM insight: 需求强度 / Demand intensity",
  },
  {
    q: "Q5. 如果真人 mock 的价格为 200-300 美元/小时，你的感受是？ / If a human mock costs USD 200-300 per hour, how do you feel?（单选 / Single choice）",
    options: [
      "太贵，基本不会购买 / Too expensive; rarely or never buy",
      "偏贵，只会在关键面试前购买 / Expensive; only before critical interviews",
      "可以接受，但必须反馈质量很高 / Acceptable only with high-quality feedback",
      "价格不是主要问题 / Price is not my main concern",
      "不了解真人 mock 的价格 / Not familiar with human mock pricing",
    ],
    pm: "PM insight: 价格敏感度 / Price sensitivity",
  },
  {
    q: "Q6. 你最希望 AI Mock 面试教练帮你解决哪些问题？ / What problems should an AI Mock Interview Coach solve?（最多选 3 项 / Choose up to 3）",
    options: [
      "指出具体扣分点 / Identify specific weaknesses",
      "给出结构化评分 / Provide structured scoring",
      "像真人一样追问 / Ask real-interviewer-like follow-ups",
      "提供更好的示范回答 / Provide stronger sample answers",
      "追踪多次练习后的进步 / Track improvement across sessions",
      "降低真人 mock 的费用和预约成本 / Reduce cost and scheduling friction",
    ],
    pm: "PM insight: 功能优先级 / Feature priority",
  },
  {
    q: "Q7. 如果 AI Mock 提供“题目 + 作答 + 多维评分 + 扣分依据 + 改进建议”，你愿意使用吗？ / Would you use an AI Mock tool with questions, answers, scoring, evidence, and advice?（单选 / Single choice）",
    options: [
      "非常愿意，会高频使用 / Very willing; frequent use",
      "愿意，会在面试前使用 / Willing; use before interviews",
      "可以试试，但要看反馈质量 / Would try, depending on feedback quality",
      "兴趣不大 / Not very interested",
      "不会使用 / Would not use it",
    ],
    pm: "PM insight: AI 方案接受度 / AI solution acceptance",
  },
  {
    q: "Q8. 什么因素最会影响你持续使用这类产品？ / What factors would most influence continued use?（最多选 3 项 / Choose up to 3）",
    options: [
      "反馈具体、可执行 / Specific and actionable feedback",
      "评分可信、标准清晰 / Credible and transparent scoring",
      "题目贴近目标岗位 / Role-relevant questions",
      "能看到自己持续进步 / Measurable improvement",
      "响应快、使用方便 / Fast and easy to use",
      "价格合理 / Reasonable pricing",
      "隐私和简历内容安全 / Privacy and resume data security",
    ],
    pm: "PM insight: 留存驱动因素 / Retention drivers",
  },
];

const body = [];
body.push(
  paragraph(
    [
      run("AI Mock Interview Coach User Survey", { bold: true, color: "0B2545", size: 30 }),
      run("  |  ", { color: "94A3B8", size: 22 }),
      run("AI Mock 面试教练用户调研问卷", { bold: true, color: "0B2545", size: 30 }),
    ],
    { after: 70, line: 260, align: "center" },
  ),
);
body.push(
  paragraph(
    [
      run("PM version · Bilingual · 8 questions · Estimated time: 3-5 minutes", { color: "526071", size: 17 }),
      run("  /  产品经理版 · 中英文对照 · 8题 · 预计填写时间 3-5分钟", { color: "526071", size: 17 }),
    ],
    { after: 80, line: 230, align: "center" },
  ),
);
body.push(
  table([
    row([
      cell(
        paragraph(
          [
            run("Purpose / 目的：", { bold: true, color: "1F3A5F", size: 16 }),
            run("Validate mock demand, human mock pricing pain, AI feedback acceptance, and V1 feature priority. / 验证 mock 需求、真人 mock 价格痛点、AI 反馈接受度与 V1 功能优先级。", {
              color: "1F3A5F",
              size: 16,
            }),
          ],
          { after: 0, line: 220 },
        ),
        { width: PAGE.contentWidth, shading: "E8EEF5", gridSpan: 2 },
      ),
    ]),
  ]),
);
body.push(spacer(40));
for (const item of questions.slice(0, 4)) {
  body.push(questionBlock(item));
  body.push(spacer(38));
}
body.push(pageBreak());
for (const item of questions.slice(4)) {
  body.push(questionBlock(item));
  body.push(spacer(38));
}
body.push(
  table([
    row([
      cell(
        paragraph(
          [
            run("Optional follow-up interview / 后续访谈：", { bold: true, color: "0F172A", size: 16 }),
            run("If open to a 20-30 min interview, please leave contact: ______________________________ / 如愿接受 20-30 分钟访谈，请留下联系方式。", {
              color: "172033",
              size: 16,
            }),
          ],
          { after: 0, line: 220 },
        ),
        { width: PAGE.contentWidth, shading: "F8FAFC", gridSpan: 2 },
      ),
    ]),
  ]),
);

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${body.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="${PAGE.width}" w:h="${PAGE.height}"/>
      <w:pgMar w:top="${PAGE.margin}" w:right="${PAGE.margin}" w:bottom="${PAGE.margin}" w:left="${PAGE.margin}" w:header="360" w:footer="360" w:gutter="0"/>
      <w:cols w:space="708"/>
      <w:docGrid w:linePitch="300"/>
    </w:sectPr>
  </w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:color w:val="172033"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="40" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
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
  <dc:title>User Survey - AI Mock Interview Coach</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;

const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Codex</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-mock-survey-compact-"));
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
const zipPath = path.join(os.tmpdir(), `ai-mock-survey-compact-${Date.now()}.zip`);
if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
const psQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const command = `$ErrorActionPreference='Stop'; Compress-Archive -Path ${psQuote(path.join(tmpRoot, "*"))} -DestinationPath ${psQuote(zipPath)} -Force`;
const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
  encoding: "utf8",
});
if (result.status !== 0) {
  throw new Error(`Compress-Archive failed:\n${result.stdout}\n${result.stderr}`);
}
fs.mkdirSync(path.dirname(outAbs), { recursive: true });
if (fs.existsSync(outAbs)) fs.rmSync(outAbs, { force: true });
fs.copyFileSync(zipPath, outAbs);
fs.rmSync(zipPath, { force: true });
fs.rmSync(tmpRoot, { recursive: true, force: true });
const stat = fs.statSync(outAbs);
console.log(`${outAbs}\n${stat.size} bytes`);
