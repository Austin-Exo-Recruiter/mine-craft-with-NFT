import { Server } from "socket.io";
import { socketChat, summarizeChat } from "../pinecone/chat.js";

class SocketServer {
    constructor(server) {
        this._io = new Server(server, {
            cors: {
                origin: "*",
            },
        });
        this.listen();
    }

    listen = () => {
        this._io.on("connection", (socket) => {
            // Get socket id and sub from client, then store to redis
            const socketId = socket.id;
            // remove sub from redis once disconnect
            console.log("socket has connected -----------");
            console.log(socketId);
            socket.on("chat", (data) => {
                if (typeof data === "undefined") return;
                console.log("socket chat called ----------");
                console.log(data);
                socketChat(
                    data,
                    (res) => {
                        this._io.to(socket.id).emit("response", res);
                    },
                    (response) => {
                        this._io.to(socket.id).emit("end", response);
                    }
                );
            });
            socket.on("summarize", (data) => {
                if (typeof data === "undefined") return;
                console.log("socket chat called ----------");
                console.log(data);
                summarizeChat(
                    data,
                    (res) => {
                        this._io.to(socket.id).emit("response", res);
                    },
                    (response) => {
                        this._io.to(socket.id).emit("end", response);
                    }
                );
            });
        });

        if (this._io) {
            console.log("Running Socket Server is listening.");
        }
    };

    close = () => {
        this._io.on("end", (socket) => {
            socket.disconnect(0);
            console.info(new Date(), "[SocketServer]: Disconnect");
        });
    };

    get instance() {
        return this._io;
    }
}

export default SocketServer;
