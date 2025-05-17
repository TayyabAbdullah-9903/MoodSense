// Updated JavaScript for MoodSense App
document.addEventListener('DOMContentLoaded', function() {
    // Tab navigation
    const tabItems = document.querySelectorAll('.sidebar nav ul li');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all tabs
            tabItems.forEach(tab => tab.classList.remove('active'));
            // Add active class to clicked tab
            item.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.style.display = 'none');
            // Show the corresponding tab content
            const tabId = item.getAttribute('data-tab');
            document.getElementById(tabId).style.display = 'block';
        });
    });

    // Upload photo tab elements
    const uploadContainer = document.getElementById('upload-container');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.querySelector('.preview-container');
    const previewImage = document.getElementById('preview-image');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsSection = document.getElementById('results-section');
    const expressionResult = document.getElementById('expression-result');
    const resultEmojiIcon = document.getElementById('result-emoji-icon');
    const tipsList = document.getElementById('tips-list');
    const tryAgainBtn = document.getElementById('try-again-btn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // History storage
    let expressionHistory = localStorage.getItem('moodSenseHistory') ? 
        JSON.parse(localStorage.getItem('moodSenseHistory')) : [];
    
    // Update history display
    function updateHistoryDisplay() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        
        if (expressionHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-history">Your analyzed expressions will appear here.</p>';
            return;
        }
        
        expressionHistory.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const emoji = getEmojiForExpression(item.expression);
            
            historyItem.innerHTML = `
                <div class="history-emoji">${emoji}</div>
                <div class="history-details">
                    <h4>${item.expression}</h4>
                    <div class="history-date">${item.date}</div>
                </div>
            `;
            
            historyList.appendChild(historyItem);
        });
    }
    
    // Get emoji based on expression
    function getEmojiForExpression(expression) {
        const emojis = {
            'Angry': '😡',
            'Disgust': '🤢',
            'Fear': '😨',
            'Happy': '😊',
            'Sad': '😔',
            'Surprise': '😲',
            'Neutral': '😐'
        };
        
        return emojis[expression] || '😊';
    }
    
    // Add new entry to history
    function addToHistory(expression) {
        const now = new Date();
        const formattedDate = `${now.toLocaleDateString()} - ${now.toLocaleTimeString()}`;
        
        expressionHistory.unshift({
            expression: expression,
            date: formattedDate
        });
        
        // Keep only the last 10 entries
        if (expressionHistory.length > 10) {
            expressionHistory = expressionHistory.slice(0, 10);
        }
        
        // Save to local storage
        localStorage.setItem('moodSenseHistory', JSON.stringify(expressionHistory));
        
        // Update the display
        updateHistoryDisplay();
    }

    // Add drag and drop events
    uploadContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = 'var(--primary-color)';
    });

    uploadContainer.addEventListener('dragleave', () => {
        uploadContainer.style.borderColor = 'var(--gray-300)';
    });

    uploadContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadContainer.style.borderColor = 'var(--gray-300)';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });

    // File input change event
    fileInput.addEventListener('change', handleFileSelect);

    function handleFileSelect() {
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                previewContainer.style.display = 'block';
                document.querySelector('.upload-default').style.display = 'none';
                analyzeBtn.disabled = false;
            };
            
            reader.readAsDataURL(fileInput.files[0]);
        }
    }

    // Click on upload container
    uploadContainer.addEventListener('click', function() {
        fileInput.click();
    });

    // Analyze button click event
    analyzeBtn.addEventListener('click', analyzeExpression);

    function analyzeExpression() {
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Create form data
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        // Send request to server
        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            
            // Display results
            expressionResult.textContent = data.expression;
            resultEmojiIcon.textContent = getEmojiForExpression(data.expression);
            
            // Add to history
            addToHistory(data.expression);
            
            // Add tips to list
            tipsList.innerHTML = '';
            data.tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                tipsList.appendChild(li);
            });
            
            // Show results section
            resultsSection.style.display = 'block';
        })
        .catch(error => {
            loadingOverlay.style.display = 'none';
            alert('Error analyzing image: ' + error.message);
        });
    }

    // Try again button click event
    tryAgainBtn.addEventListener('click', resetUI);

    function resetUI() {
        // Reset UI elements
        previewContainer.style.display = 'none';
        document.querySelector('.upload-default').style.display = 'block';
        analyzeBtn.disabled = true;
        resultsSection.style.display = 'none';
        
        // Reset file input
        fileInput.value = '';
    }

    // Webcam functionality 
    const webcamElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('canvas');
    const startCameraBtn = document.getElementById('start-camera');
    const stopCameraBtn = document.getElementById('stop-camera');
    const captureBtn = document.getElementById('capture-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');
    const countdownNumber = document.querySelector('.countdown-number');
    const cameraResultsSection = document.getElementById('camera-results-section');
    const cameraExpressionResult = document.getElementById('camera-expression-result');
    const cameraResultEmoji = document.getElementById('camera-result-emoji');
    const cameraTipsList = document.getElementById('camera-tips-list');
    const newCaptureBtn = document.getElementById('new-capture-btn');
    
    let stream = null;
    
    // Start camera
    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: true,
                audio: false
            });
            
            webcamElement.srcObject = stream;
            
            startCameraBtn.disabled = true;
            stopCameraBtn.disabled = false;
            captureBtn.disabled = false;
            
            cameraResultsSection.style.display = 'none';
        } catch (error) {
            alert(`Error accessing camera: ${error.message}`);
        }
    });
    
    // Stop camera
    stopCameraBtn.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            webcamElement.srcObject = null;
            
            startCameraBtn.disabled = false;
            stopCameraBtn.disabled = true;
            captureBtn.disabled = true;
        }
    });
    
    // Capture image
    captureBtn.addEventListener('click', () => {
        // Start countdown
        countdownOverlay.style.display = 'flex';
        let countdown = 5;
        countdownNumber.textContent = countdown;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            countdownNumber.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                captureImage();
            }
        }, 1000);
    });
    
    function captureImage() {
        // Display canvas and capture image
        canvasElement.width = webcamElement.videoWidth;
        canvasElement.height = webcamElement.videoHeight;
        canvasElement.getContext('2d').drawImage(webcamElement, 0, 0);
        
        // Convert to data URL
        const imageData = canvasElement.toDataURL('image/jpeg');
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Send to server
        fetch('/analyze_webcam', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_data: imageData })
        })
        .then(response => response.json())
        .then(data => {
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            
            // Display results
            cameraExpressionResult.textContent = data.expression;
            cameraResultEmoji.textContent = getEmojiForExpression(data.expression);
            
            // Add to history
            addToHistory(data.expression);
            
            // Add tips to list
            cameraTipsList.innerHTML = '';
            data.tips.forEach(tip => {
                const li = document.createElement('li');
                li.textContent = tip;
                cameraTipsList.appendChild(li);
            });
            
            // Show results section
            cameraResultsSection.style.display = 'block';
        })
        .catch(error => {
            loadingOverlay.style.display = 'none';
            alert('Error analyzing image: ' + error.message);
        });
    }
    
    // New capture button
    newCaptureBtn.addEventListener('click', () => {
        cameraResultsSection.style.display = 'none';
    });
    
    // Initialize history display
    updateHistoryDisplay();
});