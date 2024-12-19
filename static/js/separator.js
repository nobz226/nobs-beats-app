document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.querySelector('.file-drop-area');
    const fileInput = document.querySelector('.file-input');
    const fileMsg = document.querySelector('.file-name');
    const separateBtn = document.getElementById('separate-btn');
    const separationStatus = document.querySelector('.separation-status');
    const progressBar = document.querySelector('.separator-progress');
    const statusText = document.querySelector('.separator-status-text');
    const stemsSection = document.querySelector('.stems-section');

    let selectedFile = null;
    let currentSessionId = null;
    let downloadedStems = new Set();

    // Drag and drop handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('drag-over');
        });
    });

    dropArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            selectedFile = files[0];
            fileMsg.textContent = selectedFile.name;
            separateBtn.disabled = false;
        }
    }

    function showError(message) {
        statusText.textContent = message;
        statusText.style.color = '#ff4081';
        progressBar.style.width = '0%';
        stemsSection.style.display = 'none';
        
        // Reset file input
        fileInput.value = '';
        selectedFile = null;
        fileMsg.textContent = '';
        separateBtn.disabled = true;
    }

    function updateStemsSection(data) {
        stemsSection.style.display = 'grid';
        currentSessionId = data.session_id;
        downloadedStems.clear();
        
        // Update audio players and download buttons
        Object.entries(data.stems).forEach(([stem, url]) => {
            const card = document.querySelector(`.stem-card[data-stem="${stem}"]`);
            if (!card) return;

            const audio = card.querySelector('audio');
            const downloadBtn = card.querySelector('.download-btn');
            
            // Update audio player
            if (audio) {
                audio.src = url;
                audio.load(); // Reload the audio element with new source
            }
            
            // Update download button
            if (downloadBtn) {
                downloadBtn.href = url;
                const originalFileName = selectedFile ? selectedFile.name.split('.')[0] : 'audio';
                const downloadFilename = `${originalFileName}_${stem}.mp3`;
                
                // Remove existing listeners
                const newBtn = downloadBtn.cloneNode(true);
                downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = downloadFilename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // Track this stem as downloaded
                    downloadedStems.add(stem);

                    // If all stems have been downloaded, clean up
                    if (downloadedStems.size === Object.keys(data.stems).length) {
                        cleanupFiles();
                        statusText.textContent = 'All stems downloaded. Files cleaned up.';
                        cleanupAudioElements();
                    }
                });
            }
        });
    }

    // Clean up function for audio elements
    function cleanupAudioElements() {
        const audioElements = stemsSection.querySelectorAll('audio');
        audioElements.forEach(audio => {
            audio.pause();
            audio.src = '';
            audio.load();
        });
    }

    // Clean up server files
    function cleanupFiles() {
        if (currentSessionId) {
            fetch(`/cleanup_stems/${currentSessionId}`, {
                method: 'POST'
            }).then(response => response.json())
              .then(data => {
                  if (data.success) {
                      console.log('Stems cleaned up successfully');
                  }
              })
              .catch(error => console.error('Cleanup error:', error));
        }
    }

    separateBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // Clean up any existing files first
        if (currentSessionId) {
            cleanupFiles();
            cleanupAudioElements();
        }

        const formData = new FormData();
        formData.append('audio_file', selectedFile);

        // Show separation status
        separationStatus.style.display = 'block';
        progressBar.style.width = '0%';
        statusText.style.color = '#F5F5DC';
        statusText.textContent = 'Separating stems... This may take a few minutes.';
        separateBtn.disabled = true;
        stemsSection.style.display = 'none';

        try {
            progressBar.style.width = '50%';
            
            const response = await fetch('/separator', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Separation failed');
            }

            const data = await response.json();

            if (data.success) {
                progressBar.style.width = '100%';
                statusText.textContent = 'Separation complete! Click to download stems.';
                updateStemsSection(data);
                
                // Reset form
                fileInput.value = '';
                selectedFile = null;
                fileMsg.textContent = '';
            } else {
                showError(data.error || 'Separation failed');
            }
        } catch (error) {
            console.error('Separation error:', error);
            showError(error.message || 'Error during separation');
        } finally {
            separateBtn.disabled = false;
        }
    });

    // Clean up when leaving the page
    window.addEventListener('beforeunload', () => {
        cleanupFiles();
        cleanupAudioElements();
    });

    // Clean up when visibility changes (page refresh or navigation)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            cleanupFiles();
            cleanupAudioElements();
        }
    });
});