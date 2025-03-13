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
    toggleBtn: document.querySelector(".global-toggle-btn"),
    progressBar: document.querySelector(".progress-bar"),
    progressContainer: document.querySelector(".progress-container"),
    trackName: document.querySelector(".track-name"),
    currentTime: document.querySelector(".current-time"),
    totalTime: document.querySelector(".total-time"),
    artworkImage: document.querySelector(".track-artwork"),
    artworkPlaceholder: document.querySelector(".artwork-placeholder"),
    playerContainer: document.getElementById("global-audio-player"),
  };

  // Configure audio element
  player.audio.preload = "auto";

  // State
  let currentTrackIndex = -1;
  let isRepeatEnabled = false;
  let isPlayerHidden = true; // Default state is hidden
  let trackList = [];
  let wasPlaying = false;

  // Initialize repeat button state
  player.repeatBtn.style.opacity = "0.5";

  // Initialize toggle button icon
  updateToggleButtonIcon();

  // Function to update toggle button icon based on player state
  function updateToggleButtonIcon() {
    if (player.toggleBtn) {
      if (isPlayerHidden) {
        player.toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        player.toggleBtn.title = "Show Player";
      } else {
        player.toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        player.toggleBtn.title = "Hide Player";
      }
      
      // Ensure visibility
      player.toggleBtn.style.display = 'flex';
      player.toggleBtn.style.opacity = '1';
    }
  }

  // Toggle player visibility
  player.toggleBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevent any default behavior
    e.stopPropagation(); // Prevent event bubbling
    
    // Always allow the user to show/hide the player even if no track is loaded
    if (isPlayerHidden) {
      // Unhide player
      player.playerContainer.classList.add("active");
      player.playerContainer.classList.remove("hidden");
      isPlayerHidden = false;
    } else {
      // Hide player
      player.playerContainer.classList.add("hidden");
      isPlayerHidden = true;
    }
    
    updateToggleButtonIcon();
    saveState();
  });

  // Function to check if artwork should spin (has 'vinyl' in the name)
  const shouldArtworkSpin = (artworkElement) => {
    const artworkSrc =
      artworkElement.src || artworkElement.querySelector("img")?.src || "";
    return artworkSrc.toLowerCase().includes("vinyl");
  };

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
    const currentShowcaseArtwork = currentTrackIndex >= 0 && currentTrackIndex < allShowcaseArtworks.length ? 
      allShowcaseArtworks[currentTrackIndex] : null;

    // Update global player artwork
    if (globalArtwork) {
      if (isPlaying) {
        globalArtwork.classList.add("spinning");
        globalArtwork.classList.remove("paused");
      } else {
        // When paused, add paused class and remove spinning
        globalArtwork.classList.remove("spinning");
        globalArtwork.classList.add("paused");
      }
    }

    // Update current track artwork in showcase
    if (currentShowcaseArtwork) {
      if (isPlaying) {
        currentShowcaseArtwork.classList.add("spinning");
        currentShowcaseArtwork.classList.remove("paused");
      } else {
        // When paused, add paused class and remove spinning
        currentShowcaseArtwork.classList.remove("spinning");
        currentShowcaseArtwork.classList.add("paused");
      }
    }

    // Also update any secondary artwork if present
    if (currentTrackIndex >= 0) {
      const secondaryArtworks = document.querySelectorAll(".track-artwork-secondary");
      if (secondaryArtworks.length > 0 && currentTrackIndex < secondaryArtworks.length) {
        const currentSecondaryArtwork = secondaryArtworks[currentTrackIndex];
        if (currentSecondaryArtwork) {
          if (isPlaying) {
            currentSecondaryArtwork.classList.add("spinning");
            currentSecondaryArtwork.classList.remove("paused");
          } else {
            currentSecondaryArtwork.classList.add("paused");
          }
        }
      }
    }
  };

  // Function to stop all artwork spinning
  const stopAllArtworkSpinning = () => {
    // Stop primary artworks
    const allArtworks = document.querySelectorAll(".track-artwork");
    allArtworks.forEach((artwork) => {
      artwork.classList.remove("spinning", "paused");
    });
    
    // Stop secondary artworks
    const secondaryArtworks = document.querySelectorAll(".track-artwork-secondary");
    secondaryArtworks.forEach((artwork) => {
      artwork.classList.remove("spinning", "paused");
    });
    
    // Stop global player artwork
    const globalArtwork = document.querySelector(".global-player-info .track-artwork");
    if (globalArtwork) {
      globalArtwork.classList.remove("spinning", "paused");
    }
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
    if (player.audio.src) {
      const state = {
        src: player.audio.src,
        trackName: player.trackName.textContent,
        currentTime: player.audio.currentTime,
        isPlaying: !player.audio.paused,
        isRepeatEnabled: isRepeatEnabled,
        isPlayerHidden: isPlayerHidden,
        currentTrackIndex: currentTrackIndex,
        artworkSrc: player.artworkImage.style.display !== "none" ? player.artworkImage.src : "",
      };
      sessionStorage.setItem("audioState", JSON.stringify(state));
    } else {
      sessionStorage.removeItem("audioState");
    }
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
      isPlayerHidden = state.isPlayerHidden !== undefined ? state.isPlayerHidden : true;
      player.repeatBtn.style.opacity = isRepeatEnabled ? "1" : "0.5";

      // Restore artwork if available
      if (state.artworkSrc) {
        player.artworkImage.src = state.artworkSrc;
        player.artworkImage.style.display = "block";
        
        // Ensure proper scaling and dimensions
        player.artworkImage.style.width = "100%";
        player.artworkImage.style.height = "100%";
        player.artworkImage.style.objectFit = "contain";
        player.artworkImage.style.borderRadius = "50%";
        
        if (player.artworkPlaceholder) {
          player.artworkPlaceholder.style.display = "none";
        }
      }

      // Show player if there was a track
      if (state.src) {
        player.playerContainer.classList.add("active");
        
        // Apply hidden state if needed
        if (isPlayerHidden) {
          player.playerContainer.classList.add("hidden");
        } else {
          player.playerContainer.classList.remove("hidden");
        }
        
        updateToggleButtonIcon();
      }

      // Function to handle playback restoration
      const restorePlayback = () => {
        player.audio.currentTime = state.currentTime;
        if (state.isPlaying) {
          player.audio.play().then(() => {
            updateArtworkSpinning(true);
            player.playBtn.classList.add("playing");
            player.playBtn.querySelector("i").classList.remove("fa-play");
            player.playBtn.querySelector("i").classList.add("fa-pause");
          }).catch(error => {
            console.log("Auto-play prevented by browser:", error);
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

  // Function to set proper artwork styling
  const setProperArtworkStyling = (artworkElement) => {
    if (!artworkElement) return;
    
    // Ensure proper scaling and dimensions
    artworkElement.style.width = "100%";
    artworkElement.style.height = "100%";
    artworkElement.style.objectFit = "cover";
    artworkElement.style.borderRadius = "50%";
    artworkElement.style.margin = "0";
    artworkElement.style.padding = "0";
    artworkElement.style.display = "block";
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
        
        // Ensure proper scaling and dimensions
        player.artworkImage.style.width = "100%";
        player.artworkImage.style.height = "100%";
        player.artworkImage.style.objectFit = "contain";
        player.artworkImage.style.borderRadius = "50%";
        
        if (player.artworkPlaceholder) {
          player.artworkPlaceholder.style.display = "none";
        }
      }

      // Show the player and unhide it when a track is loaded
      player.playerContainer.classList.add("active");
      player.playerContainer.classList.remove("hidden");
      isPlayerHidden = false;
      updateToggleButtonIcon();

      // Update play button icon
      player.playBtn.classList.add("playing");
      player.playBtn.querySelector("i").classList.remove("fa-play");
      player.playBtn.querySelector("i").classList.add("fa-pause");

      player.audio.play().then(() => {
        updateArtworkSpinning(true);
      }).catch(error => {
        console.log("Auto-play prevented by browser:", error);
        // Still show the player even if autoplay is blocked
        player.playerContainer.classList.add("active");
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
        player.playBtn.classList.add("playing");
        player.playBtn.querySelector("i").classList.remove("fa-play");
        player.playBtn.querySelector("i").classList.add("fa-pause");
        player.progressBar.classList.add("playing");
      }).catch(error => {
        console.log("Play prevented by browser:", error);
      });
    } else {
      player.audio.pause();
      updateArtworkSpinning(false);
      player.playBtn.classList.remove("playing");
      player.playBtn.querySelector("i").classList.remove("fa-pause");
      player.playBtn.querySelector("i").classList.add("fa-play");
      player.progressBar.classList.remove("playing");
    }
    saveState();
  });

  // Stop
  player.stopBtn.addEventListener("click", () => {
    if (!player.audio.src) return;
    player.audio.pause();
    player.audio.currentTime = 0;
    player.playBtn.classList.remove("playing");
    player.playBtn.querySelector("i").classList.remove("fa-pause");
    player.playBtn.querySelector("i").classList.add("fa-play");
    stopAllArtworkSpinning();
    saveState();
  });

  // Restart
  player.restartBtn.addEventListener("click", () => {
    if (!player.audio.src) return;
    player.audio.currentTime = 0;
    player.audio.play().then(() => {
      updateArtworkSpinning(true);
      player.playBtn.classList.add("playing");
      player.playBtn.querySelector("i").classList.remove("fa-play");
      player.playBtn.querySelector("i").classList.add("fa-pause");
    }).catch(error => {
      console.log("Play prevented by browser:", error);
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
    
    // Ensure proper scaling and dimensions
    player.artworkImage.style.width = "100%";
    player.artworkImage.style.height = "100%";
    player.artworkImage.style.objectFit = "contain";
    player.artworkImage.style.borderRadius = "50%";
    
    if (player.artworkPlaceholder) {
      player.artworkPlaceholder.style.display = "none";
    }
    
    // Update play button icon
    player.playBtn.classList.add("playing");
    player.playBtn.querySelector("i").classList.remove("fa-play");
    player.playBtn.querySelector("i").classList.add("fa-pause");
    
    player.audio.play().then(() => {
      updateArtworkSpinning(true);
    }).catch(error => {
      console.log("Play prevented by browser:", error);
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
    
    // Ensure proper scaling and dimensions
    player.artworkImage.style.width = "100%";
    player.artworkImage.style.height = "100%";
    player.artworkImage.style.objectFit = "contain";
    player.artworkImage.style.borderRadius = "50%";
    
    if (player.artworkPlaceholder) {
      player.artworkPlaceholder.style.display = "none";
    }
    
    // Update play button icon
    player.playBtn.classList.add("playing");
    player.playBtn.querySelector("i").classList.remove("fa-play");
    player.playBtn.querySelector("i").classList.add("fa-pause");
    
    player.audio.play().then(() => {
      updateArtworkSpinning(true);
    }).catch(error => {
      console.log("Play prevented by browser:", error);
    });
    updatePlayerLayout();
    saveState();
  });

  // Progress bar click
  player.progressContainer.addEventListener("click", (e) => {
    if (!player.audio.src) return;
    const rect = player.progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    player.audio.currentTime = pos * player.audio.duration;
    saveState();
  });

  // Audio time update
  player.audio.addEventListener("timeupdate", () => {
    if (!player.audio.duration) return;
    const progress = (player.audio.currentTime / player.audio.duration) * 100;
    player.progressBar.style.width = `${progress}%`;
    player.currentTime.textContent = formatTime(player.audio.currentTime);
  });

  // Audio loaded metadata
  player.audio.addEventListener("loadedmetadata", () => {
    player.totalTime.textContent = formatTime(player.audio.duration);
  });

  // Audio ended
  player.audio.addEventListener("ended", () => {
    if (isRepeatEnabled) {
      player.audio.currentTime = 0;
      player.audio.play().then(() => {
        updateArtworkSpinning(true);
      }).catch(error => {
        console.log("Play prevented by browser:", error);
      });
    } else if (currentTrackIndex < trackList.length - 1) {
      // Play next track
      player.nextBtn.click();
    } else {
      // End of playlist
      player.playBtn.classList.remove("playing");
      player.playBtn.querySelector("i").classList.remove("fa-pause");
      player.playBtn.querySelector("i").classList.add("fa-play");
      stopAllArtworkSpinning();
    }
  });

  // Update player layout
  const updatePlayerLayout = () => {
    // Show player when a track is loaded
    if (player.audio.src) {
      player.playerContainer.classList.add("active");
    } else {
      player.playerContainer.classList.remove("active");
    }

    // Update play button icon
    if (!player.audio.paused) {
      player.playBtn.classList.add("playing");
      player.playBtn.querySelector("i").classList.remove("fa-play");
      player.playBtn.querySelector("i").classList.add("fa-pause");
    } else {
      player.playBtn.classList.remove("playing");
      player.playBtn.querySelector("i").classList.remove("fa-pause");
      player.playBtn.querySelector("i").classList.add("fa-play");
    }
  };

  // Format time (seconds to MM:SS)
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

  // Initialize
  storeTrackList();
  restoreState();
  updatePlayerLayout();
  
  // Initialize audio visualizer
  initAudioVisualizer();
  
  // Function to initialize the audio visualizer
  function initAudioVisualizer() {
    const visualizerContainer = document.getElementById('audio-visualizer');
    if (!visualizerContainer) return;
    
    // Clear any existing bars
    visualizerContainer.innerHTML = '';
    
    // Create even more bars for the visualizer (increased from 100 to 150)
    const barCount = 150;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'visualizer-bar';
      visualizerContainer.appendChild(bar);
    }
    
    // Start the animation when audio is playing, pause when paused
    player.audio.addEventListener('play', startVisualizer);
    player.audio.addEventListener('pause', pauseVisualizer);
    player.audio.addEventListener('ended', pauseVisualizer);
    
    // If audio is already playing, start the visualizer
    if (!player.audio.paused && player.audio.src) {
      startVisualizer();
    }
  }
  
  // Function to start the visualizer animation
  function startVisualizer() {
    const bars = document.querySelectorAll('.visualizer-bar');
    if (!bars.length) return;
    
    // Calculate the width of each bar to ensure they fill the container with no gaps
    const visualizerContainer = document.getElementById('audio-visualizer');
    if (visualizerContainer) {
      // Always show visualizer when playing
      visualizerContainer.style.opacity = '1';
      
      // Calculate the exact width needed to fill the container with no gaps
      const containerWidth = visualizerContainer.offsetWidth;
      const barWidth = containerWidth / bars.length;
      
      // Apply the calculated width to each bar
      bars.forEach(bar => {
        // Set exact width with no margins or padding
        bar.style.width = `${barWidth}px`;
        bar.style.margin = '0';
        bar.style.padding = '0';
        bar.style.boxSizing = 'border-box';
      });
    }
    
    // Add playing class to progress bar
    player.progressBar.classList.add("playing");
    
    // Calculate the maximum bar height (85% of the visualizer container height)
    const maxBarHeight = Math.round(visualizerContainer.offsetHeight * 0.85);
    
    // Check if bars already have animation (were paused)
    const barsHaveAnimation = bars[0].style.animation && bars[0].style.animation !== 'none';
    
    if (barsHaveAnimation) {
      // If bars already have animation, just resume it
      bars.forEach(bar => {
        bar.style.animationPlayState = 'running';
      });
    } else {
      // Animate each bar with a random height and duration
      bars.forEach((bar, index) => {
        // Random height between 5px and maxBarHeight
        const height = 5 + Math.random() * (maxBarHeight - 5);
        // Random duration between 0.4s and 1.2s
        const duration = 0.4 + Math.random() * 0.8;
        // Random delay to create a more natural effect
        const delay = Math.random() * 0.3;
        
        // Set custom properties for the animation
        bar.style.setProperty('--bar-height', `${height}px`);
        bar.style.animation = `equalizer ${duration}s ease-in-out ${delay}s infinite`;
        bar.style.animationPlayState = 'running';
        
        // Consistent opacity for cleaner look
        bar.style.opacity = '0.9';
      });
    }
  }
  
  // Function to pause the visualizer animation
  function pauseVisualizer() {
    const bars = document.querySelectorAll('.visualizer-bar');
    if (!bars.length) return;
    
    // Keep the visualizer container visible
    const visualizerContainer = document.getElementById('audio-visualizer');
    if (visualizerContainer) {
      // Keep it visible
      visualizerContainer.style.opacity = '1';
    }
    
    // Remove playing class from progress bar
    player.progressBar.classList.remove("playing");
    
    // Pause the animation for each bar (don't hide them)
    bars.forEach(bar => {
      // Pause the animation instead of stopping it
      bar.style.animationPlayState = 'paused';
      
      // Keep the current height
      // Don't set height to 0 or remove the animation
    });
  }
});
