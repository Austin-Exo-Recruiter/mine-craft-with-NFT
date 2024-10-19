import { getConnection } from "../auth/auth.js";
import { chat } from "../../pinecone/chat.js";
const CHAT_TABLE = "chat";
const MSG_TABLE = "msg";
import { Configuration, OpenAIApi } from "openai";
import { OPENAI_API_KEY } from "../../pinecone/config/pinecone.js";
import { encode } from "gpt-tokenizer";
import { USER_TABLE } from "../../common/constants.js";

const connection = getConnection();

export const addchat = async (req, res) => {
    try {
        console.log("addChat ------");
        const { title, user_id, created_at } = req.body;
        const qInsertOne = `
                INSERT INTO  ${CHAT_TABLE}
                (title, created_at, user_id)
                VALUES ( ?, ?, ?)
                `;
        connection.query(
            qInsertOne,
            [title, created_at, user_id],
            (err, result) => {
                if (err) throw err;
                console.log(result);
                res.send({
                    response: true,
                    msg: "chat has added",
                    newchatid: result.insertId,
                });
            }
        );
    } catch (err) {
        console.log(err);
    }
};

export const getchat = async (req, res) => {
    try {
        console.log("getchat ---------");
        const { user_id } = req.body;
        console.log(user_id);
        const qFineOne = `
            SELECT *  
            FROM ${CHAT_TABLE}  
            WHERE user_id=?`;
        connection.query(qFineOne, [user_id], (err, result) => {
            console.log(result);
            if (err) throw err;
            res.send({ response: true, result });
        });
    } catch (err) {
        console.log(err);
    }
};

export const addmsg = async (req, res) => {
    try {
        console.log("savemsg ---------");
        console.log(req.body);
        const { prompt, response, refs, chat_id, created_at } = req.body;
        const token_counts = encode(prompt + response).length;
        console.log("token_counts for msg is ", token_counts);
        const qInsertOne = `
                INSERT INTO  ${MSG_TABLE}
                (prompt, response, refs, chat_id, created_at)
                VALUES ( ?, ?, ?, ?, ?)
                `;
        connection.query(
            qInsertOne,
            [prompt, response, refs, chat_id, created_at],
            (err, result) => {
                if (err) throw err;
                console.log("savemsg result is : ", result);
                const qUpdateOne = `
                        UPDATE ${USER_TABLE}  
                        SET token_usage = COALESCE(token_usage, 0) + ${token_counts}  
                        WHERE id IN (  
                            SELECT user_id  
                            FROM ${CHAT_TABLE}  
                            WHERE id = ${chat_id}  
                        )`;
                connection.query(qUpdateOne, [], (err, result) => {
                    if (err) throw err;
                    res.send({ response: true, msg: "msg saved" });
                });
            }
        );
    } catch (err) {
        console.log(err);
    }
};

export const getmsg = async (req, res) => {
    try {
        console.log("getmsg -------");
        const { chat_id } = req.body;
        const qFineOne = `
            SELECT *
            FROM ${MSG_TABLE}
            WHERE chat_id = ?`;
        connection.query(qFineOne, [chat_id], (err, result) => {
            if (err) throw err;
            console.log("gemsg result is : ", result);
            res.send({ response: true, result });
        });
    } catch (err) {
        console.log(err);
    }
};

export const deletechat = async (req, res) => {
    try {
        console.log("deletechat ------------");
        const { chat_id } = req.body;
        console.log(chat_id);
        const qFineOne = `
            DELETE
            FROM ${CHAT_TABLE}
            WHERE id = ?`;
        connection.query(qFineOne, [chat_id], (err, result) => {
            if (err) throw err;
            console.log("delete chat_id is : ", result);
            res.send({ response: true, result });
        });
    } catch (err) {
        console.log(err);
    }
};

export const deleteallchat = async (req, res) => {
    try {
        console.log("deleteallmsg ------------");
        const { user_id } = req.body;
        console.log(user_id);
        const qFineOne = `
            DELETE
            FROM ${CHAT_TABLE}
            WHERE user_id = ?`;
        connection.query(qFineOne, [user_id], (err, result) => {
            if (err) throw err;
            console.log("delete user_id is : ", result);
            res.send({ response: true, result });
        });
    } catch (err) {
        console.log(err);
    }
};

export const thumb = async (req, res) => {
    try {
        console.log("thumb -------------");
        const { msg_id, thumb } = req.body;
        console.log(msg_id, thumb);
        const qUpdateOne = `
            UPDATE ${MSG_TABLE}
            SET thumb=?
            WHERE id=?`;
        connection.query(qUpdateOne, [thumb, msg_id], (err, result) => {
            if (err) {
                res.send({
                    response: false,
                    msg: "Failed to update thumb",
                });
                throw err;
            }
            console.log("result is : ", result);
            res.send({
                response: true,
                msg: "Thumb has updated successfully",
            });
        });
    } catch (err) {
        console.log(err);
    }
};

export const gettitle = async (req, res) => {
    const { question } = req.body;
    let title = "";

    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-0613",
        messages: [
            {
                role: "user",
                content: `Produce a concise, descriptive Title for this message. The Title should fit on a single line. Do not include the word 'Title' in your response. Message is : ${question}`,
            },
        ],
    });
    console.log(chatCompletion.data.choices[0].message);
    title = chatCompletion.data.choices[0].message;
    res.send({
        response: true,
        title: title.content,
    });
};

export const getFilenameList = async (list, question) => {
    console.log("getFIleList called -----------");
    console.log(list);
    const filenames = list
        .filter((item) => item.visible === "show")
        .map((item) => item.filename);
    // const filenames = ["landshare.pdf", "apache.pdf", " profile.pdf"];
    let title = "";
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    console.log(filenames.join());

    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-0613",
        messages: [
            {
                role: "user",
                content: `I will provide you array of file names and one question. Question is related to one of the filename. You need to select one or more filenames as array of string among array of filenames that is suitable for user's question. If there is no suitable file name then reply this : [].
                -----------------------------
                Here is array of file names : 
                "landshare.pdf", "apache.pdf", " profile.pdf"
                Here is user's question : 
                What is landshare ?
                Here is answer :
                ["landshare.pdf"]

                Here is array of file names : 
                "landshare.pdf", "apache.pdf", " profile.pdf"
                Here is user's question : 
                Summarize landshare and apache documents
                Here is answer :
                ["landshare.pdf", "apache.pdf"]
                
                Here is array of file names : 
                ${filenames.join()}
                Here is user's question : 
                ${question}
                Here is your answer :
                `,
            },
        ],
    });
    return JSON.parse(chatCompletion.data.choices[0].message.content);
};
