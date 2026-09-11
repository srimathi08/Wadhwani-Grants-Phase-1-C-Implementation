import { evaluateDependencyRule, countWords, calculateEndingBalance, calculateVariance } from '../wcfFormEvaluator';

describe('wcfFormEvaluator Unit Tests', () => {
    
    test('evaluateDependencyRule TRACK_INCLUDES', () => {
        const rule = { sourceQuestionKey: 'Q_SELECTED_TRACKS', operator: 'TRACK_INCLUDES', value: 'JOB_FULFILLMENT' };
        expect(evaluateDependencyRule(rule, ['JOB_FULFILLMENT', 'JOB_CREATION'], {})).toBe(true);
        expect(evaluateDependencyRule(rule, ['LIVELIHOOD'], {})).toBe(false);
    });

    test('evaluateDependencyRule EQUALS and NOT_BLANK', () => {
        const ruleEquals = { sourceQuestionKey: 'Q_LEGAL_TYPE', operator: 'EQUALS', value: 'Section8' };
        expect(evaluateDependencyRule(ruleEquals, [], { Q_LEGAL_TYPE: 'Section8' })).toBe(true);
        expect(evaluateDependencyRule(ruleEquals, [], { Q_LEGAL_TYPE: 'Trust' })).toBe(false);

        const ruleNotBlank = { sourceQuestionKey: 'Q_ORG_NAME', operator: 'NOT_BLANK' };
        expect(evaluateDependencyRule(ruleNotBlank, [], { Q_ORG_NAME: 'Acme Corp' })).toBe(true);
        expect(evaluateDependencyRule(ruleNotBlank, [], { Q_ORG_NAME: '   ' })).toBe(false);
    });

    test('countWords', () => {
        expect(countWords('Hello world testing 1 2 3')).toBe(6);
        expect(countWords('<p>Hello <b>world</b></p>')).toBe(2);
        expect(countWords('')).toBe(0);
    });

    test('calculateEndingBalance & calculateVariance', () => {
        expect(calculateEndingBalance(100, 500, 200)).toBe(400);
        expect(calculateVariance(1000, 850)).toBe(150);
    });
});
