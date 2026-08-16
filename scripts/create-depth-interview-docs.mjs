import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const outDir = process.argv[2] || os.tmpdir();

const PAGE = {
  width: 12240,
  height: 15840,
  margin: 1080,
  contentWidth: 10080,
};

function xmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function r(text, { bold = false, italic = false, color = "172033", size = 22 } = {}) {
  let props = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/>`;
  if (bold) props += "<w:b/><w:bCs/>";
  if (italic) props += "<w:i/><w:iCs/>";
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function p(runs, { style = null, before = 0, after = 120, line = 300, align = null, left = 0, shading = null } = {}) {
  let pPr = "";
  if (style) pPr += `<w:pStyle w:val="${style}"/>`;
  if (align) pPr += `<w:jc w:val="${align}"/>`;
  if (left) pPr += `<w:ind w:left="${left}"/>`;
  if (shading) pPr += `<w:shd w:val="clear" w:color="auto" w:fill="${shading}"/>`;
  pPr += `<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.join("")}</w:p>`;
}

function text(text, options = {}) {
  return p([r(text, options)], options);
}

function heading1(value) {
  return text(value, { bold: true, color: "2E74B5", size: 32, before: 260, after: 120 });
}

function heading2(value) {
  return text(value, { bold: true, color: "1F4D78", size: 26, before: 180, after: 80 });
}

function bullet(value) {
  return p([r("• ", { color: "2E74B5", size: 22, bold: true }), r(value, { size: 22 })], {
    left: 360,
    after: 80,
    line: 300,
  });
}

function callout(value) {
  return text(value, { color: "1F3A5F", size: 21, shading: "E8EEF5", after: 160 });
}

function cell(content, { width, fill = null, span = null } = {}) {
  let tcPr = `<w:tcW w:w="${Math.round(width)}" w:type="dxa"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:start w:w="120" w:type="dxa"/><w:end w:w="120" w:type="dxa"/></w:tcMar>`;
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

function kvTable(items) {
  const widths = [2500, PAGE.contentWidth - 2500];
  const rows = items.map(([key, value]) =>
    row([
      cell(p([r(key, { bold: true, color: "1F4D78", size: 20 })], { after: 0, line: 270 }), {
        width: widths[0],
        fill: "F2F4F7",
      }),
      cell(p([r(value, { size: 20 })], { after: 0, line: 270 }), { width: widths[1] }),
    ]),
  );
  return table(rows, widths);
}

function qaTable(items) {
  const widths = [3100, PAGE.contentWidth - 3100];
  const rows = [
    row([
      cell(p([r("访谈问题 / Interview Question", { bold: true, color: "0F172A", size: 20 })], { after: 0 }), {
        width: widths[0],
        fill: "E8EEF5",
      }),
      cell(p([r("记录要点 / Notes", { bold: true, color: "0F172A", size: 20 })], { after: 0 }), {
        width: widths[1],
        fill: "E8EEF5",
      }),
    ]),
    ...items.map(([q, note]) =>
      row([
        cell(p([r(q, { bold: true, size: 20 })], { after: 0, line: 270 }), { width: widths[0] }),
        cell(p([r(note, { size: 20 })], { after: 0, line: 270 }), { width: widths[1] }),
      ]),
    ),
  ];
  return table(rows, widths);
}

function packageDocx(outputPath, documentXml, title) {
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="172033"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
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
  <dc:title>${xmlEscape(title)}</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
  const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Codex</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion>
</Properties>`;

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "depth-interview-docx-"));
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
  const zipPath = path.join(os.tmpdir(), `depth-interview-${Date.now()}-${Math.random().toString(16).slice(2)}.zip`);
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
  return outAbs;
}

function wrapDoc(body) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
}

function buildTemplate() {
  const body = [];
  body.push(text("AI Mock 面试教练深度访谈模板", { bold: true, color: "0B2545", size: 42, after: 80 }));
  body.push(text("适用场景：小样本探索性用户研究 · 建议时长 20-30 分钟 · 目标样本 8-12 人", { color: "526071", size: 22, after: 180 }));
  body.push(callout("研究目标：验证用户是否真的需要 mock 练习、现有方案为何不满足、真人 mock 的价格痛点是否成立，以及用户是否愿意接受 AI 结构化反馈。"));
  body.push(heading1("1. 访谈基本信息"));
  body.push(
    kvTable([
      ["访谈对象", "姓名 / 学校 / 年级 / 目标岗位 / 求职阶段"],
      ["访谈方式", "线上视频或语音；需提前说明仅用于产品研究"],
      ["建议时长", "20-30 分钟"],
      ["记录重点", "不要只记结论，要记录用户原话、真实案例、犹豫点和情绪强度"],
    ]),
  );
  body.push(heading1("2. 开场说明"));
  body.push(bullet("感谢参与。本次访谈不是测试你，而是了解你准备面试的真实过程。"));
  body.push(bullet("没有标准答案，请尽量结合最近一次面试准备经历来回答。"));
  body.push(bullet("内容仅用于产品研究，可匿名记录；如果有不想回答的问题可以跳过。"));
  body.push(heading1("3. 访谈问题大纲"));
  body.push(
    qaTable([
      ["A. 背景筛选", "你目前的求职阶段是什么？主要投递哪些岗位？最近一次面试是什么时候？"],
      ["B. 当前准备方式", "你通常如何准备面试？用过题库、同学 mock、真人付费 mock 或 ChatGPT 吗？"],
      ["C. 最近一次 mock 体验", "请回忆一次最近的 mock 或自练：你做了什么？哪里有帮助？哪里没帮助？"],
      ["D. 核心痛点", "你最困扰的是没题练、没人追问、不知道哪里扣分、还是不知道有没有进步？"],
      ["E. 价格敏感度", "如果真人 mock 是 200-300 美元/小时，你怎么看？什么情况下会购买？"],
      ["F. AI 接受度", "如果 AI 可以给题、追问、打分、指出扣分依据，你愿意用吗？哪里会不信任？"],
      ["G. 功能优先级", "如果只能保留一个功能，你最想要：结构化评分、扣分点、追问、范例答案、进步追踪中的哪一个？"],
      ["H. 留存动机", "什么情况下你会 7 天内再次使用？什么会让你放弃？"],
    ]),
  );
  body.push(heading1("4. 追问提示"));
  body.push(bullet("当用户说“反馈没用”时，追问：具体是哪句话让你觉得没用？你期待怎样的反馈？"));
  body.push(bullet("当用户说“太贵”时，追问：可接受价格是多少？你会为哪类结果付费？"));
  body.push(bullet("当用户说“AI 不可信”时，追问：是怕打分不准、建议太泛、还是隐私风险？"));
  body.push(bullet("当用户说“愿意使用”时，追问：你会在什么时间、什么频率、什么面试阶段使用？"));
  body.push(heading1("5. 访谈后分析框架"));
  body.push(
    kvTable([
      ["需求强度", "高 / 中 / 低；是否近期有真实面试压力"],
      ["当前替代方案", "题库、朋友 mock、真人 mock、ChatGPT、自练"],
      ["最大痛点", "价格、预约、反馈泛、缺追问、缺进步感"],
      ["AI 接受度", "愿意高频用 / 愿意试用 / 只在面试前用 / 不信任"],
      ["V1 优先级", "评分复盘、扣分依据、范例答案、题库匹配、进步追踪"],
    ]),
  );
  return wrapDoc(body);
}

function buildJohnSample() {
  const body = [];
  body.push(text("深度访谈样本记录：John Macay", { bold: true, color: "0B2545", size: 42, after: 80 }));
  body.push(text("说明：以下为假设样本，用于展示深度访谈记录的写法，不代表真实已完成访谈。", { color: "9B1C1C", size: 22, after: 160 }));
  body.push(
    kvTable([
      ["受访者", "John Macay"],
      ["身份", "大三学生，准备暑期实习申请"],
      ["目标方向", "Product Management / Strategy Internship"],
      ["面试阶段", "已投递 12 家公司，收到 2 个一面邀请"],
      ["访谈时长", "约 28 分钟"],
    ]),
  );
  body.push(heading1("1. 访谈摘要"));
  body.push(bullet("John 有明确面试辅导需求，但没有稳定使用真人 mock，主要原因是价格高、预约麻烦、反馈质量不确定。"));
  body.push(bullet("他使用过 ChatGPT 准备 behavioral 问题，但认为反馈偏泛，缺少“为什么扣分”和“如何改答案”的细节。"));
  body.push(bullet("他最看重 AI Mock 的三个能力：具体扣分点、结构化评分、可对比的进步记录。"));
  body.push(bullet("对 200-300 美元/小时真人 mock 的接受度较低，只会在 final round 前考虑。"));
  body.push(heading1("2. 逐题访谈记录"));
  body.push(heading2("A. 背景与准备状态"));
  body.push(text("Q: 你现在处于什么求职阶段？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 我现在是大三，主要在找暑期实习，方向偏产品经理和 strategy intern。最近两周开始比较密集准备，因为已经有两个一面邀请了。"));
  body.push(text("Q: 你现在怎么准备面试？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 我会先看网上面经，把 behavioral 问题整理到 Notion，然后自己写 bullet points。产品题会看一些 mock case。偶尔会找同学练，但大家时间不一定对得上。"));
  body.push(heading2("B. 现有方案体验"));
  body.push(text("Q: 你用过真人 mock 或付费辅导吗？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 我问过一个校友 mock，一小时大概 250 美元。我觉得太贵了，不是不值，而是我不可能每周都约。如果是 final round 前可能会考虑一次，但平时练习负担太高。"));
  body.push(text("Q: 用 ChatGPT 准备效果怎么样？", { bold: true, color: "1F4D78" }));
  body.push(text("John: ChatGPT 可以帮我改语言，但它经常说“更具体一点”“逻辑更清楚一点”，我知道方向，但不知道具体哪一句有问题。它也不会持续记住我前几次哪里弱。"));
  body.push(heading2("C. 核心痛点"));
  body.push(text("Q: 你练习面试最大的痛点是什么？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 最大问题不是没题，而是练完不知道到底有没有变好。同学 mock 会给感觉上的建议，但没有标准。比如他说我回答还行，我不知道是 7 分还是 9 分，也不知道正式面试官会不会觉得空。"));
  body.push(text("Q: 哪类反馈对你最有用？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 我希望它能告诉我具体扣分点，比如 STAR 少了 result，或者 action 讲得太泛。最好能指出我原回答里的句子，然后给一个改写版本。"));
  body.push(heading2("D. AI Mock 接受度"));
  body.push(text("Q: 如果 AI 能提问、评分、给扣分依据，你愿意用吗？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 愿意。我不会把它当最终判断，但会把它当日常练习工具。如果它能给稳定评分，我会每周用两三次，尤其是面试前。"));
  body.push(text("Q: 你会担心什么？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 一个是评分准不准，另一个是隐私。比如我把简历项目细节放进去，会不会被保存或泄露。还有就是如果反馈太模板化，我用两次就不会再看了。"));
  body.push(heading2("E. 功能优先级与留存"));
  body.push(text("Q: 如果只能保留一个核心功能，你选什么？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 我选“具体扣分点 + 改进建议”。题库我可以自己找，但高质量反馈很难找。第二重要是历史进步记录，因为我想知道我是不是一直卡在同一个问题。"));
  body.push(text("Q: 什么情况下你会 7 天内再次使用？", { bold: true, color: "1F4D78" }));
  body.push(text("John: 如果第一次报告让我觉得“它真的看懂了我的答案”，我会回来。比如它指出我没有量化结果，而且给了一个可以直接练的版本。反过来，如果只是泛泛建议，我不会再用。"));
  body.push(heading1("3. PM 分析结论"));
  body.push(
    kvTable([
      ["需求强度", "高。近期有真实面试邀请，并愿意高频练习。"],
      ["价格痛点", "强。200-300 美元/小时被认为只适合 final round 前低频使用。"],
      ["当前替代方案缺口", "ChatGPT 反馈泛；同学 mock 不稳定；真人 mock 贵且低频。"],
      ["AI 机会点", "日常高频练习 + 结构化评分 + 具体扣分依据 + 进步记录。"],
      ["V1 产品启示", "先做好评分可信和复盘有用，不必一开始追求完整真人面试体验。"],
    ]),
  );
  return wrapDoc(body);
}

const outputs = [
  ["AI_Mock面试教练_深度访谈模板.docx", buildTemplate(), "AI Mock 面试教练深度访谈模板"],
  ["AI_Mock面试教练_深度访谈样本_John_Macay.docx", buildJohnSample(), "深度访谈样本记录：John Macay"],
];

const generated = [];
for (const [filename, xml, title] of outputs) {
  generated.push(packageDocx(path.join(outDir, filename), xml, title));
}

console.log(generated.join("\n"));
