document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const inputCotacao = document.getElementById('inputCotacao');
    const inputQuantity = document.getElementById('inputQuantity');
    const inputTotalBrl = document.getElementById('inputTotalBrl');
    
    const btnExportPDF = document.getElementById('btnExportPDF');
    const btnClearData = document.getElementById('btnClearData');
    const printTimestamp = document.getElementById('printTimestamp');
    const saveStatus = document.getElementById('saveStatus');
    
    // UI Elements for Analysis Breakdown
    const resTotalWbx = document.getElementById('resTotalWbx'); 
    const resValorBase = document.getElementById('resValorBase'); 
    const resCotacao = document.getElementById('resCotacao'); 
    const resWbxBase = document.getElementById('resWbxBase'); 
    const resTaxaWbx = document.getElementById('resTaxaWbx'); 
    const tableBody = document.getElementById('referenceTableBody');

    // Constants
    const pontoPrice = 0.0285; 
    const platformFee = 0.035; // 3.5%
    const DB_NAME = 'UauCalculatorDB';
    const STORE_NAME = 'screenshots';

    // --- Storage Manager ---
    const StorageManager = {
        db: null,

        async init() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                request.onsuccess = (e) => {
                    this.db = e.target.result;
                    resolve();
                };
                request.onerror = (e) => reject(e.target.error);
            });
        },

        async saveScreenshot(file) {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(file, 'last_upload');
                request.onsuccess = () => {
                    this.showStatus();
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        },

        async loadScreenshot() {
            if (!this.db) await this.init();
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_NAME], 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get('last_upload');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        saveInputs() {
            const data = {
                cotacao: NumberFormatter.parse(inputCotacao.value),
                quantity: NumberFormatter.parse(inputQuantity.value),
                totalBrl: NumberFormatter.parse(inputTotalBrl.value)
            };
            localStorage.setItem('uau_calc_data', JSON.stringify(data));
            this.showStatus();
        },

        loadInputs() {
            const data = JSON.parse(localStorage.getItem('uau_calc_data'));
            if (data) {
                inputCotacao.value = data.cotacao || '';
                inputQuantity.value = data.quantity || '';
                inputTotalBrl.value = data.totalBrl || '';
                return true;
            }
            return false;
        },

        async clear() {
            localStorage.removeItem('uau_calc_data');
            if (this.db) {
                const transaction = this.db.transaction([STORE_NAME], 'readwrite');
                transaction.objectStore(STORE_NAME).clear();
            }
            this.showStatus('Dados limpos');
        },

        showStatus(text = 'Salvo localmente') {
            document.getElementById('saveStatusText').innerText = text;
            saveStatus.style.opacity = '1';
            setTimeout(() => {
                saveStatus.style.opacity = '0';
            }, 2000);
        }
    };

    // --- Main Logic ---

    // Trigger file input
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFile);

    async function handleFile(e) {
        const file = e.target ? e.target.files[0] : e;
        if (file) {
            // Save to IndexedDB
            await StorageManager.saveScreenshot(file);
            
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.hidden = false;
            };
            reader.readAsDataURL(file);
            processOCR(file);
        }
    }

    async function processOCR(imageSource) {
        dropZone.style.borderColor = '#00ff70';
        resCotacao.innerText = 'PROCESSANDO OCR...';
        
        try {
            const result = await Tesseract.recognize(
                imageSource,
                'por',
                { logger: m => { if (m.status === 'recognizing text') resCotacao.innerText = `LENDO: ${Math.round(m.progress * 100)}%`; } }
            );

            const text = result.data.text;

            // Extraction patterns
            const cotacaoMatch = text.match(/(?:PRE[ÇC]O|APROXIMADO)[^]*?(?:R\$|RS)\s?([\d.,]+)/i) || text.match(/(?:R\$|RS)?\s?(0[.,]\d{2,})/i);
            const qtyMatch = text.match(/(?:QUANTIDADE|APROXIMADA)[^]*?([\d.,]+)\s?WBX/i);
            const valorMatch = text.match(/(?:VALOR.*?COMPRA)[^]*?(?:R\$|RS)\s?([\d.,]+)/i);

            if (cotacaoMatch) {
                const val = parseFloat(cotacaoMatch[1].replace(/\./g, '').replace(',', '.'));
                inputCotacao.value = NumberFormatter.format(val, 4);
            }
            if (qtyMatch) {
                const val = parseFloat(qtyMatch[1].replace(/\./g, '').replace(',', '.'));
                inputQuantity.value = NumberFormatter.format(val, 2);
            }
            if (valorMatch) {
                const val = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
                inputTotalBrl.value = NumberFormatter.format(val, 2);
            }

            // Trigger sync to fill missing gaps if OCR only found some values
            syncInputs(cotacaoMatch ? 'inputCotacao' : (qtyMatch ? 'inputQuantity' : 'inputTotalBrl'));

        } catch (error) {
            console.error('OCR Error:', error);
            resCotacao.innerText = 'ERRO';
        }
    }

    function calculateCapacity() {
        const cotacao = NumberFormatter.parse(inputCotacao.value);
        const totalWbx = NumberFormatter.parse(inputQuantity.value);
        const totalBrl = NumberFormatter.parse(inputTotalBrl.value);

        // Reset UI if missing essential data
        if (cotacao <= 0 || totalWbx <= 0) {
            resTotalWbx.innerText = '0';
            resCotacao.innerText = 'AGUARDANDO...';
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">Suba um print ou digite os valores para gerar a tabela.</td></tr>';
            return;
        }

        // REVERSE LOGIC: 
        // Total_Quantity = Base_WBX * (1 + platformFee)
        const wbxBase = totalWbx / (1 + platformFee);
        const wbxTaxa = totalWbx - wbxBase;
        const rsPool = wbxBase * cotacao;
        const totalPoints = rsPool / pontoPrice;

        // Update UI Analysis Panel
        resTotalWbx.innerText = NumberFormatter.format(Math.floor(totalPoints), 0);
        resValorBase.innerText = totalBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resCotacao.innerText = `R$ ${NumberFormatter.format(cotacao, 4)}`;
        resWbxBase.innerText = `${NumberFormatter.format(wbxBase, 2)} WBX`;
        resTaxaWbx.innerText = `${NumberFormatter.format(wbxTaxa, 2)} WBX`;

        // Always sync reference table
        generateReferenceTable(cotacao);
    }

    function generateReferenceTable(cotacao) {
        if (cotacao <= 0) return;
        
        const tiers = [50, 100, 500, 1000, 5000, 10000, 50000];
        tableBody.innerHTML = '';

        tiers.forEach(qty => {
            const rsBase = qty * pontoPrice;
            const wbxBase = rsBase / cotacao;
            const wbxTax = wbxBase * platformFee;
            const wbxTotal = wbxBase + wbxTax;
            const rsTotal = wbxTotal * cotacao;

            const row = `
                <tr>
                    <td>${NumberFormatter.format(qty, 0)}</td>
                    <td>R$ 0,0285</td>
                    <td>${rsBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>${NumberFormatter.format(wbxBase, 2)}</td>
                    <td>${NumberFormatter.format(wbxTax, 2)}</td>
                    <td class="accent">${NumberFormatter.format(wbxTotal, 2)}</td>
                    <td>${rsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    const NumberFormatter = {
        parse(str) {
            if (!str) return 0;
            // Remove dots (thousands) and replace comma with dot (decimal)
            return parseFloat(str.toString().split('.').join('').replace(',', '.')) || 0;
        },
        format(num, digits = 2) {
            if (isNaN(num)) return '';
            return num.toLocaleString('pt-BR', { 
                minimumFractionDigits: digits, 
                maximumFractionDigits: digits 
            });
        }
    };

    let isSyncing = false;

    function syncInputs(triggerId) {
        if (isSyncing) return;
        isSyncing = true;

        const cotacao = NumberFormatter.parse(inputCotacao.value);
        const quantity = NumberFormatter.parse(inputQuantity.value);
        const totalBrl = NumberFormatter.parse(inputTotalBrl.value);

        if (triggerId === 'inputCotacao' || triggerId === 'inputQuantity') {
            if (cotacao > 0 && quantity > 0) {
                inputTotalBrl.value = NumberFormatter.format(cotacao * quantity, 2);
            }
        } else if (triggerId === 'inputTotalBrl') {
            if (totalBrl > 0 && cotacao > 0) {
                inputQuantity.value = NumberFormatter.format(totalBrl / cotacao, 2);
            } else if (totalBrl > 0 && quantity > 0) {
                inputCotacao.value = NumberFormatter.format(totalBrl / quantity, 4);
            }
        }

        isSyncing = false;
        calculateCapacity();
        StorageManager.saveInputs();
    }

    // Real-time calculation and syncing listeners
    [inputCotacao, inputQuantity, inputTotalBrl].forEach(input => {
        input.addEventListener('input', (e) => {
            // Basic cleanup: only symbols allowed in pt-BR numbers
            const cursor = e.target.selectionStart;
            const originalLength = e.target.value.length;
            
            // Allow only digits, dots and commas
            e.target.value = e.target.value.replace(/[^\d.,]/g, '');
            
            // Re-adjust cursor if needed
            const newLength = e.target.value.length;
            e.target.setSelectionRange(cursor + (newLength - originalLength), cursor + (newLength - originalLength));

            syncInputs(e.target.id);
        });

        // Format on blur to ensure thousands separators are applied
        input.addEventListener('blur', (e) => {
            const val = NumberFormatter.parse(e.target.value);
            const digits = e.target.id === 'inputCotacao' ? 4 : 2;
            if (val > 0) e.target.value = NumberFormatter.format(val, digits);
        });
    });

    // Export PDF logic
    btnExportPDF.addEventListener('click', () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        printTimestamp.innerText = `Relatório gerado em: ${dateStr} às ${timeStr}`;
        window.print();
    });

    // Clear Data logic
    btnClearData.addEventListener('click', async () => {
        await StorageManager.clear();
        inputCotacao.value = '';
        inputQuantity.value = '';
        inputTotalBrl.value = '';
        imagePreview.src = '';
        imagePreview.hidden = true;
        calculateCapacity();
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#00ff70';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#2e2e2e';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#2e2e2e';
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    // --- Init Load ---
    (async () => {
        const data = JSON.parse(localStorage.getItem('uau_calc_data'));
        if (data) {
            if (data.cotacao) inputCotacao.value = NumberFormatter.format(parseFloat(data.cotacao), 4);
            if (data.quantity) inputQuantity.value = NumberFormatter.format(parseFloat(data.quantity), 2);
            if (data.totalBrl) inputTotalBrl.value = NumberFormatter.format(parseFloat(data.totalBrl), 2);
            calculateCapacity();
        }

        const savedFile = await StorageManager.loadScreenshot();
        if (savedFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                imagePreview.hidden = false;
            };
            reader.readAsDataURL(savedFile);
        }
    })();
});
