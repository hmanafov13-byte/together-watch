const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const PORT = process.env.PORT || 3000;

/*
=========================================================
DIRECTORIES
=========================================================
*/

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, {
        recursive: true
    });
}

/*
=========================================================
MULTER - MP4 UPLOAD
=========================================================
*/

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },

    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const safeName =
            path
                .basename(
                    file.originalname,
                    path.extname(file.originalname)
                )
                .replace(/[^a-zA-Z0-9-_]/g, "_")
                .substring(0, 60);

        const uniqueName =
            `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 10)}-${safeName}${extension}`;

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 2 * 1024 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {
        const extension =
            path.extname(file.originalname).toLowerCase();

        if (extension !== ".mp4") {
            return cb(
                new Error("Yalnız MP4 fayllarına icazə verilir.")
            );
        }

        cb(null, true);
    }
});

/*
=========================================================
MIDDLEWARE
=========================================================
*/

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

/*
=========================================================
MP4 FILES
=========================================================
*/

app.use(
    "/uploads",
    express.static(uploadsDir, {
        setHeaders: (res, filePath) => {
            res.setHeader(
                "Accept-Ranges",
                "bytes"
            );

            res.setHeader(
                "Cache-Control",
                "public, max-age=3600"
            );
        }
    })
);

/*
=========================================================
ROOM STORAGE
=========================================================
*/

const rooms = new Map();

/*
room structure:

{
    hostId: "...",

    video: {
        type: "youtube" | "mp4",

        videoId: "",
        videoUrl: "",

        title: "",

        playing: false,
        currentTime: 0,
        updatedAt: timestamp
    }
}
*/

/*
=========================================================
HELPERS
=========================================================
*/

function createRoomId() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let id = "";

    for (let i = 0; i < 6; i++) {
        id +=
            chars[
                Math.floor(
                    Math.random() * chars.length
                )
            ];
    }

    if (rooms.has(id)) {
        return createRoomId();
    }

    return id;
}

function extractYouTubeId(url) {
    if (!url) return null;

    url = url.trim();

    const normal = url.match(
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
    );

    if (normal) {
        return normal[1];
    }

    const short = url.match(
        /youtu\.be\/([a-zA-Z0-9_-]{11})/
    );

    if (short) {
        return short[1];
    }

    const embed = url.match(
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    );

    if (embed) {
        return embed[1];
    }

    return null;
}

/*
=========================================================
GET CURRENT VIDEO STATE
=========================================================
*/

function getCurrentVideoState(room) {
    if (!room || !room.video) {
        return null;
    }

    const video = {
        ...room.video
    };

    /*
    Əgər film oynayırsa,
    serverdə saxlanan vaxtdan indiki vaxta qədər
    keçən müddəti əlavə edirik.
    */

    if (video.playing) {
        const elapsed =
            (Date.now() - video.updatedAt) / 1000;

        video.currentTime =
            Math.max(
                0,
                video.currentTime + elapsed
            );
    }

    return video;
}

/*
=========================================================
CREATE ROOM API
=========================================================
*/

app.post(
    "/api/create-room",
    (req, res) => {

        const roomId =
            createRoomId();

        rooms.set(roomId, {

            hostId: null,

            video: {

                type: null,

                videoId: "",

                videoUrl: "",

                title: "Film seçilməyib",

                playing: false,

                currentTime: 0,

                updatedAt: Date.now()
            }
        });

        res.json({
            success: true,
            roomId
        });
    }
);

/*
=========================================================
ROOM INFO
=========================================================
*/

app.get(
    "/api/room/:roomId",
    (req, res) => {

        const roomId =
            req.params.roomId.toUpperCase();

        const room =
            rooms.get(roomId);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Otaq tapılmadı."
            });
        }

        res.json({
            success: true,
            room: {
                ...room,
                video:
                    getCurrentVideoState(room)
            }
        });
    }
);

/*
=========================================================
MP4 UPLOAD
=========================================================
*/

app.post(
    "/api/upload-mp4",
    upload.single("video"),
    (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "MP4 faylı seçilməyib."
                });
            }

            const videoUrl =
                `/uploads/${req.file.filename}`;

            const originalName =
                path.basename(
                    req.file.originalname
                );

            res.json({
                success: true,

                videoUrl,

                title:
                    originalName
                        .replace(/\.mp4$/i, ""),

                fileName:
                    req.file.filename,

                size:
                    req.file.size
            });

        } catch (error) {

            console.error(
                "MP4 upload xətası:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "MP4 yüklənərkən xəta baş verdi."
            });
        }
    }
);

/*
=========================================================
UPLOAD ERROR
=========================================================
*/

app.use(
    (error, req, res, next) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "MP4 faylı çox böyükdür. Maksimum 2 GB."
                });
            }

            return res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }

        if (error) {

            return res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "Fayl yüklənmədi."
            });
        }

        next();
    }
);

/*
=========================================================
SOCKET CONNECTION
=========================================================
*/

io.on(
    "connection",
    (socket) => {

        console.log(
            "Yeni istifadəçi:",
            socket.id
        );

        /*
        -------------------------------------------------
        JOIN ROOM
        -------------------------------------------------
        */

        socket.on(
            "join-room",
            ({ roomId, username }) => {

                roomId =
                    String(
                        roomId || ""
                    ).toUpperCase();

                const room =
                    rooms.get(roomId);

                if (!room) {

                    socket.emit(
                        "room-error",
                        "Bu otaq artıq mövcud deyil."
                    );

                    return;
                }

                socket.join(roomId);

                socket.data.roomId =
                    roomId;

                socket.data.username =
                    username || "Qonaq";

                /*
                İlk girən host olur
                */

                if (!room.hostId) {
                    room.hostId =
                        socket.id;
                }

                const users = [];

                const socketsInRoom =
                    io.sockets.adapter.rooms.get(
                        roomId
                    );

                if (socketsInRoom) {

                    for (
                        const socketId
                        of socketsInRoom
                    ) {

                        const connectedSocket =
                            io.sockets.sockets.get(
                                socketId
                            );

                        if (
                            connectedSocket
                        ) {

                            users.push({
                                id: socketId,

                                username:
                                    connectedSocket
                                        .data
                                        .username ||
                                    "Qonaq"
                            });
                        }
                    }
                }

                socket.emit(
                    "room-state",
                    {
                        video:
                            getCurrentVideoState(
                                room
                            ),

                        isHost:
                            room.hostId ===
                            socket.id
                    }
                );

                io.to(roomId).emit(
                    "users-update",
                    users
                );

                io.to(roomId).emit(
                    "system-message",
                    {
                        text:
                            `${socket.data.username} otağa qoşuldu 🌸`
                    }
                );

                console.log(
                    `${socket.data.username} ${roomId} otağına qoşuldu`
                );
            }
        );

        /*
        -------------------------------------------------
        VIDEO LOAD
        -------------------------------------------------
        */

        socket.on(
            "load-video",
            ({
                type,
                videoId,
                videoUrl,
                title
            }) => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) return;

                const room =
                    rooms.get(roomId);

                if (!room) return;

                /*
                Yalnız host film dəyişə bilər
                */

                if (
                    room.hostId !==
                    socket.id
                ) {
                    return;
                }

                if (
                    type !== "youtube" &&
                    type !== "mp4"
                ) {
                    return;
                }

                if (
                    type === "youtube" &&
                    !videoId
                ) {
                    return;
                }

                if (
                    type === "mp4" &&
                    !videoUrl
                ) {
                    return;
                }

                room.video = {

                    type,

                    videoId:
                        type === "youtube"
                            ? videoId
                            : "",

                    videoUrl:
                        type === "mp4"
                            ? videoUrl
                            : "",

                    title:
                        title ||
                        "Film",

                    playing: false,

                    currentTime: 0,

                    updatedAt:
                        Date.now()
                };

                io.to(roomId).emit(
                    "video-loaded",
                    room.video
                );
            }
        );

        /*
        -------------------------------------------------
        PLAY
        -------------------------------------------------
        */

        socket.on(
            "video-play",
            ({ currentTime }) => {

                const roomId =
                    socket.data.roomId;

                const room =
                    rooms.get(roomId);

                if (!room) return;

                if (
                    room.hostId !==
                    socket.id
                ) {
                    return;
                }

                room.video.playing =
                    true;

                room.video.currentTime =
                    Math.max(
                        0,
                        Number(currentTime) || 0
                    );

                room.video.updatedAt =
                    Date.now();

                socket
                    .to(roomId)
                    .emit(
                        "remote-play",
                        {
                            currentTime:
                                room.video
                                    .currentTime
                        }
                    );
            }
        );

        /*
        -------------------------------------------------
        PAUSE
        -------------------------------------------------
        */

        socket.on(
            "video-pause",
            ({ currentTime }) => {

                const roomId =
                    socket.data.roomId;

                const room =
                    rooms.get(roomId);

                if (!room) return;

                if (
                    room.hostId !==
                    socket.id
                ) {
                    return;
                }

                room.video.playing =
                    false;

                room.video.currentTime =
                    Math.max(
                        0,
                        Number(currentTime) || 0
                    );

                room.video.updatedAt =
                    Date.now();

                socket
                    .to(roomId)
                    .emit(
                        "remote-pause",
                        {
                            currentTime:
                                room.video
                                    .currentTime
                        }
                    );
            }
        );

        /*
        -------------------------------------------------
        SEEK
        -------------------------------------------------
        */

        socket.on(
            "video-seek",
            ({ currentTime }) => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) return;

                const room =
                    rooms.get(roomId);

                if (!room) return;

                if (
                    room.hostId !==
                    socket.id
                ) {
                    return;
                }

                room.video.currentTime =
                    Math.max(
                        0,
                        Number(currentTime) || 0
                    );

                room.video.updatedAt =
                    Date.now();

                socket
                    .to(roomId)
                    .emit(
                        "remote-seek",
                        {
                            currentTime:
                                room.video
                                    .currentTime
                        }
                    );
            }
        );

        /*
        -------------------------------------------------
        CHAT
        -------------------------------------------------
        */

        socket.on(
            "chat-message",
            ({ message }) => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) return;

                message =
                    String(
                        message || ""
                    ).trim();

                if (!message) return;

                if (
                    message.length > 500
                ) {
                    message =
                        message.substring(
                            0,
                            500
                        );
                }

                io.to(roomId).emit(
                    "chat-message",
                    {
                        username:
                            socket.data.username ||
                            "Qonaq",

                        message,

                        time:
                            new Date()
                                .toLocaleTimeString(
                                    "az-AZ",
                                    {
                                        hour:
                                            "2-digit",

                                        minute:
                                            "2-digit"
                                    }
                                )
                    }
                );
            }
        );

        /*
        -------------------------------------------------
        DISCONNECT
        -------------------------------------------------
        */

        socket.on(
            "disconnect",
            () => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) return;

                const room =
                    rooms.get(roomId);

                if (!room) return;

                /*
                Host çıxarsa yeni host seç
                */

                if (
                    room.hostId ===
                    socket.id
                ) {

                    const roomSockets =
                        io.sockets
                            .adapter
                            .rooms
                            .get(roomId);

                    if (
                        roomSockets &&
                        roomSockets.size > 0
                    ) {

                        room.hostId =
                            [
                                ...roomSockets
                            ][0];

                        const newHost =
                            io.sockets
                                .sockets
                                .get(
                                    room.hostId
                                );

                        if (newHost) {

                            newHost.emit(
                                "became-host"
                            );
                        }

                    } else {

                        room.hostId =
                            null;
                    }
                }

                /*
                İstifadəçi siyahısı
                */

                const users = [];

                const socketsInRoom =
                    io.sockets
                        .adapter
                        .rooms
                        .get(roomId);

                if (socketsInRoom) {

                    for (
                        const socketId
                        of socketsInRoom
                    ) {

                        const connectedSocket =
                            io.sockets
                                .sockets
                                .get(
                                    socketId
                                );

                        if (
                            connectedSocket
                        ) {

                            users.push({
                                id:
                                    socketId,

                                username:
                                    connectedSocket
                                        .data
                                        .username ||
                                    "Qonaq"
                            });
                        }
                    }
                }

                io.to(roomId).emit(
                    "users-update",
                    users
                );

                io.to(roomId).emit(
                    "system-message",
                    {
                        text:
                            `${socket.data.username || "Qonaq"} otaqdan çıxdı.`
                    }
                );

                /*
                Otaq boşdursa sil
                */

                if (
                    !socketsInRoom ||
                    socketsInRoom.size === 0
                ) {

                    rooms.delete(
                        roomId
                    );

                    console.log(
                        "Boş otaq silindi:",
                        roomId
                    );
                }
            }
        );
    }
);

/*
=========================================================
START
=========================================================
*/

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "===================================="
        );

        console.log(
            "       TOGETHER WATCH"
        );

        console.log(
            "===================================="
        );

        console.log("");

        console.log(
            `Server: http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            "MP4 upload: ENABLED"
        );

        console.log("");
    }
);