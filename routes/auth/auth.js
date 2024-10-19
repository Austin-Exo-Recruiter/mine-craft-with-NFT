import {
    MYSQL_CONNECTION_URL,
    SG_API_KEY,
    SG_FROM,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_FROM_PHONE_NUMBER,
} from "../../config.js";
import sgMail from "@sendgrid/mail";
import mysql from "mysql";
import crypto from "crypto";
import TwilioSDK from "twilio";
import { userInfo } from "os";
import { addHistory } from "../profile/profile.js";
import { ACTION_LOGIN, ACTION_USER_CREATED } from "../../common/constants.js";
const connection = mysql.createConnection(MYSQL_CONNECTION_URL);
const client = TwilioSDK(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const getConnection = () => {
    return connection;
};

const USER_TABLE = "user";
const SESSION_TABLE = "session";

// There are three steps for creating profile using email and password
// status : "none", not created yet
// status : "email verified", email has verified but phone not verified yet
// status : "created", created with email and phone verified, but not completed profile
// status : "finished", created and complete profile
export async function email(req, res) {
    const { email, password } = req.body;
    const type = "email";
    const status = "none";
    const code = generateCode();
    const message = {
        to: email,
        from: `Adapa <${SG_FROM}>`,
        subject: "Verification Code",
        html: `Code is ${code}`,
    };
    sendMail(message);
    signup(email, password, code, status, type, res);
}

const signup = (email, password, code, status, type, res) => {
    try {
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email = ? AND type=?`;
        connection.query(qFineOne, [email, type], (err, result) => {
            if (err) throw err;
            if (result.length === 0) {
                console.log("not found");
                const qInsertOne = `
                INSERT INTO  ${USER_TABLE}
                (email, password, code, status,type)
                VALUES ( ?, ?, ?, ?, ?)
                `;
                connection.query(
                    qInsertOne,
                    [email, password, code, status, type],
                    (err, result) => {
                        if (err) throw err;
                        console.log("result is : ", result);
                        res.send({
                            response: true,
                            msg: "verification code sent to new email",
                            userid: result.insertId,
                        });
                        return;
                    }
                );
            } else {
                console.log("exits");
                if (result[0].status == "finished") {
                    res.send({ response: false, msg: "already created" });
                    return;
                }
                const qUpdateOne = `
                    UPDATE ${USER_TABLE}
                    SET email=?, password=?, code=?, status=?, type=?
                    WHERE email=? AND type=?`;
                connection.query(
                    qUpdateOne,
                    [email, password, code, status, type, email, type],
                    (err, result) => {
                        if (err) throw err;
                        console.log("result is : ", result);
                    }
                );
                res.send({
                    response: true,
                    msg: "verification code sent to exist email",
                    userid: result[0].id,
                });
                return;
            }
        });
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
};

export async function resendcode(req, res) {
    try {
        const { email } = req.body;
        const newcode = generateCode();
        const message = {
            to: email,
            from: `Adapa <${SG_FROM}>`,
            subject: "Verification Code",
            html: `Code is ${newcode}`,
        };
        sendMail(messag);
        updateCode(email, newcode, res);
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
}

const updateCode = (email, code, res) => {
    try {
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email = ?`;
        connection.query(qFineOne, [email], (err, result) => {
            if (err) throw err;
            if (result.length === 0) {
                res.send({
                    response: false,
                    msg: "not found that email, please register",
                });
            } else {
                if (result[0].status == "created") {
                    res.send({ response: false, msg: "already created" });
                    return;
                }
                const qUpdateOne = `
                UPDATE ${USER_TABLE}
                SET code=?
                WHERE email=?`;
                connection.query(qUpdateOne, [code, email], (err, result) => {
                    if (err) throw err;
                    console.log("result is : ", result);
                });
                res.send({ response: true, msg: "verification code resent" });
                return;
            }
        });
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
};

export async function verifycode(req, res) {
    const { email, code } = req.body;
    verify(email, code, res);
}

const verify = (email, code, res) => {
    try {
        const status = "none";
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email = ? AND code = ? AND status = ? `;
        connection.query(qFineOne, [email, code, status], (err, result) => {
            if (err) throw err;
            if (result.length === 0) {
                res.send({
                    response: false,
                    msg: "failed to verify, code is different",
                });
                return;
            } else {
                const status = "email verified";
                const qUpdateOne = `
               UPDATE ${USER_TABLE}
               SET status=?
               WHERE email=?`;
                connection.query(qUpdateOne, [status, email], (err, result) => {
                    if (err) throw err;
                    console.log("result is : ", result);
                });
                res.send({ response: true, msg: "successfully created" });
                return;
            }
        });
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
};

export async function createprofile(req, res) {
    try {
        console.log("createprofile called ------------");
        const { email, password, firstname, lastname, role, usecase, type } =
            req.body;
        if (type == "google" || type == "github") {
            const namespace = createRandomNamespace();
            const qInsertOne = `
            INSERT INTO  ${USER_TABLE}
            (email, type, namespace, firstname, lastname, role, usecase )
            VALUES ( ?, ?, ?, ?, ?, ?, ?)
            `;
            connection.query(
                qInsertOne,
                [email, type, namespace, firstname, lastname, role, usecase],
                async (err, result) => {
                    if (err) throw err;
                    console.log("result is : ", result);
                    await addHistory(
                        result.insertId,
                        ACTION_USER_CREATED,
                        "Profile created"
                    );
                    res.send({
                        response: true,
                        msg: "Social profile created successfully",
                    });
                }
            );
        } else {
            const status = "finished";
            const qFineOne = `
                SELECT *  
                FROM ${USER_TABLE}  
                WHERE email=? AND password=?`;
            connection.query(qFineOne, [email, password], (err, result) => {
                if (err) throw err;
                if (result.length === 0) {
                    res.send({
                        response: false,
                        msg: "email or password incorrect",
                    });
                    return;
                } else {
                    const namespace = createRandomNamespace();
                    const qUpdateOne = `
                        UPDATE ${USER_TABLE}
                        SET firstname=?, lastname=?, role=?, usecase=?, status=?, namespace=?
                        WHERE email=? AND password=?`;
                    connection.query(
                        qUpdateOne,
                        [
                            firstname,
                            lastname,
                            role,
                            usecase,
                            status,
                            namespace,
                            email,
                            password,
                        ],
                        async (err, result) => {
                            if (err) throw err;
                            const qFindOne = `
                            SELECT id FROM ${USER_TABLE}
                            WHERE email=? AND password=?`;
                            connection.query(
                                qFindOne,
                                [email, password],
                                async (err, result) => {
                                    console.log("result is : ", result[0].id);
                                    await addHistory(
                                        result[0].id,
                                        ACTION_USER_CREATED,
                                        `${email} has created`
                                    );
                                    res.send({
                                        response: true,
                                        msg: "profile successfully created",
                                    });
                                    return;
                                }
                            );
                        }
                    );
                    return;
                }
            });
        }
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
}

export const signin = (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email);
        console.log(password);
        const type = "email";
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email=? AND password=? AND type=?`;
        connection.query(
            qFineOne,
            [email, password, type],
            async (err, result) => {
                if (err) throw err;
                if (result.length === 0) {
                    res.send({
                        response: false,
                        msg: "email or password incorrect",
                    });
                    return;
                } else {
                    await addHistory(
                        result[0].id,
                        ACTION_LOGIN,
                        `${result[0].email} has logged in`
                    );
                    res.send({
                        response: true,
                        msg: "success fully logged in",
                        firstname: result[0].firstname,
                        lastname: result[0].lastname,
                        namespace: result[0].namespace,
                    });
                    return;
                }
            }
        );
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
};

export const signinsocial = (req, res) => {
    try {
        const { email, type } = req.body;
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email=? AND type=?`;
        connection.query(qFineOne, [email, type], async (err, result) => {
            if (err) throw err;
            if (result.length === 0) {
                res.send({
                    response: false,
                    msg: `Create social profile`,
                });
            } else {
                await addHistory(
                    result[0].id,
                    ACTION_LOGIN,
                    `${result[0].email} has logged in`
                );
                res.send({
                    response: true,
                    msg: `successfully logged in with ${email} as ${type}`,
                    namespace: result[0].namespace,
                    name: result[0].firstname + " " + result[0].lastname,
                });
                return;
            }
        });
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000);

const sendMail = (message) => {
    sgMail.setApiKey(SG_API_KEY);
    sgMail
        .send(message)
        .then((res) => {
            console.log(res);
        })
        .catch((err) => {
            console.log(err.response.body);
        });
};

const createRandomNamespace = () => {
    const hash = crypto
        .createHash("sha256")
        .update(crypto.randomBytes(32))
        .digest("hex");
    return hash;
};

export const connectDatabase = async () => {
    connection.connect((err) => {
        if (err) throw err;
        console.log("MySQL db connected");
    });
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

export const getNamespaceById = async (user_id) => {
    try {
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE id=?`;
        const result = await new Promise((resolve, reject) => {
            connection.query(qFineOne, [user_id], (err, result) => {
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

export const getuserid = async (req, res) => {
    try {
        const { email, type } = req.body;
        console.log(email, type);
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email=? AND type=?`;
        connection.query(qFineOne, [email, type], (err, result) => {
            if (err) throw err;
            if (result.length == 0) {
                console.log("error to get user info");
                res.send({ response: false, result: "user not found" });
            } else {
                res.send({ response: true, result: result[0].id });
            }
        });
    } catch (err) {
        console.log(err);
        return "error";
    }
};

export const getdocshow = (req, res) => {
    console.log("getdocshow called -----------");
    try {
        const { user_id } = req.body;
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE id=?`;
        connection.query(qFineOne, [user_id], (err, result) => {
            if (err) throw err;
            if (result.length == 0) {
                console.log("error to get docshow");
                res.send({ response: false, result: "user not found" });
            } else {
                res.send({ response: true, result: result[0].docshow });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const setdocshow = (req, res) => {
    console.log("setdocshow called -----------");
    try {
        const { user_id, docshow } = req.body;
        const qUpdateOne = `
                UPDATE ${USER_TABLE}
                SET docshow=?
                WHERE id=?`;
        connection.query(qUpdateOne, [docshow, user_id], (err, result) => {
            if (err) throw err;
            console.log("result is : ", result);
        });
        res.send({
            response: true,
            result: `updated docshow is ${docshow}`,
        });
        return;
    } catch (err) {
        console.log(err);
    }
};

export const sendsms = (req, res) => {
    console.log("sendsms called ------------");
    try {
        const smscode = generateCode();
        const { phonenumber, user_id } = req.body;
        const status = "email verified";
        console.log(smscode);
        client.messages
            .create({
                to: phonenumber,
                from: TWILIO_FROM_PHONE_NUMBER,
                body: `Verification code is : ${smscode}`,
            })
            .then((msg) => {
                const qUpdateOne = `
                    UPDATE ${USER_TABLE}
                    SET smscode=?, phonenumber=?
                    WHERE id=? AND status=?
                `;
                connection.query(
                    qUpdateOne,
                    [smscode, phonenumber, user_id, status],
                    (err, result) => {
                        if (err) throw err;
                        if (result.changedRows == 0) {
                            res.send({
                                response: false,
                                msg: "Failed to send SMS verification code",
                            });
                            return;
                        } else {
                            res.send({
                                response: true,
                                msg: "SMS verification code successfully sent !",
                            });
                            return;
                        }
                    }
                );
            });
    } catch (err) {
        console.log(err);
    }
};

export const checksms = (req, res) => {
    console.log("checksms has called -----------");
    try {
        const { user_id, smscode } = req.body;
        const status = "email verified";
        const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE id=? AND status=? 
        `;
        connection.query(qFineOne, [user_id, status], (err, result) => {
            if (err) throw err;
            if (result.length == 1) {
                const qFineOne = `
                    SELECT *  
                    FROM ${USER_TABLE}  
                    WHERE id=? AND smscode=? 
                `;
                connection.query(
                    qFineOne,
                    [user_id, smscode],
                    (err, result) => {
                        if (err) throw err;
                        if (result.length == 0) {
                            res.send({
                                response: false,
                                msg: "Verification code is incorrect",
                            });
                        } else {
                            const status = "created";
                            const qUpdateOne = `
                                UPDATE ${USER_TABLE}
                                SET status=?
                                WHERE id=?
                            `;
                            connection.query(
                                qUpdateOne,
                                [status, user_id],
                                (err, result) => {
                                    if (err) throw err;
                                    res.send({
                                        response: true,
                                        msg: "Successfully verified",
                                    });
                                }
                            );
                        }
                    }
                );
            } else {
                res.send({
                    response: false,
                    msg: "Failed",
                });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const recpasswd = async (req, res) => {
    console.log("recpasswd has called -----------");
    try {
        const { email, rectype } = req.body;

        const type = "email";
        const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE email=? AND type=? 
        `;
        connection.query(qFineOne, [email, type], async (err, result) => {
            if (err) throw err;
            if (result.length == 1) {
                console.log(result[0]);
                const reccode = generateCode();
                if (rectype == "email") {
                    const message = {
                        to: result[0].email,
                        from: `Adapa <${SG_FROM}>`,
                        subject: "Verification Code",
                        html: `Recovery passcode is ${reccode}`,
                    };
                    sendMail(message);
                    updateRecCode(email, reccode, res, rectype);
                    return;
                } else if (rectype == "phone") {
                    const phonenumber = result[0].phonenumber;
                    await client.messages.create({
                        to: phonenumber,
                        from: TWILIO_FROM_PHONE_NUMBER,
                        body: `Your recovery code is : ${reccode}`,
                    });
                    updateRecCode(email, reccode, res, rectype);
                    return;
                } else {
                    res.send({
                        response: false,
                        msg: "Recovery method must be Phone or Email",
                    });
                    return;
                }
                return;
            } else {
                res.send({
                    response: false,
                    msg: "Not found user with that email",
                });
                return;
            }
        });
    } catch (err) {
        console.log(err);
    }
};

const updateRecCode = (email, reccode, res, rectype) => {
    try {
        const type = "email";
        const qFineOne = `
        SELECT *  
        FROM ${USER_TABLE}  
        WHERE email = ? AND type = ?`;
        connection.query(qFineOne, [email, type], (err, result) => {
            if (err) throw err;
            if (result.length === 0) {
                res.send({
                    response: false,
                    msg: "Not found that email, please register",
                });
            } else {
                const qUpdateOne = `
                    UPDATE ${USER_TABLE}
                    SET reccode = ?
                    WHERE email = ? AND type = ?`;
                connection.query(
                    qUpdateOne,
                    [reccode, email, type],
                    (err, result) => {
                        if (err) throw err;
                        console.log("result is : ", result);
                    }
                );
                res.send({
                    response: true,
                    msg:
                        rectype == "email"
                            ? `Recovery code resent to ${email}`
                            : `Recovery code resent to ${result[0].phonenumber}`,
                });
                return;
            }
        });
    } catch (err) {
        console.log(err);
        res.send({ response: false, msg: err });
    }
};

export const checkrecpasswd = async (req, res) => {
    console.log("checkrecpasswd has called -----------");
    try {
        const { email, reccode } = req.body;
        const type = "email";
        const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE email=? AND type=? 
        `;
        connection.query(qFineOne, [email, type], async (err, result) => {
            if (err) throw err;
            if (result.length == 1) {
                console.log(result[0]);
                if (result[0].reccode == reccode) {
                    const recstatus = "verified";
                    const qUpdateOne = `
                        UPDATE ${USER_TABLE}
                        SET recstatus=?
                        WHERE email=? AND type=?`;
                    connection.query(
                        qUpdateOne,
                        [recstatus, email, type],
                        (err, result) => {
                            if (err) throw err;
                            console.log(result);
                            res.send({
                                response: true,
                                msg: "Successfully verified",
                            });
                            return;
                        }
                    );
                } else {
                    res.send({
                        response: false,
                        msg: "Recovery code is incorrect",
                    });
                }
            } else {
                res.send({
                    response: false,
                    msg: "Not found user with that email",
                });
                return;
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const updatepasswd = async (req, res) => {
    try {
        const { email, password } = req.body;
        const type = "email";
        const recstatus = "verified";
        const qFineOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE email=? AND type=? 
        `;
        connection.query(qFineOne, [email, type], async (err, result) => {
            if (err) throw err;
            if (result.length == 1) {
                if (result[0].recstatus == recstatus) {
                    const updatedRecstatus = "updated";
                    const qUpdateOne = `
                            UPDATE ${USER_TABLE}
                            SET password=?, recstatus=?
                            WHERE email=? AND type=?`;
                    connection.query(
                        qUpdateOne,
                        [password, updatedRecstatus, email, type],
                        (err, result) => {
                            if (err) throw err;
                            console.log("result is : ", result);
                            res.send({
                                response: true,
                                msg: "Password updated succssfully",
                            });
                        }
                    );
                } else {
                    res.send({
                        response: false,
                        msg: "You need to verify recovery code first",
                    });
                }
            } else {
                res.send({
                    response: false,
                    msg: "Not found user with that email",
                });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const getSession = (req, res) => {
    console.log("getSession called ----------");
    try {
        const { appid } = req.body;
        const curTime = new Date();
        const qFindOne = `
            SELECT *  
            FROM ${SESSION_TABLE}  
            WHERE appid = ? 
        `;
        connection.query(qFindOne, [appid], async (err, result) => {
            if (err) throw err;
            if (result.length == 1) {
                const created_at = new Date(result[0].created_at);
                created_at.setDate(created_at.getDate() + 7);
                console.log(created_at);
                if (curTime > created_at) {
                    res.send({
                        response: false,
                        msg: "Session not exist",
                    });
                } else {
                    const qFindOne = `
                    SELECT *  
                    FROM ${USER_TABLE}  
                    WHERE id = ? `;
                    connection.query(
                        qFindOne,
                        [result[0].userid],
                        (err, result) => {
                            if (err) throw err;
                            const qUpdateOne = `
                                UPDATE ${SESSION_TABLE}
                                SET created_at=?
                                WHERE appid=?`;
                            connection.query(
                                qUpdateOne,
                                [curTime, appid],
                                (err, result2) => {
                                    if (err) throw err;
                                    res.send({
                                        response: true,
                                        msg: "Session exist",
                                        user: result[0],
                                    });
                                }
                            );
                        }
                    );
                }
            } else {
                res.send({
                    response: false,
                    msg: "Session not exist",
                });
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const saveSession = (req, res) => {
    console.log("saveSession called --------");
    try {
        const { appid, userid } = req.body;
        const created_at = new Date();
        const qFindOne = `
            SELECT *  
            FROM ${SESSION_TABLE}  
            WHERE appid = ?`;
        connection.query(qFindOne, [appid], (err, result) => {
            if (err) throw err;
            if (result.length == 0) {
                const qInsertOne = `
                    INSERT INTO  ${SESSION_TABLE}
                    (appid, userid, created_at)
                    VALUES ( ?, ?, ?)`;
                connection.query(
                    qInsertOne,
                    [appid, userid, created_at],
                    (err, result) => {
                        if (err) throw err;
                        res.send({
                            response: true,
                            msg: "Session created",
                        });
                    }
                );
            } else {
                const qUpdateOne = `
                    UPDATE ${SESSION_TABLE}
                    SET appid=?, userid=?, created_at=?
                    WHERE appid=?`;
                connection.query(
                    qUpdateOne,
                    [appid, userid, created_at, appid],
                    (err, result) => {
                        if (err) throw err;
                        res.send({
                            response: true,
                            msg: "Sesssion updated",
                        });
                    }
                );
            }
        });
    } catch (err) {
        console.log(err);
    }
};

export const deleteSession = (req, res) => {
    console.log("deleteSession called ---------");
    const { appid } = req.body;
    const qFindOne = `
        SELECT *  
        FROM ${SESSION_TABLE}  
        WHERE appid = ?`;
    connection.query(qFindOne, [appid], (err, result) => {
        if (err) throw err;
        if (result.length == 0) {
            res.send({
                response: false,
                msg: "Sesssion not found",
            });
        } else {
            const qDeleteOne = `
                DELETE
                FROM ${SESSION_TABLE}
                WHERE appid = ? `;
            connection.query(qDeleteOne, [appid], (err, result) => {
                if (err) throw err;
                res.send({
                    response: true,
                    msg: "Session deleted",
                });
            });
        }
    });
};

export const getuseremail = (req, res) => {
    console.log("geetueremail called ---------");
    try {
        const { id } = req.body;
        const qFindOne = `
            SELECT *  
            FROM ${USER_TABLE}  
            WHERE id = ?`;
        connection.query(qFindOne, [id], (err, result) => {
            res.send({
                result: true,
                response: result[0].email,
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
