declare module "word-extractor" {
  export type ExtractedWordDocument = {
    getBody(): string;
  };

  export default class WordExtractor {
    extract(input: Buffer): Promise<ExtractedWordDocument>;
  }
}
