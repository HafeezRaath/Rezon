// ==========================================
// 🔥 CNIC OCR EXTRACTION - Add to verifyIdentity.js
// ==========================================

import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// 🔥 Helper: Preprocess image for better OCR
const preprocessImage = async (buffer) => {
    try {
        const processed = await sharp(buffer)
            .resize(1200, 800, { fit: 'inside' })
            .grayscale()
            .normalize()
            .threshold(128)
            .toBuffer();
        return processed;
    } catch (err) {
        console.error("Image preprocessing error:", err);
        return buffer;
    }
};

// 🔥 Helper: Extract CNIC data using OCR
const extractCNICData = async (imageBuffer) => {
    try {
        const processedBuffer = await preprocessImage(imageBuffer);
        
        const { data: { text } } = await Tesseract.recognize(
            processedBuffer,
            'eng',
            {
                logger: m => console.log(m),
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- '
            }
        );

        console.log("🔍 OCR Raw Text:", text);

        const extractedData = parseCNICText(text);
        
        return {
            success: true,
            rawText: text,
            ...extractedData
        };

    } catch (err) {
        console.error("OCR Error:", err);
        return { success: false, error: err.message };
    }
};

// 🔥 Helper: Parse CNIC text to extract Name, Father Name, CNIC Number
const parseCNICText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let name = null;
    let fatherName = null;
    let cnicNumber = null;
    let dateOfBirth = null;
    let gender = null;

    // CNIC Number Pattern: 12345-1234567-1
    const cnicPatterns = [
        /\d{5}[-]?\d{7}[-]?\d{1}/,
        /\d{13}/
    ];

    const nameIndicators = ['name', 'naam', 'نام', 'holder'];
    const fatherIndicators = ['father', 'husband', 'walid', 'والد', 'spouse'];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        const originalLine = lines[i];

        // Extract CNIC Number
        if (!cnicNumber) {
            for (const pattern of cnicPatterns) {
                const match = originalLine.match(pattern);
                if (match) {
                    cnicNumber = match[0].replace(/-/g, '');
                    if (cnicNumber.length === 13) {
                        cnicNumber = `${cnicNumber.slice(0, 5)}-${cnicNumber.slice(5, 12)}-${cnicNumber.slice(12)}`;
                    }
                    break;
                }
            }
        }

        // Extract Name
        if (!name && nameIndicators.some(ind => line.includes(ind))) {
            const nameMatch = originalLine.match(/name[\s:.-]*(.*)/i) || 
                             lines[i + 1]?.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/);
            if (nameMatch) {
                name = nameMatch[1]?.trim() || lines[i + 1]?.trim();
            }
        }

        // Extract Father Name
        if (!fatherName && fatherIndicators.some(ind => line.includes(ind))) {
            const fatherMatch = originalLine.match(/(?:father|husband)[\s:.-]*(.*)/i) || 
                               lines[i + 1]?.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/);
            if (fatherMatch) {
                fatherName = fatherMatch[1]?.trim() || lines[i + 1]?.trim();
            }
        }

        // Extract Gender
        if (!gender) {
            if (line.includes('male') && !line.includes('female')) gender = 'Male';
            else if (line.includes('female')) gender = 'Female';
        }

        // Extract Date of Birth
        if (!dateOfBirth) {
            const dobPattern = /\d{2}[\/.\-]\d{2}[\/.\-]\d{4}/;
            const dobMatch = originalLine.match(dobPattern);
            if (dobMatch) dateOfBirth = dobMatch[0];
        }
    }

    // Fallback: Look for capitalized words
    if (!name) {
        const capitalizedWords = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}/g);
        if (capitalizedWords && capitalizedWords.length > 0) {
            name = capitalizedWords[0];
            if (!fatherName && capitalizedWords.length > 1) {
                fatherName = capitalizedWords[1];
            }
        }
    }

    return {
        name,
        fatherName,
        cnicNumber,
        dateOfBirth,
        gender,
        confidence: name && cnicNumber ? 'high' : (name || cnicNumber ? 'medium' : 'low')
    };
};
export { extractCNICData };