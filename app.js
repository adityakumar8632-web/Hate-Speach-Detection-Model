// ========================================
// HATE SPEECH DETECTION APP
// Modular, Production-Ready JavaScript
// ========================================

// ========================================
// STATE MANAGEMENT
// ========================================
const AppState = {
    currentPage: 'home',
    isAnalyzing: false,
    lastAnalysisResults: null,
    isOnline: navigator.onLine
};

// ========================================
// DOM ELEMENTS CACHE
// ========================================
const DOM = {
    // Navigation
    navLinks: document.querySelectorAll('.nav-link'),
    
    // Pages
    homePage: document.getElementById('home-page'),
    analyzePage: document.getElementById('analyze-page'),
    resultsPage: document.getElementById('results-page'),
    
    // Analyze Page Elements
    textInput: document.getElementById('text-input'),
    charCount: document.getElementById('char-count'),
    analyzeBtn: document.getElementById('analyze-btn'),
    clearBtn: document.getElementById('clear-btn'),
    btnText: document.getElementById('btn-text'),
    btnIcon: document.getElementById('btn-icon'),
    
    // Results Page Elements
    skeletonLoader: document.getElementById('skeleton-loader'),
    resultsContent: document.getElementById('results-content'),
    verdictIcon: document.getElementById('verdict-icon'),
    verdictTitle: document.getElementById('verdict-title'),
    verdictSubtitle: document.getElementById('verdict-subtitle'),
    overallPercentage: document.getElementById('overall-percentage'),
    overallCircle: document.getElementById('overall-circle'),
    overallLabel: document.getElementById('overall-label'),
    categoriesGrid: document.getElementById('categories-grid'),
    
    // Action Buttons
    copyReportBtn: document.getElementById('copy-report-btn'),
    flagReviewBtn: document.getElementById('flag-review-btn'),
    newAnalysisBtn: document.getElementById('new-analysis-btn'),
    
    // Offline Banner
    offlineBanner: document.getElementById('offline-banner'),
    toastContainer: document.getElementById('toast-container')
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    attachEventListeners();
    setupScrollAnimations();
    checkNetworkStatus();
});

function initializeApp() {
    console.log('🚀 Initializing Hate Speech Detection App...');
    
    // Set initial page
    showPage('home');
    
    // Check API configuration
    if (!CONFIG.OPENAI_API_KEY || CONFIG.OPENAI_API_KEY.startsWith('sk-') === false) {
        showToast('OpenAI API key not configured', 'error');
        return;
    }    
}

// ========================================
// EVENT LISTENERS
// ========================================
function attachEventListeners() {
    // Navigation
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            showPage(page);
            updateActiveNavLink(link);
        });
    });
    
    // Text Input
    DOM.textInput.addEventListener('input', handleTextInput);
    
    // Analyze Button
    DOM.analyzeBtn.addEventListener('click', handleAnalyzeClick);
    
    // Clear Button
    DOM.clearBtn.addEventListener('click', handleClearClick);
    
    // Action Buttons
    DOM.copyReportBtn.addEventListener('click', handleCopyReport);
    DOM.flagReviewBtn.addEventListener('click', handleFlagReview);
    DOM.newAnalysisBtn.addEventListener('click', handleNewAnalysis);
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Network Status
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

// ========================================
// NAVIGATION
// ========================================
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const pageMap = {
        'home': DOM.homePage,
        'analyze': DOM.analyzePage,
        'results': DOM.resultsPage
    };
    
    const targetPage = pageMap[pageName];
    if (targetPage) {
        targetPage.classList.add('active');
        AppState.currentPage = pageName;
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function updateActiveNavLink(activeLink) {
    DOM.navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

function navigateToAnalyze() {
    showPage('analyze');
    DOM.navLinks.forEach(link => {
        if (link.dataset.page === 'analyze') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Focus on textarea
    setTimeout(() => {
        DOM.textInput.focus();
    }, 300);
}

function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ========================================
// INPUT HANDLING
// ========================================
function handleTextInput(e) {
    const text = e.target.value;
    const length = text.length;
    const maxLength = CONFIG.MAX_INPUT_LENGTH;
    
    // Update character counter
    DOM.charCount.textContent = length;
    
    // Visual feedback based on length
    const charCounter = DOM.charCount.parentElement;
    charCounter.classList.remove('warning', 'danger');
    
    if (length > maxLength * 0.9) {
        charCounter.classList.add('danger');
    } else if (length > maxLength * 0.7) {
        charCounter.classList.add('warning');
    }
    
    // Enable/disable analyze button
    DOM.analyzeBtn.disabled = length === 0 || length > maxLength;
}

function handleClearClick() {
    DOM.textInput.value = '';
    DOM.charCount.textContent = '0';
    DOM.charCount.parentElement.classList.remove('warning', 'danger');
    DOM.analyzeBtn.disabled = true;
    
    // Haptic feedback effect
    DOM.clearBtn.style.transform = 'scale(0.98)';
    setTimeout(() => {
        DOM.clearBtn.style.transform = '';
    }, 150);
    
    showToast('Text cleared', 'success');
}

// ========================================
// ANALYSIS LOGIC
// ========================================
async function handleAnalyzeClick() {
    const text = DOM.textInput.value.trim();
    
    // Validation
    if (!text) {
        showToast('Please enter text to analyze', 'warning');
        return;
    }
    
    if (text.length > CONFIG.MAX_INPUT_LENGTH) {
        showToast(`Text exceeds maximum length of ${CONFIG.MAX_INPUT_LENGTH} characters`, 'error');
        return;
    }
    
    if (!AppState.isOnline) {
        showToast('No internet connection. Please check your network.', 'error');
        return;
    }
    
    // Check API key
    if (!CONFIG.OPENAI_API_KEY || CONFIG.OPENAI_API_KEY.startsWith('sk-') === false) {
        showToast('OpenAI API key not configured', 'error');
        return;
    }    
    
    // Start analysis
    setAnalyzingState(true);
    showPage('results');
    showSkeletonLoader();
    
    try {
        const results = await analyzeToxicity(text);
        AppState.lastAnalysisResults = results;
        displayResults(results);
    } catch (error) {
        handleAnalysisError(error);
    } finally {
        setAnalyzingState(false);
    }
}

async function analyzeToxicity(text) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        CONFIG.REQUEST_TIMEOUT
    );

    const response = await fetch(CONFIG.OPENAI_MODERATION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'omni-moderation-latest',
            input: text
        }),
        signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error('OpenAI Moderation API error');
    }

    const data = await response.json();
    return processApiResponse(data);
}


function processApiResponse(data) {
    const result = data.results[0];
    const categories = result.categories;
    const flagged = result.flagged;

    const categoryMap = {
        hate: 'Hate',
        harassment: 'Harassment',
        'self-harm': 'Self Harm',
        sexual: 'Sexual Content',
        violence: 'Violence',
        'hate/threatening': 'Hate / Threat',
        'harassment/threatening': 'Harassment / Threat'
    };

    let results = {
        overall: 0,
        categories: []
    };

    let total = 0;
    let count = 0;

    for (const key in categoryMap) {
        if (categories[key] !== undefined) {
            const score = categories[key] ? 85 : 5; // simple mapping
            results.categories.push({
                name: categoryMap[key],
                score,
                raw: score / 100
            });
            total += score;
            count++;
        }
    }

    results.overall = flagged
        ? Math.min(100, Math.round(total / count))
        : Math.round(total / count);

    return results;
}


// ========================================
// RESULTS DISPLAY
// ========================================
function showSkeletonLoader() {
    DOM.skeletonLoader.style.display = 'block';
    DOM.resultsContent.classList.add('hidden');
}

function hideSkeletonLoader() {
    // Add slight delay for better UX
    setTimeout(() => {
        DOM.skeletonLoader.style.display = 'none';
        DOM.resultsContent.classList.remove('hidden');
    }, 800);
}

function displayResults(results) {
    hideSkeletonLoader();
    
    // Display verdict
    displayVerdict(results.overall);
    
    // Display overall score
    displayOverallScore(results.overall);
    
    // Display categories
    displayCategories(results.categories);
}

function displayVerdict(overallScore) {
    let icon, title, subtitle, iconClass;
    
    if (overallScore < 30) {
        icon = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
        title = 'Content Safe';
        subtitle = 'No significant harmful content detected';
        iconClass = 'safe';
    } else if (overallScore < 70) {
        icon = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
        `;
        title = 'Moderate Risk Detected';
        subtitle = 'Some potentially harmful content found';
        iconClass = 'warning';
    } else {
        icon = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
        title = 'High Risk Content';
        subtitle = 'Significant harmful content detected';
        iconClass = 'danger';
    }
    
    DOM.verdictIcon.innerHTML = icon;
    DOM.verdictIcon.className = `verdict-icon ${iconClass}`;
    DOM.verdictTitle.textContent = title;
    DOM.verdictSubtitle.textContent = subtitle;
}

function displayOverallScore(score) {
    // Animate number
    animateNumber(DOM.overallPercentage, 0, score, 1500);
    
    // Animate circular progress
    const circle = DOM.overallCircle;
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    
    // Set color based on score
    let color, label;
    if (score < 30) {
        color = 'var(--color-safe)';
        label = 'Low Risk';
    } else if (score < 70) {
        color = 'var(--color-warning)';
        label = 'Moderate Risk';
    } else {
        color = 'var(--color-danger)';
        label = 'High Risk';
    }
    
    circle.style.stroke = color;
    DOM.overallLabel.textContent = label;
    DOM.overallLabel.style.color = color;
}

function displayCategories(categories) {
    DOM.categoriesGrid.innerHTML = '';
    
    categories.forEach((category, index) => {
        const card = createCategoryCard(category, index);
        DOM.categoriesGrid.appendChild(card);
    });
    
    // Trigger animations after DOM insertion
    setTimeout(() => {
        document.querySelectorAll('.category-fill').forEach(fill => {
            fill.style.width = fill.dataset.width;
        });
    }, 100);
}

function createCategoryCard(category, index) {
    const card = document.createElement('div');
    card.className = 'category-card';
    
    // Determine severity class
    let severityClass;
    if (category.score < 30) {
        severityClass = 'safe';
    } else if (category.score < 70) {
        severityClass = 'warning';
    } else {
        severityClass = 'danger';
    }
    
    card.innerHTML = `
        <div class="category-header">
            <span class="category-name">${category.name}</span>
            <span class="category-score">${category.score}%</span>
        </div>
        <div class="category-bar">
            <div class="category-fill ${severityClass}" data-width="${category.score}%"></div>
        </div>
    `;
    
    return card;
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * easeOut);
        
        element.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function setAnalyzingState(isAnalyzing) {
    AppState.isAnalyzing = isAnalyzing;
    
    if (isAnalyzing) {
        DOM.analyzeBtn.classList.add('loading');
        DOM.btnText.textContent = 'Analyzing...';
        DOM.analyzeBtn.disabled = true;
    } else {
        DOM.analyzeBtn.classList.remove('loading');
        DOM.btnText.textContent = 'Analyze Text';
        DOM.analyzeBtn.disabled = false;
    }
}

// ========================================
// ACTION HANDLERS
// ========================================
function handleCopyReport() {
    if (!AppState.lastAnalysisResults) {
        showToast('No analysis results to copy', 'warning');
        return;
    }
    
    const results = AppState.lastAnalysisResults;
    const report = generateTextReport(results);
    
    navigator.clipboard.writeText(report).then(() => {
        showToast('Report copied to clipboard', 'success');
        
        // Haptic feedback
        DOM.copyReportBtn.style.transform = 'scale(0.98)';
        setTimeout(() => {
            DOM.copyReportBtn.style.transform = '';
        }, 150);
    }).catch(() => {
        showToast('Failed to copy report', 'error');
    });
}

function generateTextReport(results) {
    let report = '=== HATE SPEECH ANALYSIS REPORT ===\n\n';
    report += `Overall Toxicity Score: ${results.overall}%\n\n`;
    report += 'Category Breakdown:\n';
    report += '─────────────────────\n';
    
    results.categories.forEach(cat => {
        const bar = '█'.repeat(Math.floor(cat.score / 5));
        report += `${cat.name.padEnd(20)} ${cat.score}% ${bar}\n`;
    });
    
    report += '\n─────────────────────\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += 'SafeGuard Hate Speech Detector\n';
    
    return report;
}

function handleFlagReview() {
    // Simulate flagging for review
    showToast('Content flagged for manual review', 'success');
    
    // Haptic feedback
    DOM.flagReviewBtn.style.transform = 'scale(0.98)';
    setTimeout(() => {
        DOM.flagReviewBtn.style.transform = '';
    }, 150);
    
    // In production, this would send data to a review queue
    console.log('Content flagged:', {
        timestamp: new Date().toISOString(),
        results: AppState.lastAnalysisResults
    });
}

function handleNewAnalysis() {
    // Clear previous results
    DOM.textInput.value = '';
    DOM.charCount.textContent = '0';
    DOM.charCount.parentElement.classList.remove('warning', 'danger');
    
    // Navigate to analyze page
    showPage('analyze');
    DOM.navLinks.forEach(link => {
        if (link.dataset.page === 'analyze') {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Focus textarea
    setTimeout(() => {
        DOM.textInput.focus();
    }, 300);
}

// ========================================
// ERROR HANDLING
// ========================================
function handleAnalysisError(error) {
    console.error('Analysis error:', error);
    
    // Show appropriate error message
    let message = 'Analysis failed. Please try again.';
    
    if (error.message.includes('timeout')) {
        message = 'Request timed out. Please check your connection.';
    } else if (error.message.includes('API')) {
        message = 'API error. Please check your configuration.';
    } else if (error.message.includes('network')) {
        message = 'Network error. Please check your internet connection.';
    }
    
    showToast(message, 'error');
    
    // Return to analyze page
    setTimeout(() => {
        showPage('analyze');
    }, 2000);
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>`,
        error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>`,
        warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>`
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// ========================================
// NETWORK STATUS MONITORING
// ========================================
function checkNetworkStatus() {
    AppState.isOnline = navigator.onLine;
    updateOfflineBanner();
}

function handleOnline() {
    AppState.isOnline = true;
    updateOfflineBanner();
    showToast('Connection restored', 'success');
}

function handleOffline() {
    AppState.isOnline = false;
    updateOfflineBanner();
    showToast('Connection lost', 'error');
}

function updateOfflineBanner() {
    if (AppState.isOnline) {
        DOM.offlineBanner.classList.remove('show');
        setTimeout(() => {
            DOM.offlineBanner.classList.add('hidden');
        }, 350);
    } else {
        DOM.offlineBanner.classList.remove('hidden');
        setTimeout(() => {
            DOM.offlineBanner.classList.add('show');
        }, 10);
    }
}

// ========================================
// SCROLL ANIMATIONS
// ========================================
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all reveal elements
    document.querySelectorAll('.reveal-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ========================================
// KEYBOARD SHORTCUTS
// ========================================
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + Enter to analyze
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && AppState.currentPage === 'analyze') {
        e.preventDefault();
        if (!DOM.analyzeBtn.disabled && !AppState.isAnalyzing) {
            handleAnalyzeClick();
        }
    }
    
    // Escape to clear or go back
    if (e.key === 'Escape') {
        if (AppState.currentPage === 'analyze' && DOM.textInput.value) {
            handleClearClick();
        }
    }
}

// ========================================
// EXPOSE GLOBAL FUNCTIONS
// (Used by inline HTML event handlers)
// ========================================
window.navigateToAnalyze = navigateToAnalyze;
window.scrollToFeatures = scrollToFeatures;

// ========================================
// CONSOLE STYLING
// ========================================
console.log('%cSafeGuard Hate Speech Detector', 'font-size: 20px; font-weight: bold; color: #6366f1;');
console.log('%cProduction-Ready | Built with ❤️', 'font-size: 12px; color: #94a3b8;');
console.log('%cKeep your API key secure!', 'font-size: 12px; color: #f59e0b; font-weight: bold;');