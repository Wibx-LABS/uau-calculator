document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const inputCotacao = document.getElementById('inputCotacao');
    const inputQuantity = document.getElementById('inputQuantity');
    const inputTotalBrl = document.getElementById('inputTotalBrl');
    
    const btnExportPDF = document.getElementById('btnExportPDF');
    const printTimestamp = document.getElementById('printTimestamp');
    
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

    // Trigger file input
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFile);

    function handleFile(e) {
        const file = e.target.files[0];
        if (file) {
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
                inputCotacao.value = parseFloat(cotacaoMatch[1].replace(/\./g, '').replace(',', '.'));
            }
            if (qtyMatch) {
                inputQuantity.value = parseFloat(qtyMatch[1].replace(/\./g, '').replace(',', '.'));
            }
            if (valorMatch) {
                inputTotalBrl.value = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
            }

            calculateCapacity();

        } catch (error) {
            console.error('OCR Error:', error);
            resCotacao.innerText = 'ERRO';
        }
    }

    function calculateCapacity() {
        const cotacao = parseFloat(inputCotacao.value) || 0;
        const totalWbx = parseFloat(inputQuantity.value) || 0;
        const totalBrl = parseFloat(inputTotalBrl.value) || 0;

        // Reset UI if missing essential data
        if (cotacao <= 0 || totalWbx <= 0) {
            resTotalWbx.innerText = '0';
            resCotacao.innerText = 'AGUARDANDO...';
            return;
        }

        // REVERSE LOGIC: 
        // Total_Quantity = Base_WBX * (1 + platformFee)
        const wbxBase = totalWbx / (1 + platformFee);
        const wbxTaxa = totalWbx - wbxBase;
        const rsPool = wbxBase * cotacao;
        const totalPoints = rsPool / pontoPrice;

        // Update UI Analysis Panel
        resTotalWbx.innerText = Math.floor(totalPoints).toLocaleString('pt-BR');
        resValorBase.innerText = totalBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        resCotacao.innerText = `R$ ${cotacao.toFixed(4)}`;
        resWbxBase.innerText = `${wbxBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} WBX`;
        resTaxaWbx.innerText = `${wbxTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} WBX`;

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
                    <td>${qty.toLocaleString('pt-BR')}</td>
                    <td>R$ 0,0285</td>
                    <td>${rsBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td>${wbxBase.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${wbxTax.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="accent">${wbxTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>${rsTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // Real-time calculation listeners
    [inputCotacao, inputQuantity, inputTotalBrl].forEach(input => {
        input.addEventListener('input', calculateCapacity);
    });

    // Export PDF logic
    btnExportPDF.addEventListener('click', () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        printTimestamp.innerText = `Relatório gerado em: ${dateStr} às ${timeStr}`;
        window.print();
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
        if (file) handleFile({ target: { files: [file] } });
    });
});
