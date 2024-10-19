import formidable from "formidable";
import fs, { readSync } from "fs";
import path, { resolve } from "path";
import mysql from "mysql";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { MYSQL_CONNECTION_URL } from "../../config.js";
import {
    AVATAR_PATH,
    HISTORY_TABLE,
    SESSION_TABLE,
    UPLOADLIST_TABLE,
    USER_TABLE,
} from "../../common/constants.js";
import { userInfo } from "os";
const connection = mysql.createConnection(MYSQL_CONNECTION_URL);
export const getConnection = () => {
    return connection;
};

export const updatePassword = async (req, res) => {
    console.log("updatePassword called ------------");
    const { userid, oldpassword, newpassword } = req.body;
    const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE id = ?`;
    await connection.query(qFineOne, [userid], async (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
            res.send({
                result: false,
                response: "No user with that id",
            });
            return;
        } else {
            if (result[0].password != oldpassword) {
                res.send({
                    result: false,
                    response: "Incorrect password",
                });
                return;
            } else {
                const qUpdateOne = `
                    UPDATE ${USER_TABLE}
                    SET password = ?
                    WHERE id = ?`;
                await connection.query(
                    qUpdateOne,
                    [newpassword, userid],
                    (err, result) => {
                        if (err) throw err;
                        console.log(result);
                        res.send({
                            result: true,
                            response: "Password updated successfully",
                        });
                    }
                );
            }
        }
    });
};

export const updateBio = async (req, res) => {
    console.log("updateBio called ------------");
    const { userid, firstname, lastname, role, usecase } = req.body;
    const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE id = ?`;
    await connection.query(qFineOne, [userid], async (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
            res.send({
                result: false,
                response: "No user with that id",
            });
            return;
        } else {
            const qUpdateOne = `
                    UPDATE ${USER_TABLE}
                    SET firstname = ?, lastname = ?, role = ?, usecase = ?
                    WHERE id = ?`;
            await connection.query(
                qUpdateOne,
                [firstname, lastname, role, usecase, userid],
                (err, result) => {
                    if (err) throw err;
                    console.log(result);
                    res.send({
                        result: true,
                        response: "Bio updated successfully",
                    });
                }
            );
        }
    });
};

export const updateEmail = async (req, res) => {
    console.log("updateEmail called ---------------");
    console.log("updateBio called ------------");
    const { userid, newemail } = req.body;
    const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE id = ?`;
    await connection.query(qFineOne, [userid], async (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
            res.send({
                result: false,
                response: "No user with that id",
            });
            return;
        } else {
            const qUpdateOne = `
                    UPDATE ${USER_TABLE}
                    SET newemail = ?
                    WHERE id = ?`;
            await connection.query(
                qUpdateOne,
                [userid, newemail],
                (err, result) => {
                    if (err) throw err;
                    console.log(result);
                    res.send({
                        result: true,
                        response: "Email updated successfully",
                    });
                }
            );
        }
    });
};

export const updateAvatar = async (req, res) => {
    console.log("updateAvatar called ---------------");
    try {
        const form = new formidable.IncomingForm();
        form.parse(req, async function (err, fields, files) {
            const { userid } = fields;
            const qFineOne = `
                SELECT *  
                FROM ${USER_TABLE}  
                WHERE id = ?`;
            await connection.query(qFineOne, [userid], async (err, result) => {
                if (err) throw err;
                saveAvatar(files.file, userid);
                res.json({
                    result: true,
                    response: "Avatar successfully uploaded",
                });
            });
        });
    } catch (err) {
        console.log("Error ---------", err);
        res.status(500).json({ result: false, response: err });
    }
};

export const ifCustomAvatar = async (req, res) => {
    console.log("ifCustomAvatar called ----------");
    try {
        const { userid } = req.body;
        const fullPath = path.resolve(AVATAR_PATH + `${userid}.png`);
        fs.access(fullPath, fs.constants.F_OK, (err) => {
            if (!err) {
                res.send({
                    result: true,
                    response: "Avatar exists",
                });
            } else {
                res.send({
                    result: false,
                    response: "Avatar not exists",
                });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

const saveAvatar = async (file, userid) => {
    try {
        const oldpath = file.filepath;
        const newpath = AVATAR_PATH + `${userid}.png`;
        console.log("oldpath : ", oldpath);
        const readStream = fs.createReadStream(oldpath);
        const fullPath = path.resolve(newpath);
        const writeStream = fs.createWriteStream(fullPath);
        const result = await readStream.pipe(writeStream);
        return result;
    } catch (err) {
        console.log("Error ----------- ", err);
        return "";
    }
};

export const closeacc = async (req, res) => {
    try {
        console.log("/api/closeacc called ---------------");
        const { id } = req.body;
        const qDeleteAll = `
            DELETE FROM ${USER_TABLE}  
            WHERE id = ?`;
        connection.query(qDeleteAll, [id], (err, result) => {
            if (err) {
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            const qDeleteAll = `
                DELETE FROM ${SESSION_TABLE}  
                WHERE userid = ?`;
            connection.query(qDeleteAll, [id], (err, result) => {
                if (err) {
                    res.send({
                        result: false,
                        response: err,
                    });
                    throw err;
                }
                const qDeleteAll = `
                    DELETE FROM ${UPLOADLIST_TABLE}  
                    WHERE user_id = ?`;
                connection.query(qDeleteAll, [id], (err, result) => {
                    if (err) {
                        res.send({
                            result: false,
                            response: err,
                        });
                        throw err;
                    }
                    res.send({
                        result: true,
                        response: "User closed successfully",
                    });
                });
            });
        });
    } catch (err) {
        res.send({
            result: false,
            response: err,
        });
        console.log(err);
    }
};

export const updatePhonenumber = async (req, res) => {
    try {
        console.log("/api/updatePhonenumber called ------------");
        console.log(req.body);
        const { id, phonenumber } = req.body;
        if (!isPossiblePhoneNumber(phonenumber)) {
            res.send({
                result: false,
                response: "Please input valid phoenumber",
            });
            return;
        }
        const qUpdateOne = `
            UPDATE ${USER_TABLE}
            SET phonenumber = ?
            WHERE id = ?`;
        connection.query(qUpdateOne, [phonenumber, id], (err, result) => {
            if (err) {
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            res.send({
                result: true,
                response: "Phoneumber updated successfully",
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
        throw err;
    }
};

export const addHistory = async (userid, action, detail) => {
    console.log("History updated -------------");
    const created_at = new Date();
    try {
        return new Promise((resolve, reject) => {
            const qInsertOne = `
            INSERT INTO  ${HISTORY_TABLE}
            (userid, action, detail, created_at)
            VALUES ( ?, ?, ?, ?)
            `;
            connection.query(
                qInsertOne,
                [userid, action, detail, created_at],
                (err, result) => {
                    if (err) {
                        resolve({
                            result: false,
                            response: err,
                        });
                        throw err;
                    }
                    resolve({
                        result: true,
                        response: "History successfully added",
                    });
                }
            );
        });
    } catch (err) {
        console.log(err);
        throw err;
    }
};

export const clearHistory = async (req, res) => {
    console.log("clearHistory called ----------");
    try {
        console.log(req.body);
        const { userid } = req.body;
        const qDeleteAll = `
            DELETE FROM ${HISTORY_TABLE}  
            WHERE id = ?`;
        connection.query(qDeleteAll, [userid], (err, result) => {
            if (err) {
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            res.send({
                result: true,
                response: "History cleared",
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
        throw err;
    }
};

export const changeNotificationVisible = async (req, res) => {
    console.log("changeNotificationSetting called --------");
    try {
        console.log(req.body);
        const { id } = req.body;
        const qUpdateOne = `
            UPDATE ${USER_TABLE}   
            SET notify_visible = CASE   
                WHEN notify_visible IS NULL OR notify_visible = 'true' THEN 'false'   
                ELSE 'true'  
            END   
            WHERE id = ?`;
        connection.query(qUpdateOne, [id], (err, result) => {
            if (err) {
                console.log(err);
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            console.log(result);
            res.send({
                result: true,
                response:
                    "Notificaion visible setting has changed successfully",
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
        throw err;
    }
};

export const getHistory = (req, res) => {
    console.log("getHistory called --------");
    try {
        console.log(req.body);
        const { id } = req.body;
        const qFindOne = `
            SELECT *  
            FROM ${HISTORY_TABLE}  
            WHERE userid = ?`;
        connection.query(qFindOne, [id], (err, result) => {
            if (err) {
                console.log(err);
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            res.send({
                result: true,
                response: result,
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
        throw err;
    }
};

export const getAllHistory = (req, res) => {
    console.log("getAllHistory called --------");
    try {
        // const qFindOne = ` SELECT JSON_OBJECT(
        //     'id', user.id,
        //     'history', (
        //         SELECT JSON_ARRAYAGG(
        //             JSON_OBJECT(
        //                 'id', history.id,
        //                 'userid', history.userid,
        //                 'action', history.action,
        //                 'detail', history.detail,
        //                 'created_at', history.created_at
        //             )
        //         )
        //         FROM history
        //         WHERE history.userid = user.id
        //     )
        // )
        // FROM user; `;
        const qFindOne = `                
            SELECT ${HISTORY_TABLE}.*   
            FROM ${HISTORY_TABLE}  
            INNER JOIN ${USER_TABLE} ON ${HISTORY_TABLE}.userid = ${USER_TABLE}.id`;
        connection.query(qFindOne, [], (err, result) => {
            if (err) {
                console.log(err);
                res.send({
                    result: false,
                    response: err,
                });
                throw err;
            }
            let grouped = result.reduce((r, a) => {
                r[a.userid] = [...(r[a.userid] || []), a];
                return r;
            }, {});

            let response = Object.entries(grouped).map(([userid, history]) => ({
                userid,
                history,
            }));
            res.send({
                result: true,
                response: response,
            });
        });
    } catch (err) {
        console.log(err);
        res.send({
            result: false,
            response: err,
        });
        throw err;
    }
};
