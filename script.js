// Global variables
let currentReport = null;
let analysisChart = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("AI Video Detector initialized");
    
    // Set up file input change listener
    const videoInput = document.getElementById('videoInput');
    if (videoInput) {
        videoInput.addEventListener('change', handleFileSelect);
    }
    
    // Set up drag and drop
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
        setupDragAndDrop(uploadArea);
    }
    
    // Show upload tab by default
    showTab('upload');
});

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-file-video"></i>
                <h4>${file.name}</h4>
                <p class="text-muted">${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis</p>
                <button class="btn btn-sm btn-outline-primary mt-2" onclick="document.getElementById('videoInput').click()">
                    Change File
                </button>
            `;
        }
        showMessage(`Selected: ${file.name}`, 'info');
    }
}

// Setup drag and drop functionality
function setupDragAndDrop(uploadArea) {
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.borderColor = '#4a00e0';
        this.style.background = 'rgba(142, 45, 226, 0.15)';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.borderColor = '#8e2de2';
        this.style.background = 'rgba(142, 45, 226, 0.05)';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.borderColor = '#8e2de2';
        this.style.background = 'rgba(142, 45, 226, 0.05)';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                document.getElementById('videoInput').files = files;
                this.innerHTML = `
                    <i class="fas fa-file-video"></i>
                    <h4>${file.name}</h4>
                    <p class="text-muted">${(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis</p>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="document.getElementById('videoInput').click()">
                        Change File
                    </button>
                `;
                showMessage(`File dropped: ${file.name}`, 'info');
            } else {
                showMessage('Please drop a video file', 'warning');
            }
        }
    });
}

// Show/hide tabs
function showTab(tabName) {
    // Hide all tabs
    document.getElementById('uploadTab').style.display = 'none';
    document.getElementById('historyTab').style.display = 'none';
    document.getElementById('trainTab').style.display = 'none';
    document.getElementById('statsTab').style.display = 'none';
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to clicked nav link
    const activeLink = document.querySelector(`a[href="#"][onclick*="${tabName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').style.display = 'block';
    
    // Load content if needed
    if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'stats') {
        loadStats();
    }
}

// Show loading overlay
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show message/alert
function showMessage(message, type = 'info') {
    const statusDiv = document.getElementById('uploadStatus');
    if (!statusDiv) return;
    
    const alertClass = {
        'success': 'alert-success',
        'danger': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    statusDiv.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    // Auto-remove after 5 seconds for success/info messages
    if (type !== 'danger' && type !== 'warning') {
        setTimeout(() => {
            if (statusDiv.firstChild) {
                statusDiv.firstChild.remove();
            }
        }, 5000);
    }
}

// Analyze video function
function analyzeVideo() {
    const fileInput = document.getElementById('videoInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showMessage('Please select a video file first', 'warning');
        return;
    }
    
    // Check file size (200MB limit)
    if (file.size > 200 * 1024 * 1024) {
        showMessage('File size exceeds 200MB limit', 'danger');
        return;
    }
    
    const formData = new FormData();
    formData.append('video', file);
    
    showLoading();
    showMessage('Analyzing video... This may take a minute.', 'info');
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        hideLoading();
        
        if (data.error) {
            showMessage('Error: ' + data.error, 'danger');
            return;
        }
        
        currentReport = data;
        displayResults(data);
        showMessage('Analysis complete!', 'success');
    })
    .catch(error => {
        hideLoading();
        showMessage('Error: ' + error.message, 'danger');
        console.error('Error:', error);
    });
}

// Display analysis results
function displayResults(report) {
    // Show results section
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Update basic info
    document.getElementById('videoFilename').textContent = report.filename;
    document.getElementById('videoDuration').textContent = report.duration.toFixed(2);
    document.getElementById('totalFrames').textContent = report.total_frames;
    document.getElementById('analyzedFrames').textContent = report.frames_analyzed;
    
    // Update percentages
    const aiPercent = report.fake_percentage;
    const realPercent = 100 - aiPercent;
    
    document.getElementById('aiPercentage').textContent = aiPercent.toFixed(1) + '%';
    document.getElementById('realPercent').textContent = realPercent.toFixed(1) + '%';
    document.getElementById('fakePercent').textContent = aiPercent.toFixed(1) + '%';
    
    document.getElementById('aiProgress').style.width = aiPercent + '%';
    document.getElementById('realProgress').style.width = realPercent + '%';
    
    // Update verdict
    document.getElementById('verdictText').textContent = report.verdict;
    document.getElementById('confidenceText').textContent = 'Confidence: ' + report.confidence_level;
    
    const verdictBadge = document.getElementById('verdictBadge');
    verdictBadge.style.background = report.verdict_color === 'danger' 
        ? 'linear-gradient(45deg, #ff416c, #ff4b2b)' 
        : report.verdict_color === 'warning'
        ? 'linear-gradient(45deg, #ff9a00, #ff9a00)'
        : 'linear-gradient(45deg, #00b09b, #96c93d)';
    
    document.getElementById('verdictIcon').className = report.verdict_icon;
    
    // Create chart
    if (analysisChart) {
        analysisChart.destroy();
    }
    
    const ctx = document.getElementById('analysisChart').getContext('2d');
    analysisChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: report.frame_results.map(f => f.time.toFixed(1) + 's'),
            datasets: [{
                label: 'AI Probability',
                data: report.frame_results.map(f => f.fake_prob),
                borderColor: '#ff416c',
                backgroundColor: 'rgba(255, 65, 108, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }, {
                label: 'Real Probability',
                data: report.frame_results.map(f => f.real_prob),
                borderColor: '#00b09b',
                backgroundColor: 'rgba(0, 176, 155, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Frame-by-Frame Analysis',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                }
            }
        }
    });
    
    // Display frame thumbnails
    const frameGrid = document.getElementById('frameGrid');
    if (frameGrid) {
        frameGrid.innerHTML = '';
        
        report.frame_results.forEach(frame => {
            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 mb-3';
            
            col.innerHTML = `
                <div class="card h-100">
                    <img src="${frame.thumbnail}" 
                         class="frame-thumbnail ${frame.is_fake ? 'fake-frame' : 'real-frame'}">
                    <div class="card-body p-2 text-center">
                        <small class="d-block text-muted">${frame.time.toFixed(1)}s</small>
                        <span class="badge ${frame.is_fake ? 'bg-danger' : 'bg-success'}">
                            ${frame.is_fake ? 'AI' : 'Real'} (${frame.confidence}%)
                        </span>
                    </div>
                </div>
            `;
            frameGrid.appendChild(col);
        });
    }
}

// Download report
function downloadReport() {
    if (!currentReport || !currentReport.id) {
        showMessage('No report available to download', 'warning');
        return;
    }
    
    window.open(`/download/${currentReport.id}`, '_blank');
}

// Load analysis history
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    historyList.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Loading history...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/reports');
        const data = await response.json();
        
        if (data.reports && data.reports.length > 0) {
            let html = '<div class="list-group">';
            
            data.reports.forEach(report => {
                const date = new Date(report.upload_time).toLocaleString();
                html += `
                    <div class="list-group-item list-group-item-action">
                        <div class="d-flex w-100 justify-content-between">
                            <h5 class="mb-1">
                                <i class="fas fa-file-video me-2"></i>${report.filename}
                            </h5>
                            <small>${date}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span class="badge ${report.verdict_color === 'danger' ? 'bg-danger' : report.verdict_color === 'warning' ? 'bg-warning' : 'bg-success'}">
                                ${report.verdict}
                            </span>
                            <span>AI Content: ${report.fake_percentage.toFixed(1)}%</span>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewReport('${report.id}')">
                                <i class="fas fa-eye me-1"></i>View Details
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            historyList.innerHTML = html;
        } else {
            historyList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-history fa-3x text-muted mb-3"></i>
                    <h5>No analysis history found</h5>
                    <p class="text-muted">Upload and analyze your first video!</p>
                    <button class="btn btn-gradient" onclick="showTab('upload')">
                        <i class="fas fa-upload me-2"></i>Upload Video
                    </button>
                </div>
            `;
        }
    } catch (error) {
        historyList.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading history: ${error.message}
            </div>
        `;
    }
}

// View specific report
async function viewReport(reportId) {
    showLoading();
    
    try {
        const response = await fetch(`/report/${reportId}`);
        const report = await response.json();
        
        if (report.error) {
            showMessage(report.error, 'danger');
            return;
        }
        
        currentReport = report;
        displayResults(report);
        showTab('upload');
    } catch (error) {
        showMessage('Error loading report: ' + error.message, 'danger');
    } finally {
        hideLoading();
    }
}

// Train AI model
function trainModel() {
    const realFolder = document.getElementById('realFolder').value.trim();
    const fakeFolder = document.getElementById('fakeFolder').value.trim();
    const epochs = document.getElementById('epochs').value;
    
    if (!realFolder || !fakeFolder) {
        showMessage('Please provide both real and fake folder paths', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('real_folder', realFolder);
    formData.append('fake_folder', fakeFolder);
    formData.append('epochs', epochs);
    
    const trainingStatus = document.getElementById('trainingStatus');
    trainingStatus.innerHTML = `
        <div class="alert alert-info">
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2"></div>
                <div>
                    <strong>Training in progress...</strong>
                    <div class="small">This may take several minutes. Please wait.</div>
                </div>
            </div>
        </div>
    `;
    
    fetch('/train', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            trainingStatus.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.error}
                </div>
            `;
        } else {
            trainingStatus.innerHTML = `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Success!</strong> ${data.message}
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-success" onclick="location.reload()">
                            <i class="fas fa-redo me-1"></i>Refresh Page
                        </button>
                    </div>
                </div>
            `;
        }
    })
    .catch(error => {
        trainingStatus.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Network error: ${error.message}
            </div>
        `;
    });
}

// Load system statistics
async function loadStats() {
    const statsContent = document.getElementById('statsContent');
    if (!statsContent) return;
    
    statsContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary"></div>
            <p class="mt-2">Loading statistics...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/stats');
        const data = await response.json();
        
        if (data.error) {
            statsContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${data.error}
                </div>
            `;
            return;
        }
        
        const modelStatus = data.model_loaded ? 
            '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Loaded</span>' : 
            '<span class="badge bg-warning"><i class="fas fa-exclamation-triangle me-1"></i>Not Loaded</span>';
        
        statsContent.innerHTML = `
            <div class="row">
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-video fa-3x text-primary mb-3"></i>
                            <h2 class="display-4">${data.videos_analyzed}</h2>
                            <p class="text-muted">Videos Analyzed</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-body text-center">
                            <i class="fas fa-file-alt fa-3x text-success mb-3"></i>
                            <h2 class="display-4">${data.reports_generated}</h2>
                            <p class="text-muted">Reports Generated</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title"><i class="fas fa-cogs me-2"></i>System Status</h5>
                            <table class="table">
                                <tr>
                                    <td><i class="fas fa-robot me-2"></i>AI Model Status</td>
                                    <td>${modelStatus}</td>
                                </tr>
                                <tr>
                                    <td><i class="fas fa-database me-2"></i>Model File</td>
                                    <td>${data.model_exists ? 'Exists' : 'Not Found'}</td>
                                </tr>
                                <tr>
                                    <td><i class="fas fa-server me-2"></i>System Status</td>
                                    <td><span class="badge bg-success">${data.system_status}</span></td>
                                </tr>
                            </table>
                            <div class="text-center mt-3">
                                <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">
                                    <i class="fas fa-redo me-1"></i>Refresh Statistics
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        statsContent.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Error loading statistics: ${error.message}
            </div>
        `;
    }
}

// Add this to handle Enter key in form fields
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        if (activeElement.id === 'realFolder' || 
            activeElement.id === 'fakeFolder' || 
            activeElement.id === 'epochs') {
            trainModel();
        }
    }
});