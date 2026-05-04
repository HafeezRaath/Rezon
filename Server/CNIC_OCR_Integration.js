// ==========================================
// 🔥 CNIC OCR EXTRACTION - Fixed for Pakistani CNIC
// ==========================================

import Tesseract from 'tesseract.js';
import sharp from 'sharp';

// 🔥 Helper: Preprocess image for better OCR
const preprocessImage = async (buffer) => {
    try {
        const processed = await sharp(buffer)
            .resize(1800, 1200, { fit: 'inside' }) // Higher resolution for better OCR
            .grayscale()
            .normalize() // Auto contrast
            .threshold(140) // Slightly higher threshold for CNIC background
            .sharpen({ sigma: 2, flat: 1, jagged: 2 }) // Sharpen text edges
            .toBuffer();
        return processed;
    } catch (err) {
        console.error("❌ Image preprocessing error:", err);
        return buffer;
    }
};

// 🔥 Helper: Extract CNIC data using OCR with retry logic
const extractCNICData = async (imageBuffer) => {
    try {
        const processedBuffer = await preprocessImage(imageBuffer);
        
        // 🔥 Try multiple OCR configurations for best result
        let bestText = '';
        let bestConfidence = 0;

        // Attempt 1: Standard English
        try {
            const result1 = await Tesseract.recognize(
                processedBuffer,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
                        }
                    }
                }
            );
            if (result1.data.confidence > bestConfidence) {
                bestConfidence = result1.data.confidence;
                bestText = result1.data.text;
            }
        } catch (e) {
            console.log("Attempt 1 failed:", e.message);
        }

        // Attempt 2: Without preprocessing (original image)
        if (bestConfidence < 60) {
            try {
                const result2 = await Tesseract.recognize(
                    imageBuffer,
                    'eng',
                    { logger: () => {} }
                );
                if (result2.data.confidence > bestConfidence) {
                    bestConfidence = result2.data.confidence;
                    bestText = result2.data.text;
                }
            } catch (e) {
                console.log("Attempt 2 failed:", e.message);
            }
        }

        console.log("🔍 OCR Best Confidence:", bestConfidence);
        console.log("🔍 OCR Raw Text:\n", bestText);

        const extractedData = parseCNICText(bestText);
        
        return {
            success: !!(extractedData.cnicNumber && extractedData.cnicNumber.length >= 13),
            rawText: bestText,
            ocrConfidence: bestConfidence,
            ...extractedData
        };

    } catch (err) {
        console.error("❌ OCR Critical Error:", err);
        return { 
            success: false, 
            error: err.message,
            rawText: null,
            cnicNumber: null,
            name: null,
            fatherName: null
        };
    }
};

// 🔥 Helper: Parse CNIC text - ROBUST version for Pakistani CNIC
const parseCNICText = (text) => {
    if (!text || typeof text !== 'string') {
        return { name: null, fatherName: null, cnicNumber: null, dateOfBirth: null, gender: null };
    }

    // Clean text: normalize spaces, remove special chars except needed ones
    let cleanText = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ');

    const lines = cleanText.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 2);

    console.log("📝 Parsed Lines:", lines);

    let name = null;
    let fatherName = null;
    let cnicNumber = null;
    let dateOfBirth = null;
    let gender = null;

    // ========================================
    // CNIC NUMBER EXTRACTION (Most Critical)
    // ========================================
    
    // Pattern 1: With dashes 12345-1234567-1
    const cnicDashPattern = /(\d{5})[\s\-–—]?(\d{7})[\s\-–—]?(\d{1})/g;
    // Pattern 2: Continuous 13 digits
    const cnicContinuousPattern = /(\d{13})/g;
    // Pattern 3: Spaced out digits
    const cnicSpacedPattern = /(\d{5})\s+(\d{7})\s+(\d{1})/g;

    // Search in full text first
    let cnicMatch = cleanText.match(cnicDashPattern);
    if (!cnicMatch) cnicMatch = cleanText.match(cnicContinuousPattern);
    if (!cnicMatch) cnicMatch = cleanText.match(cnicSpacedPattern);

    if (cnicMatch) {
        let rawCNIC = cnicMatch[0].replace(/[^\d]/g, ''); // Remove all non-digits
        if (rawCNIC.length === 13) {
            cnicNumber = `${rawCNIC.slice(0, 5)}-${rawCNIC.slice(5, 12)}-${rawCNIC.slice(12)}`;
            console.log("✅ CNIC Found:", cnicNumber);
        }
    }

    // If still not found, search line by line with fuzzy matching
    if (!cnicNumber) {
        for (const line of lines) {
            const digitsOnly = line.replace(/\D/g, '');
            if (digitsOnly.length === 13) {
                cnicNumber = `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 12)}-${digitsOnly.slice(12)}`;
                console.log("✅ CNIC Found (line search):", cnicNumber);
                break;
            }
            // Sometimes OCR splits: 31203 4256351 7
            const parts = line.match(/\d{5}\s+\d{7}\s+\d{1}/);
            if (parts) {
                const digits = parts[0].replace(/\s/g, '');
                cnicNumber = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
                break;
            }
        }
    }

    // ========================================
    // NAME & FATHER NAME EXTRACTION
    // ========================================

    const nameKeywords = ['name', 'naam', 'holder', 'nam', 'nme', 'nane'];
    const fatherKeywords = ['father', 'husband', 'walid', 'spouse', 'fathr', 'fther', 'fater'];
    const genderKeywords = ['gender', 'sex'];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        const originalLine = lines[i];

        // Name extraction
        if (!name && nameKeywords.some(kw => line.includes(kw))) {
            // Try to get name from same line after keyword
            const nameFromLine = extractNameAfterKeyword(originalLine, nameKeywords);
            if (nameFromLine && isValidName(nameFromLine)) {
                name = cleanName(nameFromLine);
                console.log("✅ Name Found:", name);
            } 
            // Try next line
            else if (i + 1 < lines.length && isValidName(lines[i + 1])) {
                name = cleanName(lines[i + 1]);
                console.log("✅ Name Found (next line):", name);
            }
        }

        // Father Name extraction
        if (!fatherName && fatherKeywords.some(kw => line.includes(kw))) {
            const fatherFromLine = extractNameAfterKeyword(originalLine, fatherKeywords);
            if (fatherFromLine && isValidName(fatherFromLine)) {
                fatherName = cleanName(fatherFromLine);
                console.log("✅ Father Name Found:", fatherName);
            }
            else if (i + 1 < lines.length && isValidName(lines[i + 1])) {
                fatherName = cleanName(lines[i + 1]);
                console.log("✅ Father Name Found (next line):", fatherName);
            }
        }

        // Gender extraction
        if (!gender) {
            if (line.includes('gender') || line.includes('sex')) {
                if (line.includes('m') && !line.includes('fem')) gender = 'Male';
                else if (line.includes('f') || line.includes('female')) gender = 'Female';
            }
            // Standalone M/F
            if (!gender && /^[MF]$/.test(originalLine.trim())) {
                gender = originalLine.trim() === 'M' ? 'Male' : 'Female';
            }
        }

        // Date of Birth
        if (!dateOfBirth) {
            const dobPatterns = [
                /\b(\d{2})[.\/](\d{2})[.\/](\d{4})\b/,  // DD.MM.YYYY or DD/MM/YYYY
                /\b(\d{2})[.\/](\d{2})[.\/](\d{2})\b/,   // DD.MM.YY
            ];
            for (const pattern of dobPatterns) {
                const match = originalLine.match(pattern);
                if (match) {
                    dateOfBirth = match[0];
                    break;
                }
            }
        }
    }

    // ========================================
    // FALLBACK: Smart name detection
    // ========================================
    
    if (!name) {
        // Look for capitalized words that look like names (not common words)
        const namePattern = /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,2}\b/g;
        const possibleNames = cleanText.match(namePattern);
        
        if (possibleNames) {
            // Filter out common false positives
            const filtered = possibleNames.filter(n => 
                !['Name', 'Father', 'Gender', 'Country', 'Pakistan', 'Identity', 'Number', 
                  'Date', 'Issue', 'Expiry', 'Holder', 'Signature', 'Card', 'National',
                  'Islamic', 'Republic', 'Stay', 'M', 'F'].includes(n)
            );
            
            if (filtered.length > 0) {
                name = filtered[0];
                console.log("✅ Name Found (fallback):", name);
                if (!fatherName && filtered.length > 1) {
                    fatherName = filtered[1];
                    console.log("✅ Father Name Found (fallback):", fatherName);
                }
            }
        }
    }

    // ========================================
    // FINAL VALIDATION
    // ========================================

    // Validate CNIC format one more time
    if (cnicNumber && !/^\d{5}-\d{7}-\d{1}$/.test(cnicNumber)) {
        console.log("❌ Invalid CNIC format, resetting:", cnicNumber);
        cnicNumber = null;
    }

    // Clean up names - remove numbers and special chars
    if (name) name = name.replace(/[\d@#$%^&*()_+=\[\]{};:"\\|,.<>\/?]/g, '').trim();
    if (fatherName) fatherName = fatherName.replace(/[\d@#$%^&*()_+=\[\]{};:"\\|,.<>\/?]/g, '').trim();

    // Remove common OCR artifacts
    const ocrArtifacts = ['|', '_', '-', '—', '–', '…', '...'];
    if (name && ocrArtifacts.some(a => name.includes(a))) {
        name = name.split(/[|_\-—–]/)[0].trim();
    }

    return {
        name,
        fatherName,
        cnicNumber,
        dateOfBirth,
        gender,
        confidence: (name && cnicNumber) ? 'high' : (cnicNumber ? 'medium' : 'low')
    };
};

// 🔥 Helper: Extract name after keyword from a line
const extractNameAfterKeyword = (line, keywords) => {
    const lowerLine = line.toLowerCase();
    for (const kw of keywords) {
        const idx = lowerLine.indexOf(kw);
        if (idx !== -1) {
            // Get text after keyword
            let after = line.substring(idx + kw.length).trim();
            // Remove common separators
            after = after.replace(/^[:\-–—\s]+/, '').trim();
            if (after.length > 2) return after;
        }
    }
    return null;
};

// 🔥 Helper: Validate if text looks like a real name
const isValidName = (text) => {
    if (!text || text.length < 3 || text.length > 50) return false;
    
    // Must contain at least 2 words (First + Last name)
    const words = text.trim().split(/\s+/).filter(w => w.length > 1);
    if (words.length < 2) return false;
    
    // Should not be mostly numbers
    const digitCount = (text.match(/\d/g) || []).length;
    if (digitCount > text.length * 0.3) return false;
    
    // Should not contain too many special characters
    const specialCount = (text.match(/[^a-zA-Z\s\-']/g) || []).length;
    if (specialCount > text.length * 0.2) return false;
    
    return true;
};

// 🔥 Helper: Clean up extracted name
const cleanName = (name) => {
    return name
        .replace(/\s+/g, ' ')           // Multiple spaces to single
        .replace(/[^\w\s\-']/g, '')      // Remove special chars except - and '
        .replace(/\b\w/g, c => c.toUpperCase()) // Title case
        .trim();
};

export { extractCNICData };