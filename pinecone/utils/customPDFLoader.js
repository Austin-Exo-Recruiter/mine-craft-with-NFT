import { Document } from "langchain/document";
import { readFile } from "fs/promises";
import { BaseDocumentLoader } from "langchain/document_loaders/base";
import path from "path";

class BufferLoader extends BaseDocumentLoader {
  constructor(filePathOrBlob) {
    super();
    this.filePathOrBlob = filePathOrBlob;
  }

  async load() {
    let buffer;
    let metadata;
    if (typeof this.filePathOrBlob === "string") {
      buffer = await readFile(this.filePathOrBlob);
      metadata = { source: path.basename(this.filePathOrBlob) };
    } else {
      buffer = await this.filePathOrBlob
        .arrayBuffer()
        .then((ab) => Buffer.from(ab));
      metadata = { source: "blob", blobType: this.filePathOrBlob.type };
    }
    console.log("metadata is -----------------", metadata);
    return this.parse(buffer, metadata);
  }

  async parse(raw, metadata) {
    throw new Error("Not implemented");
  }
}

class CustomPDFLoader extends BufferLoader {
  async parse(raw, metadata) {
    const { pdf } = await PDFLoaderImports();
    const parsed = await pdf(raw);
    return [
      new Document({
        pageContent: parsed.text,
        metadata: {
          ...metadata,
          pdf_numpages: parsed.numpages,
        },
      }),
    ];
  }
}

async function PDFLoaderImports() {
  try {
    const { default: pdf } = await import("pdf-parse/lib/pdf-parse.js");
    return { pdf };
  } catch (error) {
    console.error(error);
    throw new Error(
      "Failed to load pdf-parse. Please install it with eg. `npm install pdf-parse`."
    );
  }
}

export { BufferLoader, CustomPDFLoader };
