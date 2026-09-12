/*
=========================================================
TOGETHER WATCH
PRO CLIENT
YouTube + MP4 + Sync + Chat + Rooms
=========================================================
*/


/*
=========================================================
GLOBAL STATE
=========================================================
*/

let socket = null;

let roomId = null;

let username = null;

let isHost = false;


/*
=========================================================
YOUTUBE
=========================================================
*/

let player = null;

let playerReady = false;


/*
=========================================================
MP4
=========================================================
*/

let mp4Player = null;


/*
=========================================================
VIDEO STATE
=========================================================
*/

let currentVideo = null;

let ignorePlayerEvents = false;

let suppressSeekEvent = false;

let lastPlayerTime = 0;

let lastSyncTime = 0;

let lastKnownPlaying = false;


/*
=========================================================
DOM
=========================================================
*/

const landing =
    document.getElementById("landing");

const roomPage =
    document.getElementById("roomPage");

const joinModal =
    document.getElementById("joinModal");

const createRoomBtn =
    document.getElementById("createRoomBtn");

const joinExistingBtn =
    document.getElementById("joinExistingBtn");

const closeJoinModal =
    document.getElementById("closeJoinModal");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");

const roomCodeInput =
    document.getElementById("roomCodeInput");

const joinNameInput =
    document.getElementById("joinNameInput");

const roomCodeDisplay =
    document.getElementById("roomCodeDisplay");

const copyRoomBtn =
    document.getElementById("copyRoomBtn");

const shareRoomBtn =
    document.getElementById("shareRoomBtn");

const leaveBtn =
    document.getElementById("leaveBtn");

const hostControls =
    document.getElementById("hostControls");

const hostBadge =
    document.getElementById("hostBadge");

const videoUrlInput =
    document.getElementById("videoUrlInput");

const loadVideoBtn =
    document.getElementById("loadVideoBtn");

const pasteVideoBtn =
    document.getElementById("pasteVideoBtn");

const youtubeSearchInput =
    document.getElementById("youtubeSearchInput");

const youtubeSearchBtn =
    document.getElementById("youtubeSearchBtn");

const youtubeSearchResults =
    document.getElementById("youtubeSearchResults");

const toggleLinkModeBtn =
    document.getElementById("toggleLinkModeBtn");

const linkModeBlock =
    document.getElementById("linkModeBlock");

const mp4FileInput =
    document.getElementById("mp4FileInput");

const uploadMp4Btn =
    document.getElementById("uploadMp4Btn");

const mp4Status =
    document.getElementById("mp4Status");

const mp4PlayerElement =
    document.getElementById("mp4Player");

const movieTitle =
    document.getElementById("movieTitle");

const playerOverlay =
    document.getElementById("playerOverlay");

const chatMessages =
    document.getElementById("chatMessages");

const chatForm =
    document.getElementById("chatForm");

const chatInput =
    document.getElementById("chatInput");

const onlineCount =
    document.getElementById("onlineCount");

const watchingCount =
    document.getElementById("watchingCount");

const avatarStack =
    document.getElementById("avatarStack");

const connectionStatus =
    document.getElementById("connectionStatus");

const videoWrapper =
    document.getElementById("videoWrapper");

const mediaControls =
    document.getElementById("mediaControls");

const seekBar =
    document.getElementById("seekBar");

const playPauseBtn =
    document.getElementById("playPauseBtn");

const timeDisplay =
    document.getElementById("timeDisplay");

const muteBtn =
    document.getElementById("muteBtn");

const volumeSlider =
    document.getElementById("volumeSlider");

const micToggleBtn =
    document.getElementById("micToggleBtn");

const voiceHangupBtn =
    document.getElementById("voiceHangupBtn");

const fullscreenBtn =
    document.getElementById("fullscreenBtn");

const voiceStatusBar =
    document.getElementById("voiceStatusBar");

const voiceStatusText =
    document.getElementById("voiceStatusText");


/*
=========================================================
VOICE CHAT STATE
=========================================================
*/

let localStream = null;

let micEnabled = false;

let micMuted = false;

const peerConnections = {};

const remoteAudioEls = {};

const speakingDetectors = {};

let audioCtx = null;

const rtcConfig = {

    iceServers: [

        {
            urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302"
            ]
        }

    ]

};


/*
=========================================================
MEDIA CONTROLS STATE
=========================================================
*/

let isSeeking = false;


/*
=========================================================
TOAST
=========================================================
*/

function showToast(
    message,
    type = "normal"
) {

    let toast =
        document.getElementById("twToast");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id =
            "twToast";

        toast.className =
            "tw-toast";

        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    toast.className =
        `tw-toast ${type}`;


    requestAnimationFrame(() => {

        toast.classList.add(
            "show"
        );

    });


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 2500);

}


/*
=========================================================
YOUTUBE ID
=========================================================
*/

function extractYouTubeId(url) {

    if (!url) {
        return null;
    }


    url =
        String(url).trim();


    try {

        const parsed =
            new URL(url);


        let hostname =
            parsed.hostname
                .replace(/^www\./, "")
                .replace(/^m\./, "")
                .toLowerCase();


        /*
        youtube.com
        */

        if (
            hostname === "youtube.com" ||
            hostname === "youtube-nocookie.com"
        ) {

            /*
            watch?v=
            */

            const watchId =
                parsed.searchParams.get(
                    "v"
                );


            if (
                watchId &&
                /^[a-zA-Z0-9_-]{11}$/.test(
                    watchId
                )
            ) {

                return watchId;

            }


            /*
            shorts
            */

            const shorts =
                parsed.pathname.match(
                    /\/shorts\/([a-zA-Z0-9_-]{11})/
                );


            if (shorts) {
                return shorts[1];
            }


            /*
            embed
            */

            const embed =
                parsed.pathname.match(
                    /\/embed\/([a-zA-Z0-9_-]{11})/
                );


            if (embed) {
                return embed[1];
            }


            /*
            live
            */

            const live =
                parsed.pathname.match(
                    /\/live\/([a-zA-Z0-9_-]{11})/
                );


            if (live) {
                return live[1];
            }

        }


        /*
        youtu.be
        */

        if (
            hostname === "youtu.be"
        ) {

            const parts =
                parsed.pathname
                    .split("/")
                    .filter(Boolean);


            const id =
                parts[0];


            if (
                id &&
                /^[a-zA-Z0-9_-]{11}$/.test(
                    id
                )
            ) {

                return id;

            }

        }

    } catch (error) {

        /*
        Fallback
        */

        const match =
            url.match(
                /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/
            );


        if (match) {
            return match[1];
        }

    }


    return null;
}


/*
=========================================================
CREATE ROOM
=========================================================
*/

if (createRoomBtn) {

    createRoomBtn.addEventListener(
        "click",
        async () => {

            try {

                createRoomBtn.disabled =
                    true;


                const response =
                    await fetch(
                        "/api/create-room",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );


                if (!response.ok) {
                    throw new Error(
                        "Room yaratmaq mümkün olmadı."
                    );
                }


                const data =
                    await response.json();


                if (!data.success) {

                    showToast(
                        data.message ||
                        "Otaq yaradıla bilmədi.",
                        "error"
                    );

                    return;

                }


                const name =
                    prompt(
                        "Otaqda görünəcək adını yaz:",
                        "Mən"
                    );


                username =
                    name?.trim() ||
                    "Mən";


                await openRoom(
                    data.roomId
                );


            } catch (error) {

                console.error(
                    "Create room:",
                    error
                );


                showToast(
                    "Serverə qoşulmaq mümkün olmadı.",
                    "error"
                );


            } finally {

                createRoomBtn.disabled =
                    false;

            }

        }
    );

}


/*
=========================================================
JOIN MODAL
=========================================================
*/

if (joinExistingBtn) {

    joinExistingBtn.addEventListener(
        "click",
        () => {

            joinModal.classList.remove(
                "hidden"
            );


            setTimeout(() => {

                roomCodeInput?.focus();

            }, 100);

        }
    );

}


if (closeJoinModal) {

    closeJoinModal.addEventListener(
        "click",
        () => {

            joinModal.classList.add(
                "hidden"
            );

        }
    );

}


if (joinModal) {

    joinModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                joinModal
            ) {

                joinModal.classList.add(
                    "hidden"
                );

            }

        }
    );

}


/*
=========================================================
JOIN ROOM
=========================================================
*/

if (joinRoomBtn) {

    joinRoomBtn.addEventListener(
        "click",
        () => {

            const code =
                roomCodeInput.value
                    .trim()
                    .toUpperCase();


            const name =
                joinNameInput.value.trim();


            if (!code) {

                showToast(
                    "Otaq kodunu yaz.",
                    "error"
                );

                roomCodeInput.focus();

                return;

            }


            if (
                !/^[A-Z0-9]{6}$/.test(
                    code
                )
            ) {

                showToast(
                    "Otaq kodu 6 simvol olmalıdır.",
                    "error"
                );

                roomCodeInput.focus();

                return;

            }


            username =
                name ||
                "Qonaq";


            openRoom(
                code
            );


            joinModal.classList.add(
                "hidden"
            );

        }
    );

}


/*
=========================================================
ENTER JOIN
=========================================================
*/

if (roomCodeInput) {

    roomCodeInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                joinRoomBtn?.click();

            }

        }
    );

}


if (joinNameInput) {

    joinNameInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                joinRoomBtn?.click();

            }

        }
    );

}


/*
=========================================================
OPEN ROOM
=========================================================
*/

async function openRoom(code) {

    try {

        const cleanCode =
            String(code || "")
                .trim()
                .toUpperCase();


        if (!cleanCode) {
            return;
        }


        const response =
            await fetch(
                `/api/room/${encodeURIComponent(cleanCode)}`
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            showToast(
                data.message ||
                "Bu otaq artıq mövcud deyil.",
                "error"
            );

            return;

        }


        roomId =
            cleanCode;


        /*
        UI
        */

        landing.classList.add(
            "hidden"
        );


        roomPage.classList.remove(
            "hidden"
        );


        roomCodeDisplay.textContent =
            roomId;


        /*
        Əgər köhnə socket varsa
        */

        if (socket) {

            socket.disconnect();

            socket = null;

        }


        resetVideoUI();


        connectSocket();


    } catch (error) {

        console.error(
            "Open room:",
            error
        );


        showToast(
            "Serverə qoşulmaq mümkün olmadı.",
            "error"
        );

    }

}


/*
=========================================================
SOCKET CONNECTION
=========================================================
*/

function connectSocket() {

    socket =
        io({
            transports: [
                "websocket",
                "polling"
            ],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });


    /*
    CONNECT
    */

    socket.on(
        "connect",
        () => {

            updateConnection(
                true
            );


            socket.emit(
                "join-room",
                {
                    roomId,
                    username
                }
            );

        }
    );


    /*
    DISCONNECT
    */

    socket.on(
        "disconnect",
        () => {

            updateConnection(
                false
            );

        }
    );


    /*
    RECONNECT ATTEMPT
    */

    socket.io.on(
        "reconnect_attempt",
        () => {

            updateConnection(
                false
            );

        }
    );


    /*
    =====================================================
    ROOM STATE
    =====================================================
    */

    socket.on(
        "room-state",
        state => {

            setHost(
                Boolean(
                    state?.isHost
                )
            );


            if (
                state?.video
            ) {

                applyVideoState(
                    state.video,
                    true
                );

            }

        }
    );


    /*
    =====================================================
    VIDEO LOADED
    =====================================================
    */

    socket.on(
        "video-loaded",
        video => {

            applyVideoState(
                video,
                false
            );


            showToast(
                "Film dəyişdirildi 🎬",
                "success"
            );

        }
    );


    /*
    =====================================================
    GUEST VIDEO REQUEST
    =====================================================
    */

    socket.on(
        "video-load-request",
        request => {

            if (!isHost) {
                return;
            }


            const requester =
                request?.requestedBy ||
                "Qonaq";


            const videoId =
                request?.videoId;


            const accept =
                confirm(
                    `${requester} bu YouTube filmini təklif edir.\n\nVideo ID: ${videoId}\n\nFilmi otağa qoşaq?`
                );


            if (!accept) {

                showToast(
                    "Film istəyi rədd edildi."
                );

                return;

            }


            socket.emit(
                "load-video",
                {
                    videoId,
                    videoUrl:
                        request?.videoUrl ||
                        "",
                    title:
                        request?.title ||
                        "Birlikdə izlədiyimiz film 🎬"
                }
            );

        }
    );


    /*
    =====================================================
    VIDEO REQUEST SENT
    =====================================================
    */

    socket.on(
        "video-request-sent",
        () => {

            showToast(
                "Film istəyi hosta göndərildi 💜",
                "success"
            );

        }
    );


    /*
    =====================================================
    VIDEO REQUEST ERROR
    =====================================================
    */

    socket.on(
        "video-request-error",
        message => {

            showToast(
                message ||
                "Film istəyi göndərilə bilmədi.",
                "error"
            );

        }
    );


    /*
    =====================================================
    VIDEO LOAD ERROR
    =====================================================
    */

    socket.on(
        "video-load-error",
        message => {

            showToast(
                message ||
                "Video yüklənə bilmədi.",
                "error"
            );

        }
    );


    /*
    =====================================================
    MP4 LOAD ERROR
    =====================================================
    */

    socket.on(
        "mp4-load-error",
        message => {

            showToast(
                message ||
                "MP4 yüklənə bilmədi.",
                "error"
            );

        }
    );


    /*
    =====================================================
    REMOTE PLAY
    =====================================================
    */

    socket.on(
        "remote-play",
        ({ currentTime }) => {

            remotePlay(
                Number(currentTime) || 0
            );

        }
    );


    /*
    =====================================================
    REMOTE PAUSE
    =====================================================
    */

    socket.on(
        "remote-pause",
        ({ currentTime }) => {

            remotePause(
                Number(currentTime) || 0
            );

        }
    );


    /*
    =====================================================
    REMOTE SEEK
    =====================================================
    */

    socket.on(
        "remote-seek",
        ({ currentTime }) => {

            remoteSeek(
                Number(currentTime) || 0
            );

        }
    );


    /*
    =====================================================
    USERS
    =====================================================
    */

    socket.on(
        "users-update",
        users => {

            updateUsers(
                Array.isArray(users)
                    ? users
                    : []
            );

        }
    );


    /*
    =====================================================
    CHAT
    =====================================================
    */

    socket.on(
        "chat-message",
        data => {

            addChatMessage(
                data?.username ||
                    "Qonaq",
                data?.message ||
                    "",
                data?.time ||
                    ""
            );

        }
    );


    /*
    =====================================================
    SYSTEM
    =====================================================
    */

    socket.on(
        "system-message",
        data => {

            if (data?.text) {

                addSystemMessage(
                    data.text
                );

            }

        }
    );


    /*
    =====================================================
    BECAME HOST
    =====================================================
    */

    socket.on(
        "became-host",
        () => {

            setHost(
                true
            );

        }
    );


    /*
    =====================================================
    VOICE CHAT SİQNALLARI
    =====================================================
    */

    socket.on(
        "voice-peers",
        peerIds => {

            (peerIds || []).forEach(
                id => callPeer(id)
            );


            if ((peerIds || []).length) {

                showVoiceStatus(
                    "🎙️ Bağlanır..."
                );

            }

        }
    );


    socket.on(
        "voice-peer-joined",
        ({ username: peerName } = {}) => {

            showToast(
                `${peerName || "Sevgilin"} səsli əlaqəyə qoşuldu 🎙️`,
                "success"
            );

        }
    );


    socket.on(
        "voice-peer-left",
        ({ peerId } = {}) => {

            if (peerId) {

                closePeerConnection(
                    peerId
                );

            }


            showToast(
                "Səsli əlaqə kəsildi",
                "normal"
            );

        }
    );


    socket.on(
        "voice-peer-mute",
        ({ muted } = {}) => {

            voiceStatusBar?.classList.toggle(
                "partner-muted",
                Boolean(muted)
            );

        }
    );


    socket.on(
        "voice-signal",
        handleVoiceSignal
    );


    /*
    =====================================================
    ROOM ERROR
    =====================================================
    */

    socket.on(
        "room-error",
        message => {

            showToast(
                message ||
                "Otaq xətası.",
                "error"
            );


            setTimeout(() => {

                leaveRoom(
                    true
                );

            }, 500);

        }
    );

}


/*
=========================================================
CONNECTION STATUS
=========================================================
*/

function updateConnection(
    connected
) {

    if (!connectionStatus) {
        return;
    }


    if (connected) {

        connectionStatus.textContent =
            "● Bağlı";


        connectionStatus.classList.add(
            "connected"
        );


        connectionStatus.classList.remove(
            "offline",
            "disconnected",
            "connecting"
        );

    } else {

        connectionStatus.textContent =
            "● Yenidən qoşulur...";


        connectionStatus.classList.remove(
            "connected"
        );


        connectionStatus.classList.add(
            "offline"
        );

    }

}


/*
=========================================================
HOST
=========================================================
*/

function setHost(
    value
) {

    isHost =
        Boolean(value);


    if (!hostControls) {
        return;
    }


    /*
    ARTIQ HEÇ BİR MƏHDUDİYYƏT YOXDUR —
    HƏR İKİSİ EYNİ ŞƏKİLDƏ İDARƏ EDİR
    */

    hostControls.classList.remove(
        "hidden"
    );


    hostBadge?.classList.remove(
        "hidden"
    );


    if (loadVideoBtn) {

        loadVideoBtn.textContent =
            "🎬 Filmi qoş";

    }

}


/*
=========================================================
APPLY VIDEO STATE
=========================================================
*/

function applyVideoState(
    video,
    fromRoomState = false
) {

    if (!video) {
        return;
    }


    currentVideo =
        {
            ...video
        };


    movieTitle.textContent =
        video.title ||
        "Film";


    setControlsEnabled(
        true
    );


    /*
    YOUTUBE
    */

    if (
        video.type === "youtube" ||
        (
            video.videoId &&
            !video.type
        )
    ) {

        switchToYouTube();

        loadYouTubeVideo(
            video.videoId,
            video
        );

        return;
    }


    /*
    MP4
    */

    if (
        video.type === "mp4"
    ) {

        switchToMP4();

        loadMP4Video(
            video
        );

        return;
    }


    /*
    EMPTY
    */

    resetVideoUI();

}


/*
=========================================================
SWITCH TO YOUTUBE
=========================================================
*/

function switchToYouTube() {

    if (mp4PlayerElement) {

        try {

            mp4PlayerElement.pause();

        } catch {}

        mp4PlayerElement.classList.add(
            "hidden"
        );

        mp4PlayerElement.removeAttribute(
            "src"
        );

        mp4PlayerElement.load();

    }


    const playerElement =
        document.getElementById(
            "player"
        );


    if (playerElement) {

        playerElement.classList.remove(
            "hidden"
        );

    }

}


/*
=========================================================
SWITCH TO MP4
=========================================================
*/

function switchToMP4() {

    const playerElement =
        document.getElementById(
            "player"
        );


    if (playerElement) {

        playerElement.classList.add(
            "hidden"
        );

    }


    if (mp4PlayerElement) {

        mp4PlayerElement.classList.remove(
            "hidden"
        );

    }

}


/*
=========================================================
RESET VIDEO UI
=========================================================
*/

function resetVideoUI() {

    currentVideo =
        null;


    movieTitle.textContent =
        "Film seçilməyib";


    playerOverlay?.classList.remove(
        "hidden"
    );


    if (mp4PlayerElement) {

        try {

            mp4PlayerElement.pause();

        } catch {}

        mp4PlayerElement.removeAttribute(
            "src"
        );

        mp4PlayerElement.load();

        mp4PlayerElement.classList.add(
            "hidden"
        );

    }


    const playerElement =
        document.getElementById(
            "player"
        );


    if (playerElement) {

        playerElement.classList.remove(
            "hidden"
        );

    }


    playerReady =
        Boolean(
            player
        );


    setControlsEnabled(
        false
    );

}


/*
=========================================================
YOUTUBE API READY
=========================================================
*/

window.onYouTubeIframeAPIReady =
    function () {

        console.log(
            "YouTube API hazırdır."
        );

    };


/*
=========================================================
LOAD YOUTUBE VIDEO
=========================================================
*/

function loadYouTubeVideo(
    videoId,
    state = {}
) {

    if (
        !videoId ||
        !/^[a-zA-Z0-9_-]{11}$/.test(
            videoId
        )
    ) {

        showToast(
            "YouTube video ID düzgün deyil.",
            "error"
        );

        return;

    }


    switchToYouTube();


    playerOverlay?.classList.add(
        "hidden"
    );


    const startTime =
        Math.max(
            0,
            Number(
                state?.currentTime
            ) || 0
        );


    /*
    PLAYER ARTIQ VAR
    */

    if (player) {

        try {

            ignorePlayerEvents =
                true;


            playerReady =
                true;


            player.loadVideoById({
                videoId,
                startSeconds:
                    startTime
            });


            lastPlayerTime =
                startTime;


            lastKnownPlaying =
                Boolean(
                    state?.playing
                );


            setTimeout(() => {

                ignorePlayerEvents =
                    false;


                /*
                Server oynayır deyirsə
                playeri oynatmağa çalışırıq.
                */

                if (
                    state?.playing
                ) {

                    try {

                        player.playVideo();

                    } catch {}

                }

            }, 1000);


        } catch (error) {

            console.error(
                "YouTube load:",
                error
            );

            ignorePlayerEvents =
                false;

        }


        return;
    }


    /*
    YOUTUBE API HƏLƏ HAZIR DEYİLSƏ
    */

    if (
        typeof YT === "undefined" ||
        !YT.Player
    ) {

        setTimeout(() => {

            loadYouTubeVideo(
                videoId,
                state
            );

        }, 400);

        return;

    }


    /*
    YENİ PLAYER
    */

    player =
        new YT.Player(
            "player",
            {

                videoId,

                playerVars: {

                    autoplay: 0,

                    controls: 0,

                    rel: 0,

                    modestbranding: 1,

                    playsinline: 1

                },


                events: {

                    onReady:
                        event => {

                            playerReady =
                                true;


                            const time =
                                Math.max(
                                    0,
                                    Number(
                                        state?.currentTime
                                    ) || 0
                                );


                            lastPlayerTime =
                                time;


                            lastKnownPlaying =
                                Boolean(
                                    state?.playing
                                );


                            if (
                                time > 0
                            ) {

                                try {

                                    player.seekTo(
                                        time,
                                        true
                                    );

                                } catch {}

                            }


                            /*
                            Server state oynayır
                            deyirsə davam etdiririk
                            */

                            if (
                                state?.playing
                            ) {

                                setTimeout(
                                    () => {

                                        try {

                                            player.playVideo();

                                        } catch {}

                                    },
                                    700
                                );

                            }

                        },


                    onStateChange:
                        handleYouTubeState

                }

            }
        );

}


/*
=========================================================
YOUTUBE STATE
=========================================================
*/

function handleYouTubeState(
    event
) {

    if (!playerReady) {
        return;
    }


    if (ignorePlayerEvents) {
        return;
    }


    if (
        typeof YT === "undefined"
    ) {
        return;
    }


    /*
    PLAY
    */

    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        const currentTime =
            safeYouTubeTime();


        lastPlayerTime =
            currentTime;


        lastKnownPlaying =
            true;


        socket?.emit(
            "video-play",
            {
                currentTime
            }
        );


        return;

    }


    /*
    PAUSE
    */

    if (
        event.data ===
        YT.PlayerState.PAUSED
    ) {

        const currentTime =
            safeYouTubeTime();


        lastPlayerTime =
            currentTime;


        lastKnownPlaying =
            false;


        socket?.emit(
            "video-pause",
            {
                currentTime
            }
        );


        return;

    }

}


/*
=========================================================
SAFE YOUTUBE TIME
=========================================================
*/

function safeYouTubeTime() {

    try {

        if (
            player &&
            typeof player.getCurrentTime ===
                "function"
        ) {

            return Math.max(
                0,
                Number(
                    player.getCurrentTime()
                ) || 0
            );

        }

    } catch {}


    return 0;
}


/*
=========================================================
YOUTUBE SEEK DETECTION
=========================================================
*/

setInterval(
    () => {

        if (
            !playerReady ||
            !player ||
            ignorePlayerEvents ||
            suppressSeekEvent ||
            !socket ||
            !socket.connected
        ) {

            return;

        }


        const currentTime =
            safeYouTubeTime();


        const difference =
            Math.abs(
                currentTime -
                lastPlayerTime
            );


        /*
        Timeline-da ciddi dəyişiklik
        */

        if (
            difference > 1.8
        ) {

            const now =
                Date.now();


            if (
                now -
                lastSyncTime >
                700
            ) {

                socket.emit(
                    "video-seek",
                    {
                        currentTime
                    }
                );


                lastSyncTime =
                    now;

            }

        }


        lastPlayerTime =
            currentTime;

    },
    500
);


/*
=========================================================
REMOTE PLAY
=========================================================
*/

function remotePlay(
    currentTime
) {

    /*
    MP4
    */

    if (
        currentVideo?.type ===
        "mp4"
    ) {

        remoteMP4Play(
            currentTime
        );

        return;

    }


    /*
    YouTube
    */

    if (
        !playerReady ||
        !player
    ) {

        return;

    }


    ignorePlayerEvents =
        true;


    try {

        player.seekTo(
            currentTime,
            true
        );


        player.playVideo();


        lastPlayerTime =
            currentTime;


        lastKnownPlaying =
            true;

    } catch (error) {

        console.error(
            "Remote YouTube play:",
            error
        );

    }


    setTimeout(() => {

        ignorePlayerEvents =
            false;

    }, 900);

}


/*
=========================================================
REMOTE PAUSE
=========================================================
*/

function remotePause(
    currentTime
) {

    /*
    MP4
    */

    if (
        currentVideo?.type ===
        "mp4"
    ) {

        remoteMP4Pause(
            currentTime
        );

        return;

    }


    /*
    YouTube
    */

    if (
        !playerReady ||
        !player
    ) {

        return;

    }


    ignorePlayerEvents =
        true;


    try {

        player.seekTo(
            currentTime,
            true
        );


        player.pauseVideo();


        lastPlayerTime =
            currentTime;


        lastKnownPlaying =
            false;

    } catch (error) {

        console.error(
            "Remote YouTube pause:",
            error
        );

    }


    setTimeout(() => {

        ignorePlayerEvents =
            false;

    }, 900);

}


/*
=========================================================
REMOTE SEEK
=========================================================
*/

function remoteSeek(
    currentTime
) {

    /*
    MP4
    */

    if (
        currentVideo?.type ===
        "mp4"
    ) {

        remoteMP4Seek(
            currentTime
        );

        return;

    }


    /*
    YouTube
    */

    if (
        !playerReady ||
        !player
    ) {

        return;

    }


    suppressSeekEvent =
        true;


    try {

        player.seekTo(
            currentTime,
            true
        );


        lastPlayerTime =
            currentTime;

    } catch (error) {

        console.error(
            "Remote YouTube seek:",
            error
        );

    }


    setTimeout(() => {

        suppressSeekEvent =
            false;

    }, 900);

}


/*
=========================================================
YOUTUBE SEARCH (link yapışdırmadan)
=========================================================
*/

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text || "";

    return div.innerHTML;

}


function sendLoadVideoRequest(payload) {

    if (!socket || !socket.connected) {

        showToast(
            "Server bağlantısı yoxdur.",
            "error"
        );

        return;

    }


    socket.emit(
        "load-video",
        payload
    );

    showToast(
        "Film otağa qoşulur 🎬",
        "success"
    );

}


function renderYoutubeSearchResults(results, debugReason) {

    youtubeSearchResults.innerHTML = "";

    if (!results || results.length === 0) {

        let message =
            "Heç nə tapılmadı 😕 başqa söz sınayın.";

        if (debugReason === "consent-wall") {

            message =
                "YouTube server IP-dən 'cookie razılığı' səhifəsi qaytardı. Server-i yenidən başlat və yenidən sınayın; davam edərsə şəbəkə/host tərəfini yoxlamaq lazımdır.";

        } else if (debugReason === "marker-not-found" || debugReason === "json-extract-failed" || debugReason === "json-parse-failed") {

            message =
                "YouTube nəticələri oxuna bilmədi (səhifə strukturu dəyişmiş ola bilər). Server konsoluna baxın.";

        }

        youtubeSearchResults.innerHTML =
            `<div class="yt-search-empty">${escapeHtml(message)}</div>`;

        youtubeSearchResults.classList.remove("hidden");

        return;

    }


    results.forEach((item) => {

        const card =
            document.createElement("div");

        card.className =
            "yt-result-card";

        card.innerHTML = `
            <div class="yt-result-thumb">
                <img src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy">
                ${item.duration ? `<span class="yt-result-duration">${escapeHtml(item.duration)}</span>` : ""}
                <div class="yt-result-play">▶</div>
            </div>
            <div class="yt-result-meta">
                <div class="yt-result-title">${escapeHtml(item.title)}</div>
                ${item.channel ? `<div class="yt-result-channel">${escapeHtml(item.channel)}</div>` : ""}
            </div>
        `;

        card.addEventListener(
            "click",
            () => {

                sendLoadVideoRequest({

                    videoId:
                        item.videoId,

                    videoUrl:
                        `https://www.youtube.com/watch?v=${item.videoId}`,

                    title:
                        item.title ||
                        "Birlikdə izlədiyimiz film 🎬"

                });


                youtubeSearchResults.classList.add("hidden");

                youtubeSearchInput.value = "";

            }
        );

        youtubeSearchResults.appendChild(card);

    });


    youtubeSearchResults.classList.remove("hidden");

}


async function performYoutubeSearch() {

    const query =
        youtubeSearchInput.value.trim();


    if (!query) {

        showToast(
            "Axtarmaq üçün film adı yaz.",
            "error"
        );

        youtubeSearchInput.focus();

        return;

    }


    youtubeSearchResults.classList.remove("hidden");

    youtubeSearchResults.innerHTML =
        `<div class="yt-search-loading">Axtarılır<span class="dot-anim">...</span></div>`;


    try {

        const response =
            await fetch(
                `/api/youtube-search?q=${encodeURIComponent(query)}`
            );

        const data =
            await response.json();


        if (!data.success) {

            youtubeSearchResults.innerHTML =
                `<div class="yt-search-empty">${escapeHtml(data.message || "Axtarış zamanı xəta baş verdi.")}</div>`;

            return;

        }


        console.log(
            "YouTube axtarış nəticəsi:",
            data
        );


        renderYoutubeSearchResults(
            data.results,
            data.debug
        );


    } catch (error) {

        console.error(
            "YouTube axtarış xətası:",
            error
        );

        youtubeSearchResults.innerHTML =
            `<div class="yt-search-empty">Server ilə əlaqə qurulmadı.</div>`;

    }

}


if (youtubeSearchBtn) {

    youtubeSearchBtn.addEventListener(
        "click",
        performYoutubeSearch
    );

}


if (youtubeSearchInput) {

    youtubeSearchInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                event.preventDefault();

                performYoutubeSearch();

            }

        }
    );

}


if (toggleLinkModeBtn && linkModeBlock) {

    toggleLinkModeBtn.addEventListener(
        "click",
        () => {

            const isHiddenNow =
                linkModeBlock.classList.contains("hidden");

            linkModeBlock.classList.toggle(
                "hidden"
            );

            toggleLinkModeBtn.textContent =
                isHiddenNow ?
                    "linki gizlət ▴" :
                    "yaxud linki əl ilə yapışdır ▾";

        }
    );

}


/*
=========================================================
YOUTUBE LOAD BUTTON
=========================================================
*/

if (loadVideoBtn) {

    loadVideoBtn.addEventListener(
        "click",
        () => {

            const url =
                videoUrlInput.value.trim();


            if (!url) {

                showToast(
                    "Əvvəl YouTube linkini daxil et.",
                    "error"
                );

                videoUrlInput.focus();

                return;

            }


            const videoId =
                extractYouTubeId(
                    url
                );


            if (!videoId) {

                showToast(
                    "Bu YouTube linkini tanımadım.",
                    "error"
                );

                videoUrlInput.focus();

                return;

            }


            if (
                !socket ||
                !socket.connected
            ) {

                showToast(
                    "Server bağlantısı yoxdur.",
                    "error"
                );

                return;

            }


            socket.emit(
                "load-video",
                {

                    videoId,

                    videoUrl:
                        url,

                    title:
                        "Birlikdə izlədiyimiz film 🎬"

                }
            );


            showToast(
                "Film otağa qoşulur 🎬",
                "success"
            );


            videoUrlInput.value =
                "";

        }
    );

}


/*
=========================================================
PASTE YOUTUBE LINK
=========================================================
*/

if (pasteVideoBtn) {

    pasteVideoBtn.addEventListener(
        "click",
        async () => {

            try {

                if (
                    navigator.clipboard &&
                    typeof navigator.clipboard.readText ===
                        "function"
                ) {

                    const text =
                        await navigator.clipboard.readText();


                    if (text) {

                        videoUrlInput.value =
                            text.trim();


                        videoUrlInput.focus();


                        showToast(
                            "Link yapışdırıldı ✓",
                            "success"
                        );


                        return;

                    }

                }


                videoUrlInput.focus();


                showToast(
                    "Inputa basıb saxla → Yapışdır.",
                    "normal"
                );


            } catch (error) {

                console.log(
                    "Clipboard:",
                    error
                );


                videoUrlInput.focus();


                showToast(
                    "Inputa basıb saxla → Yapışdır.",
                    "normal"
                );

            }

        }
    );

}


/*
=========================================================
MP4 UPLOAD
=========================================================
*/

if (uploadMp4Btn) {

    uploadMp4Btn.addEventListener(
        "click",
        async () => {

            if (
                !socket ||
                !socket.connected
            ) {

                showToast(
                    "Server bağlantısı yoxdur.",
                    "error"
                );

                return;

            }


            const file =
                mp4FileInput?.files?.[0];


            if (!file) {

                showToast(
                    "Əvvəl MP4 faylı seç.",
                    "error"
                );

                return;

            }


            if (
                !file.name
                    .toLowerCase()
                    .endsWith(".mp4")
            ) {

                showToast(
                    "Yalnız MP4 faylı seç.",
                    "error"
                );

                return;

            }


            /*
            2 GB
            */

            const maxSize =
                2 *
                1024 *
                1024 *
                1024;


            if (
                file.size >
                maxSize
            ) {

                showToast(
                    "MP4 faylı maksimum 2 GB ola bilər.",
                    "error"
                );

                return;

            }


            try {

                uploadMp4Btn.disabled =
                    true;


                uploadMp4Btn.textContent =
                    "⏳ Yüklənir...";


                if (mp4Status) {

                    mp4Status.textContent =
                        "MP4 serverə yüklənir...";

                }


                const formData =
                    new FormData();


                formData.append(
                    "video",
                    file
                );


                const response =
                    await fetch(
                        "/api/upload-mp4",
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "MP4 yüklənə bilmədi."
                    );

                }


                /*
                Upload bitdi.
                İndi room-a bildiririk.
                */

                socket.emit(
                    "load-mp4",
                    {

                        videoUrl:
                            data.videoUrl,

                        title:
                            data.title ||
                            file.name.replace(
                                /\.mp4$/i,
                                ""
                            )

                    }
                );


                if (mp4Status) {

                    mp4Status.textContent =
                        "MP4 hazırdır ✓";

                }


                showToast(
                    "MP4 otağa qoşuldu 🎬",
                    "success"
                );


                mp4FileInput.value =
                    "";


            } catch (error) {

                console.error(
                    "MP4 upload:",
                    error
                );


                if (mp4Status) {

                    mp4Status.textContent =
                        error.message ||
                        "MP4 yüklənərkən xəta baş verdi.";

                }


                showToast(
                    error.message ||
                    "MP4 yüklənə bilmədi.",
                    "error"
                );


            } finally {

                uploadMp4Btn.disabled =
                    false;


                uploadMp4Btn.textContent =
                    "📁 MP4 filmi yüklə";

            }

        }
    );

}


/*
=========================================================
LOAD MP4
=========================================================
*/

function loadMP4Video(
    video
) {

    if (!mp4PlayerElement) {
        return;
    }


    if (!video.videoUrl) {

        showToast(
            "MP4 video ünvanı yoxdur.",
            "error"
        );

        return;

    }


    switchToMP4();


    playerOverlay?.classList.add(
        "hidden"
    );


    const startTime =
        Math.max(
            0,
            Number(
                video.currentTime
            ) || 0
        );


    ignorePlayerEvents =
        true;


    mp4PlayerElement.pause();


    mp4PlayerElement.src =
        video.videoUrl;


    mp4PlayerElement.load();


    const seekAndPlay =
        () => {

            try {

                if (
                    Number.isFinite(
                        startTime
                    ) &&
                    startTime > 0
                ) {

                    mp4PlayerElement.currentTime =
                        startTime;

                }

            } catch {}


            lastPlayerTime =
                startTime;


            lastKnownPlaying =
                Boolean(
                    video.playing
                );


            ignorePlayerEvents =
                false;


            /*
            Video artıq oynadılırsa
            hər iki tərəf üçün davam etdirilir
            */

            if (
                video.playing
            ) {

                mp4PlayerElement
                    .play()
                    .catch(() => {});

            }

        };


    if (
        mp4PlayerElement.readyState >=
        1
    ) {

        seekAndPlay();

    } else {

        mp4PlayerElement.addEventListener(
            "loadedmetadata",
            seekAndPlay,
            {
                once: true
            }
        );

    }

}


/*
=========================================================
MP4 PLAY
=========================================================
*/

function handleMP4Play() {

    if (
        ignorePlayerEvents
    ) {

        return;

    }


    if (
        !socket ||
        !socket.connected
    ) {

        return;

    }


    const currentTime =
        Math.max(
            0,
            Number(
                mp4PlayerElement.currentTime
            ) || 0
        );


    lastPlayerTime =
        currentTime;


    lastKnownPlaying =
        true;


    socket.emit(
        "video-play",
        {
            currentTime
        }
    );

}


/*
=========================================================
MP4 PAUSE
=========================================================
*/

function handleMP4Pause() {

    if (
        ignorePlayerEvents
    ) {

        return;

    }


    if (
        !socket ||
        !socket.connected
    ) {

        return;

    }


    const currentTime =
        Math.max(
            0,
            Number(
                mp4PlayerElement.currentTime
            ) || 0
        );


    lastPlayerTime =
        currentTime;


    lastKnownPlaying =
        false;


    socket.emit(
        "video-pause",
        {
            currentTime
        }
    );

}


/*
=========================================================
MP4 SEEK
=========================================================
*/

if (mp4PlayerElement) {

    mp4PlayerElement.addEventListener(
        "play",
        handleMP4Play
    );


    mp4PlayerElement.addEventListener(
        "pause",
        handleMP4Pause
    );


    mp4PlayerElement.addEventListener(
        "seeking",
        () => {

            if (
                ignorePlayerEvents ||
                suppressSeekEvent
            ) {

                return;

            }


            const now =
                Date.now();


            if (
                now -
                lastSyncTime <
                700
            ) {

                return;

            }


            const currentTime =
                Math.max(
                    0,
                    Number(
                        mp4PlayerElement.currentTime
                    ) || 0
                );


            lastPlayerTime =
                currentTime;


            if (
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "video-seek",
                    {
                        currentTime
                    }
                );


                lastSyncTime =
                    now;

            }

        }
    );

}


/*
=========================================================
REMOTE MP4 PLAY
=========================================================
*/

function remoteMP4Play(
    currentTime
) {

    if (!mp4PlayerElement) {
        return;
    }


    ignorePlayerEvents =
        true;


    try {

        mp4PlayerElement.currentTime =
            currentTime;

    } catch {}


    lastPlayerTime =
        currentTime;


    mp4PlayerElement
        .play()
        .catch(() => {});


    lastKnownPlaying =
        true;


    setTimeout(() => {

        ignorePlayerEvents =
            false;

    }, 900);

}


/*
=========================================================
REMOTE MP4 PAUSE
=========================================================
*/

function remoteMP4Pause(
    currentTime
) {

    if (!mp4PlayerElement) {
        return;
    }


    ignorePlayerEvents =
        true;


    try {

        mp4PlayerElement.currentTime =
            currentTime;

    } catch {}


    mp4PlayerElement.pause();


    lastPlayerTime =
        currentTime;


    lastKnownPlaying =
        false;


    setTimeout(() => {

        ignorePlayerEvents =
            false;

    }, 900);

}


/*
=========================================================
REMOTE MP4 SEEK
=========================================================
*/

function remoteMP4Seek(
    currentTime
) {

    if (!mp4PlayerElement) {
        return;
    }


    suppressSeekEvent =
        true;


    try {

        mp4PlayerElement.currentTime =
            currentTime;

    } catch {}


    lastPlayerTime =
        currentTime;


    setTimeout(() => {

        suppressSeekEvent =
            false;

    }, 900);

}


/*
=========================================================
COPY ROOM LINK
=========================================================
*/

if (copyRoomBtn) {

    copyRoomBtn.addEventListener(
        "click",
        async () => {

            const link =
                `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;


            try {

                await navigator.clipboard.writeText(
                    link
                );


                showToast(
                    "Otaq linki kopyalandı ✓",
                    "success"
                );


                copyRoomBtn.innerHTML =
                    "✓ Kopyalandı";


                setTimeout(() => {

                    copyRoomBtn.innerHTML =
                        "🔗 <span>Linki kopyala</span>";

                }, 1800);


            } catch {

                prompt(
                    "Bu linki kopyala:",
                    link
                );

            }

        }
    );

}


/*
=========================================================
SHARE ROOM
=========================================================
*/

if (shareRoomBtn) {

    shareRoomBtn.addEventListener(
        "click",
        async () => {

            const link =
                `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;


            const shareData = {

                title:
                    "Together Watch ♡",

                text:
                    `${username || "Mən"} səni birlikdə film izləməyə dəvət edir ♡`,

                url:
                    link

            };


            try {

                if (
                    navigator.share
                ) {

                    await navigator.share(
                        shareData
                    );

                    return;

                }


                await navigator.clipboard.writeText(
                    link
                );


                showToast(
                    "Link kopyalandı. İndi göndərə bilərsən ✓",
                    "success"
                );


            } catch (error) {

                if (
                    error?.name !==
                    "AbortError"
                ) {

                    prompt(
                        "Bu linki paylaş:",
                        link
                    );

                }

            }

        }
    );

}


/*
=========================================================
CHAT
=========================================================
*/

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const message =
                chatInput.value.trim();


            if (!message) {
                return;
            }


            if (
                !socket ||
                !socket.connected
            ) {

                showToast(
                    "Bağlantı yoxdur.",
                    "error"
                );

                return;

            }


            socket.emit(
                "chat-message",
                {
                    message
                }
            );


            chatInput.value =
                "";


            chatInput.focus();

        }
    );

}


/*
=========================================================
CHAT MESSAGE
=========================================================
*/

function addChatMessage(
    name,
    message,
    time
) {

    if (!chatMessages) {
        return;
    }


    const welcome =
        chatMessages.querySelector(
            ".welcome-message"
        );


    if (welcome) {

        welcome.remove();

    }


    const wrapper =
        document.createElement(
            "div"
        );


    wrapper.className =
        "message";


    const nameElement =
        document.createElement(
            "div"
        );


    nameElement.className =
        "message-name";


    nameElement.textContent =
        name;


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    bubble.textContent =
        message;


    if (time) {

        const timeElement =
            document.createElement(
                "span"
            );


        timeElement.className =
            "message-time";


        timeElement.textContent =
            time;


        bubble.appendChild(
            timeElement
        );

    }


    wrapper.appendChild(
        nameElement
    );


    wrapper.appendChild(
        bubble
    );


    chatMessages.appendChild(
        wrapper
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


/*
=========================================================
SYSTEM MESSAGE
=========================================================
*/

function addSystemMessage(
    text
) {

    if (!chatMessages) {
        return;
    }


    const element =
        document.createElement(
            "div"
        );


    element.className =
        "system-message";


    element.textContent =
        text;


    chatMessages.appendChild(
        element
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


/*
=========================================================
USERS
=========================================================
*/

function updateUsers(
    users
) {

    if (!Array.isArray(users)) {
        users = [];
    }


    if (onlineCount) {

        onlineCount.textContent =
            users.length;

    }


    if (watchingCount) {

        watchingCount.textContent =
            `${users.length} nəfər`;

    }


    if (!avatarStack) {
        return;
    }


    avatarStack.innerHTML =
        "";


    users
        .slice(0, 5)
        .forEach(
            user => {

                const avatar =
                    document.createElement(
                        "div"
                    );


                avatar.className =
                    "avatar";


                avatar.textContent =
                    getInitial(
                        user?.username
                    );


                avatar.title =
                    user?.username ||
                    "Qonaq";


                avatarStack.appendChild(
                    avatar
                );

            }
        );

}


/*
=========================================================
INITIAL
=========================================================
*/

function getInitial(
    name
) {

    return (
        String(
            name || ""
        )
            .trim()
            .charAt(0)
            .toUpperCase()
        ||
        "♡"
    );

}


/*
=========================================================
UNIFIED MEDIA CONTROLS
YouTube + MP4 üçün ortaq idarəetmə
=========================================================
*/

function isYouTubeActive() {

    return Boolean(
        currentVideo &&
        currentVideo.type === "youtube" &&
        playerReady &&
        player
    );

}


function isMP4Active() {

    return Boolean(
        currentVideo &&
        currentVideo.type === "mp4" &&
        mp4PlayerElement &&
        mp4PlayerElement.src
    );

}


function setControlsEnabled(
    enabled
) {

    [
        seekBar,
        playPauseBtn
    ].forEach(
        el => {

            if (!el) {
                return;
            }

            el.disabled =
                !enabled;

        }
    );


    if (!enabled && timeDisplay) {

        timeDisplay.textContent =
            "0:00 / 0:00";

    }

}


function togglePlayPause() {

    if (isYouTubeActive()) {

        try {

            const state =
                player.getPlayerState();


            if (state === 1) {

                player.pauseVideo();

            } else {

                player.playVideo();

            }

        } catch {}

        return;

    }


    if (isMP4Active()) {

        if (mp4PlayerElement.paused) {

            mp4PlayerElement
                .play()
                .catch(() => {});

        } else {

            mp4PlayerElement.pause();

        }

        return;

    }

}


function seekCurrentTo(
    time
) {

    if (isYouTubeActive()) {

        try {

            player.seekTo(
                time,
                true
            );

        } catch {}


        if (
            socket &&
            socket.connected
        ) {

            socket.emit(
                "video-seek",
                {
                    currentTime: time
                }
            );

        }

        return;

    }


    if (isMP4Active()) {

        try {

            mp4PlayerElement.currentTime =
                time;

        } catch {}


        if (
            socket &&
            socket.connected
        ) {

            socket.emit(
                "video-seek",
                {
                    currentTime: time
                }
            );

        }

        return;

    }

}


function getUnifiedCurrentTime() {

    if (isYouTubeActive()) {

        return safeYouTubeTime();

    }


    if (isMP4Active()) {

        return Math.max(
            0,
            Number(
                mp4PlayerElement.currentTime
            ) || 0
        );

    }


    return 0;

}


function getUnifiedDuration() {

    if (isYouTubeActive()) {

        try {

            return Math.max(
                0,
                Number(
                    player.getDuration()
                ) || 0
            );

        } catch {

            return 0;

        }

    }


    if (isMP4Active()) {

        return Math.max(
            0,
            Number(
                mp4PlayerElement.duration
            ) || 0
        );

    }


    return 0;

}


function formatTime(
    seconds
) {

    seconds =
        Math.max(
            0,
            Math.floor(
                Number(seconds) || 0
            )
        );


    const mins =
        Math.floor(
            seconds / 60
        );


    const secs =
        seconds % 60;


    const hrs =
        Math.floor(
            mins / 60
        );


    if (hrs > 0) {

        return (
            `${hrs}:` +
            `${String(mins % 60).padStart(2, "0")}:` +
            `${String(secs).padStart(2, "0")}`
        );

    }


    return (
        `${mins}:` +
        `${String(secs).padStart(2, "0")}`
    );

}


function updatePlayPauseIcon() {

    if (!playPauseBtn) {
        return;
    }


    let playing =
        false;


    if (isYouTubeActive()) {

        try {

            playing =
                player.getPlayerState() === 1;

        } catch {}

    } else if (isMP4Active()) {

        playing =
            !mp4PlayerElement.paused;

    }


    playPauseBtn.textContent =
        playing ? "⏸️" : "▶️";

}


/*
PROGRESS BAR / TIME - HƏR 400ms
*/

setInterval(
    () => {

        if (
            !currentVideo ||
            (
                !isYouTubeActive() &&
                !isMP4Active()
            )
        ) {

            return;

        }


        updatePlayPauseIcon();


        const duration =
            getUnifiedDuration();


        const current =
            getUnifiedCurrentTime();


        if (
            timeDisplay &&
            Number.isFinite(duration)
        ) {

            timeDisplay.textContent =
                `${formatTime(current)} / ${formatTime(duration)}`;

        }


        if (
            seekBar &&
            !isSeeking &&
            duration > 0
        ) {

            seekBar.max =
                String(duration);

            seekBar.value =
                String(current);

        }

    },
    400
);


if (playPauseBtn) {

    playPauseBtn.addEventListener(
        "click",
        togglePlayPause
    );

}


if (seekBar) {

    seekBar.addEventListener(
        "input",
        () => {

            isSeeking =
                true;


            const duration =
                getUnifiedDuration();


            if (
                timeDisplay &&
                duration > 0
            ) {

                timeDisplay.textContent =
                    `${formatTime(seekBar.value)} / ${formatTime(duration)}`;

            }

        }
    );


    seekBar.addEventListener(
        "change",
        () => {

            seekCurrentTo(
                Number(
                    seekBar.value
                ) || 0
            );


            setTimeout(() => {

                isSeeking =
                    false;

            }, 300);

        }
    );

}


/*
=========================================================
VOLUME
=========================================================
*/

let lastVolumeBeforeMute =
    100;

let isMuted =
    false;


function applyVolume(
    value
) {

    if (isYouTubeActive()) {

        try {

            player.setVolume(
                value
            );


            if (value <= 0) {

                player.mute();

            } else {

                player.unMute();

            }

        } catch {}

    }


    if (mp4PlayerElement) {

        mp4PlayerElement.volume =
            Math.min(
                1,
                Math.max(
                    0,
                    value / 100
                )
            );


        mp4PlayerElement.muted =
            value <= 0;

    }


    isMuted =
        value <= 0;


    if (muteBtn) {

        muteBtn.textContent =
            isMuted ? "🔇" : "🔊";

    }

}


if (volumeSlider) {

    volumeSlider.addEventListener(
        "input",
        () => {

            applyVolume(
                Number(
                    volumeSlider.value
                )
            );

        }
    );

}


if (muteBtn) {

    muteBtn.addEventListener(
        "click",
        () => {

            if (isMuted) {

                const restore =
                    lastVolumeBeforeMute > 0 ?
                        lastVolumeBeforeMute :
                        100;


                if (volumeSlider) {

                    volumeSlider.value =
                        String(restore);

                }


                applyVolume(
                    restore
                );

            } else {

                lastVolumeBeforeMute =
                    Number(
                        volumeSlider?.value
                    ) || 100;


                if (volumeSlider) {

                    volumeSlider.value =
                        "0";

                }


                applyVolume(0);

            }

        }
    );

}


/*
=========================================================
TAM EKRAN
=========================================================
*/

function isFullscreenActive() {

    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement
    );

}


function toggleFullscreen() {

    if (!videoWrapper) {
        return;
    }


    if (!isFullscreenActive()) {

        const request =
            videoWrapper.requestFullscreen ||
            videoWrapper.webkitRequestFullscreen;


        if (request) {

            request.call(
                videoWrapper
            ).catch(() => {});

        }

    } else {

        const exit =
            document.exitFullscreen ||
            document.webkitExitFullscreen;


        if (exit) {

            exit.call(
                document
            ).catch(() => {});

        }

    }

}


if (fullscreenBtn) {

    fullscreenBtn.addEventListener(
        "click",
        toggleFullscreen
    );

}


[
    "fullscreenchange",
    "webkitfullscreenchange"
].forEach(
    eventName => {

        document.addEventListener(
            eventName,
            () => {

                const active =
                    isFullscreenActive();


                videoWrapper?.classList.toggle(
                    "is-fullscreen",
                    active
                );


                fullscreenBtn.textContent =
                    active ? "⤢" : "⛶";

            }
        );

    }
);


/*
CONTROLS AUTO-HIDE (FULLSCREEN)
*/

let controlsHideTimer =
    null;


function showControlsTemporarily() {

    if (!mediaControls) {
        return;
    }


    mediaControls.classList.add(
        "controls-visible"
    );


    clearTimeout(
        controlsHideTimer
    );


    controlsHideTimer =
        setTimeout(() => {

            mediaControls.classList.remove(
                "controls-visible"
            );

        }, 3200);

}


if (videoWrapper) {

    [
        "mousemove",
        "touchstart",
        "click"
    ].forEach(
        eventName => {

            videoWrapper.addEventListener(
                eventName,
                showControlsTemporarily
            );

        }
    );

}


/*
=========================================================
SƏSLİ ƏLAQƏ (WebRTC VOICE CHAT)
=========================================================
*/

function ensureAudioContext() {

    if (!audioCtx) {

        audioCtx =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

    }


    return audioCtx;

}


function setupSpeakingDetector(
    key,
    stream,
    onSpeaking
) {

    try {

        const ctx =
            ensureAudioContext();


        const source =
            ctx.createMediaStreamSource(
                stream
            );


        const analyser =
            ctx.createAnalyser();


        analyser.fftSize =
            512;


        source.connect(
            analyser
        );


        const data =
            new Uint8Array(
                analyser.frequencyBinCount
            );


        let rafId;


        const loop =
            () => {

                analyser.getByteFrequencyData(
                    data
                );


                const avg =
                    data.reduce(
                        (a, b) => a + b,
                        0
                    ) / data.length;


                onSpeaking(
                    avg > 14
                );


                rafId =
                    requestAnimationFrame(
                        loop
                    );

            };


        loop();


        speakingDetectors[key] = {
            stop: () => cancelAnimationFrame(rafId)
        };

    } catch (error) {

        console.log(
            "Speaking detector xətası:",
            error
        );

    }

}


function stopSpeakingDetector(
    key
) {

    const detector =
        speakingDetectors[key];


    if (detector) {

        try {

            detector.stop();

        } catch {}


        delete speakingDetectors[key];

    }

}


function showVoiceStatus(
    text
) {

    if (!voiceStatusBar) {
        return;
    }


    if (voiceStatusText) {

        voiceStatusText.textContent =
            text;

    }


    voiceStatusBar.classList.remove(
        "hidden"
    );

}


function hideVoiceStatus() {

    voiceStatusBar?.classList.add(
        "hidden"
    );

}


function updateMicButtonUI() {

    if (!micToggleBtn) {
        return;
    }


    micToggleBtn.classList.remove(
        "mic-off",
        "mic-on",
        "mic-muted",
        "speaking"
    );


    if (!micEnabled) {

        micToggleBtn.textContent =
            "🎙️";

        micToggleBtn.classList.add(
            "mic-off"
        );

        micToggleBtn.title =
            "Mikrofonu aç";


        voiceHangupBtn?.classList.add(
            "hidden"
        );

        return;

    }


    voiceHangupBtn?.classList.remove(
        "hidden"
    );


    if (micMuted) {

        micToggleBtn.textContent =
            "🔇";

        micToggleBtn.classList.add(
            "mic-muted"
        );

        micToggleBtn.title =
            "Mikrofonu aç";

    } else {

        micToggleBtn.textContent =
            "🎙️";

        micToggleBtn.classList.add(
            "mic-on"
        );

        micToggleBtn.title =
            "Mikrofonu bağla (danışırsan)";

    }

}


function attachRemoteAudio(
    peerId,
    stream
) {

    let audioEl =
        remoteAudioEls[peerId];


    if (!audioEl) {

        audioEl =
            document.createElement(
                "audio"
            );

        audioEl.autoplay =
            true;

        audioEl.playsInline =
            true;

        audioEl.dataset.peerId =
            peerId;

        audioEl.style.display =
            "none";

        document.body.appendChild(
            audioEl
        );

        remoteAudioEls[peerId] =
            audioEl;

    }


    audioEl.srcObject =
        stream;


    audioEl.play().catch(() => {});


    setupSpeakingDetector(
        peerId,
        stream,
        speaking => {

            voiceStatusBar?.classList.toggle(
                "speaking",
                speaking
            );

        }
    );


    showVoiceStatus(
        "💜 Səsli əlaqə qoşuldu"
    );

}


function closePeerConnection(
    peerId
) {

    const pc =
        peerConnections[peerId];


    if (pc) {

        try {

            pc.close();

        } catch {}


        delete peerConnections[peerId];

    }


    const audioEl =
        remoteAudioEls[peerId];


    if (audioEl) {

        audioEl.srcObject =
            null;

        audioEl.remove();

        delete remoteAudioEls[peerId];

    }


    stopSpeakingDetector(
        peerId
    );


    if (
        Object.keys(peerConnections).length === 0
    ) {

        hideVoiceStatus();

    }

}


function createPeerConnection(
    peerId
) {

    const pc =
        new RTCPeerConnection(
            rtcConfig
        );


    peerConnections[peerId] =
        pc;


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    pc.addTrack(
                        track,
                        localStream
                    );

                }
            );

    }


    pc.onicecandidate =
        event => {

            if (
                event.candidate &&
                socket &&
                socket.connected
            ) {

                socket.emit(
                    "voice-signal",
                    {
                        to: peerId,
                        signal: {
                            type: "candidate",
                            candidate: event.candidate
                        }
                    }
                );

            }

        };


    pc.ontrack =
        event => {

            attachRemoteAudio(
                peerId,
                event.streams[0]
            );

        };


    pc.onconnectionstatechange =
        () => {

            if (
                [
                    "failed",
                    "closed"
                ].includes(
                    pc.connectionState
                )
            ) {

                closePeerConnection(
                    peerId
                );

            }

        };


    return pc;

}


async function callPeer(
    peerId
) {

    const pc =
        createPeerConnection(
            peerId
        );


    try {

        const offer =
            await pc.createOffer();


        await pc.setLocalDescription(
            offer
        );


        socket.emit(
            "voice-signal",
            {
                to: peerId,
                signal: {
                    type: "offer",
                    sdp: pc.localDescription
                }
            }
        );


        showVoiceStatus(
            "🎙️ Bağlanır..."
        );

    } catch (error) {

        console.error(
            "Voice offer xətası:",
            error
        );

    }

}


async function handleVoiceSignal(
    { from, signal }
) {

    if (!from || !signal) {
        return;
    }


    let pc =
        peerConnections[from];


    try {

        if (signal.type === "offer") {

            if (!pc) {

                pc =
                    createPeerConnection(
                        from
                    );

            }


            await pc.setRemoteDescription(
                new RTCSessionDescription(
                    signal.sdp
                )
            );


            const answer =
                await pc.createAnswer();


            await pc.setLocalDescription(
                answer
            );


            socket.emit(
                "voice-signal",
                {
                    to: from,
                    signal: {
                        type: "answer",
                        sdp: pc.localDescription
                    }
                }
            );

        } else if (signal.type === "answer") {

            if (pc) {

                await pc.setRemoteDescription(
                    new RTCSessionDescription(
                        signal.sdp
                    )
                );

            }

        } else if (signal.type === "candidate") {

            if (pc) {

                try {

                    await pc.addIceCandidate(
                        new RTCIceCandidate(
                            signal.candidate
                        )
                    );

                } catch {}

            }

        }

    } catch (error) {

        console.error(
            "Voice signal xətası:",
            error
        );

    }

}


async function startVoiceChat() {

    if (
        !socket ||
        !socket.connected
    ) {

        showToast(
            "Server bağlantısı yoxdur.",
            "error"
        );

        return;

    }


    try {

        localStream =
            await navigator.mediaDevices.getUserMedia({

                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }

            });

    } catch (error) {

        showToast(
            "Mikrofona icazə verilmədi 🎙️",
            "error"
        );

        return;

    }


    micEnabled =
        true;

    micMuted =
        false;


    updateMicButtonUI();


    setupSpeakingDetector(
        "local",
        localStream,
        speaking => {

            micToggleBtn?.classList.toggle(
                "speaking",
                speaking && !micMuted
            );

        }
    );


    socket.emit(
        "voice-on"
    );


    showVoiceStatus(
        "🎙️ Səsli əlaqə axtarılır..."
    );


    showToast(
        "Mikrofon aktivdir 🎙️",
        "success"
    );

}


function stopVoiceChat() {

    micEnabled =
        false;

    micMuted =
        false;


    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "voice-off"
        );

    }


    Object.keys(peerConnections).forEach(
        closePeerConnection
    );


    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        localStream =
            null;

    }


    stopSpeakingDetector(
        "local"
    );


    updateMicButtonUI();


    hideVoiceStatus();

}


function toggleMicMute() {

    if (!localStream) {
        return;
    }


    micMuted =
        !micMuted;


    localStream
        .getAudioTracks()
        .forEach(
            track => {

                track.enabled =
                    !micMuted;

            }
        );


    if (
        socket &&
        socket.connected
    ) {

        socket.emit(
            "voice-mute",
            {
                muted: micMuted
            }
        );

    }


    updateMicButtonUI();

}


if (micToggleBtn) {

    micToggleBtn.addEventListener(
        "click",
        () => {

            if (!micEnabled) {

                startVoiceChat();

            } else {

                toggleMicMute();

            }

        }
    );

}


if (voiceHangupBtn) {

    voiceHangupBtn.addEventListener(
        "click",
        stopVoiceChat
    );

}


/*
=========================================================
LEAVE
=========================================================
*/

if (leaveBtn) {

    leaveBtn.addEventListener(
        "click",
        () => {

            const accepted =
                confirm(
                    "Otaqdan çıxmaq istəyirsən?"
                );


            if (accepted) {

                leaveRoom(
                    true
                );

            }

        }
    );

}


/*
=========================================================
LEAVE ROOM
=========================================================
*/

function leaveRoom(
    returnHome = true
) {

    stopVoiceChat();


    if (socket) {

        try {

            socket.disconnect();

        } catch {}

        socket =
            null;

    }


    /*
    YouTube
    */

    if (player) {

        try {

            player.stopVideo();

            player.destroy();

        } catch {}

    }


    player =
        null;


    playerReady =
        false;


    /*
    MP4
    */

    if (mp4PlayerElement) {

        try {

            mp4PlayerElement.pause();

        } catch {}

        mp4PlayerElement.removeAttribute(
            "src"
        );

        mp4PlayerElement.load();

    }


    /*
    State
    */

    roomId =
        null;

    currentVideo =
        null;

    isHost =
        false;

    ignorePlayerEvents =
        false;

    suppressSeekEvent =
        false;


    /*
    UI
    */

    if (returnHome) {

        roomPage.classList.add(
            "hidden"
        );


        landing.classList.remove(
            "hidden"
        );


        roomCodeDisplay.textContent =
            "------";


        chatMessages.innerHTML = `
            <div class="welcome-message">

                <div class="welcome-heart">
                    ♡
                </div>

                <strong>
                    Otağa xoş gəldin
                </strong>

                <span>
                    Film başlayanda burada
                    birlikdə söhbət edə bilərsiniz.
                </span>

            </div>
        `;


        videoUrlInput.value =
            "";


        if (mp4FileInput) {

            mp4FileInput.value =
                "";

        }


        if (mp4Status) {

            mp4Status.textContent =
                "";

        }

    }

}


/*
=========================================================
AUTO JOIN
=========================================================
*/

window.addEventListener(
    "load",
    () => {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const room =
            params.get(
                "room"
            );


        if (!room) {
            return;
        }


        const cleanRoom =
            room
                .trim()
                .toUpperCase();


        const name =
            prompt(
                "Otaqda görünəcək adını yaz:",
                "Qonaq"
            );


        username =
            name?.trim() ||
            "Qonaq";


        openRoom(
            cleanRoom
        );

    }
);


/*
=========================================================
MOBILE KEYBOARD
=========================================================
*/

if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        () => {

            document.documentElement.style.setProperty(
                "--viewport-height",
                `${window.visualViewport.height}px`
            );

        }
    );

}


/*
=========================================================
INITIAL UI
=========================================================
*/

updateConnection(
    false
);


console.log(
    "Together Watch Pro Client hazırdır."
);