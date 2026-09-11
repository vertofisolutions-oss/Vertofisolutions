/**
 * Converts a numerical amount into Indian Rupee words.
 * Example: 37881.50 -> "Thirty-Seven Thousand Eight Hundred Eighty-One Rupees and Fifty Paise Only"
 */
export function numberToWordsRupees(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Rupees Only";

  const num = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - num) * 100);

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    const tenDigit = Math.floor(n / 10);
    const unitDigit = n % 10;
    return tens[tenDigit] + (unitDigit ? "-" + units[unitDigit] : "");
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = "";
    if (hundred) {
      str += units[hundred] + " Hundred";
      if (rest) str += " ";
    }
    if (rest) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  let result = "";

  const crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    result += convertThreeDigits(crore) + " Crore ";
  }

  if (lakh > 0) {
    result += convertTwoDigits(lakh) + " Lakh ";
  }

  if (thousand > 0) {
    result += convertTwoDigits(thousand) + " Thousand ";
  }

  if (remainder > 0) {
    result += convertThreeDigits(remainder);
  }

  result = result.trim() + " Rupees";

  if (paise > 0) {
    result += " and " + convertTwoDigits(paise) + " Paise";
  }

  return result + " Only";
}
