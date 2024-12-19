document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.querySelector('.file-drop-area');
    const fileInput = document.querySelector('.file-input');
    const fileMsg = document.querySelector('.file-name');
    const formatBtns = document.querySelectorAll('.format-btn');
    const convertBtn = document.getElementById('convert-btn');
    const conversionStatus = document.querySelector('.conversion-status');
    const progressBar = document.querySelector('.converter-progress');
    const statusText = document.querySelector('.converter-status-text');
    const downloadSection = document.querySelector('.download-section');

    let selectedFormat = null;
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
            updateConvertButton();
        }
    }

    // Format selection
    formatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            formatBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedFormat = btn.dataset.format;
            updateConvertButton();
        });
    });

    function updateConvertButton() {
        convertBtn.disabled = !(selectedFile && selectedFormat);
    }

    function showError(message) {
        statusText.textContent = message;
        statusText.style.color = '#ff4081';
        progressBar.style.width = '0%';
        downloadSection.style.display = 'none';
        
        // Reset file input
        fileInput.value = '';
        selectedFile = null;
        fileMsg.textContent = '';
        updateConvertButton();
    }

    function triggerDownload(url, filename) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Convert button handler
    convertBtn.addEventListener('click', async () => {
        if (!selectedFile || !selectedFormat) return;

        const formData = new FormData();
        formData.append('audio_file', selectedFile);
        formData.append('target_format', selectedFormat);

        // Show conversion status
        conversionStatus.style.display = 'block';
        progressBar.style.width = '0%';
        statusText.style.color = '#10e1d0';
        statusText.textContent = 'Converting...';
        convertBtn.disabled = true;
        downloadSection.style.display = 'none';

        try {
            const response = await fetch('/converter', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error occurred');
            }

            const data = await response.json();

            if (data.success) {
                // Show completion
                progressBar.style.width = '100%';
                statusText.textContent = 'Conversion complete! Downloading...';
                
                // Auto trigger download
                triggerDownload(data.download_url, data.filename);
                
                // Reset form after successful conversion
                fileInput.value = '';
                selectedFile = null;
                fileMsg.textContent = '';
                formatBtns.forEach(btn => btn.classList.remove('selected'));
                selectedFormat = null;
                updateConvertButton();
                
                // Hide download section since we're auto-downloading
                downloadSection.style.display = 'none';
                
                // Show success message briefly
                setTimeout(() => {
                    statusText.textContent = 'Ready for next conversion';
                    progressBar.style.width = '0%';
                }, 3000);
            } else {
                showError(data.error || 'Conversion failed');
            }
        } catch (error) {
            console.error('Conversion error:', error);
            showError(error.message || 'Error during conversion');
        } finally {
            convertBtn.disabled = false;
        }
    });

    // Clean up when leaving the page
    window.addEventListener('beforeunload', () => {
        if (selectedFile) {
            URL.revokeObjectURL(selectedFile);
        }
    });
});