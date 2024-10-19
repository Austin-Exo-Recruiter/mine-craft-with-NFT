export const SOCKET_EVENT = {
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    MESSAGE: "message",
    SCAN_VOUCHER_SUCCESS: "scan_voucher_success",
    INBOX_NOTIFICATION: "inbox_notification",
    INBOX_ANNOUNCEMENT: "inbox_announcement",
};

export const DOCPATH = "public/";
export const AVATAR_PATH = "public/avatar/";

// Database Table Names
export const ADMIN_TABLE = "admin";
export const CHAT_TABLE = "chat";
export const MSG_TABLE = "msg";
export const SESSION_TABLE = "session";
export const UPLOADLIST_TABLE = "uploadlist";
export const USER_TABLE = "user";
export const HISTORY_TABLE = "history";
export const SLACK_TABLE = "slack";

// History Action Events
export const ACTION_USER_CREATED = "ACTION_USER_CREATED";
export const ACTION_CHAT = "ACTION_CHAT";
export const ACTION_LOGIN = "ACTION_LOGIN";
export const ACTION_UPLOAD_DOCUMENT = "ACTION_UPLOAD_DOCUMENT";
export const ACTION_DOWNLOAD_DOCUMENT = "ACTION_DOWNLOAD_DOCUMENT";
export const ACTION_UPDATE_URL = "ACTION_UPDATE_URL";
export const ACTION_SHARE_DOCUMENT = "ACTION_SHARE_DOCUMENT";
export const ACTION_ACCEPT_SHARE_DOCUMENT = "ACTION_ACCEPT_SHARE_DOCUMENT";
export const ACTION_DECLINE_SHARE_DOCUMENT = "ACTION_DECLINE_SHARE_DOCUMENT";
export const ACTION_CHANGE_SHARED_DOCUMENT_PERMISSION =
    "ACTION_CHANGE_SHARED_DOCUMENT_PERMISSION";

// Pinecone Name Space
export const PINECONE_ADAPA_NAMESPACE = "ADAPA";
