/**
 * Change the namespace to the namespace on Pinecone you'd like to store your embeddings.
 */

import { getENV } from "../../routes/admin/admin.js";

// if (!process.env.PINECONE_INDEX_NAME) {
//   throw new Error('Missing Pinecone index name in .env file');
// }

const PINECONE_INDEX_NAME = "pdftool";

const PINECONE_NAME_SPACE = "ingested"; //namespace for entire uploaded files.
const PINECONE_NAME_SPACE_CACHE = "ingested"; //namespace for entire uploaded files.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// const OPENAI_API_KEY = "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";
//namespace for entire uploaded files.
export {
    PINECONE_INDEX_NAME,
    PINECONE_NAME_SPACE,
    PINECONE_NAME_SPACE_CACHE,
    OPENAI_API_KEY,
};
