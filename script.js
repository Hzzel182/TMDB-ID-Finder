const audio = document.getElementById('audio');
const playPauseBtn = document.getElementById('play-pause-btn');
const playPauseIcon = document.getElementById('play-pause-icon');
const repeatBtn = document.getElementById('repeat-btn');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');

// Capturar parámetros dinámicos desde la URL
const urlParams = new URLSearchParams(window.location.search);
const songTitle = urlParams.get('title');
const songArtist = urlParams.get('artist');
const songFile = urlParams.get('song');
const coverFile = urlParams.get('cover');

// Aplicar cambios si vienen definidos en el link
if (songTitle) document.querySelector('.track-title').textContent = songTitle;
if (songArtist) document.querySelector('.track-artist').textContent = songArtist;
if (coverFile) document.getElementById('cover-img').src = coverFile;

if (songFile) {
    audio.src = songFile;
    audio.load(); // Carga de forma limpia y directa el nuevo audio
}

// Inicializar estado de reproducción y autoplay
document.addEventListener('DOMContentLoaded', () => {
    audio.volume = 0.8;
    audio.play().then(() => {
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
    }).catch(error => {
        console.log("Autoplay bloqueado por políticas del navegador:", error);
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    });
});

// Control de Play / Pause
playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
    } else {
        audio.pause();
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    }
});

// Control de Repetir (Loop)
repeatBtn.addEventListener('click', () => {
    audio.loop = !audio.loop;
    repeatBtn.classList.toggle('active', audio.loop);
});

// Actualizar barra de progreso
audio.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audio;
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }
});

// Permitir saltar en la canción haciendo clic en la barra
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    audio.currentTime = (clickX / width) * duration;
});

// Sincronizar icono si termina y el loop está desactivado
audio.addEventListener('ended', () => {
    if (!audio.loop) {
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    }
});
