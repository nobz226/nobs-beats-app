document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.querySelector('.file-drop-area');
    const fileInput = document.querySelector('.file-input');
    const fileMsg = document.querySelector('.file-name');
    const analyzeBtn = document.getElementById('analyze-btn');
    const analysisStatus = document.querySelector('.analysis-status');
    const progressBar = document.querySelector('.analyzer-progress');
    const statusText = document.querySelector('.analyzer-status-text');
    const resultsSection = document.querySelector('.results-section');
    const tempoValue = document.querySelector('.tempo-value');
    const keyValue = document.querySelector('.key-value');

    let selectedFile = null;

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
            analyzeBtn.disabled = false;
        }
    }

    function showError(message) {
        statusText.textContent = message;
        statusText.style.color = '#ff4081';
        progressBar.style.width = '0%';
        resultsSection.style.display = 'none';
    }

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('audio_file', selectedFile);

        // Show analysis status
        analysisStatus.style.display = 'block';
        progressBar.style.width = '0%';
        statusText.style.color = '#F5F5DC';
        statusText.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;
        resultsSection.style.display = 'none';

        try {
            progressBar.style.width = '50%';
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const data = await response.json();

            if (data.success) {
                progressBar.style.width = '100%';
                statusText.textContent = 'Analysis complete!';
                
                // Display results
                resultsSection.style.display = 'flex';
                tempoValue.textContent = `${data.tempo} BPM`;
                keyValue.textContent = data.key;
                
                // Reset form
                fileInput.value = '';
                selectedFile = null;
                fileMsg.textContent = '';
                
                // Hide progress after a delay
                setTimeout(() => {
                    analysisStatus.style.display = 'none';
                }, 3000);
            } else {
                showError(data.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            showError(error.message || 'Error during analysis');
        } finally {
            analyzeBtn.disabled = false;
        }
    });
});