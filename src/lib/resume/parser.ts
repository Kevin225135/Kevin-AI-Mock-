import type { ResumeProject } from "@/lib/domain/types";
import { extractTaxonomyKeywords } from "@/lib/rag/keyword-library";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const supportedExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp"
];

export type ParsedResume = {
  rawText: string;
  summary: string;
  companies: string[];
  roles: string[];
  skills: string[];
  projects: ResumeProject[];
  education: string[];
};

export class ResumeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeParseError";
  }
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new ResumeParseError("简历文件不能为空，且大小不能超过 10MB。");
  }

  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!supportedExtensions.includes(extension)) {
    throw new ResumeParseError("仅支持 PDF、DOC、DOCX、PNG、JPG 和 WebP 简历。");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (extension === ".pdf") {
      text = await extractPdfText(buffer);
    } else if (extension === ".docx") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === ".doc") {
      text = await extractLegacyWordText(buffer);
    } else {
      text = await recognizeImage(buffer);
    }

    return structureResume(cleanText(text));
  } catch (error) {
    if (error instanceof ResumeParseError) {
      throw error;
    }
    console.error("Resume parser failed.", error);
    throw new ResumeParseError(
      "无法读取该简历。请确认文件未加密或损坏，也可以另存为 PDF 或 DOCX 后重试。"
    );
  }
}

async function extractLegacyWordText(buffer: Buffer) {
  const wordExtractorModule = await import("word-extractor");
  const WordExtractor = (wordExtractorModule.default ??
    wordExtractorModule) as unknown as new () => {
    extract(input: Buffer): Promise<{ getBody(): string }>;
  };
  const document = await new WordExtractor().extract(buffer);
  return document.getBody();
}

async function extractPdfText(buffer: Buffer) {
  const pdfParseModule = await import("pdf-parse");
  const candidate = pdfParseModule as unknown as {
    default?: (value: Buffer) => Promise<{ text?: string }>;
    PDFParse?: new (input: { data: Buffer }) => {
      getText(): Promise<{ text?: string }>;
      getScreenshot(input: {
        first: number;
        scale: number;
        imageBuffer: boolean;
      }): Promise<{ pages: Array<{ data: Uint8Array }> }>;
      destroy(): Promise<void>;
    };
  };

  if (typeof candidate.default === "function") {
    return (await candidate.default(buffer)).text ?? "";
  }
  if (candidate.PDFParse) {
    const parser = new candidate.PDFParse({ data: buffer });
    try {
      const text = (await parser.getText()).text ?? "";
      if (text.replace(/\s/g, "").length >= 40) {
        return text;
      }

      const screenshots = await parser.getScreenshot({
        first: 3,
        scale: 1.5,
        imageBuffer: true
      });
      const pages: string[] = [];
      for (const page of screenshots.pages) {
        pages.push(await recognizeImage(Buffer.from(page.data)));
      }
      return pages.join("\n\n");
    } finally {
      await parser.destroy();
    }
  }
  throw new ResumeParseError("PDF 解析组件暂时不可用。");
}

async function recognizeImage(buffer: Buffer) {
  const { recognize } = await import("tesseract.js");
  return (await recognize(buffer, "eng+chi_sim")).data.text;
}

function cleanText(text: string) {
  const cleaned = text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length < 40) {
    throw new ResumeParseError(
      "没有识别到足够的简历文字。请上传更清晰的文件，或将扫描件另存为带文字层的 PDF。"
    );
  }
  return cleaned.slice(0, 60_000);
}

function structureResume(rawText: string): ParsedResume {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const skills = unique([
    ...matchTerms(rawText, [
      "JavaScript", "TypeScript", "Python", "Java", "C++", "SQL", "React",
      "Next.js", "Node.js", "AWS", "Azure", "Docker", "Kubernetes", "Figma",
      "Excel", "PowerPoint", "Tableau", "Power BI", "Machine Learning",
      "Product Management", "Financial Modeling", "Valuation", "Strategy"
    ]),
    ...extractTaxonomyKeywords(rawText)
  ]);
  const roles = unique(
    lines.filter((line) =>
      /(manager|engineer|analyst|consultant|developer|designer|intern|director|associate|经理|工程师|分析师|顾问|实习)/i.test(line)
    ).slice(0, 12)
  );
  const companies = unique(
    lines.filter((line) =>
      /(inc\.?|ltd\.?|llc|company|bank|capital|consulting|technology|科技|公司|银行|咨询|集团)/i.test(line)
    ).slice(0, 12)
  );
  const education = unique(
    lines.filter((line) =>
      /(university|college|bachelor|master|mba|phd|大学|学院|本科|硕士|博士)/i.test(line)
    ).slice(0, 10)
  );
  const projectLines = lines.filter((line) =>
    /(project|built|launched|developed|designed|项目|搭建|上线|开发|设计)/i.test(line)
  ).slice(0, 8);
  const projects = projectLines.map((description, index) => ({
    name: inferProjectName(description, index),
    description,
    technologies: skills.filter((skill) =>
      description.toLowerCase().includes(skill.toLowerCase())
    )
  }));

  return {
    rawText,
    summary: lines.slice(0, 5).join(" ").slice(0, 600),
    companies,
    roles,
    skills,
    projects,
    education
  };
}

function matchTerms(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase()));
}

function inferProjectName(line: string, index: number) {
  const head = line.split(/[:：\-–|]/)[0]?.trim();
  return head && head.length <= 80 ? head : `Project ${index + 1}`;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
