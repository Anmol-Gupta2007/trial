// Store the selected files globally
let selectedFiles = [];

// --- UI Elements ---
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const chooseBtn = document.getElementById('choose-btn');
const outputContainer = document.getElementById('output-container');
const actionsContainer = document.getElementById('actions-container');
const mergeBtn = document.getElementById('merge-btn');
const modal = document.getElementById('processing-modal');

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

// --- Fix: Event Listeners for Uploading ---

// 1. If clicking the button, stop the event from bubbling to the uploadArea and trigger the input
chooseBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    fileInput.click();
});

// 2. If clicking anywhere else in the dotted box, trigger the input
uploadArea.addEventListener('click', () => {
    fileInput.click();
});

// 3. Detect when files are selected
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
    // Reset the input value so selecting the exact same file twice in a row still works
    fileInput.value = ''; 
});

// --- Drag and Drop Logic ---
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// --- Handle Adding Files ---
function handleFiles(files) {
    // Convert FileList to Array and filter only PDFs
    const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (newFiles.length === 0) {
        alert("Please select valid PDF files.");
        return;
    }

    // Add new files to our global list
    selectedFiles = selectedFiles.concat(newFiles);
    
    // Update the UI
    renderUI();
}

// --- Handle Removing Files ---
window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    renderUI();
}

// --- Render the UI ---
function renderUI() {
    // Clear current output
    outputContainer.innerHTML = '';

    // If we have files, show the merge button
    if (selectedFiles.length > 1) {
        actionsContainer.style.display = 'block';
    } else {
        actionsContainer.style.display = 'none';
    }

    // Generate cards for each selected file
    selectedFiles.forEach((file, index) => {
        const card = document.createElement('div');
        card.className = 'pdf-card';

        card.innerHTML = `
            <div class="pdf-icon">📄</div>
            <div class="pdf-name">${file.name}</div>
            <button class="remove-btn" onclick="removeFile(${index})">Remove</button>
        `;
        
        outputContainer.appendChild(card);
    });
}

// --- Merge PDF Logic ---
mergeBtn.addEventListener('click', async () => {
    if (selectedFiles.length < 2) {
        alert("You need at least 2 PDFs to merge.");
        return;
    }

    modal.style.display = 'flex'; // Show loading screen

    try {
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Loop through all files in the array
        for (const file of selectedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(arrayBuffer);
            
            // Copy all pages
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            
            // Add pages to new document
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        // Save and download
        const mergedPdfBytes = await mergedPdf.save();
        download(mergedPdfBytes, "Merged_Document.pdf", "application/pdf");
        
    } catch (error) {
        console.error("Error merging PDFs:", error);
        alert("An error occurred during merging. Make sure they are valid, unencrypted PDF files.");
    }
    
    modal.style.display = 'none'; // Hide loading screen
});
