export interface ParsedExpense {
  description: string;
  amount: number | null;
  participants: string[];
  splitMethod: 'even' | 'manual' | 'percentage';
  manualShares?: Record<string, number>;
  percentage?: number;
}

/**
 * Parse natural language expense input
 * Examples:
 * - "Pizza $24.50 with John and Sarah"
 * - "Uber $15.50 split evenly with Sarah"
 * - "Groceries $100 I pay 60%"
 * - "Rent $1200 John pays $400, Sarah pays $400, I pay $400"
 */
export const parseExpenseInput = (
  input: string,
  memberNames: Array<{ _id: string; name: string }>
): ParsedExpense | null => {
  if (!input.trim()) return null;

  const normalized = input.trim();
  const result: ParsedExpense = {
    description: '',
    amount: null,
    participants: [],
    splitMethod: 'even',
  };

  // Extract amount - look for $XX.XX or XX.XX or XX
  const amountRegex = /\$?(\d+(?:\.\d{2})?)/g;
  const amountMatches = normalized.match(amountRegex);
  if (amountMatches && amountMatches.length > 0) {
    // Get the first amount as the total
    const amountStr = amountMatches[0].replace('$', '');
    result.amount = parseFloat(amountStr);
  }

  // Extract participants by matching member names
  const foundParticipants: string[] = [];
  const lowerInput = normalized.toLowerCase();

  for (const member of memberNames) {
    const memberNameLower = member.name.toLowerCase();
    // Match whole word to avoid partial matches
    const nameRegex = new RegExp(`\\b${memberNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (nameRegex.test(normalized)) {
      foundParticipants.push(member._id);
    }
  }

  // Also check for "I", "me", "myself" - these refer to current user
  // We'll handle this in the component by passing current user ID

  // Extract description - everything before the amount or participant mentions
  let description = normalized;
  
  // Remove amount from description
  if (result.amount !== null) {
    description = description.replace(/\$?\d+(?:\.\d{2})?/g, '').trim();
  }

  // Remove participant names from description
  for (const member of memberNames) {
    const nameRegex = new RegExp(`\\b${member.name}\\b`, 'gi');
    description = description.replace(nameRegex, '').trim();
  }

  // Remove common split phrases
  description = description
    .replace(/\b(with|split|evenly|even|between|among)\b/gi, '')
    .replace(/\b(pays?|paying|paid)\s+\$?\d+/gi, '')
    .replace(/\b(split|I pay|I'll pay)\s+\d+%/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  result.description = description || 'Expense';

  // Determine split method and participants
  const lowerDesc = description.toLowerCase();

  // Check for percentage split: "I pay 60%", "split 50%"
  const percentageMatch = lowerInput.match(/(?:I pay|I'll pay|split)\s+(\d+)%/i);
  if (percentageMatch) {
    result.splitMethod = 'percentage';
    result.percentage = parseInt(percentageMatch[1], 10);
    result.participants = foundParticipants.length > 0 ? foundParticipants : [];
    return result;
  }

  // Check for manual split: "John pays $10, Sarah pays $15"
  const manualSplitPattern = /(\w+)\s+pays?\s+\$?(\d+(?:\.\d{2})?)/gi;
  const manualMatches = [...normalized.matchAll(manualSplitPattern)];
  
  if (manualMatches.length > 0) {
    result.splitMethod = 'manual';
    result.manualShares = {};
    result.participants = [];

    for (const match of manualMatches) {
      const name = match[1];
      const amount = parseFloat(match[2]);
      
      // Find member by name
      const member = memberNames.find(m => 
        m.name.toLowerCase() === name.toLowerCase()
      );
      
      if (member) {
        result.participants.push(member._id);
        result.manualShares![member._id] = amount;
      }
    }

    // If we found manual shares, return
    if (Object.keys(result.manualShares!).length > 0) {
      return result;
    }
  }

  // Default to even split
  result.splitMethod = 'even';
  result.participants = foundParticipants.length > 0 ? foundParticipants : [];

  return result;
};

