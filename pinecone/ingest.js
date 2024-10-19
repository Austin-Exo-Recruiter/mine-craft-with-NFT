import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { pinecone } from "./utils/pinecone-client.js";
import { PINECONE_INDEX_NAME, OPENAI_API_KEY } from "./config/pinecone.js";
import { getNamespace, getNamespaceById } from "../routes/auth/auth.js";
import https from "https";
import { convert } from "html-to-text";
import { encode } from "gpt-tokenizer";
import textact from "textract";
import { addfiletodb } from "../routes/upload/upload.js";
import {
    ACTION_UPDATE_URL,
    PINECONE_ADAPA_NAMESPACE,
    USER_TABLE,
} from "../common/constants.js";
import { addHistory, getConnection } from "../routes/profile/profile.js";
const connection = getConnection();

export async function ingesttext(req, res) {
    try {
        const { email, logintype, fileName, userid } = req.body;
        const namespace = await getNamespace(email, logintype);
        console.log("email logintype --------------------");
        console.log(email, logintype, fileName);

        const filepath = "public/" + `${namespace}/` + `${fileName}`;
        /*load raw docs from the all files in the directory */
        // const contents = await fs.promises.readFile(filepath, "utf-8");
        const contents = await getText(filepath);
        console.log(contents);
        /* Split text into chunks */
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await textSplitter.splitText(contents);
        let token_count = 0;
        docs.map((doc, idx) => {
            token_count += encode(doc).length;
        });
        console.log("token_count is : ", token_count);
        if (!(await updateTokenUsage(userid, token_count))) return;
        const docid = await addfiletodb({
            userid,
            fileName,
            token_count,
            type: fileName.split(".").pop().toLowerCase(),
        });
        const metadatas = docs.map(() => {
            return { source: docid };
        });
        console.log("metadatas is : ");
        console.log(metadatas);
        // console.log("split text", docs);
        console.log("Creating vector store...");
        /*create and store the embeddings in the vectorStore*/
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        const index = await pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
        //embed the PDF documents
        const result = await PineconeStore.fromTexts(
            docs,
            metadatas,
            embeddings,
            {
                pineconeIndex: index,
                namespace: PINECONE_ADAPA_NAMESPACE,
                textKey: "text",
            }
        );
        console.log("Ingestion completed ----------");
        // fs.unlink(path.join(folderpath, fileName), (err) => {
        //     console.log("Error while deleting file : ", err);
        // });

        res.send({ response: true, token_count: token_count });
    } catch (error) {
        console.log("error", error);
        res.status(200).json();
    }
}

export async function updateUrls(req, res) {
    console.log("updateUrls called -----------");
    try {
        const { user_id, filenames, urls } = req.body;
        console.log(user_id, filenames, urls);
        const index = await pinecone.Index(PINECONE_INDEX_NAME);
        const namespace = await getNamespaceById(user_id);
        // await index.delete1({
        //     filter: {
        //         source: { $in: filenames },
        //     },
        //     namespace: namespace,
        // });
        for (let i = 0; i < urls.length; i++) {
            const htmlcontent = await getContent(urls[i]);
            const contents = convert(htmlcontent, { wordwrap: 130 });
            console.log(contents);
            /* Split text into chunks */
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const docs = await textSplitter.splitText(contents);
            const metadatas = docs.map(() => {
                return { source: filenames[i] };
            });
            console.log("metadatas is : ");
            console.log(metadatas);
            // console.log("split text", docs);
            console.log("Creating vector store...");
            /*create and store the embeddings in the vectorStore*/
            const embeddings = new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            });
            //embed the PDF documents
            const result = await PineconeStore.fromTexts(
                docs,
                metadatas,
                embeddings,
                {
                    pineconeIndex: index,
                    namespace: namespace,
                    textKey: "text",
                }
            );
            console.log("creating vector store completed ---------");
        }
        await addHistory(
            user_id,
            ACTION_UPDATE_URL,
            `${filenames.join(",")} has updated`
        );
        res.status(200).json({ result: "update urls success" });
    } catch (err) {
        console.log(err);
    }
}

export async function url(req, res) {
    console.log("url is called -----------");
    try {
        const { user_id, url, filename, detail } = req.body;
        console.log(req.body);
        const namespace = await getNamespaceById(user_id);
        console.log(user_id, url, filename, detail);
        const htmlcontent = await getContent(url);
        const contents = convert(htmlcontent, { wordwrap: 130 });
        console.log(contents);
        /* Split text into chunks */
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await textSplitter.splitText(contents);
        let token_count = 0;
        docs.map((doc, idx) => {
            token_count += encode(doc).length;
        });
        console.log("token_count is : ", token_count);
        const metadatas = docs.map(() => {
            return { source: filename };
        });
        console.log("metadatas is : ");
        console.log(metadatas);
        // console.log("split text", docs);
        console.log("Creating vector store...");
        /*create and store the embeddings in the vectorStore*/
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        const index = await pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
        //embed the PDF documents
        const result = await PineconeStore.fromTexts(
            docs,
            metadatas,
            embeddings,
            {
                pineconeIndex: index,
                namespace: namespace,
                textKey: "text",
            }
        );
        console.log("URL Ingestion complete : ", result);
        await addfiletodb({
            userid: user_id,
            fileName: filename,
            token_count,
            type: "URL",
            detail,
        });
        res.status(200).json({ result: "success", token_count: token_count });
    } catch (err) {
        console.log(err);
    }
}

export async function getContent(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                let data = "";

                // When data is received, append it to the data variable
                res.on("data", (chunk) => {
                    data += chunk;
                });

                // When the entire response has been received, resolve the promise with the data as a string
                res.on("end", () => {
                    resolve(data);
                });
            })
            .on("error", (err) => {
                reject(new Error(err.message));
            });
    });
}

export async function getText(filepath) {
    return new Promise((resolve, reject) => {
        textact.fromFileWithPath(filepath, (err, txt) => {
            resolve(txt);
        });
    });
}

export async function updateTokenUsage(id, token_counts) {
    return new Promise((resolve, reject) => {
        const qUpdateOne = `
            UPDATE ${USER_TABLE}
            SET token_usage = COALESCE(token_usage, 0) + ${token_counts}  
            WHERE id = ${id}`;
        connection.query(qUpdateOne, [], (err, result) => {
            if (err) throw err;
            resolve(true);
        });
    });
}
