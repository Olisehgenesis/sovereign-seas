/**
 * Capitalizes the first letter of each word in a string
 * @param text - The text to capitalize
 * @returns The capitalized text
 */
export const capitalizeWords = (text: string): string => {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Capitalizes the first letter of a string
 * @param text - The text to capitalize
 * @returns The text with first letter capitalized
 */
export const capitalizeFirst = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
