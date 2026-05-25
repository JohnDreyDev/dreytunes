const uploadedSongs = [];
const queue = [];
let currentSong = null;
const ITUNES_API_URL = "https://itunes.apple.com/search";
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const songList = document.getElementById("songList");
const resultCount = document.getElementById("resultCount");
const audioPlayer = document.getElementById("audioPlayer");
const nowPlayingTitle = document.getElementById("nowPlayingTitle");
const nowPlayingArtist = document.getElementById("nowPlayingArtist");
const fileUpload = document.getElementById("fileUpload");
const queueList = document.getElementById("queueList");
const queueCount = document.getElementById("queueCount");
const queueButton = document.getElementById("queueButton");
const downloadButton = document.getElementById("downloadButton");
const dropOverlay = document.getElementById("dropOverlay");
const STORAGE_KEY = "music-player-queue";
let dragCounter = 0;

function sanitizeFileName(text) {
    return text.replace(/[^a-z0-9.\- _]/gi, "_");
}

function highlightText(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, String.raw `\$&`);
    return text.replace(new RegExp(escaped, "gi"), match => `<mark>${match}</mark>`);
}

function getLibrary() {
    return [...uploadedSongs];
}

function searchUploadSongs(query) {
    const lowerQuery = query.toLowerCase();
    return getLibrary().map(song => ({
        ...song,
        highlightedTitle: highlightText(song.title, query),
        highlightedArtist: highlightText(song.artist, query),
        highlightedGenre: highlightText(song.genre, query)
    })).filter(song => {
        return [song.title, song.artist, song.genre].some(field => field.toLowerCase().includes(lowerQuery));
    });
}

function mapApiResults(results, query) {
    return results.map(result => ({
        id: `itunes-${result.trackId}`,
        title: result.trackName,
        artist: result.artistName,
        genre: result.primaryGenreName || "Music",
        url: result.previewUrl,
        source: "iTunes",
        full: false,
        highlightedTitle: highlightText(result.trackName, query),
        highlightedArtist: highlightText(result.artistName, query),
        highlightedGenre: highlightText(result.primaryGenreName || "Music", query)
    }));
}

async function fetchItunesSongs(query) {
    try {
        const url = `${ITUNES_API_URL}?term=${encodeURIComponent(query)}&entity=song&limit=20&media=music&country=US`;
        const response = await fetch(url);
        const data = await response.json();
        return mapApiResults(data.results || [], query);
    } catch (error) {
        console.error("iTunes search failed:", error);
        return [];
    }
}

function renderSongs(list) {
    songList.innerHTML = "";
    resultCount.textContent = `Showing ${list.length} ${list.length === 1 ? "song" : "songs"}`;

    if (!list.length) {
        songList.innerHTML = `<li class="song-item"><div class="song-meta"><p class="song-title">No matching songs found.</p><p class="song-subtitle">Try another search.</p></div></li>`;
        return;
    }

    list.forEach(song => {
        const listItem = document.createElement("li");
        listItem.className = "song-item";

        const meta = document.createElement("div");
        meta.className = "song-meta";
        meta.innerHTML = `
      <p class="song-title">${song.highlightedTitle || song.title}</p>
      <p class="song-subtitle">${song.highlightedArtist || song.artist} · ${song.highlightedGenre || song.genre}
        <span class="tag">${song.source || "Upload"}${song.full ? " · Full" : " · Preview"}</span>
      </p>
    `;

        const actions = document.createElement("div");
        actions.className = "song-actions";

        const playButton = document.createElement("button");
        playButton.textContent = "Play";
        playButton.addEventListener("click", () => playSong(song));

        const queueButtonItem = document.createElement("button");
        queueButtonItem.textContent = "Queue";
        queueButtonItem.className = "queue";
        queueButtonItem.addEventListener("click", () => addToQueue(song));

        const downloadItem = document.createElement("a");
        downloadItem.className = "download-button";
        downloadItem.textContent = song.full ? "Download" : "Download Preview";
        downloadItem.href = song.url;
        downloadItem.target = "_blank";
        downloadItem.setAttribute("download", sanitizeFileName(`${song.title}-${song.artist}`) + ".mp3");

        const youtubeLink = document.createElement("a");
        youtubeLink.className = "youtube-button";
        youtubeLink.textContent = "YouTube";
        youtubeLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + " " + song.artist)}`;
        youtubeLink.target = "_blank";
        youtubeLink.rel = "noopener noreferrer";

        actions.appendChild(playButton);
        actions.appendChild(queueButtonItem);
        actions.appendChild(downloadItem);
        actions.appendChild(youtubeLink);
        listItem.appendChild(meta);
        listItem.appendChild(actions);
        songList.appendChild(listItem);
    });
}

function updateDownloadButton() {
    if (!currentSong) {
        downloadButton.classList.add("disabled");
        downloadButton.href = "#";
        downloadButton.removeAttribute("download");
        downloadButton.textContent = "Download";
        return;
    }

    downloadButton.classList.remove("disabled");
    downloadButton.href = currentSong.url;
    downloadButton.target = "_blank";
    const filename = sanitizeFileName(`${currentSong.title}-${currentSong.artist}`) + ".mp3";
    downloadButton.setAttribute("download", filename);
    downloadButton.textContent = currentSong.full ? "Download Full Track" : "Download Preview";
}

function updateQueueButton() {
    queueButton.disabled = !currentSong;
}

function persistQueue() {
    const savedQueue = queue.filter(song => song.source !== "Upload");
    if (savedQueue.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueue));
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

function restoreQueue() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
        const parsed = JSON.parse(saved);
        parsed.forEach(song => queue.push(song));
    } catch (error) {
        console.warn("Could not restore saved queue:", error);
    }
}

function renderQueue() {
    queueList.innerHTML = "";
    queueCount.textContent = `${queue.length} ${queue.length === 1 ? "track" : "tracks"} queued`;

    if (!queue.length) {
        queueList.innerHTML = `<li class="queue-item"><p>No tracks in queue yet. Add songs from search results or upload your own.</p></li>`;
        persistQueue();
        return;
    }

    queue.forEach((song, index) => {
        const item = document.createElement("li");
        item.className = "queue-item";

        const info = document.createElement("p");
        info.textContent = `${song.title} · ${song.artist}`;

        const removeButton = document.createElement("button");
        removeButton.textContent = "Remove";
        removeButton.addEventListener("click", () => {
            queue.splice(index, 1);
            renderQueue();
        });

        item.appendChild(info);
        item.appendChild(removeButton);
        queueList.appendChild(item);
    });

    persistQueue();
}

function playSong(song) {
    currentSong = song;
    audioPlayer.src = song.url;
    audioPlayer.play().catch(() => {
        // autoplay may be blocked; user can press play manually
    });
    nowPlayingTitle.textContent = song.title;
    nowPlayingArtist.textContent = `${song.artist} · ${song.genre}`;
    updateDownloadButton();
    updateQueueButton();
}

function addToQueue(song) {
    queue.push(song);
    renderQueue();
}

function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
}

function setDragActive(active) {
    document.body.classList.toggle("dragging", active);
}

function handleFiles(files) {
    const fileList = Array.from(files || []);
    fileList.forEach((file, index) => {
        if (!file.type.startsWith("audio/")) return;
        const objectUrl = URL.createObjectURL(file);
        uploadedSongs.unshift({
            id: `upload-${Date.now()}-${index}`,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Uploaded",
            genre: "Uploaded",
            url: objectUrl,
            source: "Upload",
            full: true
        });
    });
    renderSongs(getLibrary());
}

function handleDrop(files) {
    setDragActive(false);
    handleFiles(files);
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) {
        renderSongs([]);
        return;
    }

    resultCount.textContent = "Loading results...";
    const [apiResults, uploadResults] = await Promise.all([
        fetchItunesSongs(query),
        Promise.resolve(searchUploadSongs(query))
    ]);

    renderSongs([...uploadResults, ...apiResults]);
}

function handleUpload(event) {
    handleFiles(event.target.files);
    event.target.value = "";
}

searchButton.addEventListener("click", performSearch);
searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") performSearch();
});
queueButton.addEventListener("click", () => {
    if (currentSong) addToQueue(currentSong);
});
fileUpload.addEventListener("change", handleUpload);
audioPlayer.addEventListener("ended", () => {
    if (queue.length) {
        playSong(queue.shift());
        renderQueue();
    }
});

document.addEventListener("dragenter", event => {
    preventDefault(event);
    dragCounter += 1;
    setDragActive(true);
});
document.addEventListener("dragover", preventDefault);
document.addEventListener("dragleave", event => {
    preventDefault(event);
    dragCounter -= 1;
    if (dragCounter <= 0) {
        dragCounter = 0;
        setDragActive(false);
    }
});
document.addEventListener("drop", event => {
    preventDefault(event);
    dragCounter = 0;
    handleDrop(event.dataTransfer.files);
});

renderSongs(getLibrary());
restoreQueue();
renderQueue();