import { UserInfoContextImpl } from "twilio/lib/rest/oauth/v1/userInfo.js";
import { file } from "../../pinecone/file.js";
import { getConnection } from "../auth/auth.js";
import { addHistory } from "../profile/profile.js";
import {
    ACTION_ACCEPT_SHARE_DOCUMENT,
    ACTION_CHANGE_SHARED_DOCUMENT_PERMISSION,
    ACTION_DECLINE_SHARE_DOCUMENT,
    ACTION_SHARE_DOCUMENT,
    SLACK_TABLE,
} from "../../common/constants.js";
import { WebClient } from "@slack/web-api";

const UPLOADLIST_TABLE = "uploadlist";
const USER_TABLE = "user";

const connection = getConnection();

export const share = (req, res) => {
    console.log("/api/share called ----------");
    const { user_id, filename, email } = req.body;
    // verify if user with email exists
    const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email = ?`;
    connection.query(qFineOne, [email], (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
            res.send({
                response: false,
                result: "User with that email not found",
            });
            return;
        }
        for (let i = 0; i < result.length; i++) {
            if (result[i].id == user_id) {
                res.send({
                    response: false,
                    result: "Can not share your self",
                });
                return;
            }
        }
        const qUpdateOne = `
            UPDATE ${UPLOADLIST_TABLE}
            SET share=?
            WHERE user_id=? AND filename=?`;
        connection.query(
            qUpdateOne,
            [email, user_id, filename],
            (err, result) => {
                if (err) throw err;
                res.send({
                    response: true,
                    result: "Successfully add shared email",
                });
            }
        );
    });
    console.log(share);
    try {
    } catch (err) {
        console.log(err);
        res.send({ response: false, result: err });
    }
};

export const addshare = async (req, res) => {
    console.log("/api/addshare called -----------");
    try {
        const { user_id, filename, email, permission, downloadPermission } =
            req.body;
        let docid = "";
        const qFindOne2 = `
            SELECT *        
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id = ? AND filename = ?`;
        await connection.query(
            qFindOne2,
            [user_id, filename],
            async (err, result1) => {
                if (err) throw err;
                console.log("result.length : ", result1.length);
                console.log("result[0].id", result1[0].id);
                docid = result1[0].id;
                console.log("docid : ", docid);
                const qFindOne = `
                    SELECT *        
                    FROM ${USER_TABLE}  
                    WHERE email = ?`;
                await connection.query(
                    qFindOne,
                    [email],
                    async (err, result2) => {
                        if (err) throw err;
                        // Check validations
                        if (result2.length == 0) {
                            res.send({
                                response: false,
                                result: "User with that email not found",
                            });
                            return;
                        }
                        console.log(result2);
                        for (let i = 0; i < result2.length; i++) {
                            if (result2[i].id == user_id) {
                                console.log(i);
                                res.send({
                                    response: false,
                                    result: "Can not share your self",
                                });
                                return;
                            }
                            if (result2[i].sharedtome != null)
                                if (
                                    JSON.parse(result2[i].sharedtome).some(
                                        (item) => item.docid == docid
                                    )
                                ) {
                                    res.send({
                                        response: false,
                                        result: "Already shared to that email",
                                    });
                                    return;
                                }
                        }
                        // Add shared document to sharedbyme field
                        const qFindOne1 = `
                            SELECT *        
                            FROM ${USER_TABLE}  
                            WHERE id = ?`;
                        await connection.query(
                            qFindOne1,
                            [user_id],
                            async (err, result3) => {
                                if (err) throw err;
                                let filenames = [];
                                if (result3[0].sharedbyme == null) {
                                    filenames.push({
                                        docid,
                                        status: "Pending",
                                    });
                                } else {
                                    filenames = JSON.parse(
                                        result3[0].sharedbyme
                                    );
                                    if (
                                        !filenames.some(
                                            (filename) =>
                                                filename.docid == docid &&
                                                filename.status == "Pending"
                                        )
                                    )
                                        filenames.push({
                                            docid,
                                            status: "Pending",
                                        });
                                }
                                const qUpdateOne = `
                                    UPDATE ${USER_TABLE}
                                    SET sharedbyme = ?
                                    WHERE id=?`;
                                await connection.query(
                                    qUpdateOne,
                                    [JSON.stringify(filenames), user_id],
                                    (err, result) => {
                                        if (err) throw err;
                                        console.log(result);
                                    }
                                );
                            }
                        );
                        // Add shared document to sharedtome field
                        for (let j = 0; j < result2.length; j++) {
                            let sharedtome = [];
                            if (result2[j].sharedtome == null)
                                sharedtome.push({ docid, status: "Pending" });
                            else {
                                sharedtome = JSON.parse(result2[j].sharedtome);
                                if (
                                    !JSON.parse(result2[j].sharedtome).some(
                                        (filename) =>
                                            filename.docid == docid &&
                                            filename.status == "Pending"
                                    )
                                )
                                    sharedtome.push({
                                        docid,
                                        status: "Pending",
                                    });
                            }
                            const qUpdateOne = `
                                UPDATE ${USER_TABLE}
                                SET sharedtome=?
                                WHERE email=? AND id=?`;
                            await connection.query(
                                qUpdateOne,
                                [
                                    JSON.stringify(sharedtome),
                                    email,
                                    result2[j].id,
                                ],
                                (err, result) => {
                                    if (err) throw err;
                                }
                            );
                        }
                        // Add share document to sharedto field in uploadlist table
                        let sharedto = [];
                        if (result1[0].sharedto == null) {
                            console.log("null");
                            sharedto.push({
                                email: email,
                                permission,
                                downloadPermission,
                                status: "Pending",
                            });
                        } else {
                            console.log("not null");
                            sharedto = JSON.parse(result1[0].sharedto);
                            sharedto.push({
                                email,
                                permission,
                                downloadPermission,
                                status: "Pending",
                            });
                        }
                        const qUpdateOne = `
                            UPDATE ${UPLOADLIST_TABLE}
                            SET sharedto=?
                            WHERE id=?`;
                        await connection.query(
                            qUpdateOne,
                            [JSON.stringify(sharedto), docid],
                            (err, result) => {
                                if (err) throw err;
                            }
                        );
                        addNotify(email);
                        addHistory(
                            user_id,
                            ACTION_SHARE_DOCUMENT,
                            `${filename} has shared to ${email} with ${permission} permission`
                        );
                        res.send({
                            response: true,
                            result: `Successfully shared to \n ${email}`,
                        });
                    }
                );
            }
        );
    } catch (err) {
        console.log(err);
        res.send({
            response: false,
            result: err,
        });
    }
};

export const removeshare = async (req, res) => {
    console.log("/api/removeshare called -----------");
    try {
        const { user_id, filename, email } = req.body;
        let docid = "";
        const qFindOne2 = `  
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id = ? AND filename = ?`;
        await connection.query(
            qFindOne2,
            [user_id, filename],
            async (err, result1) => {
                if (err) throw err;
                docid = result1[0].id;
                const qFindOne = `  
                    SELECT *  
                    FROM ${USER_TABLE}  
                    WHERE email = ?`;
                await connection.query(
                    qFindOne,
                    [email],
                    async (err, result2) => {
                        if (err) throw err;
                        if (result2.length == 0) {
                            res.send({
                                response: false,
                                result: "User with that email not found",
                            });
                            return;
                        }

                        let sharedto = JSON.parse(result1[0].sharedto);
                        sharedto = sharedto.filter(
                            (share) => share.email !== email
                        );

                        const qUpdateOne = `  
                            UPDATE ${UPLOADLIST_TABLE}  
                            SET sharedto=?  
                            WHERE id=?`;
                        await connection.query(
                            qUpdateOne,
                            [JSON.stringify(sharedto), docid],
                            (err, result) => {
                                if (err) throw err;
                            }
                        );
                        if (sharedto.length == 0) {
                            const qFindOne1 = `  
                            SELECT *  
                            FROM ${USER_TABLE}  
                            WHERE id = ?`;
                            await connection.query(
                                qFindOne1,
                                [user_id],
                                async (err, result3) => {
                                    if (err) throw err;

                                    let sharedbyme = JSON.parse(
                                        result3[0].sharedbyme
                                    );
                                    sharedbyme = sharedbyme.filter(
                                        (item) => item.docid !== docid
                                    );

                                    const qUpdateOne = `  
                                    UPDATE ${USER_TABLE}  
                                    SET sharedbyme = ?  
                                    WHERE id=?`;
                                    await connection.query(
                                        qUpdateOne,
                                        [JSON.stringify(sharedbyme), user_id],
                                        (err, result) => {
                                            if (err) throw err;
                                        }
                                    );
                                }
                            );
                        }

                        for (let j = 0; j < result2.length; j++) {
                            let sharedtome = JSON.parse(result2[j].sharedtome);
                            sharedtome = sharedtome.filter(
                                (item) => item.docid !== docid
                            );

                            const qUpdateOne = `  
                                UPDATE ${USER_TABLE}  
                                SET sharedtome=?  
                                WHERE email=? AND id=?`;
                            await connection.query(
                                qUpdateOne,
                                [
                                    JSON.stringify(sharedtome),
                                    email,
                                    result2[j].id,
                                ],
                                (err, result) => {
                                    if (err) throw err;
                                }
                            );
                        }
                        await addHistory(
                            user_id,
                            ACTION_DECLINE_SHARE_DOCUMENT,
                            `${email} cancel ${filename} sharing`
                        );
                        res.send({
                            response: true,
                            result: "Successfully removed",
                        });
                    }
                );
            }
        );
    } catch (err) {
        console.log(err);
        res.send({
            response: false,
            result: err,
        });
    }
};

export const getshare = (req, res) => {
    console.log("/api/getshare called -----------");
    const { user_id, filename } = req.body;
    try {
        const qFineOne = `
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id = ? AND filename = ?`;
        connection.query(qFineOne, [user_id, filename], (err, result) => {
            if (err) throw err;
            if (result.length == 0) {
                res.send({
                    response: false,
                    result: "File not found",
                });
                return;
            }
            res.send({
                response: true,
                result:
                    result[0].sharedto == null
                        ? []
                        : JSON.parse(result[0].sharedto),
            });
            return;
        });
    } catch (err) {
        console.log(err);
    }
};

export const changePermission = async (req, res) => {
    console.log("/api/chagepermission called --------");
    const { user_id, filename, email, permission, downloadPermission } =
        req.body;
    const qFindOne1 = `
            SELECT *        
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id = ? AND filename = ?`;
    await connection.query(
        qFindOne1,
        [user_id, filename],
        async (err, result) => {
            if (err) throw err;
            const sharedto = JSON.parse(result[0].sharedto);
            for (let i = 0; i < sharedto.length; i++) {
                if (sharedto[i].email == email)
                    sharedto[i].permission = permission;
                sharedto[i].downloadPermission = downloadPermission;
            }
            const qUpdateOne = `
            UPDATE ${UPLOADLIST_TABLE}
            SET sharedto=?
            WHERE user_id = ? AND filename = ?`;
            await connection.query(
                qUpdateOne,
                [JSON.stringify(sharedto), user_id, filename],
                async (err, result) => {
                    if (err) throw err;
                    await addHistory(
                        user_id,
                        ACTION_CHANGE_SHARED_DOCUMENT_PERMISSION,
                        `Shared ${filename} permission in ${email} has changed to ${permission} `
                    );
                    res.send({
                        response: true,
                        result: "Permission updated successfully",
                    });
                    return;
                }
            );
        }
    );
};

export const getOwner = async (req, res) => {
    console.log("getOwner called -------");
    const { id } = req.body;
    console.log(req.body);
    const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE id=?`;
    connection.query(qFineOne, [id], (err, result) => {
        res.status(200).json({
            response: true,
            result: result[0],
        });
    });
};

const addNotify = async (email) => {
    console.log("addNotify is called -------");
    const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email = ?`;
    await connection.query(qFineOne, [email], async (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
            res.send({
                response: false,
                result: "User with that email not found",
            });
            return;
        }
        for (let i = 0; i < result.length; i++) {
            console.log(result[i].notify);
            let notify;
            if (result[i].notify == null) {
                notify = 0;
            } else notify = result[i].notify;
            notify++;
            const qUpdateOne = `
                UPDATE ${USER_TABLE}
                SET notify=?
                WHERE id=?`;
            await connection.query(
                qUpdateOne,
                [notify, result[i].id],
                (err, result) => {
                    if (err) throw err;
                }
            );
        }
        console.log("Notify has successfully added");
    });
};

export const removeNotify = async (req, res) => {
    console.log("removeNotify has called ------------");
    const { id } = req.body;
    console.log(req.body);
    const notify = 0;
    const qUpdateOne = `
        UPDATE ${USER_TABLE}
        SET notify=?
        WHERE id=?`;
    connection.query(qUpdateOne, [notify, id], (err, result) => {
        if (err) throw err;
        res.send({
            response: true,
            result: "Notify removed",
        });
    });
};

export const getNotify = async (req, res) => {
    console.log("getNotify called --------");
    const { id } = req.body;
    const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE id = ?`;
    await connection.query(qFineOne, [id], (err, result) => {
        if (err) throw err;
        res.send({
            response: true,
            result:
                result[0].notify_visible == false
                    ? 0
                    : result[0].notify == null
                    ? 0
                    : result[0].notify,
        });
    });
};

export const acceptshare = async (req, res) => {
    console.log("/api/accept called --------");
    try {
        const { user_id, filename, email } = req.body;
        const qFineOne = `
            SELECT *  
            FROM ${UPLOADLIST_TABLE}  
            WHERE user_id = ? AND filename = ?`;
        connection.query(
            qFineOne,
            [user_id, filename],
            async (err, result1) => {
                if (err) throw err;
                // change status to "Accepted" in UPLOADLIST_TABLE
                let sharedto = JSON.parse(result1[0].sharedto);
                sharedto = sharedto.map((share) => {
                    if (share.email == email) share.status = "Accepted";
                    return share;
                });
                const qUpdateOne = `  
                UPDATE ${UPLOADLIST_TABLE}  
                SET sharedto = ?  
                WHERE id = ?`;
                await connection.query(
                    qUpdateOne,
                    [JSON.stringify(sharedto), result1[0].id],
                    (err, result) => {
                        if (err) throw err;
                    }
                );
                // change status to "Accepted" in sharedbyme field in USER_TABLE"
                const qFineOne = `
                    SELECT *  
                    FROM ${USER_TABLE}  
                    WHERE id = ?`;
                connection.query(qFineOne, [user_id], (err, result2) => {
                    if (err) throw err;
                    let sharedbyme = JSON.parse(result2[0].sharedbyme);
                    sharedbyme = sharedbyme.map((item) => {
                        if (item.docid == result1[0].id) {
                            return {
                                docid: item.docid,
                                status: "Accepted",
                            };
                        } else return item;
                    });
                    const qUpdateOne = `
                        UPDATE ${USER_TABLE}
                        SET sharedbyme = ?
                        WHERE id=?`;
                    connection.query(
                        qUpdateOne,
                        [JSON.stringify(sharedbyme), user_id],
                        (err, result) => {
                            if (err) throw err;
                            console.log(result);
                        }
                    );
                });
                // change status to "Accepted" in sharedtome field in USER_TABLE"
                const qFineOne2 = `
                    SELECT *  
                    FROM ${USER_TABLE}  
                    WHERE email = ?`;
                connection.query(qFineOne2, [email], (err, result3) => {
                    if (err) throw err;
                    for (let i = 0; i < result3.length; i++) {
                        let sharedtome = JSON.parse(result3[i].sharedtome);
                        sharedtome = sharedtome.map((item) => {
                            if (item.docid == result1[0].id) {
                                return {
                                    docid: item.docid,
                                    status: "Accepted",
                                };
                            } else return item;
                        });
                        const qUpdateOne = `
                            UPDATE ${USER_TABLE}
                            SET sharedtome = ?
                            WHERE id=?`;
                        connection.query(
                            qUpdateOne,
                            [JSON.stringify(sharedtome), result3[i].id],
                            (err, result) => {
                                if (err) throw err;
                                console.log(result);
                            }
                        );
                    }
                });
            }
        );
        user_id, filename, email;
        await addHistory(
            user_id,
            ACTION_ACCEPT_SHARE_DOCUMENT,
            `${email} accept ${filename} sharing`
        );
        res.send({
            response: true,
            result: "Accept shared document",
        });
    } catch (err) {
        console.log(err);
    }
};

export const declineshare = async (req, res) => {
    console.log("declineshare called ----------");
};

export const getSlackHistory = async (req, res) => {
    console.log("getSlackHistory called --------");
    console.log(req.body);
    const { botUserToken, channelID } = req.body;
    const web = new WebClient(botUserToken);
    try {
        const response = await web.conversations.history({
            channel: channelID,
        });
        console.log(response.messages);
        res.json(response);

        // // const token = botUserToken;
        // // const web = new WebClient(token);

        // // async function getChatHistory(userId) {
        // //     try {
        // //         // Get the list of all conversations
        // //         const result = await web.conversations.list({ types: "im" });

        // //         let channelId = null;

        // //         // Use the 'members' field of the channel object to verify if the wanted user is a member of the channel
        // //         console.log(result.channels);
        // //         result.channels.forEach((channel) => {
        // //             if (channel.is_im && channel.user === userId) {
        // //                 channelId = channel.id;
        // //             }
        // //         });

        // //         if (channelId) {
        // //             // Get the conversation history
        // //             const history = await web.conversations.history({
        // //                 channel: channelId,
        // //             });

        // //             console.log(history);
        // //         } else {
        // //             console.log(
        // //                 `No direct message conversation found with user: ${userId}`
        // //             );
        // //         }
        //     } catch (error) {
        //         console.log("error : ", error);
        //     }
        // }

        // getChatHistory("U05V2L6S2RJ"); // replace with user1's ID
    } catch (err) {
        console.log(err);
        throw err;
    }
};

export const saveToken = async (req, res) => {
    console.log("/api/saveToken called --------");
    try {
        const { user_id, channel, token } = req.body;
        const qInsertOne = `
            INSERT IGNORE INTO ${SLACK_TABLE} (user_id, channel, token)  
            VALUES (?, ?,?);  
        `;
        connection.query(
            qInsertOne,
            [user_id, channel, token],
            (err, result) => {
                if (err) {
                    console.log(err);
                    throw err;
                }
                res.send({
                    result: "Token saved successfully",
                    response: result,
                });
            }
        );
    } catch (err) {
        console.log(err);
        throw err;
    }
};

export const removeToken = async (req, res) => {
    console.log("/api/removeToken called ---------");
    try {
        const { id } = req.body;
        const qDeleteOne = `
                DELETE
                FROM ${SLACK_TABLE}
                WHERE id = ? `;
        connection.query(qDeleteOne, [id], (err, result) => {
            if (err) {
                console.log(err);
                throw err;
            }
            res.send({
                msg: "Token removed successfully",
                response: result,
            });
        });
    } catch (err) {
        console.log(err);
        throw err;
    }
};
