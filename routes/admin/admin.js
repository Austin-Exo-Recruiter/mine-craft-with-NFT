import fs from "fs";
import formidable from "formidable";
import path from "path";
import mysql from "mysql";
import { MYSQL_CONNECTION_URL } from "../../config.js";
import { Configuration, OpenAIApi } from "openai";

import { AVATAR_PATH } from "../../common/constants.js";
const connection = mysql.createConnection(MYSQL_CONNECTION_URL);

const USER_TABLE = "user";
const UPLOADLIST_TABLE = "uploadlist";
const ADMIN_TABLE = "admin";
const SESSION_TABLE = "session";

export const tokenusage = async (req, res) => {
    try {
        console.log(req.body);
        const { id } = req.body;
        // const query = `SELECT SUM(token_count) as totalTokens FROM ${UPLOADLIST_TABLE} WHERE user_id = ?`;
        // await connection.query(query, [id], async (err, results) => {
        //     if (err) throw err;
        //     const totalTokens = results[0].totalTokens;
        //     res.send({
        //         results: true,
        //         resposne: {
        //             totalTokens,
        //         },
        //     });
        //     return;
        // });

        // const query = `
        //     SELECT u.id, u.email, SUM(up.token_count) AS totalTokens, up.filename, up.token_count
        //     FROM ${USER_TABLE} u
        //     INNER JOIN ${UPLOADLIST_TABLE} up ON u.id = up.user_id
        //     GROUP BY u.id, u.email
        //     `;
        // await connection.query(query, (err, result) => {
        //     if (err) throw err;
        //     console.log(result);
        //     const users = result.map((row) => ({
        //         user_id: row.user_id,
        //         email: row.email,
        //         totalTokens: row.totalTokens,
        //     }));
        //     res.send({
        //         result: true,
        //         response: {
        //             users: users,
        //         },
        //     });
        // });

        const query = `  
            SELECT u.id AS userid, u.email, SUM(up.token_count) AS totalTokens,   
                    up.filename, up.token_count  
            FROM ${USER_TABLE} u  
            INNER JOIN ${UPLOADLIST_TABLE} up ON u.id = up.user_id  
            GROUP BY u.id, u.email, up.filename, up.token_count  
            `;
        await connection.query(query, (err, result) => {
            const userMap = new Map();

            result.forEach((row) => {
                const { userid, email, totalTokens, filename, token_count } =
                    row;

                if (!userMap.has(userid)) {
                    userMap.set(userid, {
                        userid,
                        email,
                        totalTokens,
                        documents: [{ filename, token_count }],
                    });
                } else {
                    const user = userMap.get(userid);
                    user.totalTokens += totalTokens;
                    user.documents.push({ filename, token_count });
                }
            });

            const users = Array.from(userMap.values());
            console.log(users);
            res.send({
                result: true,
                response: users,
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            resposne: err,
        });
    }
};

export const tokenusagebyuser = (req, res) => {
    try {
        const { id } = req.body;
        const query = ` 
            
        `;
        connection.query;
    } catch (err) {
        console.log(err);
        req.send({
            result: false,
            response: err,
        });
    }
};

export const getENV = async () => {
    return new Promise((resolve, reject) => {
        try {
            const query = `
                SELECT * FROM ${ADMIN_TABLE} LIMIT 1
                `;
            connection.query(query, (err, result) => {
                if (err) console.log(err);
                resolve(result[0]);
            });
        } catch (err) {
            reject(new Error(err));
        }
    });
};

export const updateopenaiapikey = async (req, res) => {
    try {
        console.log(req.body);
        const { key } = req.body;
        const valid = await is_openai_api_key_valid(key);
        console.log(valid);
        if (!valid) {
            res.send({
                result: false,
                response: "Invalid OpenAI API key",
            });
            return;
        }
        const qUpdateOne = `
            UPDATE ${ADMIN_TABLE}
            SET openai_api_key = ?
            WHERE id = 1`;
        connection.query(qUpdateOne, [key], (err, result) => {
            if (err) {
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            process.env["OPENAI_API_KEY"] = key;
            res.send({
                result: true,
                response: "OpenAI API key updated successfully",
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
    }
};

export const updatesendgridapikey = async (req, res) => {
    try {
        console.log(req.body);
        const { key } = req.body;
        const qUpdateOne = `
            UPDATE ${ADMIN_TABLE}
            SET sendgrid_api_key = ?
            WHERE id = 1`;
        connection.query(qUpdateOne, [key], (err, result) => {
            if (err) {
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            process.env["SENDGRID_API_KEY"] = key;
            res.send({
                result: true,
                response: "Sendgrid API key updated successfully",
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
    }
};

export const updateserpapikey = async (req, res) => {
    try {
        console.log(req.body);
        const { key } = req.body;
        const qUpdateOne = `
            UPDATE ${ADMIN_TABLE}
            SET serp_api_key = ?
            WHERE id = 1`;
        connection.query(qUpdateOne, [key], (err, result) => {
            if (err) {
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            process.env["SERP_API_KEY"] = key;
            res.send({
                result: true,
                response: "SERP API key updated successfully",
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
    }
};

export const updatetwilioapikey = (req, res) => {
    try {
        console.log(req.body);
        const { twilio_account_sid, twilio_auth_token } = req.body;
        const qUpdateOne = `
            UPDATE ${ADMIN_TABLE}
            SET twilio_account_sid = ?, twilio_auth_token = ?
            WHERE id = 1`;
        connection.query(
            qUpdateOne,
            [twilio_account_sid, twilio_auth_token],
            (err, result) => {
                if (err) {
                    res.send({
                        result: false,
                        response: err,
                    });
                    throw err;
                }
                process.env["TWILIO_ACCOUNT_SID"] = twilio_account_sid;
                process.env["TWILIO_AUTH_TOKEN"] = twilio_auth_token;
                res.send({
                    result: true,
                    response: "Twilio API key updated successfully",
                });
            }
        );
    } catch (err) {
        console.log(err);
    }
};

const is_openai_api_key_valid = async (key) => {
    try {
        const configuration = new Configuration({
            apiKey: key,
        });
        const openai = new OpenAIApi(configuration);
        console.log("here");
        const chatCompletion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo-0613",
            messages: [
                {
                    role: "user",
                    content: "hello",
                },
            ],
        });
        return true;
    } catch (err) {
        return false;
    }
};
