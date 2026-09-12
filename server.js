const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");


/*
=========================================================
APP
=========================================================
*/

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

        const extension =
            path.extname(file.originalname).toLowerCase();

        const originalBaseName =
            path.basename(
                file.originalname,
                path.extname(file.originalname)
            );

        const safeName =
            originalBaseName
                .replace(/[^a-zA-Z0-9_-]/g, "_")
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

        fileSize:
            2 * 1024 * 1024 * 1024

    },

    fileFilter: (req, file, cb) => {

        const extension =
            path.extname(file.originalname).toLowerCase();

        if (extension !== ".mp4") {

            return cb(
                new Error(
                    "Yalnız MP4 fayllarına icazə verilir."
                )
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

app.use(express.json({
    limit: "10mb"
}));


app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/*
=========================================================
MP4 STATIC FILES
=========================================================
*/

app.use(
    "/uploads",

    express.static(
        uploadsDir,

        {
            setHeaders: (res) => {

                res.setHeader(
                    "Accept-Ranges",
                    "bytes"
                );

                res.setHeader(
                    "Cache-Control",
                    "public, max-age=3600"
                );

            }
        }
    )
);


/*
=========================================================
ROOM STORAGE
=========================================================

Room:

{
    hostId: "...",

    video: {

        type: "youtube" | "mp4" | null,

        videoId: "",

        videoUrl: "",

        title: "",

        playing: false,

        currentTime: 0,

        updatedAt: timestamp

    }
}

=========================================================
*/

const rooms = new Map();


/*
=========================================================
HELPERS
=========================================================
*/


/*
---------------------------------------------------------
CREATE ROOM ID
---------------------------------------------------------
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


/*
---------------------------------------------------------
YOUTUBE ID
---------------------------------------------------------
*/

function extractYouTubeId(url) {

    if (!url) {
        return null;
    }

    url = String(url).trim();

    let match;


    /*
    youtube.com/watch?v=
    */

    match = url.match(
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
    );

    if (match) {
        return match[1];
    }


    /*
    youtube.com/watch?...&v=
    */

    match = url.match(
        /youtube\.com\/watch\?[^#\s]*[?&]v=([a-zA-Z0-9_-]{11})/
    );

    if (match) {
        return match[1];
    }


    /*
    youtu.be
    */

    match = url.match(
        /youtu\.be\/([a-zA-Z0-9_-]{11})/
    );

    if (match) {
        return match[1];
    }


    /*
    youtube.com/embed
    */

    match = url.match(
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    );

    if (match) {
        return match[1];
    }


    /*
    youtube.com/shorts
    */

    match = url.match(
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    );

    if (match) {
        return match[1];
    }


    /*
    youtube.com/live
    */

    match = url.match(
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
    );

    if (match) {
        return match[1];
    }


    return null;
}


/*
---------------------------------------------------------
CURRENT VIDEO STATE
---------------------------------------------------------
*/

function getCurrentVideoState(room) {

    if (!room || !room.video) {
        return null;
    }

    const video = {
        ...room.video
    };


    /*
    Film oynayırsa,
    serverdəki vaxtın üstünə
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
---------------------------------------------------------
GET USERS
---------------------------------------------------------
*/

function getRoomUsers(roomId) {

    const users = [];

    const socketsInRoom =
        io.sockets.adapter.rooms.get(roomId);

    if (!socketsInRoom) {
        return users;
    }

    for (const socketId of socketsInRoom) {

        const connectedSocket =
            io.sockets.sockets.get(socketId);

        if (!connectedSocket) {
            continue;
        }

        users.push({

            id: socketId,

            username:
                connectedSocket.data.username ||
                "Qonaq"

        });

    }

    return users;
}


/*
---------------------------------------------------------
BROADCAST USERS
---------------------------------------------------------
*/

function broadcastUsers(roomId) {

    io.to(roomId).emit(
        "users-update",
        getRoomUsers(roomId)
    );

}


/*
=========================================================
HOME
=========================================================
*/

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


/*
=========================================================
CREATE ROOM
=========================================================
*/

app.post(
    "/api/create-room",
    (req, res) => {

        const roomId =
            createRoomId();

        rooms.set(
            roomId,

            {

                hostId: null,

                voiceUsers: new Set(),

                video: {

                    type: null,

                    videoId: "",

                    videoUrl: "",

                    title:
                        "Film seçilməyib",

                    playing: false,

                    currentTime: 0,

                    updatedAt:
                        Date.now()

                }

            }
        );


        res.json({

            success: true,

            roomId

        });

    }
);


/*
=========================================================
YOUTUBE SEARCH (link yapışdırmadan axtarış)
=========================================================

Rəsmi YouTube Data API açarı tələb etmədən,
YouTube-un axtarış səhifəsini oxuyub
içindəki nəticələri çıxarır.

Qeyd: Bu, YouTube-un ictimai səhifə strukturuna
əsaslanır. Əgər gələcəkdə YouTube öz səhifə
kodunu köklü şəkildə dəyişsə, bu funksiya
yenilənməyə ehtiyac duya bilər. Daha sabit/rəsmi
yol istəsən, buraya öz YouTube Data API v3
açarını əlavə edib eyni endpoint-i ona köçürə bilərsən.
*/

app.get(
    "/api/youtube-search",
    async (req, res) => {

        try {

            const query =
                String(req.query.q || "").trim();

            if (!query) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Axtarış üçün söz daxil et."

                });

            }

            const searchUrl =
                "https://www.youtube.com/results?search_query=" +
                encodeURIComponent(query) +
                "&hl=en&gl=US&persist_gl=1&persist_hl=1";

            const ytResponse =
                await fetch(searchUrl, {

                    headers: {

                        "User-Agent":
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",

                        "Accept-Language":
                            "en-US,en;q=0.9,az;q=0.8",

                        /*
                        Avropa/CIS IP-lərdən gələn
                        sorğularda YouTube "Cookie
                        razılığı" (consent) səhifəsi
                        göstərir və nəticələr əvəzinə
                        o səhifə qayıdır. Bu cookie
                        həmin divarı keçir.
                        */

                        "Cookie":
                            "CONSENT=YES+1; SOCS=CAI"

                    }

                });

            console.log(
                `[YT axtarış] "${query}" | status: ${ytResponse.status}`
            );

            if (!ytResponse.ok) {

                return res.status(502).json({

                    success: false,

                    message:
                        "YouTube-a qoşulmaq mümkün olmadı."

                });

            }

            const html =
                await ytResponse.text();

            console.log(
                `[YT axtarış] HTML uzunluğu: ${html.length}`
            );


            /*
            YouTube bəzən eyni datanı fərqli
            şəkillərdə yerləşdirir, ona görə
            bir neçə variantı yoxlayırıq.
            */

            const markers = [
                "var ytInitialData = ",
                "window[\"ytInitialData\"] = ",
                "ytInitialData = "
            ];

            let jsonStartIdx = -1;

            let markerUsed = null;

            for (const marker of markers) {

                const idx =
                    html.indexOf(marker);

                if (idx !== -1) {

                    jsonStartIdx =
                        idx + marker.length;

                    markerUsed = marker;

                    break;

                }

            }

            if (jsonStartIdx === -1) {

                const isConsentPage =
                    html.includes("consent.youtube.com") ||
                    html.includes("Before you continue");

                console.log(
                    "[YT axtarış] ytInitialData tapılmadı." +
                    (isConsentPage ?
                        " Səbəb: consent/cookie divarı." :
                        " Səbəb: naməlum (YouTube səhifə strukturu dəyişmiş ola bilər).")
                );

                return res.json({

                    success: true,

                    results: [],

                    debug:
                        isConsentPage ?
                            "consent-wall" :
                            "marker-not-found"

                });

            }

            console.log(
                `[YT axtarış] Marker tapıldı: "${markerUsed}"`
            );


            /*
            Marker-dən sonra gələn JSON obyektinin
            dəqiq sonunu tapmaq üçün mötərizələri
            sayırıq (yalnız ";</script>" axtarmaq
            hər zaman düz nəticə vermir).
            */

            function extractJsonObject(text, startIndex) {

                let depth = 0;

                let inString = false;

                let escapeNext = false;

                for (let i = startIndex; i < text.length; i++) {

                    const ch = text[i];

                    if (escapeNext) {
                        escapeNext = false;
                        continue;
                    }

                    if (ch === "\\") {
                        escapeNext = true;
                        continue;
                    }

                    if (ch === "\"") {
                        inString = !inString;
                        continue;
                    }

                    if (inString) {
                        continue;
                    }

                    if (ch === "{") {
                        depth++;
                    } else if (ch === "}") {

                        depth--;

                        if (depth === 0) {
                            return text.substring(startIndex, i + 1);
                        }

                    }

                }

                return null;

            }

            const firstBrace =
                html.indexOf("{", jsonStartIdx);

            const jsonString =
                firstBrace === -1 ?
                    null :
                    extractJsonObject(html, firstBrace);

            if (!jsonString) {

                console.log(
                    "[YT axtarış] JSON obyekti çıxarıla bilmədi."
                );

                return res.json({

                    success: true,

                    results: [],

                    debug: "json-extract-failed"

                });

            }

            let data;

            try {

                data =
                    JSON.parse(jsonString);

            } catch (parseError) {

                console.log(
                    "[YT axtarış] JSON.parse xətası:",
                    parseError.message
                );

                return res.json({

                    success: true,

                    results: [],

                    debug: "json-parse-failed"

                });

            }

            const results = [];

            try {

                const sections =
                    data
                        ?.contents
                        ?.twoColumnSearchResultsRenderer
                        ?.primaryContents
                        ?.sectionListRenderer
                        ?.contents || [];

                for (const section of sections) {

                    const items =
                        section
                            ?.itemSectionRenderer
                            ?.contents || [];

                    for (const item of items) {

                        const vr =
                            item.videoRenderer;

                        if (!vr || !vr.videoId) {
                            continue;
                        }

                        const title =
                            (vr.title?.runs || [])
                                .map((r) => r.text)
                                .join("") ||
                            "Adsız video";

                        const channel =
                            (vr.ownerText?.runs || [])
                                .map((r) => r.text)
                                .join("") || "";

                        const thumbs =
                            vr.thumbnail?.thumbnails ||
                            [];

                        const thumbnail =
                            thumbs.length ?
                                thumbs[thumbs.length - 1].url :
                                `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;

                        const duration =
                            vr.lengthText?.simpleText ||
                            "";

                        results.push({

                            videoId: vr.videoId,

                            title,

                            channel,

                            thumbnail,

                            duration

                        });

                        if (results.length >= 15) {
                            break;
                        }

                    }

                    if (results.length >= 15) {
                        break;
                    }

                }

            } catch (walkError) {

                console.error(
                    "YouTube nəticə oxuma xətası:",
                    walkError
                );

            }

            console.log(
                `[YT axtarış] Tapılan nəticə sayı: ${results.length}`
            );

            res.json({

                success: true,

                results

            });

        } catch (error) {

            console.error(
                "YouTube axtarış xətası:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Axtarış zamanı xəta baş verdi."

            });

        }

    }
);


/*
=========================================================
GET ROOM
=========================================================
*/

app.get(
    "/api/room/:roomId",
    (req, res) => {

        const roomId =
            String(
                req.params.roomId || ""
            ).toUpperCase();


        const room =
            rooms.get(roomId);


        if (!room) {

            return res.status(404).json({

                success: false,

                message:
                    "Otaq tapılmadı."

            });

        }


        res.json({

            success: true,

            room: {

                ...room,

                video:
                    getCurrentVideoState(
                        room
                    )

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

                    message:
                        "MP4 faylı seçilməyib."

                });

            }


            const videoUrl =
                `/uploads/${req.file.filename}`;


            const originalName =
                path.basename(
                    req.file.originalname
                );


            const title =
                originalName.replace(
                    /\.mp4$/i,
                    ""
                );


            res.json({

                success: true,

                videoUrl,

                title,

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
UPLOAD ERROR HANDLER
=========================================================
*/

app.use(
    (error, req, res, next) => {

        if (
            error instanceof multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(413).json({

                    success: false,

                    message:
                        "MP4 faylı maksimum 2 GB ola bilər."

                });

            }

        }


        if (error) {

            console.error(
                "Server xətası:",
                error
            );


            return res.status(400).json({

                success: false,

                message:
                    error.message ||
                    "Naməlum xəta baş verdi."

            });

        }


        next();

    }
);


/*
=========================================================
SOCKET.IO
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
        =================================================
        JOIN ROOM
        =================================================
        */

        socket.on(
            "join-room",
            ({ roomId, username }) => {

                roomId =
                    String(
                        roomId || ""
                    ).trim().toUpperCase();


                username =
                    String(
                        username || "Qonaq"
                    ).trim();


                if (!username) {
                    username = "Qonaq";
                }


                const room =
                    rooms.get(roomId);


                if (!room) {

                    socket.emit(
                        "room-error",
                        "Bu otaq artıq mövcud deyil."
                    );

                    return;

                }


                /*
                Socket room-a daxil olur
                */

                socket.join(roomId);


                socket.data.roomId =
                    roomId;

                socket.data.username =
                    username;


                /*
                İlk qoşulan host olur
                */

                if (!room.hostId) {

                    room.hostId =
                        socket.id;

                }


                /*
                Mövcud video state
                */

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


                /*
                User siyahısı
                */

                broadcastUsers(
                    roomId
                );


                /*
                Sistem mesajı
                */

                io.to(roomId).emit(
                    "system-message",
                    {

                        text:
                            `${username} otağa qoşuldu 🌸`

                    }
                );


                console.log(
                    `${username} ${roomId} otağına qoşuldu`
                );

            }
        );


        /*
        =================================================
        LOAD YOUTUBE
        =================================================
        */

        socket.on(
            "load-video",
            ({ videoId, title, videoUrl }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                videoId =
                    String(
                        videoId || ""
                    ).trim();


                /*
                YouTube ID yoxlaması
                */

                if (
                    !/^[a-zA-Z0-9_-]{11}$/.test(
                        videoId
                    )
                ) {

                    socket.emit(
                        "video-load-error",
                        "YouTube video ID düzgün deyil."
                    );

                    return;

                }


                room.video = {

                    type: "youtube",

                    videoId,

                    videoUrl:
                        videoUrl || "",

                    title:
                        title ||
                        "Birlikdə izlədiyimiz film 🎬",

                    playing: false,

                    currentTime: 0,

                    updatedAt:
                        Date.now()

                };


                io.to(roomId).emit(
                    "video-loaded",
                    room.video
                );


                console.log(
                    `YouTube yükləndi: ${videoId} | Room: ${roomId}`
                );

            }
        );


        /*
        =================================================
        GUEST -> HOST YOUTUBE REQUEST
        =================================================
        */

        socket.on(
            "request-load-video",
            ({ videoId, title, videoUrl }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                /*
                Host özü request göndərmir
                */

                if (
                    room.hostId ===
                    socket.id
                ) {

                    return;

                }


                videoId =
                    String(
                        videoId || ""
                    ).trim();


                if (
                    !/^[a-zA-Z0-9_-]{11}$/.test(
                        videoId
                    )
                ) {

                    socket.emit(
                        "video-request-error",
                        "YouTube linki düzgün deyil."
                    );

                    return;

                }


                const hostSocket =
                    io.sockets.sockets.get(
                        room.hostId
                    );


                if (!hostSocket) {

                    socket.emit(
                        "video-request-error",
                        "Host hazırda otaqda deyil."
                    );

                    return;

                }


                hostSocket.emit(
                    "video-load-request",
                    {

                        videoId,

                        videoUrl:
                            videoUrl || "",

                        title:
                            title ||
                            "Birlikdə izlədiyimiz film 🎬",

                        requestedBy:
                            socket.data.username ||
                            "Qonaq"

                    }
                );


                socket.emit(
                    "video-request-sent"
                );

            }
        );


        /*
        =================================================
        LOAD MP4
        =================================================
        */

        socket.on(
            "load-mp4",
            ({ videoUrl, title }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                videoUrl =
                    String(
                        videoUrl || ""
                    ).trim();


                if (!videoUrl) {

                    socket.emit(
                        "mp4-load-error",
                        "MP4 video ünvanı yoxdur."
                    );

                    return;

                }


                /*
                Yalnız bizim uploads
                */

                if (
                    !videoUrl.startsWith(
                        "/uploads/"
                    )
                ) {

                    socket.emit(
                        "mp4-load-error",
                        "MP4 faylı server üzərindən olmalıdır."
                    );

                    return;

                }


                room.video = {

                    type: "mp4",

                    videoId: "",

                    videoUrl,

                    title:
                        title ||
                        "MP4 Film",

                    playing: false,

                    currentTime: 0,

                    updatedAt:
                        Date.now()

                };


                io.to(roomId).emit(
                    "video-loaded",
                    room.video
                );


                console.log(
                    `MP4 yükləndi: ${videoUrl} | Room: ${roomId}`
                );

            }
        );


        /*
        =================================================
        PLAY
        =================================================
        */

        socket.on(
            "video-play",
            ({ currentTime }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                room.video.playing =
                    true;


                room.video.currentTime =
                    Math.max(
                        0,
                        Number(
                            currentTime
                        ) || 0
                    );


                room.video.updatedAt =
                    Date.now();


                socket
                    .to(roomId)
                    .emit(
                        "remote-play",
                        {

                            currentTime:
                                room.video.currentTime

                        }
                    );

            }
        );


        /*
        =================================================
        PAUSE
        =================================================
        */

        socket.on(
            "video-pause",
            ({ currentTime }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                room.video.playing =
                    false;


                room.video.currentTime =
                    Math.max(
                        0,
                        Number(
                            currentTime
                        ) || 0
                    );


                room.video.updatedAt =
                    Date.now();


                socket
                    .to(roomId)
                    .emit(
                        "remote-pause",
                        {

                            currentTime:
                                room.video.currentTime

                        }
                    );

            }
        );


        /*
        =================================================
        SEEK
        =================================================
        */

        socket.on(
            "video-seek",
            ({ currentTime }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                room.video.currentTime =
                    Math.max(
                        0,
                        Number(
                            currentTime
                        ) || 0
                    );


                room.video.updatedAt =
                    Date.now();


                socket
                    .to(roomId)
                    .emit(
                        "remote-seek",
                        {

                            currentTime:
                                room.video.currentTime

                        }
                    );

            }
        );


        /*
        =================================================
        VOICE CHAT - MİKROFON SİQNALLAŞMASI (WebRTC)
        =================================================
        */

        socket.on(
            "voice-on",
            () => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) {
                    return;
                }

                const room =
                    rooms.get(roomId);

                if (!room) {
                    return;
                }

                if (!room.voiceUsers) {
                    room.voiceUsers = new Set();
                }

                room.voiceUsers.add(
                    socket.id
                );

                const others =
                    [...room.voiceUsers].filter(
                        id => id !== socket.id
                    );

                /*
                Yeni qoşulan artıq səsli
                olanların siyahısını alır,
                özü təklif (offer) göndərəcək.
                */

                socket.emit(
                    "voice-peers",
                    others
                );

                /*
                Artıq səsli olanlara xəbər
                veririk ki, yeni nəfər gəldi.
                */

                others.forEach(
                    id => {

                        io.to(id).emit(
                            "voice-peer-joined",
                            {
                                peerId: socket.id,
                                username:
                                    socket.data.username ||
                                    "Qonaq"
                            }
                        );

                    }
                );

            }
        );

        socket.on(
            "voice-off",
            () => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) {
                    return;
                }

                const room =
                    rooms.get(roomId);

                if (!room || !room.voiceUsers) {
                    return;
                }

                room.voiceUsers.delete(
                    socket.id
                );

                socket
                    .to(roomId)
                    .emit(
                        "voice-peer-left",
                        {
                            peerId: socket.id
                        }
                    );

            }
        );

        socket.on(
            "voice-mute",
            ({ muted }) => {

                const roomId =
                    socket.data.roomId;

                if (!roomId) {
                    return;
                }

                socket
                    .to(roomId)
                    .emit(
                        "voice-peer-mute",
                        {
                            peerId: socket.id,
                            muted: Boolean(muted)
                        }
                    );

            }
        );

        socket.on(
            "voice-signal",
            ({ to, signal }) => {

                if (!to || !signal) {
                    return;
                }

                io.to(to).emit(
                    "voice-signal",
                    {
                        from: socket.id,
                        signal
                    }
                );

            }
        );


        /*
        =================================================
        CHAT
        =================================================
        */

        socket.on(
            "chat-message",
            ({ message }) => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                message =
                    String(
                        message || ""
                    ).trim();


                if (!message) {
                    return;
                }


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
        =================================================
        DISCONNECT
        =================================================
        */

        socket.on(
            "disconnect",
            () => {

                const roomId =
                    socket.data.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                if (
                    room.voiceUsers &&
                    room.voiceUsers.has(socket.id)
                ) {

                    room.voiceUsers.delete(
                        socket.id
                    );

                    socket
                        .to(roomId)
                        .emit(
                            "voice-peer-left",
                            {
                                peerId: socket.id
                            }
                        );

                }


                const username =
                    socket.data.username ||
                    "Qonaq";


                /*
                HOST ÇIXDI
                */

                if (
                    room.hostId ===
                    socket.id
                ) {

                    const socketsInRoom =
                        io.sockets
                            .adapter
                            .rooms
                            .get(roomId);


                    if (
                        socketsInRoom &&
                        socketsInRoom.size > 0
                    ) {

                        /*
                        Yeni host
                        */

                        room.hostId =
                            [
                                ...socketsInRoom
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
                USER LIST
                */

                broadcastUsers(
                    roomId
                );


                /*
                SYSTEM MESSAGE
                */

                io.to(roomId).emit(
                    "system-message",
                    {

                        text:
                            `${username} otaqdan çıxdı.`

                    }
                );


                /*
                OTAQ BOŞDURSA SİL
                */

                const socketsInRoom =
                    io.sockets
                        .adapter
                        .rooms
                        .get(roomId);


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
HEALTH CHECK
=========================================================
*/

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status: "online",

            service:
                "Together Watch",

            rooms:
                rooms.size,

            time:
                new Date().toISOString()

        });

    }
);


/*
=========================================================
START SERVER
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
            "YouTube sync: ENABLED"
        );

        console.log(
            "YouTube search: ENABLED"
        );

        console.log(
            "MP4 upload: ENABLED"
        );

        console.log(
            "Chat: ENABLED"
        );

        console.log(
            "Room sync: ENABLED"
        );

        console.log("");

    }
);