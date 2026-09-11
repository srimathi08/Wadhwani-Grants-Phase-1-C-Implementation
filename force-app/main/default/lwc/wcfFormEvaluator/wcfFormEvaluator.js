/**
 * Utility module for client-side form evaluation:
 * - Dynamic dependency rules (TRACK_INCLUDES, EQUALS, NOT_BLANK, etc.)
 * - Word count validation
 * - Dynamic financial & outcome grid auto-calculations
 */

export function evaluateDependencyRule(rule, selectedTracks = [], formValues = {}) {
    if (!rule) return true;
    
    const { sourceQuestionKey, operator, value } = rule;
    
    switch (operator) {
        case 'TRACK_INCLUDES':
            return Array.isArray(selectedTracks) && selectedTracks.includes(value);
            
        case 'EQUALS':
            return formValues[sourceQuestionKey] === value;
            
        case 'NOT_EQUALS':
            return formValues[sourceQuestionKey] !== value;
            
        case 'NOT_BLANK':
            const val = formValues[sourceQuestionKey];
            return val !== undefined && val !== null && String(val).trim() !== '';
            
        case 'CONTAINS':
            const strVal = String(formValues[sourceQuestionKey] || '');
            return strVal.includes(value);
            
        default:
            return true;
    }
}

export function countWords(text) {
    if (!text) return 0;
    // Strip HTML tags for rich text
    const cleanText = text.replace(/<[^>]*>/g, ' ').trim();
    if (!cleanText) return 0;
    return cleanText.split(/\s+/).filter(Boolean).length;
}

export function calculateEndingBalance(startBalance, revenue, expense) {
    const start = Number(startBalance) || 0;
    const rev = Number(revenue) || 0;
    const exp = Number(expense) || 0;
    return start + rev - exp;
}

export function calculateVariance(budget, actualProjection) {
    const b = Number(budget) || 0;
    const p = Number(actualProjection) || 0;
    return b - p;
}
