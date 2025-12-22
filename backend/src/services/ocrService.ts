import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface ReceiptData {
  description: string;
  totalAmount: number | null;
  date: Date | null;
  merchant: string | null;
  items: string[];
}

/**
 * Preprocess image for better OCR accuracy
 */
const preprocessImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  return await sharp(imageBuffer)
    .greyscale()
    .normalize()
    .sharpen()
    .resize(2000, null, { withoutEnlargement: true })
    .toBuffer();
};

/**
 * Extract text from receipt image using OCR
 */
const extractText = async (imageBuffer: Buffer): Promise<string> => {
  const processedImage = await preprocessImage(imageBuffer);
  
  const { data: { text } } = await Tesseract.recognize(processedImage, 'eng', {
    logger: (m) => {
      // Suppress verbose logging
      if (m.status === 'recognizing text') {
        // Only log progress occasionally
      }
    },
  });

  return text;
};

/**
 * Parse amount from text
 */
const parseAmount = (text: string): number | null => {
  // Look for currency patterns: $XX.XX, XX.XX, etc.
  const amountPatterns = [
    /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, // $1,234.56 or 1234.56
    /total[:\s]*\$?\s*(\d+(?:\.\d{2})?)/gi,
    /amount[:\s]*\$?\s*(\d+(?:\.\d{2})?)/gi,
    /due[:\s]*\$?\s*(\d+(?:\.\d{2})?)/gi,
  ];

  const amounts: number[] = [];

  for (const pattern of amountPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount) && amount > 0) {
        amounts.push(amount);
      }
    }
  }

  // Return the largest amount (likely the total)
  if (amounts.length > 0) {
    return Math.max(...amounts);
  }

  return null;
};

/**
 * Parse date from text
 */
const parseDate = (text: string): Date | null => {
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g, // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4})-(\d{2})-(\d{2})/g, // YYYY-MM-DD
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi, // DD Mon YYYY
  ];

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  for (const pattern of datePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      try {
        if (pattern.source.includes('Jan|Feb')) {
          // Handle "DD Mon YYYY" format
          const day = parseInt(match[1], 10);
          const monthName = match[2].toLowerCase();
          const year = parseInt(match[3], 10);
          const month = monthNames.indexOf(monthName);
          if (month >= 0) {
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        } else if (pattern.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
          // Handle YYYY-MM-DD format
          const year = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1;
          const day = parseInt(match[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } else {
          // Handle MM/DD/YYYY or DD/MM/YYYY
          const part1 = parseInt(match[1], 10);
          const part2 = parseInt(match[2], 10);
          const year = parseInt(match[3], 10);

          // Try MM/DD/YYYY first
          let date = new Date(year, part1 - 1, part2);
          if (isNaN(date.getTime()) || part1 > 12) {
            // Try DD/MM/YYYY
            date = new Date(year, part2 - 1, part1);
          }

          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      } catch (error) {
        // Continue to next match
      }
    }
  }

  // Default to today if no date found
  return new Date();
};

/**
 * Extract merchant name from text (usually first few lines)
 */
const parseMerchant = (text: string): string | null => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Merchant name is usually in the first 3 lines
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i];
    // Skip lines that look like addresses, phone numbers, or dates
    if (
      !line.match(/\d{3}-\d{3}-\d{4}/) && // Phone
      !line.match(/\d{1,2}\/\d{1,2}\/\d{4}/) && // Date
      !line.match(/^\d+/) && // Starts with number
      line.length > 2 && // At least 3 characters
      line.length < 50 // Not too long
    ) {
      return line;
    }
  }

  return null;
};

/**
 * Extract item descriptions from text
 */
const parseItems = (text: string): string[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const items: string[] = [];

  // Look for lines that might be items (contain text and possibly a price)
  for (const line of lines) {
    // Skip lines that are clearly not items
    if (
      line.match(/^(total|subtotal|tax|tip|amount|due|change|cash|card|receipt|thank|merchant)/i) ||
      line.match(/^\d{1,2}\/\d{1,2}\/\d{4}/) || // Date
      line.match(/^\d{3}-\d{3}-\d{4}/) || // Phone
      line.length < 3 || // Too short
      line.length > 100 // Too long
    ) {
      continue;
    }

    // If line contains a price pattern, it might be an item
    if (line.match(/\$?\d+\.\d{2}/) || line.length > 5) {
      // Remove price from end if present
      const cleaned = line.replace(/\s+\$?\d+\.\d{2}\s*$/, '').trim();
      if (cleaned.length > 2) {
        items.push(cleaned);
      }
    }
  }

  return items.slice(0, 10); // Limit to 10 items
};

/**
 * Main function to scan receipt and extract data
 */
export const scanReceipt = async (imageBase64: string): Promise<ReceiptData> => {
  // Remove data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Extract text using OCR
  const text = await extractText(imageBuffer);

  // Parse data from text
  const amount = parseAmount(text);
  const date = parseDate(text);
  const merchant = parseMerchant(text);
  const items = parseItems(text);

  // Generate description from merchant or items
  let description = merchant || 'Receipt';
  if (items.length > 0) {
    description = `${merchant || 'Receipt'}: ${items.slice(0, 3).join(', ')}`;
  }

  return {
    description: description.substring(0, 100), // Limit length
    totalAmount: amount,
    date: date,
    merchant: merchant,
    items: items,
  };
};

