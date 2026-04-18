// ==========================================
// TRY! N2 - Complete Application JavaScript
// ==========================================

// ===== CONFIGURATION =====
const CONFIG = {
    xmlPath: 'database.xml',
    defaultBab: 1,
    speechRate: 0.8,
    ttsLang: 'ja-JP'
};

// ===== STATE MANAGEMENT =====
let currentState = {
    currentBab: 1,
    currentPage: 'isi',
    xmlData: null,
    isPlaying: false,
    sidebarOpen: false
};

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeQuotes(text) {
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ===== TTS FUNCTIONS =====
function speakJapanese(text) {
    if (!text || !text.trim()) return;
    
    if (!('speechSynthesis' in window)) {
        alert('Browser tidak mendukung text-to-speech');
        return;
    }
    
    // Hentikan audio yang sedang berjalan
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = CONFIG.ttsLang;
    utterance.rate = CONFIG.speechRate;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

// ===== XML LOADING & PARSING =====
async function loadDatabase() {
    try {
        const response = await fetch(CONFIG.xmlPath);
        if (!response.ok) throw new Error('Failed to load XML');
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        currentState.xmlData = xmlDoc;
        console.log('Database loaded successfully');
        
        initializeApp();
    } catch (error) {
        console.error('Error loading database:', error);
        document.getElementById('content-area').innerHTML = `
            <div class="error-message">
                <h3>Error Loading Database</h3>
                <p>${error.message}</p>
                <p>Pastikan file database.xml ada di folder yang sama.</p>
            </div>
        `;
    }
}

function getTextContent(parent, tagName) {
    if (!parent) return '';
    const element = parent.querySelector(tagName);
    return element ? element.textContent.trim() : '';
}

function getElements(parent, tagName) {
    if (!parent) return [];
    return Array.from(parent.querySelectorAll(tagName));
}

// ===== CONTENT RENDERERS =====

// Render Daftar Isi
function renderDaftarIsi() {
    const babs = getElements(currentState.xmlData, 'bab');
    let html = '<div class="daftar-isi-container">';
    
    html += '<h2 class="section-title">もくじ (Daftar Isi)</h2>';
    
    babs.forEach(bab => {
        const id = bab.getAttribute('id');
        const header = bab.querySelector('header');
        const judul = getTextContent(header, 'judul');
        const judulId = getTextContent(header, 'judul_id');
        const halaman = getTextContent(header, 'halaman');
        
        html += `
            <div class="bab-item" onclick="navigateToBab(${id})">
                <div class="bab-header">
                    <span class="bab-number">Bab ${id}</span>
                    <span class="bab-page">Hal. ${halaman}</span>
                </div>
                <div class="bab-titles">
                    <h3 class="judul-jp sentence-jp" onclick="event.stopPropagation(); speakJapanese('${escapeQuotes(judul)}')">${judul}</h3>
                    <p class="judul-id">${judulId}</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Render Header Bab
function renderBabHeader(babData) {
    const header = babData.querySelector('header');
    return `
        <div class="bab-header-detail">
            <div class="bab-meta">
                <span class="bab-number-large">Bab ${babData.getAttribute('id')}</span>
                <span class="bab-page-ref">Halaman ${getTextContent(header, 'halaman')}</span>
            </div>
            <h1 class="main-title sentence-jp" onclick="speakJapanese('${escapeQuotes(getTextContent(header, 'judul'))}')">
                ${getTextContent(header, 'judul')}
            </h1>
            <h2 class="sub-title">${getTextContent(header, 'judul_id')}</h2>
        </div>
    `;
}

// Render Content by Type
function renderContent(contentElement) {
    const type = contentElement.getAttribute('type');
    
    switch(type) {
        case 'speech':
            return renderSpeech(contentElement);
        case 'essay':
            return renderEssay(contentElement);
        case 'job_ad':
        case 'announcement':
            return renderJobAd(contentElement);
        case 'matome':
            return renderMatome(contentElement);
        default:
            return `<div class="unknown-type">Unknown content type: ${type}</div>`;
    }
}

// Render Speech
function renderSpeech(speechData) {
    const judul = getTextContent(speechData, 'judul');
    const judulEn = getTextContent(speechData, 'judul_en');
    const teks = getTextContent(speechData, 'teks');
    const terjemahan = getTextContent(speechData, 'terjemahan') || getTextContent(speechData, 'teks_id');
    
    // Pecah teks per kalimat untuk TTS
    const sentences = teks.match(/[^。！？]+[。！？]+/g) || [teks];
    let processedText = '';
    
    sentences.forEach(sentence => {
        if (sentence.trim()) {
            processedText += `<span class="sentence-jp" onclick="speakJapanese('${escapeQuotes(sentence.trim())}')">${escapeHtml(sentence.trim())}</span>`;
        }
    });
    
    return `
        <div class="content-card content-speech">
            <div class="card-header">
                <span class="content-type-badge">スピーチ</span>
                <span class="content-type-id">Pidato</span>
            </div>
            <div class="speech-title-section">
                <h3 class="content-title sentence-jp" onclick="speakJapanese('${escapeQuotes(judul)}')">${judul}</h3>
                <span class="content-title-en">${judulEn}</span>
            </div>
            <div class="content-body">
                <div class="japanese-content">
                    ${processedText}
                </div>
                <div class="translation-box">
                    <div class="translation-label">Terjemahan Indonesia:</div>
                    <p class="translation-text">${terjemahan}</p>
                </div>
            </div>
        </div>
    `;
}

// Render Essay
function renderEssay(essayData) {
    const judul = getTextContent(essayData, 'judul');
    const judulEn = getTextContent(essayData, 'judul_en');
    const teks = getTextContent(essayData, 'teks');
    const terjemahan = getTextContent(essayData, 'terjemahan') || getTextContent(essayData, 'teks_id');
    
    const sentences = teks.match(/[^。！？]+[。！？]+/g) || [teks];
    let processedText = '';
    
    sentences.forEach(sentence => {
        if (sentence.trim()) {
            processedText += `<span class="sentence-jp" onclick="speakJapanese('${escapeQuotes(sentence.trim())}')">${escapeHtml(sentence.trim())}</span>`;
        }
    });
    
    return `
        <div class="content-card content-essay">
            <div class="card-header">
                <span class="content-type-badge">エッセー</span>
                <span class="content-type-id">Esai</span>
            </div>
            <div class="essay-title-section">
                <h3 class="content-title sentence-jp" onclick="speakJapanese('${escapeQuotes(judul)}')">${judul}</h3>
                <span class="content-title-en">${judulEn}</span>
            </div>
            <div class="content-body">
                <div class="japanese-content">
                    ${processedText}
                </div>
                <div class="translation-box">
                    <div class="translation-label">Terjemahan Indonesia:</div>
                    <p class="translation-text">${terjemahan}</p>
                </div>
            </div>
        </div>
    `;
}

// Render Job Ad / Announcement
function renderJobAd(jobData) {
    const judul = getTextContent(jobData, 'judul');
    const judulEn = getTextContent(jobData, 'judul_en');
    const pointGrammar = getTextContent(jobData, 'point_grammar');
    const pointGrammarId = getTextContent(jobData, 'point_grammar_id');
    const bunkei = getTextContent(jobData, 'bunkei');
    
    // Parse reibun (examples)
    const reibunElements = getElements(jobData, 'item');
    let examplesHtml = '';
    
    reibunElements.forEach((item, index) => {
        const jp = getTextContent(item, 'jp');
        const id = getTextContent(item, 'id');
        
        examplesHtml += `
            <div class="example-item">
                <div class="example-number">例 ${index + 1}</div>
                <p class="example-jp sentence-jp" onclick="speakJapanese('${escapeQuotes(jp)}')">${jp}</p>
                <p class="example-id">${id}</p>
            </div>
        `;
    });
    
    return `
        <div class="content-card content-job">
            <div class="card-header">
                <span class="content-type-badge">お知らせ・広告</span>
                <span class="content-type-id">Pengumuman/Iklan</span>
            </div>
            <div class="job-title-section">
                <h3 class="content-title sentence-jp" onclick="speakJapanese('${escapeQuotes(judul)}')">${judul}</h3>
                <span class="content-title-en">${judulEn}</span>
            </div>
            
            <div class="grammar-point-section">
                <div class="grammar-label">文型 (Pola Kalimat):</div>
                <div class="grammar-box">
                    <p class="grammar-jp sentence-jp" onclick="speakJapanese('${escapeQuotes(pointGrammar)}')">${pointGrammar}</p>
                    <p class="grammar-id">${pointGrammarId}</p>
                </div>
                <div class="bunkei-box">
                    <span class="bunkei-label">文型:</span>
                    <span class="bunkei-text">${bunkei}</span>
                </div>
            </div>
            
            <div class="examples-section">
                <div class="examples-label">例文 (Contoh Kalimat):</div>
                ${examplesHtml}
            </div>
        </div>
    `;
}

// Render Matome (Summary)
function renderMatome(matomeData) {
    const items = getElements(matomeData, 'item');
    let itemsHtml = '';
    
    items.forEach((item, index) => {
        const jp = getTextContent(item, 'jp');
        const id = getTextContent(item, 'id');
        const en = getTextContent(item, 'en');
        
        itemsHtml += `
            <div class="matome-item">
                <div class="matome-number">${index + 1}</div>
                <div class="matome-content">
                    <p class="matome-jp sentence-jp" onclick="speakJapanese('${escapeQuotes(jp)}')">${jp}</p>
                    <p class="matome-id">${id}</p>
                    ${en ? `<p class="matome-en">${en}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    return `
        <div class="content-card content-matome">
            <div class="card-header">
                <span class="content-type-badge">まとめ</span>
                <span class="content-type-id">Rangkuman</span>
            </div>
            <div class="matome-list">
                ${itemsHtml}
            </div>
        </div>
    `;
}

// Render Check (Quiz)
function renderCheck(checkData) {
    const id = checkData.getAttribute('id') || '';
    const konteks = getTextContent(checkData, 'konteks');
    const pertanyaan = getTextContent(checkData, 'pertanyaan');
    const pilihanElements = getElements(checkData, 'item');
    const jawaban = getTextContent(checkData, 'jawaban');
    
    let optionsHtml = '';
    pilihanElements.forEach((opt, idx) => {
        const text = opt.textContent.trim();
        optionsHtml += `
            <label class="quiz-option" onclick="selectOption(this, ${idx}, '${id}', '${jawaban}')">
                <input type="radio" name="quiz-${id}" value="${idx}">
                <span class="option-marker">${['ア', 'イ', 'ウ', 'エ'][idx]}</span>
                <span class="option-text sentence-jp" onclick="event.stopPropagation(); speakJapanese('${escapeQuotes(text)}')">${text}</span>
            </label>
        `;
    });
    
    return `
        <div class="quiz-card" id="quiz-${id}">
            <div class="quiz-header">
                <span class="quiz-number">Check ${id}</span>
                <span class="quiz-context sentence-jp" onclick="speakJapanese('${escapeQuotes(konteks)}')">${konteks}</span>
            </div>
            <div class="quiz-question">
                <p>${pertanyaan}</p>
            </div>
            <div class="quiz-options">
                ${optionsHtml}
            </div>
            <div class="quiz-result" id="result-${id}"></div>
        </div>
    `;
}

// Render Dekiru Koto (Can-do statements)
function renderDekiruKoto(dekiruData) {
    const items = getElements(dekiruData, 'item');
    let html = '<div class="dekiru-section"><h3 class="dekiru-title">できること (Apa yang bisa dilakukan)</h3>';
    
    items.forEach(item => {
        const jp = getTextContent(item, 'jp');
        const id = getTextContent(item, 'id');
        const en = getTextContent(item, 'en');
        
        html += `
            <div class="dekiru-item">
                <span class="check-icon">✓</span>
                <div class="dekiru-content">
                    <p class="dekiru-jp sentence-jp" onclick="speakJapanese('${escapeQuotes(jp)}')">${jp}</p>
                    <p class="dekiru-id">${id}</p>
                    ${en ? `<p class="dekiru-en">${en}</p>` : ''}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// ===== NAVIGATION FUNCTIONS =====
function navigateTo(page) {
    currentState.currentPage = page;
    const contentArea = document.getElementById('content-area');
    
    // Update active menu
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });
    
    // Render content based on page
    switch(page) {
        case 'isi':
            contentArea.innerHTML = renderDaftarIsi();
            break;
        case 'bab':
            renderBabContent(currentState.currentBab);
            break;
        case 'grammar':
            renderGrammarPage();
            break;
        case 'check':
            renderCheckPage();
            break;
        case 'matome':
            renderMatomePage();
            break;
        default:
            contentArea.innerHTML = renderDaftarIsi();
    }
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
        toggleSidebar(false);
    }
    
    window.scrollTo(0, 0);
}

function navigateToBab(babId) {
    currentState.currentBab = babId;
    navigateTo('bab');
}

function renderBabContent(babId) {
    const bab = currentState.xmlData.querySelector(`bab[id="${babId}"]`);
    if (!bab) {
        document.getElementById('content-area').innerHTML = '<div class="error">Bab tidak ditemukan</div>';
        return;
    }
    
    let html = renderBabHeader(bab);
    html += '<div class="bab-content">';
    
    // Render all contents
    const contents = getElements(bab, 'content');
    contents.forEach(content => {
        html += renderContent(content);
    });
    
    // Render dekiru_koto if exists
    const dekiru = bab.querySelector('dekiru_koto');
    if (dekiru) {
        html += renderDekiruKoto(dekiru);
    }
    
    // Render check items if exists
    const checks = getElements(bab, 'check');
    if (checks.length > 0) {
        html += '<div class="checks-section"><h3 class="section-title">Check (Latihan)</h3>';
        checks.forEach(check => {
            html += renderCheck(check);
        });
        html += '</div>';
    }
    
    html += '</div>';
    
    // Navigation buttons
    html += `
        <div class="bab-navigation">
            ${babId > 1 ? `<button class="nav-btn prev-btn" onclick="navigateToBab(${babId - 1})">← Bab ${babId - 1}</button>` : '<div></div>'}
            ${babId < 16 ? `<button class="nav-btn next-btn" onclick="navigateToBab(${babId + 1})">Bab ${babId + 1} →</button>` : '<div></div>'}
        </div>
    `;
    
    document.getElementById('content-area').innerHTML = html;
}

function renderGrammarPage() {
    document.getElementById('content-area').innerHTML = `
        <div class="placeholder-page">
            <h2>Grammar Point</h2>
            <p>Halaman grammar akan ditampilkan di sini.</p>
        </div>
    `;
}

function renderCheckPage() {
    document.getElementById('content-area').innerHTML = `
        <div class="placeholder-page">
            <h2>Check (Latihan)</h2>
            <p>Semua soal check akan ditampilkan di sini.</p>
        </div>
    `;
}

function renderMatomePage() {
    document.getElementById('content-area').innerHTML = `
        <div class="placeholder-page">
            <h2>Matome (Rangkuman)</h2>
            <p>Rangkuman semua bab akan ditampilkan di sini.</p>
        </div>
    `;
}

// ===== INTERACTION FUNCTIONS =====
function selectOption(element, value, quizId, correctAnswer) {
    const quizCard = document.getElementById(`quiz-${quizId}`);
    const resultDiv = document.getElementById(`result-${quizId}`);
    const options = quizCard.querySelectorAll('.quiz-option');
    
    // Disable all options
    options.forEach(opt => {
        opt.style.pointerEvents = 'none';
        opt.classList.remove('selected');
    });
    
    // Mark selected
    element.classList.add('selected');
    element.querySelector('input').checked = true;
    
    // Check answer
    const isCorrect = value.toString() === correctAnswer;
    if (isCorrect) {
        element.classList.add('correct');
        resultDiv.innerHTML = '<span class="result-correct">✓ Benar!</span>';
    } else {
        element.classList.add('wrong');
        options[parseInt(correctAnswer)].classList.add('correct');
        resultDiv.innerHTML = '<span class="result-wrong">✗ Salah. Jawaban yang benar: ' + ['ア', 'イ', 'ウ', 'エ'][parseInt(correctAnswer)] + '</span>';
    }
}

function toggleSidebar(forceState) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (typeof forceState !== 'undefined') {
        currentState.sidebarOpen = forceState;
    } else {
        currentState.sidebarOpen = !currentState.sidebarOpen;
    }
    
    if (currentState.sidebarOpen) {
        sidebar.classList.add('open');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// ===== INITIALIZATION =====
function initializeApp() {
    // Setup menu click handlers
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateTo(page);
        });
    });
    
    // Setup sidebar toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => toggleSidebar());
    }
    
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', () => toggleSidebar(false));
    }
    
    // Close sidebar on window resize if open
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && currentState.sidebarOpen) {
            toggleSidebar(false);
        }
    });
    
    // Load initial page
    navigateTo('isi');
}

// Start app when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    loadDatabase();
});

// Handle keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentState.sidebarOpen) {
        toggleSidebar(false);
    }
});