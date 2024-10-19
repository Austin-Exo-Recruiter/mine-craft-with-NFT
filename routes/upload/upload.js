import { getNamespaceById } from "../auth/auth.js";
import { getConnection } from "../auth/auth.js";
import { PINECONE_INDEX_NAME } from "../../pinecone/config/pinecone.js";
import { pinecone } from "../../pinecone/utils/pinecone-client.js";
import { ACTION_UPLOAD_DOCUMENT, DOCPATH } from "../../common/constants.js";
import fs from "fs";
import path, { resolve } from "path";
import { PINECONE_API_KEY, PINECONE_ENV } from "../../config.js";
import axios from "axios";
import { addHistory } from "../profile/profile.js";
const UPLOADLIST_TABLE = "uploadlist";
const USER_TABLE = "user";

const connection = getConnection();

export const addfiletodb = (req) => {
    return new Promise((resolve, reject) => {
        try {
            console.log("addfiletodb called-----------");
            console.log(req);
            const { userid, fileName, token_count } = req;
            let detail = "no detail";
            if ("detail" in req) detail = req.detail;
            let type = "pdf";
            if ("type" in req) type = req.type;
            const created_at = new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " ");
            const visible = "show";
            const qFineOne = `
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id=? AND filename=?`;
            connection.query(qFineOne, [userid, fileName], (err, result) => {
                if (err) throw err;
                if (result.length == 0) {
                    const qInsertOne = `
                        INSERT INTO  ${UPLOADLIST_TABLE}
                        (user_id, filename, type, detail, token_count, visible, created_at)
                        VALUES ( ?, ?, ?, ?, ?, ?, ?)
                        `;
                    connection.query(
                        qInsertOne,
                        [
                            userid,
                            fileName,
                            type,
                            detail,
                            token_count,
                            visible,
                            created_at,
                        ],
                        async (err, result) => {
                            if (err) throw err;
                            await addHistory(
                                userid,
                                ACTION_UPLOAD_DOCUMENT,
                                `${fileName} has uploaded`
                            );
                            resolve(result.insertId);
                        }
                    );
                } else {
                    reject();
                }
            });
        } catch (err) {
            console.log(err);
        }
    });
};

export const addfile = async (req, res) => {
    try {
        console.log("add file called-----------");
        console.log(req.body);
        const { user_id, filename, token_count } = req.body;
        let detail = "no detail";
        if ("detail" in req.body) detail = req.body.detail;
        let type = "pdf";
        if ("type" in req.body) type = req.body.type;
        const created_at = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
        const visible = "show";
        const qFineOne = `
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id=? AND filename=?`;
        connection.query(qFineOne, [user_id, filename], (err, result) => {
            if (err) throw err;
            if (result.length == 0) {
                const qInsertOne = `
                INSERT INTO  ${UPLOADLIST_TABLE}
                (user_id, filename, type, detail, token_count, visible, created_at)
                VALUES ( ?, ?, ?, ?, ?, ?, ?)
                `;
                connection.query(
                    qInsertOne,
                    [
                        user_id,
                        filename,
                        type,
                        detail,
                        token_count,
                        visible,
                        created_at,
                    ],
                    async (err, result) => {
                        if (err) throw err;
                        console.log(result);

                        res.send({
                            response: true,
                            msg: "file has added",
                            newfileid: result.insertId,
                        });
                    }
                );
            } else {
                res.send({ response: false, result: "file already uploaded" });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const getfilelist = async (req, res) => {
    try {
        console.log("getFilelist called -------------");
        const { user_id } = req.body;
        const visible = "show";
        const qFineOne = `
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id=? AND visible=?`;
        connection.query(qFineOne, [user_id, visible], (err, result) => {
            if (err) throw err;
            res.send({ response: true, result: result });
        });
    } catch (err) {
        console.log(err);
    }
};

export const getallfilelist = async (req, res) => {
    try {
        console.log("getAllFilelist called -------------");
        const { user_id } = req.body;

        const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE id=?`;
        connection.query(qFineOne, [user_id], (err, result) => {
            const email = result[0].email;
            const qFineOne = `
                SELECT *  
                FROM ${UPLOADLIST_TABLE}  
                WHERE ${
                    result[0].sharedtome == null || result[0].sharedtome == "[]"
                        ? "user_id=?"
                        : `user_id=? OR id IN (${JSON.parse(
                              result[0].sharedtome
                          )
                              .map((item) => item.docid)
                              .join()})`
                }`;
            connection.query(qFineOne, [user_id], (err, result) => {
                if (err) throw err;
                res.send({ response: true, result: result });
            });
        });
    } catch (err) {
        console.log(err);
    }
};

export const getacceptedfilelist = async (req, res) => {
    try {
        console.log("getacceptedfilelist called -------------");
        const { user_id } = req.body;

        const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE id=?`;
        connection.query(qFineOne, [user_id], (err, result) => {
            const email = result[0].email;
            // console.log(
            //     JSON.parse(result[0].sharedtome).filter(
            //         (item) => item.status == "Accepted"
            //     ).length > 0
            // );
            const qFineOne = `
                SELECT *  
                FROM ${UPLOADLIST_TABLE}  
                WHERE ${
                    result[0].sharedtome == null ||
                    result[0].sharedtome == "[]" ||
                    JSON.parse(result[0].sharedtome).filter(
                        (item) => item.status == "Accepted"
                    ).length == 0
                        ? "user_id=?"
                        : `user_id=? OR id IN (${JSON.parse(
                              result[0].sharedtome
                          )
                              .filter((item) => item.status == "Accepted")
                              .map((item) => item.docid)
                              .join()})`
                }`;
            connection.query(qFineOne, [user_id], (err, result) => {
                if (err) throw err;
                res.send({ response: true, result: result });
            });
        });
    } catch (err) {
        console.log(err);
    }
};

export const deletefile = async (req, res) => {
    try {
        console.log("deletefile called ---------------");
        const { user_id, filename } = req.body;
        const index = await pinecone.Index(PINECONE_INDEX_NAME);
        const namespace = await getNamespaceById(user_id);

        const innerObject = {
            namespace: namespace,
            filter: {
                source: { $eq: filename },
            },
        };
        const deleteIndex = await index._delete({
            deleteRequest: innerObject,
        });

        console.log("deleteIndex is : ", deleteIndex);
        const qDeleteOne = `
            DELETE
            FROM ${UPLOADLIST_TABLE}
            WHERE user_id = ? AND filename = ?`;
        connection.query(
            qDeleteOne,
            [user_id, filename],
            async (err, result) => {
                if (err) throw err;
                const folderpath = "public/" + `${namespace}/`;
                fs.unlink(path.join(folderpath, filename), (err) => {
                    if (err) console.log("Error while deleting file : ", err);
                });
                res.send({ response: true, result: result });
            }
        );
    } catch (err) {
        console.log(err);
    }
};

export const deletefiles = async (req, res) => {
    try {
        console.log("deletefiles called ------------");
        const { user_id, filenames } = req.body;
        const index = await pinecone.Index(PINECONE_INDEX_NAME);
        const namespace = await getNamespaceById(user_id);

        const innerObject = {
            namespace: namespace,
            filter: {
                source: { $in: [...filenames] },
            },
        };
        const deleteIndex = await index._delete({
            deleteRequest: innerObject,
        });
        console.log("deleteIndex is : ", deleteIndex);

        const qDeleteFiles = `
            DELETE
            FROM ${UPLOADLIST_TABLE}
            WHERE filename IN (?) AND user_id = ?`;
        connection.query(qDeleteFiles, [filenames, user_id], (err, result) => {
            if (err) throw err;
            for (let i = 0; i < filenames.length; i++) {
                const folderpath = "public/" + `${namespace}/`;
                fs.unlink(path.join(folderpath, filenames[i]), (err) => {
                    if (err) console.log("Error while deleting file : ", err);
                });
            }
            res.send({ response: true, result: result });
        });
    } catch (err) {
        console.log(err);
    }
};

export const setvisible = (req, res) => {
    try {
        console.log("setVisible called ----------");
        const { user_id, filename, visible } = req.body;
        console.log(user_id, filename, visible);
        const qUpdateOne = `
            UPDATE ${UPLOADLIST_TABLE}
            SET visible=?
            WHERE user_id=? AND filename=?`;
        connection.query(
            qUpdateOne,
            [visible, user_id, filename],
            (err, result) => {
                if (err) throw err;
                res.send({ response: true, result: result });
            }
        );
    } catch (err) {
        console.log(err);
    }
};

export const getlist = async (user_id) => {
    try {
        console.log("getlist called -------------");
        console.log("userid is : ", user_id);
        const res1 = await new Promise((resolve, reject) => {
            const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE id=?`;
            connection.query(qFineOne, [user_id], async (err, result) => {
                resolve(result);
            });
        });
        const qFineOne = `
                SELECT *  
                FROM ${UPLOADLIST_TABLE}  
                WHERE ${
                    res1[0].sharedtome == null || res1[0].sharedtome == "[]"
                        ? "user_id=?"
                        : `user_id=? OR id IN (${JSON.parse(res1[0].sharedtome)
                              .filter((item) => item.status == "Accepted")
                              .map((item) => item.docid)
                              .join()})`
                }`;
        const res = await new Promise((resolve, reject) => {
            connection.query(qFineOne, [user_id], (err, result) => {
                if (err) throw err;
                resolve(result);
            });
        });
        if (res.length == 0) {
            console.log("error to get user info");
            return [];
        } else {
            console.log(res);
            return res;
        }
    } catch (err) {
        console.log(err);
    }
};

export const getNamespace = async (email, type) => {
    try {
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email=? AND type=?`;
        const result = await new Promise((resolve, reject) => {
            connection.query(qFineOne, [email, type], (err, result) => {
                if (err) throw err;
                resolve(result);
            });
        });
        if (result.length === 0) {
            console.log("error to get user info");
            return "error";
        } else {
            console.log(result[0].namespace);
            return result[0].namespace;
        }
    } catch (err) {
        console.log(err);
        return "error";
    }
};

export const exist = async (req, res) => {
    console.log("exist called -------------");
    const { user_id, filename } = req.body;
    console.log(user_id, filename);
    const qFineOne = `
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id=? AND filename=?`;
    connection.query(qFineOne, [user_id, filename], (err, result) => {
        if (result.length === 0) res.status(200).json({ result: "nonexist" });
        else res.status(200).json({ result: "exist" });
    });
};

export async function getFileNamesFromIDs(ids) {
    return new Promise((resolve, rejct) => {
        let idList = ids.join(", ");
        let sqlQuery = `SELECT * FROM ${UPLOADLIST_TABLE} WHERE id IN (${idList});`;

        connection.query(sqlQuery, function (err, result, fields) {
            if (err) throw err;
            let names = result.map((row) => row.filename);
            console.log(names);
            resolve(names);
        });
    });
}
