import formidable from "formidable";
import fs from "fs";
import path from "path";
import { getNamespace, getNamespaceById } from "../routes/auth/auth.js";
import { ACTION_DOWNLOAD_DOCUMENT, DOCPATH } from "../common/constants.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { pinecone } from "./utils/pinecone-client.js";
import { PINECONE_INDEX_NAME, OPENAI_API_KEY } from "./config/pinecone.js";
import { addHistory } from "../routes/profile/profile.js";

export const config = {
    api: {
        bodyParser: false,
    },
};

export const file = async (req, res) => {
    console.log("called -----------");
    try {
        const form = new formidable.IncomingForm();
        let result;

        form.parse(req, async function (err, fields, files) {
            const { email, logintype } = fields;
            console.log(email);
            console.log(logintype);
            const namespace = await getNamespace(email, logintype);
            console.log("namespace is ", namespace);
            result = await saveFile(files.file, namespace);
        });
        return res.status(201).json(result);
    } catch (err) {
        console.log("Error ----------- ", err);
        return res.status(500).json("");
    }
};

export const higherupload = async (req, res) => {
    console.log("higher upload called --------");
    try {
        const { namespace, contents } = req.body;
        console.log(contents);
        // const textSplitter = new RecursiveCharacterTextSplitter({
        //     chunkSize: 3000,
        //     chunkOverlap: 500,
        // });
        // const docs = await textSplitter.splitText(contents);
        const docs = [contents];
        const metadatas = docs.map(() => {
            return { source: namespace };
        });
        console.log("namespace is ", namespace);
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        const index = await pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
        await index.delete1({
            deleteAll: true,
            namespace,
        });
        console.log("All deleted ----------");
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
        console.log("Ingestion completed : ", result);
        res.send({ response: true });
    } catch (err) {
        console.log("Error ----------- ", err);
        return res.status(500).json("");
    }
};

export const downloadfile = async (req, res) => {
    console.log("donwloadfile called -------------------");
    console.log(req.body);
    const { user_id, filename } = req.body;
    const namespace = await getNamespaceById(user_id);
    const newpath = DOCPATH + `${namespace}/` + filename;
    console.log(newpath);
    res.download(newpath, async (err) => {
        if (err) {
            console.log("Error while donwloading");
            console.log(err);
        } else {
            console.log("Successfully downloaded");
            await addHistory(
                user_id,
                ACTION_DOWNLOAD_DOCUMENT,
                `${filename} has donwloaded`
            );
        }
    });
    // res.status(200).json({ result: "success" });
};

export const saveFile = async (file, namespace) => {
    try {
        const oldpath = file.filepath;
        // const cTimestamp = Date.now();
        const fileName = file.originalFilename;
        const newpath = DOCPATH + `${namespace}/` + fileName;
        console.log("newpath is ", newpath);
        const readStream = fs.createReadStream(oldpath);
        console.log("1 ------------");
        const fullPath = path.resolve(newpath);
        console.log("2 ------------");
        createPathIfNotExists(DOCPATH + `${namespace}/`);
        console.log("3 ------------");
        const writeStream = fs.createWriteStream(fullPath);
        const result = await readStream.pipe(writeStream);
        return result;
    } catch (err) {
        console.log("Error ----------- ", err);
        return "";
    }
};

const createPathIfNotExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    } else {
        console.log(`Directory already exists: ${dir}`);
    }
};
