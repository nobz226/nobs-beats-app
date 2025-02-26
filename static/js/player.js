document.addEventListener("DOMContentLoaded", () => {
  // Player elements
  const player = {
    audio: document.getElementById("global-audio"),
    playBtn: document.querySelector(".global-play-btn"),
    stopBtn: document.querySelector(".global-stop-btn"),
    restartBtn: document.querySelector(".global-restart-btn"),
    repeatBtn: document.querySelector(".global-repeat-btn"),
    prevBtn: document.querySelector(".global-prev-btn"),
    nextBtn: document.querySelector(".global-next-btn"),
    progressBar: document.querySelector(".progress-bar"),
    progressContainer: document.querySelector(".progress-container"),
    trackName: document.querySelector(".track-name"),
    currentTime: document.querySelector(".current-time"),
    totalTime: document.querySelector(".total-time"),
    artworkImage: document.querySelector(".track-artwork"),
  };

  // Configure audio element
  player.audio.preload = "auto";

  // State
  let currentTrackIndex = -1;
  let isRepeatEnabled = false;
  let trackList = [];
  let wasPlaying = false;

  // Initialize repeat button state
  player.repeatBtn.style.opacity = "0.5";

  // Function to check if artwork should spin (has 'vinyl' in the name)
  const shouldArtworkSpin = (artworkElement) => {
    const artworkSrc =
      artworkElement.src || artworkElement.querySelector("img")?.src || "";
    return artworkSrc.toLowerCase().includes("vinyl");
  };

  // Function to manage artwork spinning
  // Function to manage artwork spinning
  const updateArtworkSpinning = (isPlaying) => {
    // Get all primary artworks
    const allShowcaseArtworks = document.querySelectorAll(
      ".track-card .track-artwork"
    );

    // Stop all artworks from spinning first
    allShowcaseArtworks.forEach((artwork) => {
      artwork.classList.remove("spinning", "paused");
    });

    // Get the global player artwork and current track's primary artwork
    const globalArtwork = document.querySelector(
      ".global-player-info .track-artwork"
    );
    const currentShowcaseArtwork = allShowcaseArtworks[currentTrackIndex];

    // Update global player artwork
    if (globalArtwork) {
      if (isPlaying) {
        globalArtwork.classList.add("spinning");
        globalArtwork.classList.remove("paused");
      } else {
        globalArtwork.classList.add("paused");
      }
    }

    // Update current track artwork in showcase
    if (currentShowcaseArtwork) {
      if (isPlaying) {
        currentShowcaseArtwork.classList.add("spinning");
        currentShowcaseArtwork.classList.remove("paused");
      } else {
        currentShowcaseArtwork.classList.add("paused");
      }
    }
  };

  // Function to stop all artwork spinning
  const stopAllArtworkSpinning = () => {
    const allArtworks = document.querySelectorAll(".track-artwork");
    allArtworks.forEach((artwork) => {
      artwork.classList.remove("spinning", "paused");
    });
  };

  // Store track list
  const storeTrackList = () => {
    const trackButtons = document.querySelectorAll(".play-track-btn");
    if (trackButtons.length > 0) {
      trackList = Array.from(trackButtons).map((button) => ({
        url: button.dataset.trackUrl,
        name: button.dataset.trackName,
        artwork: button.dataset.trackArtwork,
        artworkSecondary: button.dataset.trackArtworkSecondary,
      }));
      sessionStorage.setItem("trackList", JSON.stringify(trackList));
    }
  };

  // Save current state
  const saveState = () => {
    const state = {
      src: player.audio.src,
      trackName: player.trackName.textContent,
      currentTime: player.audio.currentTime,
      isPlaying: !player.audio.paused,
      artworkSrc: player.audio.src ? player.artworkImage.src : null,
      currentTrackIndex: currentTrackIndex,
      isRepeatEnabled: isRepeatEnabled,
    };
    sessionStorage.setItem("audioState", JSON.stringify(state));
  };

  // Handle visibility change
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      wasPlaying = !player.audio.paused;
      saveState();
    }
  });

  // Restore state
  const restoreState = () => {
    // Restore track list first
    const savedTrackList = sessionStorage.getItem("trackList");
    if (savedTrackList) {
      trackList = JSON.parse(savedTrackList);
    }

    const savedState = sessionStorage.getItem("audioState");
    if (savedState) {
      const state = JSON.parse(savedState);

      // Restore track and metadata
      player.audio.src = state.src;
      player.trackName.textContent = state.trackName;
      currentTrackIndex = state.currentTrackIndex;
      isRepeatEnabled = state.isRepeatEnabled;
      player.repeatBtn.style.opacity = isRepeatEnabled ? "1" : "0.5";

      // Restore artwork if available
      if (state.artworkSrc) {
        player.artworkImage.src = state.artworkSrc;
        player.artworkImage.style.display = "block";
      }

      // Function to handle playback restoration
      const restorePlayback = () => {
        player.audio.currentTime = state.currentTime;
        if (state.isPlaying) {
          player.audio.play().then(() => {
            updateArtworkSpinning(true);
          });
        }
      };

      // Wait for audio to be ready before restoring playback
      if (player.audio.readyState > 1) {
        restorePlayback();
      } else {
        player.audio.addEventListener("canplay", restorePlayback, {
          once: true,
        });
      }
    }
  };

  // Track card play buttons
  document.querySelectorAll(".play-track-btn").forEach((button, index) => {
    button.addEventListener("click", () => {
      stopAllArtworkSpinning();
      currentTrackIndex = index;
      const trackUrl = button.dataset.trackUrl;
      const trackName = button.dataset.trackName;
      const trackArtwork = button.dataset.trackArtwork;

      player.audio.src = trackUrl;
      player.trackName.textContent = trackName;
      if (trackArtwork) {
        player.artworkImage.src = trackArtwork;
        player.artworkImage.style.display = "block";
      }

      player.audio.play().then(() => {
        updateArtworkSpinning(true);
      });
      updatePlayerLayout();
      storeTrackList();
      saveState();
    });
  });

  // Play/Pause
  player.playBtn.addEventListener("click", () => {
    if (!player.audio.src) return;
    if (player.audio.paused) {
      player.audio.play().then(() => {
        updateArtworkSpinning(true);
      });
    } else {
      player.audio.pause();
      updateArtworkSpinning(false);
    }
    saveState();
  });

  // Stop
  player.stopBtn.addEventListener("click", () => {
    if (!player.audio.src) return;
    player.audio.pause();
    player.audio.currentTime = 0;
    player.playBtn.classList.remove("playing");
    stopAllArtworkSpinning();
    saveState();
  });

  // Restart
  player.restartBtn.addEventListener("click", () => {
    if (!player.audio.src) return;
    player.audio.currentTime = 0;
    player.audio.play().then(() => {
      updateArtworkSpinning(true);
    });
    saveState();
  });

  // Repeat
  player.repeatBtn.addEventListener("click", () => {
    isRepeatEnabled = !isRepeatEnabled;
    player.repeatBtn.style.opacity = isRepeatEnabled ? "1" : "0.5";
    saveState();
  });

  // Previous track
  player.prevBtn.addEventListener("click", () => {
    if (trackList.length === 0 || currentTrackIndex === -1) return;
    stopAllArtworkSpinning();
    currentTrackIndex =
      (currentTrackIndex - 1 + trackList.length) % trackList.length;
    const track = trackList[currentTrackIndex];
    player.audio.src = track.url;
    player.trackName.textContent = track.name;
    player.artworkImage.src = track.artwork;
    player.artworkImage.style.display = "block";
    player.audio.play().then(() => {
      updateArtworkSpinning(true);
    });
    updatePlayerLayout();
    saveState();
  });

  // Next track
  player.nextBtn.addEventListener("click", () => {
    if (trackList.length === 0 || currentTrackIndex === -1) return;
    stopAllArtworkSpinning();
    currentTrackIndex = (currentTrackIndex + 1) % trackList.length;
    const track = trackList[currentTrackIndex];
    player.audio.src = track.url;
    player.trackName.textContent = track.name;
    player.artworkImage.src = track.artwork;
    player.artworkImage.style.display = "block";
    player.audio.play().then(() => {
      updateArtworkSpinning(true);
    });
    updatePlayerLayout();
    saveState();
  });

  // Progress bar
  player.progressContainer.addEventListener("click", (e) => {
    if (!player.audio.src) return;
    const percent = e.offsetX / player.progressContainer.offsetWidth;
    player.audio.currentTime = percent * player.audio.duration;
    saveState();
  });

  // Time update
  player.audio.addEventListener("timeupdate", () => {
    const progress = (player.audio.currentTime / player.audio.duration) * 100;
    player.progressBar.style.width = `${progress}%`;
    player.currentTime.textContent = formatTime(player.audio.currentTime);
    player.totalTime.textContent = formatTime(player.audio.duration);
  });

  // Audio events
  player.audio.addEventListener("play", () => {
    player.playBtn.classList.add("playing");
    updateArtworkSpinning(true);
    saveState();
  });

  player.audio.addEventListener("pause", () => {
    player.playBtn.classList.remove("playing");
    updateArtworkSpinning(false);
    saveState();
  });

  player.audio.addEventListener("ended", () => {
    if (isRepeatEnabled) {
      player.audio.currentTime = 0;
      player.audio.play().then(() => {
        updateArtworkSpinning(true);
      });
    } else {
      stopAllArtworkSpinning();
      player.nextBtn.click();
    }
  });

  // Artwork visibility handler
  const updatePlayerLayout = () => {
    const hasTrack = player.audio.src !== "";
    const playerInfo = document.querySelector(".global-player-info");

    if (hasTrack && player.artworkImage.src) {
      player.artworkImage.classList.add("active");
      playerInfo.classList.add("has-artwork");
    } else {
      player.artworkImage.classList.remove("active");
      playerInfo.classList.remove("has-artwork");
      player.artworkImage.style.display = "none";
    }
  };

  // Update layout when loading new track
  player.audio.addEventListener("loadstart", updatePlayerLayout);

  // Format time helper
  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Save state before page unload
  window.addEventListener("beforeunload", saveState);

  // Initialize
  storeTrackList();
  restoreState();
  updatePlayerLayout();
});
