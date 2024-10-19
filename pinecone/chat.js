import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { makeChain } from "./utils/makechain.js";
import { pinecone } from "./utils/pinecone-client.js";
import {
    PINECONE_INDEX_NAME,
    PINECONE_NAME_SPACE,
    OPENAI_API_KEY,
} from "./config/pinecone.js";
import { getNamespace, getuserid } from "../routes/auth/auth.js";
import {
    getFileNamesFromIDs,
    getallfilelist,
    getfilelist,
    getlist,
} from "../routes/upload/upload.js";
import { query } from "express";
import { OpenAIChat, OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
    LLMChain,
    ChatVectorDBQAChain,
    loadQAChain,
    RetrievalQAChain,
} from "langchain/chains";
import { CallbackManager } from "langchain/callbacks";
import formidable from "formidable";
import { getJson } from "serpapi";
import { SERP_API_KEY, SERP_SEARCH_NUM } from "../config.js";
import { getContent } from "./ingest.js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import rp from "request-promise";
import cheerio from "cheerio";
import SerpApi from "google-search-results-nodejs";
import { getFilenameList } from "../routes/chat/chat.js";
import { HumanChatMessage } from "langchain/schema";
import {
    DEFAULT_PROMPT,
    IF_CREATE_PROMPT,
    I_CAN_PROMPT,
} from "./utils/prompt.js";
import { PINECONE_ADAPA_NAMESPACE } from "../common/constants.js";

export const chat = async (req, res) => {
    try {
        console.log("/api/chat called -------------------");
        const { question, history, email, logintype, source, userid, model } =
            req.body;
        console.log(req.body);
        const namespace = await getNamespace(email, logintype);
        if (!question) {
            return res
                .status(400)
                .json({ message: "No question in the request" });
        }
        const list = await getlist(userid);
        console.log("filelist is ----------------");
        console.log(list);
        const fileteredlist = list.filter((item) => item.visible === "show");
        const names = fileteredlist.map((item) => item.filename);
        // OpenAI recommends replacing newlines with spaces for best results
        const sanitizedQuestion = question.trim().replaceAll("\n", " ");
        // Get Pinecone index
        const index = pinecone.Index(PINECONE_INDEX_NAME);
        /* create vectorstore*/
        const vectorStore = await PineconeStore.fromExistingIndex(
            new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY }),
            {
                pineconeIndex: index,
                textKey: "text",
                namespace: namespace,
                filter:
                    source == ""
                        ? { source: { $in: names } }
                        : { source: source },
            }
        );

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache,no-transform",
            Connection: "keep-alive",
        });

        res.flushHeaders();

        //create chain
        const chain = await makeChain(
            vectorStore,
            (token) => {
                res.write("token:" + token);
                console.log(token);
            },
            model
        );

        //Ask a question
        const response = await chain.call({
            question: sanitizedQuestion,
            chat_history: history || [],
        });

        console.log("response", response);
        res.write("end:" + JSON.stringify({ data: response }));
        res.end();
    } catch (error) {
        console.log("error", error);
    } finally {
        res.end();
    }
};

export const getDocs = async (req, res) => {
    console.log("getDocs called ----------");
    console.log("req is : ", req.body);
    const { question, history, namespace } = req.body;
    const sanitizedQuestion = (
        question + "Explain more detail like explaining for children"
    )
        .trim()
        .replaceAll("\n", " ");

    const index = pinecone.Index(PINECONE_INDEX_NAME);
    const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY }),
        {
            pineconeIndex: index,
            textKey: "text",
            namespace: namespace,
        }
    );
    const docs = await vectorStore.similaritySearch(sanitizedQuestion, 3);
    console.log("docs is : ", docs);
    res.status(200).json(docs);
};

export const socketChat = async (req, socketCallback, socketEndCallback) => {
    try {
        console.log("/api/socketChat called -------------------");
        const {
            question,
            history,
            email,
            logintype,
            source,
            userid,
            model,
            lang,
            recall,
            agent,
        } = req;
        console.log("req is ", req);

        const namespace = await getNamespace(email, logintype);

        const filelist = await getlist(userid);
        console.log("filelist is ----------------");
        console.log(filelist);

        const selectedlist =
            filelist == "error"
                ? []
                : await getFilenameList(filelist, question);
        console.log("selectedlist is : ", selectedlist);
        let metadatalist;
        // metadatalist = filelist.map((file) => file.id);
        if (selectedlist.length == 0 && source == "" && filelist != "error") {
            metadatalist = filelist.map((file) => file.id);
        }
        if (filelist == "error") {
            metadatalist = [];
        } else {
            metadatalist = filelist
                .filter((file) => selectedlist.includes(file.filename))
                .map((file) => file.id);
            console.log(metadatalist);
        }

        // OpenAI recommends replacing newlines with spaces for best results
        const sanitizedQuestion = question.trim().replaceAll("\n", " ");
        // Get Pinecone index
        const index = pinecone.Index(PINECONE_INDEX_NAME);
        /* create vectorstore*/
        let vectorStore;
        if (agent == "") {
            console.log("no agent ----------");
            if (
                selectedlist.length == 0 &&
                source == "" &&
                filelist != "error"
            ) {
                console.log("without filtering mode --------------");
                vectorStore = await PineconeStore.fromExistingIndex(
                    new OpenAIEmbeddings({
                        openAIApiKey: process.env.OPENAI_API_KEY,
                    }),
                    {
                        pineconeIndex: index,
                        textKey: "text",
                        namespace: namespace,
                    }
                );
            } else {
                console.log(
                    "filtering with selectedList or source --------------"
                );
                console.log("source is : ", source);
                vectorStore = await PineconeStore.fromExistingIndex(
                    new OpenAIEmbeddings({
                        openAIApiKey: process.env.OPENAI_API_KEY,
                    }),
                    {
                        pineconeIndex: index,
                        textKey: "text",
                        namespace: PINECONE_ADAPA_NAMESPACE,
                        filter:
                            source == ""
                                ? filelist == "error"
                                    ? { source: source }
                                    : {
                                          source: {
                                              $in: [...metadatalist],
                                          },
                                      }
                                : { source: source },
                    }
                );
            }
        } else {
            console.log("Agent : ", agent);
            const params = {
                engine: agent.toLowerCase(),
                q: question,
                p: question,
                location: "Austin, Texas, United States",
                hl: "en",
                gl: "us",
                google_domain: "google.com",
                api_key: SERP_API_KEY,
            };
            const resp = await getJson(params);
            const urls = resp.organic_results
                .slice(0, SERP_SEARCH_NUM)
                .map((item) => item.link);
            console.log(urls);
            let contents = "";
            for (let i = 0; i < urls.length; i++) {
                try {
                    const html = await rp(urls[i]);
                    const ch = cheerio.load(html);
                    contents += ch("body").text();
                } catch (err) {
                    console.log("err : ", err);
                }
            }
            console.log(contents);
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const docs = await textSplitter.splitText(contents);
            console.log("docs : ", docs);
            const metadatas = docs.map(() => {
                return { source: agent };
            });
            const embeddings = new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            });
            const index = await pinecone.Index(PINECONE_INDEX_NAME);
            await PineconeStore.fromTexts(docs, metadatas, embeddings, {
                pineconeIndex: index,
                namespace: namespace,
                textKey: "text",
            });
            vectorStore = await PineconeStore.fromExistingIndex(
                new OpenAIEmbeddings({
                    openAIApiKey: process.env.OPENAI_API_KEY,
                }),
                {
                    pineconeIndex: index,
                    textKey: "text",
                    namespace: namespace,
                    filter: { source: agent },
                }
            );
            const suitableDocs = await vectorStore.similaritySearch(
                sanitizedQuestion,
                10
            );
            // const ifcreatechain = loadQAChain(
            //     new OpenAIChat({
            //         openAIApiKey: "sk-" + process.env.NEXT_PUBLIC_KEY,
            //         temperature: 0.3,
            //         modelName: "gpt-3.5-turbo-0613",
            //         verbose: true,
            //     }),
            //     {
            //         type: "stuff",
            //         prompt: IF_CREATE_PROMPT,
            //     }
            // );
            // const result = await ifcreatechain.call({
            //     input_documents: suitableDocs,
            //     question: sanitizedQuestion,
            // });
            // console.log("ifcreated ---------------------------", result);

            const chain = loadQAChain(
                new OpenAIChat({
                    openAIApiKey: process.env.OPENAI_API_KEY,
                    temperature: 0.3,
                    modelName: "gpt-3.5-turbo-0613",
                    verbose: true,
                    streaming: true,
                    callbackManager: CallbackManager.fromHandlers({
                        async handleLLMNewToken(token) {
                            socketCallback(token);
                            console.log(token);
                        },
                    }),
                })
            );
            const res = await chain.call({
                input_documents: suitableDocs,
                question: sanitizedQuestion,
            });
            const response = {
                text: res.text,
                sourceDocuments: [],
            };
            socketEndCallback(response);
            return;
        }

        let suitableDocs = await vectorStore.similaritySearch(
            sanitizedQuestion
        );
        console.log("suitableDocs is : ", suitableDocs);

        if (suitableDocs.length > 0) {
            let fileNameList = suitableDocs.map((item) => item.metadata.source);
            let newList = await getFileNamesFromIDs(fileNameList);
            suitableDocs = suitableDocs.map((item, idx) => {
                item.metadata.source = newList[idx];
                return item;
            });
            console.log("new suitableDocs is : ", suitableDocs);
        }

        const ifcreatechain = loadQAChain(
            new OpenAIChat({
                openAIApiKey: process.env.OPENAI_API_KEY,
                temperature: 0.3,
                modelName: "gpt-3.5-turbo-0613",
                verbose: true,
            }),
            {
                type: "stuff",
                prompt: IF_CREATE_PROMPT,
            }
        );
        const result = await ifcreatechain.call({
            input_documents: suitableDocs,
            question: sanitizedQuestion,
        });
        console.log("ifcreated ---------------------------", result.text);

        if (result.text == "I can.") {
            const chain = loadQAChain(
                new OpenAIChat({
                    openAIApiKey: process.env.OPENAI_API_KEY,
                    temperature: 0.3,
                    modelName: "gpt-3.5-turbo-0613",
                    verbose: true,
                    streaming: true,
                    callbackManager: CallbackManager.fromHandlers({
                        async handleLLMNewToken(token) {
                            socketCallback(token);
                            console.log(token);
                        },
                    }),
                }),
                {
                    type: "stuff",
                    prompt: I_CAN_PROMPT,
                }
            );
            const resA = await chain.call({
                input_documents: suitableDocs,
                question: sanitizedQuestion,
                chat_history: history,
            });
            const response = {
                text: resA.text,
                sourceDocuments: suitableDocs,
            };

            socketEndCallback(response);
            return;
        } else if (result.text == "I can not.") {
            const model = new OpenAIChat({
                openAIApiKey: process.env.OPENAI_API_KEY,
                temperature: 0.3,
                modelName: "gpt-3.5-turbo-0613",
                verbose: true,
                streaming: true,
                callbackManager: CallbackManager.fromHandlers({
                    async handleLLMNewToken(token) {
                        socketCallback(token);
                        console.log(token);
                    },
                }),
            });

            const resA = await model.call(DEFAULT_PROMPT + sanitizedQuestion);
            console.log(resA);
            const response = {
                text: resA,
                sourceDocuments: [],
            };
            socketEndCallback(response);
            return;
        }
        return;
    } catch (error) {
        console.log("error", error);
    } finally {
        // res.end();
    }
};

export const summarizeChat = async (req, socketCallback, socketEndCallback) => {
    // export const summarizeChat = async (req, res) => {
    try {
        console.log("/api/summarizeChat called -------------------");
        const { question, content } = req;
        console.log("req is ", req.body);
        // OpenAI recommends replacing newlines with spaces for best results
        const chain = loadQAChain(
            new OpenAIChat({
                openAIApiKey: process.env.OPENAI_API_KEY,
                temperature: 0.3,
                modelName: "gpt-3.5-turbo-0613",
                verbose: true,
                streaming: true,
                callbackManager: CallbackManager.fromHandlers({
                    async handleLLMNewToken(token) {
                        console.log(token);
                        socketCallback(token);
                    },
                }),
            })
        );
        const res = await chain.call({
            input_documents: [],
            question: `${question} \n ${content}`,
        });
        const response = {
            text: res.text,
            sourceDocuments: [],
        };
        console.log(response);
        socketEndCallback(response);
        return;
    } catch (error) {
        console.log("error", error);
    } finally {
        // res.end();
    }
};
