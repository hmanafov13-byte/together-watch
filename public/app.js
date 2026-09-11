/*
=========================================================
TOGETHER WATCH
CLIENT
=========================================================
*/

let socket;

let roomId = null;
let username = null;
let isHost = false;

let player = null;
let playerReady = false;

let mp4Player = null;
let currentVideoType = null;

let ignorePlayerEvents = false;
let suppressSeekEvent = false;

let lastYouTubeTime = 0;
let lastMp4Time = 0;


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

const mp4FileInput =
    document.getElementById("mp4FileInput");

const uploadMp4Btn =
    document.getElementById("uploadMp4Btn");

const mp4Status =
    document.getElementById("mp4Status");


/*
=========================================================
CREATE ROOM
=========================================================
*/

createRoomBtn.addEventListener(
    "click",
    async () => {

        try {

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

            const data =
                await response.json();

            if (!data.success) {

                alert(
                    "Otaq yaradıla bilmədi."
                );

                return;
            }

            const name =
                prompt(
                    "Otaqda görünəcək adını yaz:",
                    "Mən"
                );

            username =
                name?.trim() || "Mən";

            openRoom(
                data.roomId
            );

        } catch (error) {

            console.error(error);

            alert(
                "Serverə qoşulmaq mümkün olmadı."
            );
        }
    }
);


/*
=========================================================
JOIN MODAL
=========================================================
*/

joinExistingBtn.addEventListener(
    "click",
    () => {

        joinModal.classList.remove(
            "hidden"
        );

        setTimeout(() => {
            roomCodeInput.focus();
        }, 100);
    }
);


closeJoinModal.addEventListener(
    "click",
    () => {

        joinModal.classList.add(
            "hidden"
        );
    }
);


joinModal.addEventListener(
    "click",
    (event) => {

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


/*
=========================================================
JOIN ROOM
=========================================================
*/

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

            alert(
                "Otaq kodunu yaz."
            );

            return;
        }

        username =
            name || "Qonaq";

        openRoom(code);

        joinModal.classList.add(
            "hidden"
        );
    }
);


/*
=========================================================
ENTER KEY
=========================================================
*/

roomCodeInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Enter"
        ) {

            joinRoomBtn.click();
        }
    }
);


joinNameInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key ===
            "Enter"
        ) {

            joinRoomBtn.click();
        }
    }
);


/*
=========================================================
OPEN ROOM
=========================================================
*/

async function openRoom(code) {

    try {

        const response =
            await fetch(
                `/api/room/${code}`
            );

        const data =
            await response.json();

        if (!data.success) {

            alert(
                "Bu otaq tapılmadı. Kod düzgün deyil və ya otaq bağlanıb."
            );

            return;
        }

        roomId =
            code.toUpperCase();

        landing.classList.add(
            "hidden"
        );

        roomPage.classList.remove(
            "hidden"
        );

        roomCodeDisplay.textContent =
            roomId;

        connectSocket();

    } catch (error) {

        console.error(error);

        alert(
            "Serverə qoşulmaq mümkün olmadı."
        );
    }
}


/*
=========================================================
SOCKET CONNECTION
=========================================================
*/

function connectSocket() {

    socket = io();

    socket.on(
        "connect",
        () => {

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
    ROOM STATE
    */

    socket.on(
        "room-state",
        (state) => {

            setHost(
                state.isHost
            );

            if (
                state.video &&
                (
                    state.video.videoId ||
                    state.video.videoUrl
                )
            ) {

                movieTitle.textContent =
                    state.video.title ||
                    "Film";

                loadVideo(
                    state.video
                );
            }
        }
    );


    /*
    VIDEO LOADED
    */

    socket.on(
        "video-loaded",
        (video) => {

            movieTitle.textContent =
                video.title ||
                "Film";

            loadVideo(video);
        }
    );


    /*
    REMOTE PLAY
    */

    socket.on(
        "remote-play",
        ({ currentTime }) => {

            if (
                currentVideoType ===
                "youtube"
            ) {

                if (!playerReady)
                    return;

                ignorePlayerEvents =
                    true;

                player.seekTo(
                    currentTime,
                    true
                );

                player.playVideo();

                setTimeout(() => {

                    ignorePlayerEvents =
                        false;

                }, 700);

            } else if (
                currentVideoType ===
                "mp4"
            ) {

                if (!mp4Player)
                    return;

                ignorePlayerEvents =
                    true;

                mp4Player.currentTime =
                    currentTime;

                const promise =
                    mp4Player.play();

                if (
                    promise &&
                    promise.catch
                ) {
                    promise.catch(
                        () => {}
                    );
                }

                setTimeout(() => {

                    ignorePlayerEvents =
                        false;

                }, 700);
            }
        }
    );


    /*
    REMOTE PAUSE
    */

    socket.on(
        "remote-pause",
        ({ currentTime }) => {

            if (
                currentVideoType ===
                "youtube"
            ) {

                if (!playerReady)
                    return;

                ignorePlayerEvents =
                    true;

                player.seekTo(
                    currentTime,
                    true
                );

                player.pauseVideo();

                setTimeout(() => {

                    ignorePlayerEvents =
                        false;

                }, 700);

            } else if (
                currentVideoType ===
                "mp4"
            ) {

                if (!mp4Player)
                    return;

                ignorePlayerEvents =
                    true;

                mp4Player.currentTime =
                    currentTime;

                mp4Player.pause();

                setTimeout(() => {

                    ignorePlayerEvents =
                        false;

                }, 700);
            }
        }
    );


    /*
    REMOTE SEEK
    */

    socket.on(
        "remote-seek",
        ({ currentTime }) => {

            suppressSeekEvent =
                true;

            if (
                currentVideoType ===
                "youtube"
            ) {

                if (!playerReady)
                    return;

                player.seekTo(
                    currentTime,
                    true
                );

            } else if (
                currentVideoType ===
                "mp4"
            ) {

                if (!mp4Player)
                    return;

                mp4Player.currentTime =
                    currentTime;
            }

            setTimeout(() => {

                suppressSeekEvent =
                    false;

            }, 700);
        }
    );


    /*
    USERS
    */

    socket.on(
        "users-update",
        (users) => {

            updateUsers(users);
        }
    );


    /*
    CHAT
    */

    socket.on(
        "chat-message",
        (data) => {

            addChatMessage(
                data.username,
                data.message,
                data.time
            );
        }
    );


    /*
    SYSTEM
    */

    socket.on(
        "system-message",
        (data) => {

            addSystemMessage(
                data.text
            );
        }
    );


    /*
    NEW HOST
    */

    socket.on(
        "became-host",
        () => {

            setHost(true);

            addSystemMessage(
                "Artıq sən hostsan 👑"
            );
        }
    );


    /*
    ROOM ERROR
    */

    socket.on(
        "room-error",
        (message) => {

            alert(message);

            leaveRoom();
        }
    );
}


/*
=========================================================
HOST STATE
=========================================================
*/

function setHost(value) {

    isHost = value;

    if (isHost) {

        hostControls.classList.remove(
            "hidden"
        );

        hostBadge.classList.remove(
            "hidden"
        );

    } else {

        hostControls.classList.add(
            "hidden"
        );

        hostBadge.classList.add(
            "hidden"
        );
    }
}


/*
=========================================================
LOAD VIDEO
=========================================================
*/

function loadVideo(video) {

    currentVideoType =
        video.type;

    if (
        video.type ===
        "mp4"
    ) {

        loadMP4Video(video);

        return;
    }

    loadYouTubeVideo(
        video.videoId,
        video
    );
}


/*
=========================================================
YOUTUBE API
=========================================================
*/

function onYouTubeIframeAPIReady() {

    console.log(
        "YouTube API hazırdır."
    );
}


/*
=========================================================
LOAD YOUTUBE
=========================================================
*/

function loadYouTubeVideo(
    videoId,
    state
) {

    currentVideoType =
        "youtube";

    if (mp4Player) {

        mp4Player.pause();

        mp4Player.removeAttribute(
            "src"
        );

        mp4Player.load();

        mp4Player.classList.add(
            "hidden"
        );
    }

    playerOverlay.classList.add(
        "hidden"
    );

    const youtubeElement =
        document.getElementById(
            "player"
        );

    youtubeElement.classList.remove(
        "hidden"
    );

    if (player) {

        try {

            player.loadVideoById({
                videoId,

                startSeconds:
                    state?.currentTime ||
                    0
            });

        } catch (error) {

            console.error(error);
        }

        return;
    }


    if (
        typeof YT ===
            "undefined" ||
        !YT.Player
    ) {

        setTimeout(() => {

            loadYouTubeVideo(
                videoId,
                state
            );

        }, 500);

        return;
    }


    player =
        new YT.Player(
            "player",
            {

                videoId,

                playerVars: {

                    autoplay: 0,

                    controls: 1,

                    rel: 0,

                    modestbranding: 1,

                    playsinline: 1
                },

                events: {

                    onReady: () => {

                        playerReady =
                            true;

                        lastYouTubeTime =
                            state?.currentTime ||
                            0;

                        if (
                            state &&
                            state.currentTime
                        ) {

                            player.seekTo(
                                state.currentTime,
                                true
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
YOUTUBE PLAYER STATE
=========================================================
*/

function handleYouTubeState(
    event
) {

    if (!playerReady)
        return;

    if (
        ignorePlayerEvents
    ) {
        return;
    }

    if (!isHost)
        return;

    if (
        event.data ===
        YT.PlayerState.PLAYING
    ) {

        const currentTime =
            player.getCurrentTime();

        lastYouTubeTime =
            currentTime;

        socket.emit(
            "video-play",
            {
                currentTime
            }
        );
    }


    if (
        event.data ===
        YT.PlayerState.PAUSED
    ) {

        const currentTime =
            player.getCurrentTime();

        lastYouTubeTime =
            currentTime;

        socket.emit(
            "video-pause",
            {
                currentTime
            }
        );
    }
}


/*
=========================================================
YOUTUBE SEEK DETECTION
=========================================================
*/

setInterval(() => {

    if (
        !playerReady ||
        !player ||
        !isHost ||
        currentVideoType !==
            "youtube" ||
        suppressSeekEvent ||
        ignorePlayerEvents
    ) {
        return;
    }

    const currentTime =
        player.getCurrentTime();

    const difference =
        Math.abs(
            currentTime -
            lastYouTubeTime
        );

    /*
    Normal playback zamanı
    2 saniyədə təxminən 2 saniyə artır.
    Böyük sıçrayış varsa seek hesab edirik.
    */

    if (
        difference > 4
    ) {

        socket.emit(
            "video-seek",
            {
                currentTime
            }
        );
    }

    lastYouTubeTime =
        currentTime;

}, 1000);


/*
=========================================================
LOAD MP4
=========================================================
*/

function loadMP4Video(video) {

    currentVideoType =
        "mp4";

    /*
    YouTube gizlət
    */

    const youtubeElement =
        document.getElementById(
            "player"
        );

    youtubeElement.classList.add(
        "hidden"
    );


    /*
    MP4 player
    */

    if (!mp4Player) {

        mp4Player =
            document.createElement(
                "video"
            );

        mp4Player.id =
            "mp4Player";

        mp4Player.className =
            "mp4-player";

        mp4Player.controls =
            true;

        mp4Player.playsInline =
            true;

        mp4Player.preload =
            "metadata";

        /*
        Video wrapper-a əlavə et
        */

        const wrapper =
            document.querySelector(
                ".video-wrapper"
            );

        wrapper.insertBefore(
            mp4Player,
            playerOverlay
        );


        /*
        PLAY
        */

        mp4Player.addEventListener(
            "play",
            () => {

                if (
                    !isHost ||
                    ignorePlayerEvents
                ) {
                    return;
                }

                socket.emit(
                    "video-play",
                    {
                        currentTime:
                            mp4Player.currentTime
                    }
                );
            }
        );


        /*
        PAUSE
        */

        mp4Player.addEventListener(
            "pause",
            () => {

                if (
                    !isHost ||
                    ignorePlayerEvents
                ) {
                    return;
                }

                socket.emit(
                    "video-pause",
                    {
                        currentTime:
                            mp4Player.currentTime
                    }
                );
            }
        );


        /*
        SEEK
        */

        mp4Player.addEventListener(
            "seeking",
            () => {

                if (
                    !isHost ||
                    ignorePlayerEvents ||
                    suppressSeekEvent
                ) {
                    return;
                }

                socket.emit(
                    "video-seek",
                    {
                        currentTime:
                            mp4Player.currentTime
                    }
                );
            }
        );
    }


    mp4Player.classList.remove(
        "hidden"
    );

    mp4Player.src =
        video.videoUrl;

    mp4Player.load();

    playerOverlay.classList.add(
        "hidden"
    );


    /*
    Fayl hazır olanda vaxtı təyin et
    */

    mp4Player.addEventListener(
        "loadedmetadata",
        function setStartTime() {

            mp4Player.removeEventListener(
                "loadedmetadata",
                setStartTime
            );

            const startTime =
                Number(
                    video.currentTime
                ) || 0;

            if (
                startTime > 0
            ) {

                suppressSeekEvent =
                    true;

                mp4Player.currentTime =
                    startTime;

                setTimeout(() => {

                    suppressSeekEvent =
                        false;

                }, 500);
            }

            if (
                video.playing
            ) {

                /*
                Brauzer autoplay
                məhdudiyyətinə görə
                burada play bəzən bloklana bilər.
                */

                ignorePlayerEvents =
                    true;

                const promise =
                    mp4Player.play();

                if (
                    promise &&
                    promise.catch
                ) {

                    promise.catch(
                        () => {}
                    );
                }

                setTimeout(() => {

                    ignorePlayerEvents =
                        false;

                }, 700);
            }
        }
    );
}


/*
=========================================================
MP4 UPLOAD
=========================================================
*/

if (
    uploadMp4Btn &&
    mp4FileInput
) {

    uploadMp4Btn.addEventListener(
        "click",
        async () => {

            if (!isHost) {

                alert(
                    "Yalnız host MP4 yükləyə bilər."
                );

                return;
            }

            const file =
                mp4FileInput.files[0];

            if (!file) {

                alert(
                    "Əvvəlcə MP4 film seç."
                );

                return;
            }

            if (
                !file.name
                    .toLowerCase()
                    .endsWith(".mp4")
            ) {

                alert(
                    "Yalnız MP4 faylı seçə bilərsən."
                );

                return;
            }


            uploadMp4Btn.disabled =
                true;

            const oldText =
                uploadMp4Btn.textContent;

            uploadMp4Btn.textContent =
                "⏳ Yüklənir...";

            if (mp4Status) {

                mp4Status.textContent =
                    "Film serverə yüklənir...";
            }


            try {

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

                            body:
                                formData
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "MP4 yüklənmədi."
                    );
                }


                /*
                MP4 serverə yükləndi.
                İndi otaqdakı hamıya bildiririk.
                */

                socket.emit(
                    "load-video",
                    {
                        type: "mp4",

                        videoUrl:
                            data.videoUrl,

                        videoId: "",

                        title:
                            data.title ||
                            "Birlikdə izlədiyimiz film 🎬"
                    }
                );


                if (mp4Status) {

                    mp4Status.textContent =
                        "✓ Film hazırdır və otaqda açıldı.";
                }


                mp4FileInput.value =
                    "";

            } catch (error) {

                console.error(error);

                alert(
                    error.message ||
                    "MP4 yüklənərkən xəta baş verdi."
                );

                if (mp4Status) {

                    mp4Status.textContent =
                        "MP4 yüklənmədi.";
                }

            } finally {

                uploadMp4Btn.disabled =
                    false;

                uploadMp4Btn.textContent =
                    oldText;
            }
        }
    );
}


/*
=========================================================
YOUTUBE URL
=========================================================
*/

function extractYouTubeId(url) {

    if (!url)
        return null;

    url =
        url.trim();

    let match =
        url.match(
            /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/
        );

    if (match) {
        return match[1];
    }

    match =
        url.match(
            /youtu\.be\/([a-zA-Z0-9_-]{11})/
        );

    if (match) {
        return match[1];
    }

    match =
        url.match(
            /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
        );

    if (match) {
        return match[1];
    }

    return null;
}


/*
=========================================================
LOAD YOUTUBE BUTTON
=========================================================
*/

loadVideoBtn.addEventListener(
    "click",
    () => {

        if (!isHost) {

            alert(
                "Yalnız host filmi dəyişə bilər."
            );

            return;
        }

        const url =
            videoUrlInput.value.trim();

        const videoId =
            extractYouTubeId(url);

        if (!videoId) {

            alert(
                "Düzgün YouTube linki daxil et."
            );

            return;
        }

        socket.emit(
            "load-video",
            {
                type: "youtube",

                videoId,

                videoUrl: "",

                title:
                    "Birlikdə izlədiyimiz film 🎬"
            }
        );

        videoUrlInput.value =
            "";
    }
);


/*
=========================================================
COPY ROOM
=========================================================
*/

copyRoomBtn.addEventListener(
    "click",
    async () => {

        const link =
            `${window.location.origin}/?room=${roomId}`;

        try {

            await navigator.clipboard.writeText(
                link
            );

            const oldText =
                copyRoomBtn.innerHTML;

            copyRoomBtn.innerHTML =
                "✓ Link kopyalandı";

            setTimeout(() => {

                copyRoomBtn.innerHTML =
                    oldText;

            }, 1800);

        } catch {

            prompt(
                "Bu linki kopyala:",
                link
            );
        }
    }
);


/*
=========================================================
CHAT
=========================================================
*/

chatForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        const message =
            chatInput.value.trim();

        if (!message)
            return;

        socket.emit(
            "chat-message",
            {
                message
            }
        );

        chatInput.value =
            "";
    }
);


/*
=========================================================
ADD CHAT
=========================================================
*/

function addChatMessage(
    name,
    message,
    time
) {

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

function updateUsers(users) {

    onlineCount.textContent =
        users.length;

    watchingCount.textContent =
        `${users.length} nəfər`;

    avatarStack.innerHTML =
        "";

    users
        .slice(0, 5)
        .forEach(
            (user) => {

                const avatar =
                    document.createElement(
                        "div"
                    );

                avatar.className =
                    "avatar";

                avatar.textContent =
                    getInitial(
                        user.username
                    );

                avatar.title =
                    user.username;

                avatarStack.appendChild(
                    avatar
                );
            }
        );
}


function getInitial(name) {

    return (
        name
            ?.trim()
            ?.charAt(0)
            ?.toUpperCase()
        || "♡"
    );
}


/*
=========================================================
LEAVE
=========================================================
*/

leaveBtn.addEventListener(
    "click",
    () => {

        if (
            confirm(
                "Otaqdan çıxmaq istəyirsən?"
            )
        ) {

            leaveRoom();
        }
    }
);


function leaveRoom() {

    if (socket) {
        socket.disconnect();
    }

    roomPage.classList.add(
        "hidden"
    );

    landing.classList.remove(
        "hidden"
    );

    roomId =
        null;
}


/*
=========================================================
AUTO JOIN FROM LINK
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
            params.get("room");

        if (room) {

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
    }
);