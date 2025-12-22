import { GoogleGenerativeAI } from '@google/generative-ai';

export type ExpenseCategory = 
  | 'groceries'
  | 'utilities'
  | 'rent'
  | 'transportation'
  | 'dining'
  | 'entertainment'
  | 'shopping'
  | 'bills'
  | 'other';

export interface CategorizationResult {
  category: ExpenseCategory;
  confidence: number;
  reason?: string;
}

// Rule-based category mapping
const categoryKeywords: Record<ExpenseCategory, string[]> = {
  groceries: [
    'grocery', 'walmart', 'target', 'costco', 'safeway', 'kroger', 'food', 'supermarket',
    'market', 'produce', 'meat', 'dairy', 'bread', 'milk', 'eggs', 'vegetables', 'fruits'
  ],
  utilities: [
    'wifi', 'internet', 'electricity', 'electric', 'power', 'gas', 'water', 'utility',
    'internet bill', 'electric bill', 'water bill', 'gas bill', 'phone bill', 'internet service'
  ],
  rent: [
    'rent', 'apartment', 'housing', 'lease', 'landlord', 'mortgage'
  ],
  transportation: [
    'uber', 'lyft', 'taxi', 'gas', 'fuel', 'petrol', 'parking', 'metro', 'subway',
    'bus', 'train', 'flight', 'airline', 'car', 'vehicle', 'maintenance', 'repair'
  ],
  dining: [
    'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger', 'pizza', 'food',
    'dinner', 'lunch', 'breakfast', 'takeout', 'delivery', 'doordash', 'ubereats', 'grubhub'
  ],
  entertainment: [
    'movie', 'cinema', 'netflix', 'spotify', 'music', 'concert', 'theater', 'game',
    'streaming', 'subscription', 'hulu', 'disney', 'amazon prime', 'entertainment'
  ],
  shopping: [
    'amazon', 'store', 'shop', 'purchase', 'buy', 'clothing', 'clothes', 'shoes',
    'electronics', 'online', 'retail', 'mall'
  ],
  bills: [
    'bill', 'payment', 'subscription', 'insurance', 'health', 'medical', 'phone',
    'credit card', 'loan', 'debt'
  ],
  other: []
};

/**
 * Categorize expense description using rule-based matching
 */
export const categorizeByRules = (description: string): CategorizationResult => {
  const lowerDesc = description.toLowerCase().trim();
  
  // Count matches for each category
  const categoryScores: Record<ExpenseCategory, number> = {
    groceries: 0,
    utilities: 0,
    rent: 0,
    transportation: 0,
    dining: 0,
    entertainment: 0,
    shopping: 0,
    bills: 0,
    other: 0,
  };

  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      // Use word boundary to avoid partial matches
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lowerDesc)) {
        categoryScores[category as ExpenseCategory]++;
      }
    }
  }

  // Find the category with highest score
  let maxScore = 0;
  let bestCategory: ExpenseCategory = 'other';
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category as ExpenseCategory;
    }
  }

  // Calculate confidence (0-100)
  // If we have matches, confidence is based on score relative to description length
  // If no matches, confidence is low
  let confidence = 0;
  if (maxScore > 0) {
    // More matches = higher confidence, but cap at 90% for rule-based
    confidence = Math.min(90, 50 + (maxScore * 10));
  } else {
    confidence = 20; // Low confidence if no matches
  }

  return {
    category: bestCategory,
    confidence,
    reason: maxScore > 0 ? `Matched ${maxScore} keyword(s)` : 'No keyword matches found',
  };
};

/**
 * Categorize expense using Gemini AI (optional, requires API key)
 */
export const categorizeWithAI = async (
  description: string,
  apiKey?: string
): Promise<CategorizationResult | null> => {
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Categorize this expense description into one of these categories: groceries, utilities, rent, transportation, dining, entertainment, shopping, bills, or other.

Expense description: "${description}"

Respond with ONLY the category name in lowercase, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const categoryText = response.text().trim().toLowerCase();

    // Validate the category
    const validCategories: ExpenseCategory[] = [
      'groceries', 'utilities', 'rent', 'transportation', 'dining',
      'entertainment', 'shopping', 'bills', 'other'
    ];

    const category = validCategories.includes(categoryText as ExpenseCategory)
      ? (categoryText as ExpenseCategory)
      : 'other';

    return {
      category,
      confidence: 85, // High confidence for AI
      reason: 'Categorized by AI',
    };
  } catch (error) {
    console.error('AI categorization error:', error);
    return null;
  }
};

/**
 * Main categorization function - uses rules first, AI as fallback if confidence is low
 */
export const categorizeExpense = async (
  description: string,
  apiKey?: string
): Promise<CategorizationResult> => {
  // First try rule-based
  const ruleResult = categorizeByRules(description);

  // If confidence is low and we have API key, try AI
  if (ruleResult.confidence < 70 && apiKey) {
    const aiResult = await categorizeWithAI(description, apiKey);
    if (aiResult) {
      return aiResult;
    }
  }

  return ruleResult;
};

