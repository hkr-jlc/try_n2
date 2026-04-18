// ==========================================
// TRY! N2 - Japanese Learning App
// Main JavaScript File (app.js)
// ==========================================

// Global Variables
let currentBab = 1;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let appData = null;

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    loadXMLData();
    setupEventListeners();
    setupTTSEventDelegation();
});

// ==========================================
// XML DATA LOADING
// ==========================================
function loadXMLData() {
    fetch('database.xml')
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal memuat database.xml');
            }
            return response.text();
        })
        .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
        .then(data => {
            appData = data;
            renderMenu();
            renderSidebar();
            // Load default bab 1
            loadBab(1);
        })
        .catch(err => {
            console.error('Error loading XML:', err);
            document.getElementById('content-area').innerHTML = `
                <div class="error-message">
                    <p>Gagal memuat data. Pastikan file database.xml tersedia.</p>
                </div>
            `;
        });
}

// ==========================================
// MENU & NAVIGATION
// ==========================================
function renderMenu() {
    const menuContainer = document.getElementById('main-menu');
    if (!menuContainer || !appData) return;
    
    const chapters = appData.querySelectorAll('bab');
    let html = '<ul class="menu-list">';
    
    chapters.forEach(chapter => {
        const id = chapter.getAttribute('id');
        const title = chapter.querySelector('judul')?.textContent || `Bab ${id}`;
        const titleEn = chapter.querySelector('judul_en')?.textContent || '';
        
        html += `
            <li class="menu-item" onclick="loadBab(${id})">
                <span class="menu-number">${id}</span>
                <span class="menu-title">
                    <span class="jp">${title}</span>
                    ${titleEn ? `<span class="en">${titleEn}</span>` : ''}
                </span>
            </li>
        `;
    });
    
    html += '</ul>';
    menuContainer.innerHTML = html;
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar || !appData) return;
    
    const chapters = appData.querySelectorAll('bab');
    let html = '<ul class="sidebar-list">';
    
    chapters.forEach(chapter => {
        const id = chapter.getAttribute('id');
        const title = chapter.querySelector('judul')?.textContent || `Bab ${id}`;
        
        html += `
            <li class="sidebar-item" onclick="loadBab(${id}); toggleSidebar()">
                <span class="sidebar-number">Bab ${id}</span>
                <span class="sidebar-title">${title}</span>
            </li>
        `;
    });
    
    html += '</ul>';
    sidebar.innerHTML = html;
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// ==========================================
// CONTENT LOADING
// ==========================================
function loadBab(babId) {
    currentBab = babId;
    
    if (!appData) {
        console.error('Data belum dimuat');
        return;
    }
    
    const bab = appData.querySelector(`bab[id="${babId}"]`);
    if (!bab) {
        console.error('Bab tidak ditemukan:', babId);
        return;
    }
    
    // Update header
    updateHeader(bab);
    
    // Render content
    const contentArea = document.getElementById('content-area');
    let html = '<div class="bab-content">';
    
    // Render masing-masing section
    const sections = bab.querySelectorAll('section');
    sections.forEach(section => {
        const type = section.getAttribute('type');
        
        switch(type) {
            case 'mokuji':
                html += renderMokuji(section);
                break;
            case 'dialog':
                html += renderDialog(section);
                break;
            case 'speech':
                html += renderSpeech(section);
                break;
            case 'essay':
                html += renderEssay(section);
                break;
            case 'grammar':
                html += renderGrammar(section);
                break;
            case 'check':
                html += renderCheck(section);
                break;
            case 'matome':
                html += renderMatome(section);
                break;
            default:
                html += renderDefault(section);
        }
    });
    
    html += '</div>';
    contentArea.innerHTML = html;
    
    // Re-initialize TTS untuk konten baru
    setupTTSEventDelegation();
}

function updateHeader(bab) {
    const header = document.getElementById('bab-header');
    if (!header) return;
    
    const judul = bab.querySelector('judul')?.textContent || '';
    const judulEn = bab.querySelector('judul_en')?.textContent || '';
    const theme = bab.querySelector('theme')?.textContent || '';
    
    header.innerHTML = `
        <div class="bab-title-container">
            <h1 class="bab-number">Bab ${currentBab}</h1>
            <h2 class="bab-judul tts-jp" data-text="${judul}">${judul}</h2>
            ${judulEn ? `<h3 class="bab-judul-en">${judulEn}</h3>` : ''}
            ${theme ? `<p class="bab-theme">${theme}</p>` : ''}
        </div>
    `;
}

// ==========================================
// TTS (TEXT TO SPEECH) SYSTEM
// ==========================================
function setupTTSEventDelegation() {
    // Event delegation untuk semua elemen dengan class .tts-jp atau .sentence-jp
    document.addEventListener('click', function(e) {
        // Cari elemen terdekat dengan class tts-jp atau sentence-jp
        const target = e.target.closest('.tts-jp, .sentence-jp');
        
        if (target) {
            // Dapatkan text dari data-text attribute atau textContent
            const text = target.getAttribute('data-text') || target.textContent;
            if (text) {
                speakJapanese(text);
            }
        }
    });
}

function speakJapanese(text) {
    // Cancel speech sebelumnya jika masih berjalan
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    
    // Hapus utterance sebelumnya
    if (currentUtterance) {
        currentUtterance = null;
    }
    
    // Buat utterance baru
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9; // Sedikit lebih lambat untuk pembelajaran
    utterance.pitch = 1;
    
    // Simpan referensi
    currentUtterance = utterance;
    
    // Event handlers
    utterance.onend = function() {
        currentUtterance = null;
    };
    
    utterance.onerror = function(event) {
        console.error('TTS Error:', event.error);
        currentUtterance = null;
    };
    
    // Mulai bicara
    speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    currentUtterance = null;
}

// ==========================================
// CONTENT RENDERERS
// ==========================================

// 1. Render Daftar Isi (Mokuji)
function renderMokuji(section) {
    const items = section.querySelectorAll('item');
    let html = `
        <div class="section mokuji-section">
            <h2 class="section-title tts-jp" data-text="もくじ">もくじ <span class="section-subtitle">Daftar Isi</span></h2>
            <ul class="mokuji-list">
    `;
    
    items.forEach(item => {
        const number = item.getAttribute('number') || '';
        const title = item.querySelector('title')?.textContent || '';
        const titleId = item.querySelector('title_id')?.textContent || '';
        const page = item.getAttribute('page') || '';
        
        html += `
            <li class="mokuji-item">
                <span class="mokuji-number">${number}</span>
                <span class="mokuji-title">
                    <span class="jp-text tts-jp" data-text="${title}">${title}</span>
                    ${titleId ? `<span class="id-text">(${titleId})</span>` : ''}
                </span>
                <span class="mokuji-page">${page}</span>
            </li>
        `;
    });
    
    html += '</ul></div>';
    return html;
}

// 2. Render Dialog (Percakapan)
function renderDialog(section) {
    const content = section.querySelector('content');
    if (!content) return '';
    
    const title = section.querySelector('title')?.textContent || '';
    const setting = content.querySelector('setting')?.textContent || '';
    const characters = content.querySelectorAll('character');
    
    let html = `
        <div class="section dialog-section">
            <h2 class="section-title tts-jp" data-text="${title}">${title}</h2>
            ${setting ? `<p class="dialog-setting tts-jp" data-text="${setting}">${setting}</p>` : ''}
            <div class="dialog-container">
    `;
    
    characters.forEach(char => {
        const name = char.querySelector('name')?.textContent || '';
        const lines = char.querySelectorAll('line');
        
        html += `
            <div class="character-block">
                <div class="character-name tts-jp" data-text="${name}">${name}</div>
                <div class="character-lines">
        `;
        
        lines.forEach(line => {
            const jpText = line.querySelector('jp')?.textContent || '';
            const idText = line.querySelector('id')?.textContent || '';
            
            html += `
                <div class="line-block">
                    <p class="line-jp tts-jp" data-text="${jpText}">${highlightGrammar(jpText)}</p>
                    ${idText ? `<p class="line-id">${idText}</p>` : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div></div>';
    return html;
}

// 3. Render Speech (Pidato) - FIXED
function renderSpeech(section) {
    const content = section.querySelector('content');
    if (!content) return '';
    
    const title = section.querySelector('title')?.textContent || '';
    const titleEn = section.querySelector('title_en')?.textContent || '';
    const kategori = section.querySelector('kategori')?.textContent || '';
    const kategoriId = section.querySelector('kategori_id')?.textContent || '';
    const teks = content.querySelector('teks')?.textContent || '';
    const terjemahan = content.querySelector('terjemahan')?.textContent || '';
    
    // Split teks menjadi kalimat-kalimat untuk TTS individual
    const sentences = teks.split(/([。！？])/);
    let formattedText = '';
    let currentSentence = '';
    
    sentences.forEach((part, index) => {
        if (part.match(/[。！？]/)) {
            currentSentence += part;
            const cleanSentence = currentSentence.trim();
            if (cleanSentence) {
                formattedText += `<span class="sentence-jp" data-text="${cleanSentence}">${cleanSentence}</span>`;
            }
            currentSentence = '';
        } else {
            currentSentence += part;
        }
    });
    
    if (currentSentence.trim()) {
        formattedText += `<span class="sentence-jp" data-text="${currentSentence.trim()}">${currentSentence.trim()}</span>`;
    }
    
    let html = `
        <div class="section speech-section">
            <div class="speech-header">
                <h2 class="section-title tts-jp" data-text="${title}">${title}</h2>
                ${titleEn ? `<h3 class="section-title-en">${titleEn}</h3>` : ''}
                ${kategori ? `
                    <div class="kategori-badge">
                        <span class="kategori-jp tts-jp" data-text="${kategori}">${kategori}</span>
                        ${kategoriId ? `<span class="kategori-id">${kategoriId}</span>` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="speech-content-box">
                <div class="speech-jp">
                    ${formattedText}
                </div>
                ${terjemahan ? `
                    <div class="speech-translation">
                        <p class="translation-label">Terjemahan:</p>
                        <p class="translation-text">${terjemahan}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return html;
}

// 4. Render Essay (Esai) - FIXED
function renderEssay(section) {
    const content = section.querySelector('content');
    if (!content) return '';
    
    const title = section.querySelector('title')?.textContent || '';
    const titleEn = section.querySelector('title_en')?.textContent || '';
    const kategori = section.querySelector('kategori')?.textContent || '';
    const kategoriId = section.querySelector('kategori_id')?.textContent || '';
    const teks = content.querySelector('teks')?.textContent || '';
    const terjemahan = content.querySelector('terjemahan')?.textContent || '';
    
    // Split teks menjadi kalimat-kalimat
    const sentences = teks.split(/([。！？])/);
    let formattedText = '';
    let currentSentence = '';
    
    sentences.forEach((part, index) => {
        if (part.match(/[。！？]/)) {
            currentSentence += part;
            const cleanSentence = currentSentence.trim();
            if (cleanSentence) {
                formattedText += `<span class="sentence-jp" data-text="${cleanSentence}">${cleanSentence}</span>`;
            }
            currentSentence = '';
        } else {
            currentSentence += part;
        }
    });
    
    if (currentSentence.trim()) {
        formattedText += `<span class="sentence-jp" data-text="${currentSentence.trim()}">${currentSentence.trim()}</span>`;
    }
    
    let html = `
        <div class="section essay-section">
            <div class="essay-header">
                <h2 class="section-title tts-jp" data-text="${title}">${title}</h2>
                ${titleEn ? `<h3 class="section-title-en">${titleEn}</h3>` : ''}
                ${kategori ? `
                    <div class="kategori-badge">
                        <span class="kategori-jp tts-jp" data-text="${kategori}">${kategori}</span>
                        ${kategoriId ? `<span class="kategori-id">${kategoriId}</span>` : ''}
                    </div>
                ` : ''}
            </div>
            
            <div class="essay-content-box">
                <div class="essay-jp">
                    ${formattedText}
                </div>
                ${terjemahan ? `
                    <div class="essay-translation">
                        <p class="translation-label">Terjemahan:</p>
                        <p class="translation-text">${terjemahan}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return html;
}

// 5. Render Grammar (Tata Bahasa)
function renderGrammar(section) {
    const points = section.querySelectorAll('point');
    let html = '<div class="section grammar-section">';
    
    const title = section.querySelector('title')?.textContent || '文法 Grammar';
    html += `<h2 class="section-title tts-jp" data-text="${title}">${title}</h2>`;
    
    points.forEach(point => {
        const number = point.getAttribute('number') || '';
        const judul = point.querySelector('judul')?.textContent || '';
        const penjelasan = point.querySelector('penjelasan')?.textContent || '';
        const contohList = point.querySelectorAll('contoh');
        
        html += `
            <div class="grammar-point">
                <div class="point-header">
                    <span class="point-number">${number}</span>
                    <h3 class="point-judul tts-jp" data-text="${judul}">${highlightGrammar(judul)}</h3>
                </div>
                ${penjelasan ? `<p class="point-penjelasan">${penjelasan}</p>` : ''}
        `;
        
        if (contohList.length > 0) {
            html += '<div class="contoh-list">';
            contohList.forEach(contoh => {
                const jp = contoh.querySelector('jp')?.textContent || '';
                const id = contoh.querySelector('id')?.textContent || '';
                
                html += `
                    <div class="contoh-item">
                        <p class="contoh-jp tts-jp" data-text="${jp}">${highlightGrammar(jp)}</p>
                        ${id ? `<p class="contoh-id">${id}</p>` : ''}
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += '</div>';
    });
    
    html += '</div>';
    return html;
}

// 6. Render Check (Latihan)
function renderCheck(section) {
    const questions = section.querySelectorAll('question');
    let html = `
        <div class="section check-section">
            <h2 class="section-title">Check! <span class="section-subtitle">Latihan</span></h2>
            <div class="check-container">
    `;
    
    questions.forEach((q, index) => {
        const question = q.querySelector('q')?.textContent || '';
        const answer = q.querySelector('a')?.textContent || '';
        const explanation = q.querySelector('e')?.textContent || '';
        
        html += `
            <div class="question-block" id="q-${index}">
                <div class="question-header">
                    <span class="q-number">${index + 1}</span>
                    <p class="question-text tts-jp" data-text="${question}">${highlightGrammar(question)}</p>
                </div>
                <div class="answer-section" style="display:none;">
                    <p class="answer-label">Jawaban:</p>
                    <p class="answer-text tts-jp" data-text="${answer}">${answer}</p>
                    ${explanation ? `<p class="explanation">${explanation}</p>` : ''}
                </div>
                <button class="show-answer-btn" onclick="toggleAnswer(${index})">
                    Lihat Jawaban
                </button>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

function toggleAnswer(index) {
    const answerSection = document.querySelector(`#q-${index} .answer-section`);
    const btn = document.querySelector(`#q-${index} .show-answer-btn`);
    
    if (answerSection.style.display === 'none') {
        answerSection.style.display = 'block';
        btn.textContent = 'Sembunyikan';
    } else {
        answerSection.style.display = 'none';
        btn.textContent = 'Lihat Jawaban';
    }
}

// 7. Render Matome (Rangkuman)
function renderMatome(section) {
    const items = section.querySelectorAll('item');
    let html = `
        <div class="section matome-section">
            <h2 class="section-title tts-jp" data-text="まとめ">まとめ <span class="section-subtitle">Rangkuman</span></h2>
            <div class="matome-list">
    `;
    
    items.forEach(item => {
        const jp = item.querySelector('jp')?.textContent || '';
        const id = item.querySelector('id')?.textContent || '';
        
        html += `
            <div class="matome-item">
                <div class="matome-jp tts-jp" data-text="${jp}">${jp}</div>
                ${id ? `<div class="matome-id">${id}</div>` : ''}
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

// 8. Render Default (Fallback)
function renderDefault(section) {
    const title = section.querySelector('title')?.textContent || '';
    const content = section.innerHTML;
    
    return `
        <div class="section">
            ${title ? `<h2 class="section-title">${title}</h2>` : ''}
            <div class="default-content">${content}</div>
        </div>
    `;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function highlightGrammar(text) {
    // Highlight pola N2 dalam teks (opsional)
    // Contoh: highlight partikel atau pola tertentu
    return text;
}

function setupEventListeners() {
    // Tombol menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Tombol stop TTS (opsional - jika ingin tombol stop)
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            stopSpeaking();
        }
    });
}

// ==========================================
// LANGUAGE SWITCHER (Jika diperlukan)
// ==========================================
function changeLanguage(lang) {
    document.documentElement.lang = lang;
    // Simpan preference
    localStorage.setItem('preferred-lang', lang);
}

// Export functions untuk global access
window.loadBab = loadBab;
window.toggleSidebar = toggleSidebar;
window.toggleAnswer = toggleAnswer;
window.speakJapanese = speakJapanese;
window.stopSpeaking = stopSpeaking;
window.changeLanguage = changeLanguage;
