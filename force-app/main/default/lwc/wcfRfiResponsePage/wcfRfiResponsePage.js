import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getDynamicDraft from '@salesforce/apex/WCFFormEngineController.getDynamicDraft';
import resubmitDynamicApplication from '@salesforce/apex/WCFFormEngineController.resubmitDynamicApplication';
import deleteUploadedFile from '@salesforce/apex/WCFFormEngineController.deleteUploadedFile';
import searchHQLocation from '@salesforce/apex/OpenStreetMapService.searchLocation';

export default class WcfRfiResponsePage extends LightningElement {
    @api recordId;
    @api applicationName = '';
    @api questionReturnNotes = [];

    @track isLoading = true;
    @track isSaving = false;
    @track isSubmitted = false;
    @track validationErrorMessage = '';

    @track selectedTracks = [];
    @track formValues = {
        Fiscal_Month__c: '03',
        Fiscal_Day__c: '31',
        Organization_Name__c: '',
        Headquarters_City_and_Country__c: '',
        Primary_Service_Regions__c: '',
        Leader_Name__c: '',
        Leader_Title__c: '',
        Leader_Tenure__c: '',
        Submitter_Name__c: '',
        Job_Title__c: '',
        Work_Email_ID__c: '',
        Phone__c: '',
        WG_Phone_Country_Code__c: '+91',
        Legal_Type__c: '',
        Legal_Type_Other__c: '',
        Registration_Jurisdiction__c: '',
        Registration_Jurisdiction_Other__c: '',
        Incorporation_Date__c: '',
        Legal_Structure__c: '',
        Has_501c3_Status__c: '',
        Has_Equivalency_Determination__c: '',
        Is_FCRA_Registered__c: '',
        Willing_to_Pursue_ED__c: '',
        Funder_1_Name__c: '',
        Funder_1_Amount__c: '',
        Funder_1_Period_Start__c: '',
        Funder_1_Period_End__c: '',
        Funder_1_Type__c: '',
        Funder_2_Name__c: '',
        Funder_2_Amount__c: '',
        Funder_2_Period_Start__c: '',
        Funder_2_Period_End__c: '',
        Funder_2_Type__c: '',
        Funder_3_Name__c: '',
        Funder_3_Amount__c: '',
        Funder_3_Period_Start__c: '',
        Funder_3_Period_End__c: '',
        Funder_3_Type__c: '',
        Reference_1_Name__c: '',
        Reference_1_Role__c: '',
        Reference_1_Email__c: '',
        Reference_2_Name__c: '',
        Reference_2_Role__c: '',
        Reference_2_Email__c: '',
        Skilling_Approach__c: '',
        Job_Creation_Approach__c: '',
        Livelihood_Approach__c: '',
        Organizational_Sustainability__c: '',
        Use_of_Additional_Funding__c: '',
        GenieAI_Interest_Level__c: '',
        Operational_Synergies_with_WOF__c: '',
        Q24_VERIFIED__c: '',
        Q24_REPORT_URL__c: '',
        Revenue_Explanation__c: ''
    };

    @track skillingDomainRows = [];
    @track businessSectorRows = [];
    @track livelihoodProgramRows = [];
    @track communityRows = [];
    @track docRows = [];
    @track q24UploadedFiles = [];
    @track q28UploadedFiles = [];

    @track fiscalYears = {};
    @track wordCounts = {};

    @track locationResults = [];
    @track showLocationDropdown = false;
    @track isSearchingLocation = false;
    searchTimeout = null;
    _incorpDateTimeout = null;
    _wordCountTimeout = null;

    acceptedFileFormats = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'];
    pdfOnlyFormats = ['.pdf'];

    // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    connectedCallback() {
        this.loadApplicationData();
    }

    async loadApplicationData() {
        this.isLoading = true;
        try {
            const result = await getDynamicDraft({ recordId: this.recordId });
            if (result && result.isSuccess) {
                if (result.selectedTracks && result.selectedTracks.length > 0) {
                    this.selectedTracks = [...result.selectedTracks];
                }
                if (result.formValues) {
                    this.formValues = { ...this.formValues, ...result.formValues };
                }
                if (result.skillingDomains && result.skillingDomains.length > 0) {
                    this.skillingDomainRows = [...result.skillingDomains];
                } else {
                    this.skillingDomainRows = [{ id: 1, name: '', hours: '', duration: '', whenStarted: '', enrollment: '' }];
                }
                if (result.businessSectors && result.businessSectors.length > 0) {
                    this.businessSectorRows = [...result.businessSectors];
                } else {
                    this.businessSectorRows = [{ id: 1, sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', enrollment: '' }];
                }
                if (result.livelihoodPrograms && result.livelihoodPrograms.length > 0) {
                    this.livelihoodProgramRows = [...result.livelihoodPrograms];
                } else {
                    this.livelihoodProgramRows = [{ id: 1, programName: '', interventionType: '', targetPopulation: '', whenStarted: '', annualHouseholds: '' }];
                }
                if (result.communities && result.communities.length > 0) {
                    this.communityRows = [...result.communities];
                } else {
                    this.communityRows = [{ id: 1, partnerName: '', partnerType: '', geography: '', householdsReached: '' }];
                }
                if (result.documents && result.documents.length > 0) {
                    this.docRows = [...result.documents];
                }
                if (result.q24Files && result.q24Files.length > 0) {
                    this.q24UploadedFiles = [...result.q24Files];
                }
                if (result.q28Files && result.q28Files.length > 0) {
                    this.q28UploadedFiles = [...result.q28Files];
                }

                this.computeFiscalYears();
            }
        } catch (err) {
            console.error('Error loading dynamic draft for revision:', err);
        } finally {
            this.isLoading = false;
            setTimeout(() => this.restoreRichTextFields(), 200);
        }
    }

    renderedCallback() {
        if (!this.isLoading && !this.isSubmitted) {
            this.restoreRichTextFields();
        }
    }

    computeFiscalYears() {
        const currentYear = new Date().getFullYear();
        this.fiscalYears = {
            fy3Year: `FY${currentYear - 3}`,
            fy2Year: `FY${currentYear - 2}`,
            fy1Year: `FY${currentYear - 1}`,
            cfyYear: `FY${currentYear}`
        };
    }

    // â”€â”€ Track Getters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    get hasJobFulfillmentTrack() {
        return (this.selectedTracks || []).includes('JOB_FULFILLMENT');
    }
    get hasJobCreationTrack() {
        return (this.selectedTracks || []).includes('JOB_CREATION');
    }
    get hasLivelihoodTrack() {
        return (this.selectedTracks || []).includes('LIVELIHOOD');
    }

    // â”€â”€ Dynamic Continuous Question Numbering (1 to N) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    get qNum() {
        let currentNumber = 1;
        const map = {};

        map.Q1 = currentNumber++; // 1 Track selection
        map.Q2 = currentNumber++; // 2 Org info
        map.Q3 = currentNumber++; // 3 Submitter
        map.Q4 = currentNumber++; // 4 Legal structure
        map.Q5 = currentNumber++; // 5 FY end date
        map.Q6 = currentNumber++; // 6 Historical financials
        map.Q7 = currentNumber++; // 7 Current FY data
        map.Q8 = currentNumber++; // 8 501c3 & ED
        map.Q9 = currentNumber++; // 9 FCRA
        map.Q10 = currentNumber++; // 10 Funders & References

        if (this.hasJobFulfillmentTrack) {
            map.Q11 = currentNumber++;
            map.Q12 = currentNumber++;
            map.Q13 = currentNumber++;
            map.Q14 = currentNumber++;
        }

        if (this.hasJobCreationTrack) {
            map.Q15 = currentNumber++;
            map.Q16 = currentNumber++;
            map.Q17 = currentNumber++;
            map.Q18 = currentNumber++;
        }

        if (this.hasLivelihoodTrack) {
            map.Q19 = currentNumber++;
            map.Q20 = currentNumber++;
            map.Q21 = currentNumber++;
            map.Q22 = currentNumber++;
            map.Q23 = currentNumber++;
        }

        map.Q24 = currentNumber++; // Independent Verification
        map.Q25 = currentNumber++; // Sustainability
        map.Q26 = currentNumber++; // Direction for Additional Funding
        map.Q27 = currentNumber++; // GenieAI
        map.Q28 = currentNumber++; // Supporting Documents

        return map;
    }

    get canonicalTitles() {
        return {
            Q1: 'Track Selection',
            Q2: 'Organizational Identifying Information',
            Q3: 'Submitter Contact Information',
            Q4: 'Legal Structure',
            Q5: 'Legal and Tax Compliance',
            Q6: 'Fiscal Year End Date',
            Q7: 'Top 3 Most Prominent Funders',
            Q8: 'References for Outreach',
            Q9: 'Historical Financial Data',
            Q10: 'Current Fiscal Year Data',
            Q11: 'Your Skilling & Placement Approach',
            Q12: 'Skilling Domains Offered',
            Q13: 'Job Fulfillment Outcomes (Actuals)',
            Q14: 'Job Fulfillment Outcomes (Projections)',
            Q15: 'Your Job Creation Approach',
            Q16: 'Business Sectors Served',
            Q17: 'Job Creation Outcomes (Actuals)',
            Q18: 'Job Creation Outcomes (Projections)',
            Q19: 'Your Livelihood Upliftment Approach',
            Q20: 'Your Key Programs / Initiatives',
            Q21: 'Communities that you work in',
            Q22: 'Livelihood Outcomes (Actuals)',
            Q23: 'Livelihood Outcomes, Current FY Projections',
            Q24: 'Independent Verification of Your Outcomes',
            Q25: 'Organizational Sustainability',
            Q26: 'Desired Use of Additional Funding / Investment',
            Q27: 'Operational Synergies — GenieAI',
            Q28: 'Supporting Documents'
        };
    }

    // â”€â”€ Flagged Questions Resolver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    get flaggedQuestions() {
        const qMap = this.qNum;
        const titles = this.canonicalTitles;
        const notes = this.questionReturnNotes || [];

        // Build reverse lookup: dynamicNumber -> canonicalKey
        const numToKey = {};
        Object.keys(qMap).forEach(key => {
            numToKey[qMap[key]] = key;
        });

        const items = [];
        const seenKeys = new Set();

        notes.forEach(note => {
            const rawNum = Number(note.questionNum);
            let canonicalKey = null;

            // 1. Check if rawNum directly matches dynamic question number
            if (numToKey[rawNum]) {
                canonicalKey = numToKey[rawNum];
            } else if (note.questionKey && qMap[note.questionKey]) {
                canonicalKey = note.questionKey;
            } else if (qMap[`Q${rawNum}`]) {
                // 2. Direct canonical fallback
                canonicalKey = `Q${rawNum}`;
            }

            if (!canonicalKey || seenKeys.has(canonicalKey)) return;
            seenKeys.add(canonicalKey);

            const dispNum = qMap[canonicalKey] || rawNum;
            const title = titles[canonicalKey] || `Question ${dispNum}`;

            items.push({
                key: canonicalKey,
                displayNumber: dispNum,
                title: title,
                returnText: note.returnText,
                isQ1: canonicalKey === 'Q1',
                isQ2: canonicalKey === 'Q2',
                isQ3: canonicalKey === 'Q3',
                isQ4: canonicalKey === 'Q4',
                isQ5: canonicalKey === 'Q5',
                isQ6: canonicalKey === 'Q6',
                isQ7: canonicalKey === 'Q7',
                isQ8: canonicalKey === 'Q8',
                isQ9: canonicalKey === 'Q9',
                isQ10: canonicalKey === 'Q10',
                isQ11: canonicalKey === 'Q11',
                isQ12: canonicalKey === 'Q12',
                isQ13: canonicalKey === 'Q13',
                isQ14: canonicalKey === 'Q14',
                isQ15: canonicalKey === 'Q15',
                isQ16: canonicalKey === 'Q16',
                isQ17: canonicalKey === 'Q17',
                isQ18: canonicalKey === 'Q18',
                isQ19: canonicalKey === 'Q19',
                isQ20: canonicalKey === 'Q20',
                isQ21: canonicalKey === 'Q21',
                isQ22: canonicalKey === 'Q22',
                isQ23: canonicalKey === 'Q23',
                isQ24: canonicalKey === 'Q24',
                isQ25: canonicalKey === 'Q25',
                isQ26: canonicalKey === 'Q26',
                isQ27: canonicalKey === 'Q27',
                isQ28: canonicalKey === 'Q28'
            });
        });

        // Sort by dynamic display number
        return items.sort((a, b) => a.displayNumber - b.displayNumber);
    }

    get hasFlaggedQuestions() {
        return this.flaggedQuestions && this.flaggedQuestions.length > 0;
    }

    // ── Input & Field Handlers ───────────────────────────────────────────────
    handleFieldChange(event) {
        const field = event.target.dataset.field || event.currentTarget.dataset.field;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        if (field) {
            this.formValues[field] = value;
            if (this.validationErrorMessage) {
                this.validationErrorMessage = '';
            }
            if (field === 'Incorporation_Date__c') {
                if (this._incorpDateTimeout) {
                    clearTimeout(this._incorpDateTimeout);
                }
                this._incorpDateTimeout = setTimeout(() => {
                    const today = new Date().toISOString().split('T')[0];
                    const inputEl = this.template.querySelector('[data-field="Incorporation_Date__c"]');
                    if (inputEl) {
                        if (value && value > today) {
                            if (inputEl.setCustomValidity) {
                                inputEl.setCustomValidity('Incorporation Date cannot be in the future.');
                                inputEl.reportValidity();
                            }
                        } else {
                            if (inputEl.setCustomValidity) {
                                inputEl.setCustomValidity('');
                                inputEl.reportValidity();
                            }
                        }
                    }
                }, 300);
            }
        }
    }

    handleTrackToggle(event) {
        const trackCode = event.currentTarget.dataset.code;
        if (!trackCode) return;
        let trks = [...(this.selectedTracks || [])];
        if (trks.includes(trackCode)) {
            trks = trks.filter(t => t !== trackCode);
        } else {
            trks.push(trackCode);
        }
        this.selectedTracks = trks;
        if (this.validationErrorMessage) {
            this.validationErrorMessage = '';
        }
    }

    get trackCards() {
        const sel = this.selectedTracks || [];
        return [
            {
                code: 'JOB_FULFILLMENT',
                label: 'Job Fulfillment (Skilling / Direct Placement)',
                isSelected: sel.includes('JOB_FULFILLMENT'),
                cssClass: sel.includes('JOB_FULFILLMENT') ? 'rfi-track-card rfi-track-card--selected' : 'rfi-track-card'
            },
            {
                code: 'JOB_CREATION',
                label: 'Job Creation (Enterprise Support / Entrepreneurship)',
                isSelected: sel.includes('JOB_CREATION'),
                cssClass: sel.includes('JOB_CREATION') ? 'rfi-track-card rfi-track-card--selected' : 'rfi-track-card'
            },
            {
                code: 'LIVELIHOOD',
                label: 'Livelihood Upliftment (Household Income Growth)',
                isSelected: sel.includes('LIVELIHOOD'),
                cssClass: sel.includes('LIVELIHOOD') ? 'rfi-track-card rfi-track-card--selected' : 'rfi-track-card'
            }
        ];
    }

    // ── Location Autocomplete (HQ) ───────────────────────────────────────────
    handleLocationInput(event) {
        const query = event.target.value;
        this.formValues.Headquarters_City_and_Country__c = query;
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        if (!query || query.length < 3) {
            this.locationResults = [];
            this.showLocationDropdown = false;
            return;
        }
        this.isSearchingLocation = true;
        this.searchTimeout = setTimeout(() => {
            searchHQLocation({ query })
                .then(results => {
                    this.locationResults = (results || []).map(r => ({ ...r, fullLabel: r.label }));
                    this.showLocationDropdown = this.locationResults.length > 0;
                })
                .catch(() => {
                    this.locationResults = [];
                    this.showLocationDropdown = false;
                })
                .finally(() => {
                    this.isSearchingLocation = false;
                });
        }, 300);
    }

    handleSelectLocation(event) {
        const val = event.currentTarget.dataset.value;
        this.formValues.Headquarters_City_and_Country__c = val;
        this.showLocationDropdown = false;
        this.locationResults = [];
    }

    // ── Fiscal Year & Dates ──────────────────────────────────────────────────
    get fiscalMonthOptions() {
        return [
            { label: 'January', value: '01' }, { label: 'February', value: '02' },
            { label: 'March', value: '03' }, { label: 'April', value: '04' },
            { label: 'May', value: '05' }, { label: 'June', value: '06' },
            { label: 'July', value: '07' }, { label: 'August', value: '08' },
            { label: 'September', value: '09' }, { label: 'October', value: '10' },
            { label: 'November', value: '11' }, { label: 'December', value: '12' }
        ];
    }

    get fiscalDayOptions() {
        const m = parseInt(this.formValues.Fiscal_Month__c || '03', 10);
        let max = 31;
        if ([4, 6, 9, 11].includes(m)) max = 30;
        else if (m === 2) max = 29;
        const opts = [];
        for (let i = 1; i <= max; i++) {
            const v = i < 10 ? '0' + i : String(i);
            opts.push({ label: String(i), value: v });
        }
        return opts;
    }

    handleFiscalMonthChange(event) {
        this.formValues.Fiscal_Month__c = event.detail.value;
        this.computeFiscalYears();
    }

    handleFiscalDayChange(event) {
        this.formValues.Fiscal_Day__c = event.detail.value;
        this.computeFiscalYears();
    }

    // ── Picklists ────────────────────────────────────────────────────────────
    get legalTypeOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Non-profit', value: 'Non-profit' },
            { label: 'For-profit', value: 'For-profit' },
            { label: 'Hybrid', value: 'Hybrid' },
            { label: 'Government-affiliated', value: 'Government-affiliated' },
            { label: 'Other', value: 'Other' }
        ];
    }
    get isLegalTypeOther() {
        return this.formValues.Legal_Type__c === 'Other';
    }

    get countryOptions() {
        return [
            { label: '— Select country —', value: '' },
            { label: 'Brazil', value: 'Brazil' },
            { label: 'Egypt', value: 'Egypt' },
            { label: 'India', value: 'India' },
            { label: 'Indonesia', value: 'Indonesia' },
            { label: 'Kenya', value: 'Kenya' },
            { label: 'Mexico', value: 'Mexico' },
            { label: 'Nigeria', value: 'Nigeria' },
            { label: 'Philippines', value: 'Philippines' },
            { label: 'South Africa', value: 'South Africa' },
            { label: 'United States', value: 'United States' },
            { label: 'Other', value: 'Other' }
        ];
    }
    get isRegistrationJurisdictionOther() {
        return this.formValues.Registration_Jurisdiction__c === 'Other';
    }

    get isUSJurisdiction() {
        return this.formValues.Registration_Jurisdiction__c === 'United States';
    }
    get isIndiaJurisdiction() {
        return this.formValues.Registration_Jurisdiction__c === 'India';
    }
    get isOtherJurisdiction() {
        return !this.isUSJurisdiction && !this.isIndiaJurisdiction && !!this.formValues.Registration_Jurisdiction__c;
    }

    get funderTypeOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Grant', value: 'Grant' },
            { label: 'Loan', value: 'Loan' },
            { label: 'Equity', value: 'Equity' },
            { label: 'In-Kind', value: 'In-Kind' }
        ];
    }

    get genieAIOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Yes, interested', value: 'Yes, interested' },
            { label: 'Maybe, want to learn more', value: 'Maybe, want to learn more' },
            { label: 'Not at this time', value: 'Not at this time' }
        ];
    }

    get showSynergiesTextBox() {
        const v = this.formValues.GenieAI_Interest_Level__c;
        return v === 'Yes, interested' || v === 'Maybe, want to learn more';
    }

    // â”€â”€ Rich Text Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    handleRichTextInput(event) {
        const field = event.target.dataset.field;
        if (field) {
            const html = event.target.innerHTML;
            this.formValues[field] = html;
            if (this._wordCountTimeout) {
                clearTimeout(this._wordCountTimeout);
            }
            this._wordCountTimeout = setTimeout(() => {
                const text = this.stripHtml(html).trim();
                const count = text ? text.split(/\s+/).length : 0;
                this.wordCounts = { ...this.wordCounts, [field]: count };
            }, 300);
        }
    }

    stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    restoreRichTextFields() {
        const richFields = [
            'Legal_Structure__c',
            'Revenue_Explanation__c',
            'Skilling_Approach__c',
            'Job_Creation_Approach__c',
            'Livelihood_Approach__c',
            'Organizational_Sustainability__c',
            'Use_of_Additional_Funding__c',
            'Operational_Synergies_with_WOF__c'
        ];
        richFields.forEach(f => {
            const el = this.template.querySelector(`[data-field="${f}"]`);
            if (el && this.formValues[f] !== undefined && el.innerHTML !== this.formValues[f]) {
                el.innerHTML = this.formValues[f] || '';
            }
        });
    }

    formatDoc(cmd, value = null) {
        document.execCommand(cmd, false, value);
    }
    handleBold() { this.formatDoc('bold'); }
    handleItalic() { this.formatDoc('italic'); }
    handleUnderline() { this.formatDoc('underline'); }

    // â”€â”€ Table Calculations (Historical & CFY) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    get cy3BalanceEnd() {
        const s = Number(this.formValues.START_FY3 || this.formValues.CY3_Balance_Start_CFY_3__c) || 0;
        const r = Number(this.formValues.REV_FY3 || this.formValues.CY3_Revenue__c) || 0;
        const c = Number(this.formValues.CAP_FY3 || this.formValues.CY3_Capital_Expenditure__c) || 0;
        const o = Number(this.formValues.OP_FY3 || this.formValues.CY3_Operating_Expenditure__c) || 0;
        return s + r - (c + o);
    }
    get cy2BalanceEnd() {
        const s = this.cy3BalanceEnd;
        const r = Number(this.formValues.REV_FY2 || this.formValues.CY2_Revenue__c) || 0;
        const c = Number(this.formValues.CAP_FY2 || this.formValues.CY2_Capital_Expenditure__c) || 0;
        const o = Number(this.formValues.OP_FY2 || this.formValues.CY2_Operating_Expenditure__c) || 0;
        return s + r - (c + o);
    }
    get cy1BalanceEnd() {
        const s = this.cy2BalanceEnd;
        const r = Number(this.formValues.REV_FY1 || this.formValues.CY1_Revenue__c) || 0;
        const c = Number(this.formValues.CAP_FY1 || this.formValues.CY1_Capital_Expenditure__c) || 0;
        const o = Number(this.formValues.OP_FY1 || this.formValues.CY1_Operating_Expenditure__c) || 0;
        return s + r - (c + o);
    }

    get cfyRevenueVariance() {
        const b = Number(this.formValues.CFY_REV_BUDGET || this.formValues.Revenue_Budget__c) || 0;
        const p = Number(this.formValues.CFY_REV_PROJ || this.formValues.Revenue_Projection__c) || 0;
        return p - b;
    }
    get cfyCapexVariance() {
        const b = Number(this.formValues.CFY_CAP_BUDGET || this.formValues.Capital_Expenditure_Budget__c) || 0;
        const p = Number(this.formValues.CFY_CAP_PROJ || this.formValues.Capital_Expenditure_Projection__c) || 0;
        return p - b;
    }
    get cfyOpexVariance() {
        const b = Number(this.formValues.CFY_OP_BUDGET || this.formValues.Operating_Expenditure_Budget__c) || 0;
        const p = Number(this.formValues.CFY_OP_PROJ || this.formValues.Operating_Expenditure_Projection__c) || 0;
        return p - b;
    }
    get cfyNetBudget() {
        const r = Number(this.formValues.CFY_REV_BUDGET || this.formValues.Revenue_Budget__c) || 0;
        const c = Number(this.formValues.CFY_CAP_BUDGET || this.formValues.Capital_Expenditure_Budget__c) || 0;
        const o = Number(this.formValues.CFY_OP_BUDGET || this.formValues.Operating_Expenditure_Budget__c) || 0;
        return r - (c + o);
    }
    get cfyNetProj() {
        const r = Number(this.formValues.CFY_REV_PROJ || this.formValues.Revenue_Projection__c) || 0;
        const c = Number(this.formValues.CFY_CAP_PROJ || this.formValues.Capital_Expenditure_Projection__c) || 0;
        const o = Number(this.formValues.CFY_OP_PROJ || this.formValues.Operating_Expenditure_Projection__c) || 0;
        return r - (c + o);
    }
    get cfyNetVariance() {
        return this.cfyNetProj - this.cfyNetBudget;
    }

    // â”€â”€ Repeating Grids: Domains, Sectors, Programs, Communities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    handleAddSkillingDomain() {
        const nextId = this.skillingDomainRows.length + 1;
        this.skillingDomainRows = [
            ...this.skillingDomainRows,
            { id: nextId, name: '', hours: '', duration: '', whenStarted: '', enrollment: '' }
        ];
    }
    handleRemoveSkillingDomain(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        let rows = this.skillingDomainRows.filter(r => r.id !== id);
        if (rows.length === 0) rows = [{ id: 1, name: '', hours: '', duration: '', whenStarted: '', enrollment: '' }];
        this.skillingDomainRows = rows.map((r, i) => ({ ...r, id: i + 1 }));
    }
    handleSkillingDomainChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const f = event.currentTarget.dataset.field;
        const v = event.target.value;
        this.skillingDomainRows = this.skillingDomainRows.map(r => r.id === id ? { ...r, [f]: v } : r);
    }

    handleAddBusinessSector() {
        const nextId = this.businessSectorRows.length + 1;
        this.businessSectorRows = [
            ...this.businessSectorRows,
            { id: nextId, sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', enrollment: '' }
        ];
    }
    handleRemoveBusinessSector(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        let rows = this.businessSectorRows.filter(r => r.id !== id);
        if (rows.length === 0) rows = [{ id: 1, sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', enrollment: '' }];
        this.businessSectorRows = rows.map((r, i) => ({ ...r, id: i + 1 }));
    }
    handleBusinessSectorChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const f = event.currentTarget.dataset.field;
        const v = event.target.value;
        this.businessSectorRows = this.businessSectorRows.map(r => r.id === id ? { ...r, [f]: v } : r);
    }
    handleSupportTypeChip(event) {
        event.preventDefault();
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const chip = event.currentTarget.dataset.chip;
        this.businessSectorRows = this.businessSectorRows.map(r => {
            if (r.id !== id) return r;
            const current = r.supportTypes || [];
            const updated = current.includes(chip) ? current.filter(c => c !== chip) : [...current, chip];
            return { ...r, supportTypes: updated };
        });
    }

    handleAddLivelihoodProgram() {
        const nextId = this.livelihoodProgramRows.length + 1;
        this.livelihoodProgramRows = [
            ...this.livelihoodProgramRows,
            { id: nextId, programName: '', interventionType: '', targetPopulation: '', whenStarted: '', annualHouseholds: '' }
        ];
    }
    handleRemoveLivelihoodProgram(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        let rows = this.livelihoodProgramRows.filter(r => r.id !== id);
        if (rows.length === 0) rows = [{ id: 1, programName: '', interventionType: '', targetPopulation: '', whenStarted: '', annualHouseholds: '' }];
        this.livelihoodProgramRows = rows.map((r, i) => ({ ...r, id: i + 1 }));
    }
    handleLivelihoodProgramChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const f = event.currentTarget.dataset.field;
        const v = event.target.value;
        this.livelihoodProgramRows = this.livelihoodProgramRows.map(r => r.id === id ? { ...r, [f]: v } : r);
    }

    handleAddCommunity() {
        const nextId = this.communityRows.length + 1;
        this.communityRows = [
            ...this.communityRows,
            { id: nextId, partnerName: '', partnerType: '', geography: '', householdsReached: '' }
        ];
    }
    handleRemoveCommunity(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        let rows = this.communityRows.filter(r => r.id !== id);
        if (rows.length === 0) rows = [{ id: 1, partnerName: '', partnerType: '', geography: '', householdsReached: '' }];
        this.communityRows = rows.map((r, i) => ({ ...r, id: i + 1 }));
    }
    handleCommunityChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const f = event.currentTarget.dataset.field;
        const v = event.target.value;
        this.communityRows = this.communityRows.map(r => r.id === id ? { ...r, [f]: v } : r);
    }

    // â”€â”€ Q24 & Q28 File Upload Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    get isQ24VerifiedYes() {
        return this.formValues.Q24_VERIFIED__c === 'Yes' || this.formValues.Q24_VERIFIED === 'Yes';
    }
    get hasQ24UploadedFiles() {
        return this.q24UploadedFiles && this.q24UploadedFiles.length > 0;
    }
    handleQ24UploadFinished(event) {
        const uploaded = event.detail.files || [];
        if (uploaded.length > 0) {
            const newFiles = uploaded.map(f => ({
                name: f.name,
                documentId: f.documentId,
                contentVersionId: f.contentVersionId
            }));
            this.q24UploadedFiles = [...this.q24UploadedFiles, ...newFiles];
            this.dispatchEvent(new ShowToastEvent({
                title: 'File Uploaded',
                message: 'Verification Report uploaded successfully.',
                variant: 'success'
            }));
        }
    }
    handleRemoveQ24File(event) {
        const docId = event.currentTarget?.dataset?.id;
        this.q24UploadedFiles = this.q24UploadedFiles.filter(f => f.documentId !== docId);
        if (docId) {
            deleteUploadedFile({ documentId: docId, recordId: this.recordId })
                .catch(err => console.warn('File delete error:', err));
        }
    }

    get hasQ28UploadedFiles() {
        return this.q28UploadedFiles && this.q28UploadedFiles.length > 0;
    }
    handleQ28UploadFinished(event) {
        const uploaded = event.detail.files || [];
        if (uploaded.length > 0) {
            const newFiles = uploaded.map(f => ({
                name: f.name,
                documentId: f.documentId,
                contentVersionId: f.contentVersionId
            }));
            this.q28UploadedFiles = [...this.q28UploadedFiles, ...newFiles];
            this.dispatchEvent(new ShowToastEvent({
                title: 'File Uploaded',
                message: 'Supporting Document uploaded successfully.',
                variant: 'success'
            }));
        }
    }
    handleRemoveQ28File(event) {
        const docId = event.currentTarget?.dataset?.id;
        this.q28UploadedFiles = this.q28UploadedFiles.filter(f => f.documentId !== docId);
        if (docId) {
            deleteUploadedFile({ documentId: docId, recordId: this.recordId })
                .catch(err => console.warn('File delete error:', err));
        }
    }

    // ── Resubmit Action ──────────────────────────────────────────────────────
    async handleSubmitResponse() {
        if (this.isSaving) return;

        // 1. Sync rich text fields from DOM
        const richSelectors = this.template.querySelectorAll('[contenteditable="true"][data-field]');
        richSelectors.forEach(el => {
            const f = el.dataset.field;
            if (f) {
                this.formValues[f] = el.innerHTML;
            }
        });

        // 2. Validate Track Selection
        if (!this.selectedTracks || this.selectedTracks.length === 0) {
            this.validationErrorMessage = 'Please select at least one Track before submitting.';
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: this.validationErrorMessage,
                variant: 'error'
            }));
            return;
        }

        // 3. Validate Incorporation Date (cannot be in the future)
        const today = new Date().toISOString().split('T')[0];
        if (this.formValues.Incorporation_Date__c && this.formValues.Incorporation_Date__c > today) {
            this.validationErrorMessage = 'Incorporation Date cannot be in the future.';
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: this.validationErrorMessage,
                variant: 'error'
            }));
            return;
        }

        // 4. Validate all standard lightning inputs, comboboxes, radio-groups
        const inputs = [...this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-radio-group')];
        let valid = true;
        inputs.forEach(i => {
            if (i.reportValidity && !i.reportValidity()) {
                valid = false;
            }
        });

        // 5. Validate required rich text areas for returned questions
        const flagged = this.flaggedQuestions || [];
        for (const q of flagged) {
            if (q.isQ4) {
                const text = this.stripHtml(this.formValues.Legal_Structure__c).trim();
                if (!text) valid = false;
            }
            if (q.isQ11) {
                const text = this.stripHtml(this.formValues.Skilling_Approach__c).trim();
                if (!text) valid = false;
            }
            if (q.isQ15) {
                const text = this.stripHtml(this.formValues.Job_Creation_Approach__c).trim();
                if (!text) valid = false;
            }
            if (q.isQ19) {
                const text = this.stripHtml(this.formValues.Livelihood_Approach__c).trim();
                if (!text) valid = false;
            }
            if (q.isQ25) {
                const text = this.stripHtml(this.formValues.Organizational_Sustainability__c).trim();
                if (!text) valid = false;
            }
            if (q.isQ26) {
                const text = this.stripHtml(this.formValues.Use_of_Additional_Funding__c).trim();
                if (!text) valid = false;
            }
        }

        if (!valid) {
            this.validationErrorMessage = 'Please fill in all required fields and complete required descriptions before resubmitting.';
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: this.validationErrorMessage,
                variant: 'error'
            }));
            return;
        }
        this.validationErrorMessage = '';

        this.isSaving = true;
        try {
            const q24DocIds = this.q24UploadedFiles.map(f => f.documentId);
            const q28DocIds = this.q28UploadedFiles.map(f => f.documentId);

            const payload = {
                ...this.formValues,
                activeTabId: 'tabReviewSubmit',
                skillingDomains: this.skillingDomainRows,
                businessSectors: this.businessSectorRows,
                livelihoodPrograms: this.livelihoodProgramRows,
                communities: this.communityRows,
                documents: this.docRows,
                q24DocumentIds: q24DocIds,
                q28DocumentIds: q28DocIds,
                uploadedDocumentIds: [...q24DocIds, ...q28DocIds]
            };

            const result = await resubmitDynamicApplication({
                recordId: this.recordId,
                selectedTracks: this.selectedTracks,
                payloadJson: JSON.stringify(payload)
            });

            if (result && result.isSuccess) {
                this.isSubmitted = true;
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Revision Submitted',
                    message: 'Your updated answers have been submitted for review.',
                    variant: 'success'
                }));
                this.dispatchEvent(new CustomEvent('submitted'));
            } else {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Submission Error',
                    message: result ? result.message : 'Could not submit revision.',
                    variant: 'error'
                }));
            }
        } catch (err) {
            console.error('Error in resubmitDynamicApplication:', err);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Submission Error',
                message: err.body ? err.body.message : err.message || 'Error resubmitting application.',
                variant: 'error'
            }));
        } finally {
            this.isSaving = false;
        }
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleBackToDashboard() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }
}