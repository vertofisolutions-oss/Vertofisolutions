/**
 * AI-Driven WhatsApp Agent for Vertofi
 * Processes incoming text and returns structural JSON or user-friendly string responses.
 * Uses a mock LLM implementation until real API keys are provided.
 */

export type ParsedIntent = {
  intent: "SALE" | "PURCHASE" | "REPORT" | "QUESTION" | "UNKNOWN";
  amount?: number;
  party?: string;
  category?: string;
  reply: string;
};

export async function processWhatsAppMessage(message: string): Promise<ParsedIntent> {
  const lower = message.toLowerCase();

  // Basic Rule-based fallback (acts as a mock LLM)
  if (lower.includes("sale") || lower.includes("sold")) {
    // Extracting amount (very basic regex for prototyping)
    const amountMatch = message.match(/\b\d+(\.\d{1,2})?\b/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
    
    return {
      intent: "SALE",
      amount,
      reply: `✅ AI Processed: Recorded a Sale invoice for ₹${amount}. I will categorize this under Sales.`,
    };
  }

  if (lower.includes("purchase") || lower.includes("bought") || lower.includes("expense") || lower.includes("paid")) {
    const amountMatch = message.match(/\b\d+(\.\d{1,2})?\b/);
    const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;
    
    return {
      intent: "PURCHASE",
      amount,
      reply: `💸 AI Processed: Expense recorded for ₹${amount}. E-Way bill analysis in progress.`,
    };
  }

  if (lower.includes("dashboard") || lower.includes("report") || lower.includes("health")) {
    return {
      intent: "REPORT",
      reply: `📊 AI Financial Report: Your business is performing well. Cashflow is positive, but watch out for increasing vendor debts!`,
    };
  }

  return {
    intent: "UNKNOWN",
    reply: `🤖 AI CFO: I understood your message as: "${message}". Please specify if it is a sale, purchase, or if you need a report.`,
  };
}
