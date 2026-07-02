// --- Helper: Download Function ---
function download(data, filename, type) {
    const blob = new Blob([data], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// --- Modal UI functions ---
const modal = document.getElementById('processing-modal');
const showModal = () => modal.style.display = 'flex';
const hideModal = () => modal.style.display = 'none';

// --- 1. MERGE PDF LOGIC ---
const cardMerge = document.getElementById('card-merge');
const inputMerge = document.getElementById('input-merge');

cardMerge.addEventListener('click', () => inputMerge.click());

inputMerge.addEventListener('change', async (e) => {
    if (e.target.files.length < 2) {
        alert("Please select at least 2 PDFs to merge.");
        inputMerge.value = ''; // reset
        return;
    }

    showModal();
    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Loop through uploaded files
        for (const file of e.target.files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // Save and trigger download
        const mergedPdfBytes = await mergedPdf.save();
        download(mergedPdfBytes, "Merged_Document.pdf", "application/pdf");
        
    } catch (error) {
        console.error("Error merging PDFs:", error);
        alert("An error occurred during merging. Make sure they are valid PDF files.");
    }
    
    hideModal();
    inputMerge.value = ''; // Reset input
});

// --- 2. ROTATE PDF LOGIC ---
const cardRotate = document.getElementById('card-rotate');
const inputRotate = document.getElementById('input-rotate');

cardRotate.addEventListener('click', () => inputRotate.click());

inputRotate.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;

    showModal();
    try {
        const { PDFDocument, degrees } = PDFLib;
        const file = e.target.files[0];
        
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        const pages = pdfDoc.getPages();
        
        // Rotate every page by 90 degrees
        pages.forEach((page) => {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees(currentRotation + 90));
        });

        // Save and trigger download
        const pdfBytes = await pdfDoc.save();
        download(pdfBytes, "Rotated_" + file.name, "application/pdf");

    } catch (error) {
        console.error("Error rotating PDF:", error);
        alert("An error occurred during rotation.");
    }
    
    hideModal();
    inputRotate.value = ''; 
});

// --- 3. COMPRESS PDF (Basic Optimization) ---
const cardCompress = document.getElementById('card-compress');
const inputCompress = document.getElementById('input-compress');

cardCompress.addEventListener('click', () => inputCompress.click());

inputCompress.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;

    showModal();
    try {
        const file = e.target.files[0];
        const arrayBuffer = await file.arrayBuffer();

        const { PDFDocument } = PDFLib;
        
        // Load the PDF
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Strip out invisible metadata to save space
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');

        // Save using Object Streams to compress the internal PDF code
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
        
        download(pdfBytes, "Compressed_" + file.name, "application/pdf");

        const originalSizeKB = (file.size / 1024).toFixed(2);
        const newSizeKB = (pdfBytes.length / 1024).toFixed(2);
        
        setTimeout(() => {
            alert(`Optimization Complete!\n\nOriginal Size: ${originalSizeKB} KB\nNew Size: ${newSizeKB} KB`);
        }, 500);

    } catch (error) {
        console.error("Error compressing PDF:", error);
        alert("An error occurred during optimization.");
    }
    
    hideModal();
    inputCompress.value = ''; 
});

// --- 4. WORD TO PDF (Text Extraction Method) ---
const cardWordPdf = document.getElementById('card-word-pdf');
const inputWordPdf = document.getElementById('input-word-pdf');

cardWordPdf.addEventListener('click', () => inputWordPdf.click());

inputWordPdf.addEventListener('change', async (e) => {
    if (e.target.files.length === 0) return;

    showModal();
    try {
        const file = e.target.files[0];
        const arrayBuffer = await file.arrayBuffer();

        // Step 1: Use Mammoth to extract raw text
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        const extractedText = result.value;

        if (!extractedText) throw new Error("Could not extract text.");

        // Step 2: Create a new PDF using pdf-lib
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const fontSize = 12;
        const margin = 50;
        let currentY = height - margin;

        const words = extractedText.split(' ');
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + word + ' ';
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (textWidth > width - (margin * 2)) {
                page.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font: font, color: rgb(0, 0, 0) });
                currentLine = word + ' ';
                currentY -= (fontSize + 5);

                if (currentY < margin) {
                    page = pdfDoc.addPage();
                    currentY = height - margin;
                }
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine.trim()) {
            page.drawText(currentLine, { x: margin, y: currentY, size: fontSize, font: font, color: rgb(0, 0, 0) });
        }

        const pdfBytes = await pdfDoc.save();
        download(pdfBytes, "Converted_" + file.name.replace('.docx', '.pdf'), "application/pdf");

    } catch (error) {
        console.error("Error converting Word to PDF:", error);
        alert("An error occurred. Make sure the file is a valid .docx.");
    }
    
    hideModal();
    inputWordPdf.value = ''; 
});
