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
        Revenue_Explanation__c: '',
        JF_ENROLL_FY3: '', JF_PLACE_FY3: '', JF_COST_FY3: '',
        JF_ENROLL_FY2: '', JF_PLACE_FY2: '', JF_COST_FY2: '',
        JF_ENROLL_FY1: '', JF_PLACE_FY1: '', JF_COST_FY1: '',
        JF_ENROLL_PROJ: '', JF_PLACE_PROJ: '', JF_COST_PROJ: '',
        JC_NEW_BIZ_FY3: '', JC_NEW_JOBS_FY3: '', JC_EXIST_BIZ_FY3: '', JC_EXIST_JOBS_FY3: '', JC_COST_FY3: '',
        JC_NEW_BIZ_FY2: '', JC_NEW_JOBS_FY2: '', JC_EXIST_BIZ_FY2: '', JC_EXIST_JOBS_FY2: '', JC_COST_FY2: '',
        JC_NEW_BIZ_FY1: '', JC_NEW_JOBS_FY1: '', JC_EXIST_BIZ_FY1: '', JC_EXIST_JOBS_FY1: '', JC_COST_FY1: '',
        JC_NEW_BIZ_PROJ: '', JC_NEW_JOBS_PROJ: '', JC_EXIST_BIZ_PROJ: '', JC_EXIST_JOBS_PROJ: '', JC_COST_PROJ: '',
        LIV_SERVED_FY3: '', LIV_SERVED_FY2: '', LIV_SERVED_FY1: '', LIV_SERVED_PROJ: '',
        LIV_ENROLL_FY3: '', LIV_ENROLL_FY2: '', LIV_ENROLL_FY1: '', LIV_ENROLL_PROJ: '',
        LIV_OUTCOME_FY3: '', LIV_OUTCOME_FY2: '', LIV_OUTCOME_FY1: '', LIV_OUTCOME_PROJ: '',
        LIV_COST_FY3: '', LIV_COST_FY2: '', LIV_COST_FY1: '', LIV_COST_PROJ: ''
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
                    const rawFv = { ...result.formValues };
                    const numKeys = [
                        'JF_ENROLL_FY3', 'JF_PLACE_FY3', 'JF_COST_FY3',
                        'JF_ENROLL_FY2', 'JF_PLACE_FY2', 'JF_COST_FY2',
                        'JF_ENROLL_FY1', 'JF_PLACE_FY1', 'JF_COST_FY1',
                        'JF_ENROLL_PROJ', 'JF_PLACE_PROJ', 'JF_COST_PROJ',
                        'JC_NEW_BIZ_FY3', 'JC_NEW_JOBS_FY3', 'JC_EXIST_BIZ_FY3', 'JC_EXIST_JOBS_FY3', 'JC_COST_FY3',
                        'JC_NEW_BIZ_FY2', 'JC_NEW_JOBS_FY2', 'JC_EXIST_BIZ_FY2', 'JC_EXIST_JOBS_FY2', 'JC_COST_FY2',
                        'JC_NEW_BIZ_FY1', 'JC_NEW_JOBS_FY1', 'JC_EXIST_BIZ_FY1', 'JC_EXIST_JOBS_FY1', 'JC_COST_FY1',
                        'JC_NEW_BIZ_PROJ', 'JC_NEW_JOBS_PROJ', 'JC_EXIST_BIZ_PROJ', 'JC_EXIST_JOBS_PROJ', 'JC_COST_PROJ',
                        'LIV_SERVED_FY3', 'LIV_SERVED_FY2', 'LIV_SERVED_FY1', 'LIV_SERVED_PROJ',
                        'LIV_ENROLL_FY3', 'LIV_ENROLL_FY2', 'LIV_ENROLL_FY1', 'LIV_ENROLL_PROJ',
                        'LIV_OUTCOME_FY3', 'LIV_OUTCOME_FY2', 'LIV_OUTCOME_FY1', 'LIV_OUTCOME_PROJ',
                        'LIV_COST_FY3', 'LIV_COST_FY2', 'LIV_COST_FY1', 'LIV_COST_PROJ',
                        'START_FY3', 'REV_FY3', 'CAP_FY3', 'OP_FY3',
                        'REV_FY2', 'CAP_FY2', 'OP_FY2',
                        'REV_FY1', 'CAP_FY1', 'OP_FY1',
                        'CFY_REV_BUDGET', 'CFY_REV_PROJ',
                        'CFY_CAP_BUDGET', 'CFY_CAP_PROJ',
                        'CFY_OP_BUDGET', 'CFY_OP_PROJ'
                    ];
                    for (const nk of numKeys) {
                        if (rawFv[nk] !== undefined && rawFv[nk] !== null) {
                            rawFv[nk] = String(rawFv[nk]).replace(/,/g, '').trim();
                        }
                    }
                    if (!rawFv.JF_PLACE_PROJ && (rawFv.Projected_Learner_Placements_CFY__c || rawFv.Projected_Learner_placement_CFY__c)) {
                        rawFv.JF_PLACE_PROJ = String(rawFv.Projected_Learner_Placements_CFY__c || rawFv.Projected_Learner_placement_CFY__c).replace(/,/g, '').trim();
                    }
                    if (!rawFv.JC_NEW_JOBS_PROJ && (rawFv.Projected_Jobs_from_New_Businesses_CFY__c || rawFv.Jobs_from_New_Businesses_CFY__c)) {
                        rawFv.JC_NEW_JOBS_PROJ = String(rawFv.Projected_Jobs_from_New_Businesses_CFY__c || rawFv.Jobs_from_New_Businesses_CFY__c).replace(/,/g, '').trim();
                    }
                    if (!rawFv.JC_COST_PROJ && (rawFv.Avg_Cost_per_Job_CFY__c || rawFv.Manual_Avg_Cost_per_Job_CFY__c)) {
                        rawFv.JC_COST_PROJ = String(rawFv.Avg_Cost_per_Job_CFY__c || rawFv.Manual_Avg_Cost_per_Job_CFY__c).replace(/,/g, '').trim();
                    }
                    if (!rawFv.JC_NEW_BIZ_PROJ && rawFv.Projected_New_Businesses_CFY__c) {
                        rawFv.JC_NEW_BIZ_PROJ = String(rawFv.Projected_New_Businesses_CFY__c).replace(/,/g, '').trim();
                    }
                    if (!rawFv.JC_EXIST_BIZ_PROJ && rawFv.Growing_Businesses_Supported_CFY__c) {
                        rawFv.JC_EXIST_BIZ_PROJ = String(rawFv.Growing_Businesses_Supported_CFY__c).replace(/,/g, '').trim();
                    }
                    if (!rawFv.JC_EXIST_JOBS_PROJ && rawFv.Jobs_from_Growing_Businesses_CFY__c) {
                        rawFv.JC_EXIST_JOBS_PROJ = String(rawFv.Jobs_from_Growing_Businesses_CFY__c).replace(/,/g, '').trim();
                    }
                    this.formValues = { ...this.formValues, ...rawFv };
                }
                if (result.skillingDomains && result.skillingDomains.length > 0) {
                    this.skillingDomainRows = result.skillingDomains.map((d, idx) => ({
                        id: idx + 1,
                        name: d.name || '',
                        hours: d.hours !== undefined && d.hours !== null ? String(d.hours).replace(/,/g, '').trim() : '',
                        duration: d.duration !== undefined && d.duration !== null ? String(d.duration).replace(/,/g, '').trim() : '',
                        whenStarted: d.whenStarted || '',
                        enrollment: d.enrollment !== undefined && d.enrollment !== null ? String(d.enrollment).replace(/,/g, '').trim() : ''
                    }));
                } else {
                    this.skillingDomainRows = [{ id: 1, name: '', hours: '', duration: '', whenStarted: '', enrollment: '' }];
                }
                if (result.businessSectors && result.businessSectors.length > 0) {
                    this.businessSectorRows = result.businessSectors.map((s, idx) => ({
                        id: idx + 1,
                        sector: s.sector || '',
                        sectorOther: s.sectorOther || '',
                        supportTypes: Array.isArray(s.supportTypes) ? s.supportTypes : (s.supportType ? [s.supportType] : []),
                        supportTypeOther: s.supportTypeOther || '',
                        whenBegan: s.whenBegan || '',
                        enrollment: s.enrollment !== undefined && s.enrollment !== null ? String(s.enrollment).replace(/,/g, '').trim() : ''
                    }));
                } else {
                    this.businessSectorRows = [{ id: 1, sector: '', sectorOther: '', supportTypes: [], supportTypeOther: '', whenBegan: '', enrollment: '' }];
                }
                if (result.livelihoodPrograms && result.livelihoodPrograms.length > 0) {
                    this.livelihoodProgramRows = result.livelihoodPrograms.map((lp, idx) => ({
                        id: idx + 1,
                        name: lp.name || lp.programName || '',
                        supportType: lp.supportType || lp.interventionType || '',
                        manHours: lp.manHours !== undefined && lp.manHours !== null ? String(lp.manHours).replace(/,/g, '').trim() : '',
                        enrollment: lp.enrollment !== undefined && lp.enrollment !== null ? String(lp.enrollment).replace(/,/g, '').trim() : (lp.annualHouseholds !== undefined ? String(lp.annualHouseholds).replace(/,/g, '').trim() : '')
                    }));
                } else {
                    this.livelihoodProgramRows = [{ id: 1, name: '', supportType: '', manHours: '', enrollment: '' }];
                }
                if (result.communities && result.communities.length > 0) {
                    this.communityRows = result.communities.map((c, idx) => ({
                        id: idx + 1,
                        state: c.state || '',
                        district: c.district || '',
                        fy3: c.fy3 !== undefined && c.fy3 !== null ? String(c.fy3).replace(/,/g, '').trim() : '',
                        fy2: c.fy2 !== undefined && c.fy2 !== null ? String(c.fy2).replace(/,/g, '').trim() : '',
                        fy1: c.fy1 !== undefined && c.fy1 !== null ? String(c.fy1).replace(/,/g, '').trim() : '',
                        proj: c.proj !== undefined && c.proj !== null ? String(c.proj).replace(/,/g, '').trim() : ''
                    }));
                } else {
                    this.communityRows = [{ id: 1, state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }];
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

    // ── Dynamic Continuous Question Numbering (1 to N) ───────────────────
    get qNum() {
        let currentNumber = 1;
        const map = {};

        map.Q1 = currentNumber++; // 1 Track selection
        map.Q2 = currentNumber++; // 2 Org info
        map.Q3 = currentNumber++; // 3 Submitter
        map.Q4 = currentNumber++; // 4 Legal structure
        map.Q5 = currentNumber++; // 5 Legal and Tax Compliance
        map.Q6 = currentNumber++; // 6 Fiscal Year End Date
        map.Q7 = currentNumber++; // 7 Top 3 Most Prominent Funders
        map.Q8 = currentNumber++; // 8 References for Outreach
        map.Q9 = currentNumber++; // 9 Historical Financial Data
        map.Q10 = currentNumber++; // 10 Current Fiscal Year Data

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
            Q1: 'Organizational Area(s) for Funding/Investment',
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
            Q13: 'Job Fulfillment Outcomes (Last 3 Fiscal Years)',
            Q14: 'Job Fulfillment Outcomes (Current FY Projections)',
            Q15: 'Your Job Creation Approach',
            Q16: 'Business Sectors Served',
            Q17: 'Job Creation Outcomes (Last 3 Fiscal Years)',
            Q18: 'Job Creation Outcomes (Current FY Projections)',
            Q19: 'Your Livelihood Upliftment Approach',
            Q20: 'Your Key Programs / Initiatives',
            Q21: 'Communities that you work in',
            Q22: 'Livelihood Outcomes (Last 3 Fiscal Years)',
            Q23: 'Livelihood Outcomes (Current FY Projections)',
            Q24: 'Independent Verification of Your Outcomes',
            Q25: 'Sustainability Plan',
            Q26: 'Direction for Additional Funding',
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

    get todayDateString() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // ── Input & Field Handlers ────────────────────────────────────────────────
    handleFieldChange(event) {
        const field = event.target.dataset.field || event.currentTarget.dataset.field;
        const value = event.detail?.value !== undefined ? event.detail.value : event.target.value;
        if (field) {
            const updated = { ...this.formValues, [field]: value };

            // Keep DB aliases in sync when UI keys change and vice-versa
            const aliasPairs = [
                ['START_FY3', 'CY3_Balance_Start_CFY_3__c'],
                ['REV_FY3', 'CY3_Revenue__c'],
                ['CAP_FY3', 'CY3_Capital_Expenditure__c'],
                ['OP_FY3', 'CY3_Operating_Expenditure__c'],
                ['REV_FY2', 'CY2_Revenue__c'],
                ['CAP_FY2', 'CY2_Capital_Expenditure__c'],
                ['OP_FY2', 'CY2_Operating_Expenditure__c'],
                ['REV_FY1', 'CY1_Revenue__c'],
                ['CAP_FY1', 'CY1_Capital_Expenditure__c'],
                ['OP_FY1', 'CY1_Operating_Expenditure__c'],
                ['CFY_REV_BUDGET', 'Revenue_Budget__c'],
                ['CFY_REV_PROJ', 'Revenue_Projection__c'],
                ['CFY_CAP_BUDGET', 'Capital_Expenditure_Budget__c'],
                ['CFY_CAP_PROJ', 'Capital_Expenditure_Projection__c'],
                ['CFY_OP_BUDGET', 'Operating_Expenditure_Budget__c'],
                ['CFY_OP_PROJ', 'Operating_Expenditure_Projection__c'],
                ['JF_ENROLL_FY3', 'Projected_Learner_Enrollments_FY_3__c'],
                ['JF_PLACE_FY3', 'Projected_Learner_Placements_FY_3__c'],
                ['JF_COST_FY3', 'Avg_Cost_per_Placement_FY_3__c'],
                ['JF_ENROLL_FY2', 'Projected_Learner_Enrollments_FY_2__c'],
                ['JF_PLACE_FY2', 'Projected_Learner_Placements_FY_2__c'],
                ['JF_COST_FY2', 'Avg_Cost_per_Placement_FY_2__c'],
                ['JF_ENROLL_FY1', 'Projected_Learner_Enrollments_FY_1__c'],
                ['JF_PLACE_FY1', 'Projected_Learner_Placements_FY_1__c'],
                ['JF_COST_FY1', 'Avg_Cost_per_Placement_FY_1__c'],
                ['JF_ENROLL_PROJ', 'Projected_Learner_Enrollments_CFY__c'],
                ['JF_PLACE_PROJ', 'Projected_Learner_Placements_CFY__c'],
                ['JF_COST_PROJ', 'Avg_Cost_per_Placement_CFY__c'],
                ['JC_NEW_BIZ_FY3', 'Projected_New_Businesses_FY_3__c'],
                ['JC_NEW_JOBS_FY3', 'Projected_Jobs_from_New_Businesses_FY3__c'],
                ['JC_EXIST_BIZ_FY3', 'Growing_Businesses_Supported_FY_3__c'],
                ['JC_EXIST_JOBS_FY3', 'Jobs_from_Growing_Businesses_FY_3__c'],
                ['JC_COST_FY3', 'Avg_Cost_per_Job_FY_3__c'],
                ['JC_NEW_BIZ_FY2', 'Projected_New_Businesses_FY_2__c'],
                ['JC_NEW_JOBS_FY2', 'Projected_Jobs_from_New_Businesses_FY2__c'],
                ['JC_EXIST_BIZ_FY2', 'Growing_Businesses_Supported_FY_2__c'],
                ['JC_EXIST_JOBS_FY2', 'Jobs_from_Growing_Businesses_FY_2__c'],
                ['JC_COST_FY2', 'Avg_Cost_per_Job_FY_2__c'],
                ['JC_NEW_BIZ_FY1', 'Projected_New_Businesses_FY_1__c'],
                ['JC_NEW_JOBS_FY1', 'Projected_Jobs_from_New_Businesses_FY1__c'],
                ['JC_EXIST_BIZ_FY1', 'Growing_Businesses_Supported_FY_1__c'],
                ['JC_EXIST_JOBS_FY1', 'Jobs_from_Growing_Businesses_FY_1__c'],
                ['JC_COST_FY1', 'Avg_Cost_per_Job_FY_1__c'],
                ['JC_NEW_BIZ_PROJ', 'Projected_New_Businesses_CFY__c'],
                ['JC_NEW_JOBS_PROJ', 'Projected_Jobs_from_New_Businesses_CFY__c'],
                ['JC_EXIST_BIZ_PROJ', 'Growing_Businesses_Supported_CFY__c'],
                ['JC_EXIST_JOBS_PROJ', 'Jobs_from_Growing_Businesses_CFY__c'],
                ['JC_COST_PROJ', 'Avg_Cost_per_Job_CFY__c'],
                ['LIV_SERVED_FY3', 'LIV_SERVED_FY3__c'],
                ['LIV_SERVED_FY2', 'LIV_SERVED_FY2__c'],
                ['LIV_SERVED_FY1', 'LIV_SERVED_FY1__c'],
                ['LIV_SERVED_PROJ', 'LIV_SERVED_PROJ__c'],
                ['LIV_ENROLL_FY3', 'LIV_ENROLL_FY3__c'],
                ['LIV_ENROLL_FY2', 'LIV_ENROLL_FY2__c'],
                ['LIV_ENROLL_FY1', 'LIV_ENROLL_FY1__c'],
                ['LIV_ENROLL_PROJ', 'LIV_ENROLL_PROJ__c'],
                ['Has_501c3_Status__c', 'Do_you_have_a_US_501_c_3_organization__c'],
                ['Has_Equivalency_Determination__c', 'Have_you_cleared_Equivalency_Determinat__c'],
                ['Is_FCRA_Registered__c', 'Are_you_FCRA_exempted_compliant__c'],
                ['Willing_to_Pursue_ED__c', 'If_none_of_the_above_apply_would_you__c'],
                ['Q24_VERIFIED__c', 'Q24_VERIFIED']
            ];

            aliasPairs.forEach(([k1, k2]) => {
                if (field === k1) updated[k2] = value;
                if (field === k2) updated[k1] = value;
            });

            this.formValues = updated;
        }

        if (field === 'Incorporation_Date__c') {
            const today = this.todayDateString;
            if (value && value > today) {
                event.target.setCustomValidity?.('Incorporation Date cannot be a future date.');
                event.target.reportValidity?.();
            } else {
                event.target.setCustomValidity?.('');
                event.target.reportValidity?.();
            }
        }
    }

    handleTrackToggle(event) {
        // Track selection is locked/read-only in the Return Flow
        return;
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

    // ── Location Autocomplete (HQ) ────────────────────────────────────────────
    handleLocationInput(event) {
        const query = event.target.value;
        this.formValues = { ...this.formValues, Headquarters_City_and_Country__c: query };
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
        this.formValues = { ...this.formValues, Headquarters_City_and_Country__c: val };
        this.showLocationDropdown = false;
        this.locationResults = [];
    }

    // ── Fiscal Year & Dates ───────────────────────────────────────────────────
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
        this.formValues = { ...this.formValues, Fiscal_Month__c: event.detail.value };
    }

    handleFiscalDayChange(event) {
        this.formValues = { ...this.formValues, Fiscal_Day__c: event.detail.value };
    }

    // ── Picklists ────────────────────────────────────────────────────────
    get yesNoOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' }
        ];
    }

    get yesNoNotApplicableOptions() {
        return [
            { label: '— Select —', value: '' },
            { label: 'Yes', value: 'Yes' },
            { label: 'No', value: 'No' },
            { label: 'Not Applicable', value: 'Not Applicable' }
        ];
    }

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
        return !this.isUSJurisdiction && !this.isIndiaJurisdiction && !this.formValues.Registration_Jurisdiction__c;
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

    // ── Rich Text Helpers ────────────────────────────────────────────────────
    handleRichTextInput(event) {
        const field = event.target.dataset.field;
        if (field) {
            const html = event.target.innerHTML;
            this.formValues = { ...this.formValues, [field]: html };
            const text = this.stripHtml(html).trim();
            const count = text ? text.split(/\s+/).length : 0;
            this.wordCounts = { ...this.wordCounts, [field]: count };
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

    // ── Numeric Helper ───────────────────────────────────────────────────────
    _getNum(val) {
        if (val === undefined || val === null || val === '') return 0;
        const clean = String(val).replace(/,/g, '').trim();
        const num = Number(clean);
        return isNaN(num) ? 0 : num;
    }

    // ── Table Calculations (Historical & CFY) ─────────────────────────────────
    get cy3BalanceEnd() {
        const s = this._getNum(this.formValues.START_FY3);
        const r = this._getNum(this.formValues.REV_FY3);
        const c = this._getNum(this.formValues.CAP_FY3);
        const o = this._getNum(this.formValues.OP_FY3);
        return s + r - (c + o);
    }
    get cy2BalanceEnd() {
        const s = this.cy3BalanceEnd;
        const r = this._getNum(this.formValues.REV_FY2);
        const c = this._getNum(this.formValues.CAP_FY2);
        const o = this._getNum(this.formValues.OP_FY2);
        return s + r - (c + o);
    }
    get cy1BalanceEnd() {
        const s = this.cy2BalanceEnd;
        const r = this._getNum(this.formValues.REV_FY1);
        const c = this._getNum(this.formValues.CAP_FY1);
        const o = this._getNum(this.formValues.OP_FY1);
        return s + r - (c + o);
    }

    get cfyRevenueVariance() {
        const b = this._getNum(this.formValues.CFY_REV_BUDGET);
        const p = this._getNum(this.formValues.CFY_REV_PROJ);
        return p - b;
    }
    get cfyCapexVariance() {
        const b = this._getNum(this.formValues.CFY_CAP_BUDGET);
        const p = this._getNum(this.formValues.CFY_CAP_PROJ);
        return p - b;
    }
    get cfyOpexVariance() {
        const b = this._getNum(this.formValues.CFY_OP_BUDGET);
        const p = this._getNum(this.formValues.CFY_OP_PROJ);
        return p - b;
    }
    get cfyNetBudget() {
        const r = this._getNum(this.formValues.CFY_REV_BUDGET);
        const c = this._getNum(this.formValues.CFY_CAP_BUDGET);
        const o = this._getNum(this.formValues.CFY_OP_BUDGET);
        return r - (c + o);
    }
    get cfyNetProj() {
        const r = this._getNum(this.formValues.CFY_REV_PROJ);
        const c = this._getNum(this.formValues.CFY_CAP_PROJ);
        const o = this._getNum(this.formValues.CFY_OP_PROJ);
        return r - (c + o);
    }
    get cfyNetVariance() {
        return this.cfyNetProj - this.cfyNetBudget;
    }

    // ── Q13 & Q14 Placement % Calculations ────────────────────────────────────
    get computedJfPlacePctFY3() {
        const e = this._getNum(this.formValues.JF_ENROLL_FY3);
        const p = this._getNum(this.formValues.JF_PLACE_FY3);
        if (!e || e === 0) return '0.00%';
        return ((p / e) * 100).toFixed(2) + '%';
    }
    get computedJfPlacePctFY2() {
        const e = this._getNum(this.formValues.JF_ENROLL_FY2);
        const p = this._getNum(this.formValues.JF_PLACE_FY2);
        if (!e || e === 0) return '0.00%';
        return ((p / e) * 100).toFixed(2) + '%';
    }
    get computedJfPlacePctFY1() {
        const e = this._getNum(this.formValues.JF_ENROLL_FY1);
        const p = this._getNum(this.formValues.JF_PLACE_FY1);
        if (!e || e === 0) return '0.00%';
        return ((p / e) * 100).toFixed(2) + '%';
    }
    get computedJfPlacePctProj() {
        const e = this._getNum(this.formValues.JF_ENROLL_PROJ);
        const p = this._getNum(this.formValues.JF_PLACE_PROJ);
        if (!e || e === 0) return '0.00%';
        return ((p / e) * 100).toFixed(2) + '%';
    }

    // ── Q17 & Q18 Total Jobs Created Calculations ─────────────────────────────
    get computedJcTotalJobsFY3() {
        const n = this._getNum(this.formValues.JC_NEW_JOBS_FY3);
        const e = this._getNum(this.formValues.JC_EXIST_JOBS_FY3);
        return n + e;
    }
    get computedJcTotalJobsFY2() {
        const n = this._getNum(this.formValues.JC_NEW_JOBS_FY2);
        const e = this._getNum(this.formValues.JC_EXIST_JOBS_FY2);
        return n + e;
    }
    get computedJcTotalJobsFY1() {
        const n = this._getNum(this.formValues.JC_NEW_JOBS_FY1);
        const e = this._getNum(this.formValues.JC_EXIST_JOBS_FY1);
        return n + e;
    }
    get computedJcTotalJobsProj() {
        const n = this._getNum(this.formValues.JC_NEW_JOBS_PROJ);
        const e = this._getNum(this.formValues.JC_EXIST_JOBS_PROJ);
        return n + e;
    }

    // ── Repeating Grids: Domains, Sectors, Programs, Communities ──────────────
    get canRemoveSkillingDomainRow() {
        return this.skillingDomainRows && this.skillingDomainRows.length > 1;
    }
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

    get canRemoveBusinessSectorRow() {
        return this.businessSectorRows && this.businessSectorRows.length > 1;
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
    get supportTypeOptionsList() {
        return [
            { value: 'Capital', label: 'Capital' },
            { value: 'Mentorship', label: 'Mentorship' },
            { value: 'Business Advisory', label: 'Business Advisory' },
            { value: 'Market Linkages', label: 'Market Linkages' },
            { value: 'Sector Technical Assistance', label: 'Sector Technical Assistance' },
            { value: 'Other', label: 'Other' }
        ];
    }

    get businessSectorRowsIndexed() {
        const supportOpts = this.supportTypeOptionsList;
        return (this.businessSectorRows || []).map((row, index) => {
            const currentTypes = Array.isArray(row.supportTypes) ? row.supportTypes : [];
            const supportTypeChips = supportOpts.map(opt => ({
                value: opt.value,
                label: opt.label,
                isSelected: currentTypes.includes(opt.value),
                chipClass: currentTypes.includes(opt.value) ? 'rfi-chip selected' : 'rfi-chip'
            }));
            return {
                ...row,
                displayIdx: index + 1,
                isOtherSector: row.sector === 'Other',
                showSupportTypeOther: currentTypes.includes('Other'),
                supportTypeChips: supportTypeChips
            };
        });
    }

    handleSupportTypeChip(event) {
        event.preventDefault();
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const chip = event.currentTarget.dataset.chip;
        this.businessSectorRows = this.businessSectorRows.map(r => {
            if (r.id !== id) return r;
            const current = Array.isArray(r.supportTypes) ? r.supportTypes : [];
            const updated = current.includes(chip) ? current.filter(c => c !== chip) : [...current, chip];
            return {
                ...r,
                supportTypes: updated,
                supportTypeOther: updated.includes('Other') ? r.supportTypeOther : ''
            };
        });
    }

    get canRemoveLivelihoodProgramRow() {
        return this.livelihoodProgramRows && this.livelihoodProgramRows.length > 1;
    }
    handleAddLivelihoodProgram() {
        const nextId = this.livelihoodProgramRows.length + 1;
        this.livelihoodProgramRows = [
            ...this.livelihoodProgramRows,
            { id: nextId, name: '', supportType: '', manHours: '', enrollment: '' }
        ];
    }
    handleRemoveLivelihoodProgram(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        let rows = this.livelihoodProgramRows.filter(r => r.id !== id);
        if (rows.length === 0) rows = [{ id: 1, name: '', supportType: '', manHours: '', enrollment: '' }];
        this.livelihoodProgramRows = rows.map((r, i) => ({ ...r, id: i + 1 }));
    }
    handleLivelihoodProgramChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const f = event.currentTarget.dataset.field;
        const v = event.target.value;
        this.livelihoodProgramRows = this.livelihoodProgramRows.map(r => r.id === id ? { ...r, [f]: v } : r);
    }

    get canRemoveCommunityRow() {
        return this.communityRows && this.communityRows.length > 1;
    }
    handleAddCommunity() {
        const nextId = this.communityRows.length + 1;
        this.communityRows = [
            ...this.communityRows,
            { id: nextId, state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }
        ];
    }
    handleRemoveCommunity(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        let rows = this.communityRows.filter(r => r.id !== id);
        if (rows.length === 0) rows = [{ id: 1, state: '', district: '', fy3: '', fy2: '', fy1: '', proj: '' }];
        this.communityRows = rows.map((r, i) => ({ ...r, id: i + 1 }));
    }
    handleCommunityChange(event) {
        const id = parseInt(event.currentTarget.dataset.id, 10);
        const f = event.currentTarget.dataset.field;
        const v = event.target.value;
        this.communityRows = this.communityRows.map(r => r.id === id ? { ...r, [f]: v } : r);
    }

    // ── Q24 & Q28 File Upload Handlers ────────────────────────────────────────
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

    // ── Resubmit Action & Comprehensive Validation ────────────────────────────
    async handleSubmitResponse() {
        if (this.isSaving) return;

        // 1. Sync rich text fields from DOM
        const richSelectors = this.template.querySelectorAll('[contenteditable="true"][data-field]');
        richSelectors.forEach(el => {
            const f = el.dataset.field;
            if (f) {
                this.formValues = { ...this.formValues, [f]: el.innerHTML };
            }
        });

        // 2. Validate standard lightning inputs/comboboxes rendered in returned questions
        const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-radio-group');
        let standardValid = true;
        inputs.forEach(i => {
            if (i.reportValidity && !i.reportValidity()) {
                standardValid = false;
            }
        });

        if (!standardValid) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Validation Error',
                message: 'Please complete all required fields correctly before resubmitting.',
                variant: 'error'
            }));
            return;
        }

        const today = this.todayDateString;
        const incorp = this.formValues.Incorporation_Date__c;

        // 3. Question-specific validation based on returned questions (flaggedQuestions)
        const flagged = this.flaggedQuestions || [];
        for (const item of flagged) {
            const k = item.key;

            // Q2 Org Info
            if (k === 'Q2') {
                if (!this.formValues.Headquarters_City_and_Country__c?.trim()) {
                    this._toastError('Headquarters City and Country is required.');
                    return;
                }
                if (!this.formValues.Primary_Service_Regions__c?.trim()) {
                    this._toastError('Primary Service Regions is required.');
                    return;
                }
                if (!this.formValues.Leader_Name__c?.trim()) {
                    this._toastError('Leader Name is required.');
                    return;
                }
                if (!this.formValues.Leader_Title__c?.trim()) {
                    this._toastError('Leader Title is required.');
                    return;
                }
            }

            // Q3 Submitter Info
            if (k === 'Q3') {
                if (!this.formValues.Job_Title__c?.trim()) {
                    this._toastError('Job Title is required.');
                    return;
                }
            }

            // Q4 Legal Structure
            if (k === 'Q4') {
                if (!this.formValues.Legal_Type__c) {
                    this._toastError('Legal Type is required.');
                    return;
                }
                if (this.isLegalTypeOther && !this.formValues.Legal_Type_Other__c?.trim()) {
                    this._toastError('Please specify your legal structure type.');
                    return;
                }
                if (!this.formValues.Registration_Jurisdiction__c) {
                    this._toastError('Registration Jurisdiction is required.');
                    return;
                }
                if (this.isRegistrationJurisdictionOther && !this.formValues.Registration_Jurisdiction_Other__c?.trim()) {
                    this._toastError('Please specify the registration country.');
                    return;
                }
                if (!incorp) {
                    this._toastError('Incorporation Date is required.');
                    return;
                }
                if (incorp > today) {
                    this._toastError('Incorporation Date cannot be a future date.');
                    return;
                }
                if (!this.stripHtml(this.formValues.Legal_Structure__c).trim()) {
                    this._toastError('Brief Description of Legal Structure is required.');
                    return;
                }
            }

            // Q5 Compliance
            if (k === 'Q5') {
                if (!this.formValues.Has_501c3_Status__c || !this.formValues.Has_Equivalency_Determination__c || !this.formValues.Is_FCRA_Registered__c || !this.formValues.Willing_to_Pursue_ED__c) {
                    this._toastError('Please complete all compliance questions in Question 5.');
                    return;
                }
            }

            // Q6 Fiscal Year End
            if (k === 'Q6') {
                if (!this.formValues.Fiscal_Month__c || !this.formValues.Fiscal_Day__c) {
                    this._toastError('Fiscal Year End Month and Day are required.');
                    return;
                }
            }

            // Q9 Historical Financial Data
            if (k === 'Q9') {
                const q9Fields = ['START_FY3', 'REV_FY3', 'CAP_FY3', 'OP_FY3', 'REV_FY2', 'CAP_FY2', 'OP_FY2', 'REV_FY1', 'CAP_FY1', 'OP_FY1'];
                for (const f of q9Fields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '') {
                        this._toastError('Please fill in all numerical cells in Historical Financial Data.');
                        return;
                    }
                    if (Number(v) < 0) {
                        this._toastError('Historical Financial Data amounts cannot be negative.');
                        return;
                    }
                }
            }

            // Q10 Current Fiscal Year Data
            if (k === 'Q10') {
                const q10Fields = ['CFY_REV_BUDGET', 'CFY_REV_PROJ', 'CFY_CAP_BUDGET', 'CFY_CAP_PROJ', 'CFY_OP_BUDGET', 'CFY_OP_PROJ'];
                for (const f of q10Fields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '') {
                        this._toastError('Please fill in all numerical budget and projection fields in Current Fiscal Year Data.');
                        return;
                    }
                    if (Number(v) < 0) {
                        this._toastError('Current Fiscal Year amounts cannot be negative.');
                        return;
                    }
                }
            }

            // Q11 Skilling Approach
            if (k === 'Q11') {
                if (!this.stripHtml(this.formValues.Skilling_Approach__c).trim()) {
                    this._toastError('Skilling & Placement Approach is required.');
                    return;
                }
            }

            // Q12 Skilling Domains
            if (k === 'Q12') {
                if (!this.skillingDomainRows || this.skillingDomainRows.length === 0) {
                    this._toastError('Please add at least one Skilling Domain.');
                    return;
                }
                for (const row of this.skillingDomainRows) {
                    if (!row.name?.trim()) {
                        this._toastError(`Domain / Programme Name is required for Domain ${row.id}.`);
                        return;
                    }
                    if (row.hours === '' || row.hours === null || row.hours === undefined || Number(row.hours) < 0) {
                        this._toastError(`Valid Training Hours is required for Domain ${row.id}.`);
                        return;
                    }
                    if (row.duration === '' || row.duration === null || row.duration === undefined || Number(row.duration) < 0) {
                        this._toastError(`Valid Duration (Months) is required for Domain ${row.id}.`);
                        return;
                    }
                    if (!row.whenStarted) {
                        this._toastError(`"When Started" date is required for Domain ${row.id}.`);
                        return;
                    }
                    if (row.whenStarted > today) {
                        this._toastError(`"When Started" date for Domain ${row.id} cannot be a future date.`);
                        return;
                    }
                    if (incorp && row.whenStarted < incorp) {
                        this._toastError(`"When Started" date for Domain ${row.id} cannot be earlier than Incorporation Date (${incorp}).`);
                        return;
                    }
                    if (row.enrollment === '' || row.enrollment === null || row.enrollment === undefined || Number(row.enrollment) < 0) {
                        this._toastError(`Annual Enrollment is required for Domain ${row.id}.`);
                        return;
                    }
                }
            }

            // Q13 JF Outcomes Actuals
            if (k === 'Q13') {
                const jfActFields = ['JF_ENROLL_FY3', 'JF_ENROLL_FY2', 'JF_ENROLL_FY1', 'JF_PLACE_FY3', 'JF_PLACE_FY2', 'JF_PLACE_FY1', 'JF_COST_FY3', 'JF_COST_FY2', 'JF_COST_FY1'];
                for (const f of jfActFields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '' || Number(v) < 0) {
                        this._toastError('Please fill in all non-negative outcome actuals for Job Fulfillment.');
                        return;
                    }
                }
            }

            // Q14 JF Outcomes Projections
            if (k === 'Q14') {
                const jfProjFields = ['JF_ENROLL_PROJ', 'JF_PLACE_PROJ', 'JF_COST_PROJ'];
                for (const f of jfProjFields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '' || Number(v) < 0) {
                        this._toastError('Please fill in all non-negative outcome projections for Job Fulfillment.');
                        return;
                    }
                }
            }

            // Q15 Job Creation Approach
            if (k === 'Q15') {
                if (!this.stripHtml(this.formValues.Job_Creation_Approach__c).trim()) {
                    this._toastError('Job Creation Approach is required.');
                    return;
                }
            }

            // Q16 Business Sectors
            if (k === 'Q16') {
                if (!this.businessSectorRows || this.businessSectorRows.length === 0) {
                    this._toastError('Please add at least one Business Sector.');
                    return;
                }
                for (const row of this.businessSectorRows) {
                    if (!row.sector?.trim()) {
                        this._toastError(`Business Sector is required for Sector ${row.id}.`);
                        return;
                    }
                    if (!row.whenBegan) {
                        this._toastError(`"When Did Support Begin" date is required for Sector ${row.id}.`);
                        return;
                    }
                    if (row.whenBegan > today) {
                        this._toastError(`"When Did Support Begin" date for Sector ${row.id} cannot be a future date.`);
                        return;
                    }
                    if (incorp && row.whenBegan < incorp) {
                        this._toastError(`"When Did Support Begin" date for Sector ${row.id} cannot be earlier than Incorporation Date (${incorp}).`);
                        return;
                    }
                    const sTypes = Array.isArray(row.supportTypes) ? row.supportTypes : [];
                    if (sTypes.length === 0) {
                        this._toastError(`Please select at least one Type of Support Provided for Sector ${row.id}.`);
                        return;
                    }
                    if (sTypes.includes('Other') && !row.supportTypeOther?.trim()) {
                        this._toastError(`Please specify the type of support for Sector ${row.id}.`);
                        return;
                    }
                    if (row.enrollment === '' || row.enrollment === null || row.enrollment === undefined || Number(row.enrollment) < 0) {
                        this._toastError(`Annual Enterprises Supported is required for Sector ${row.id}.`);
                        return;
                    }
                }
            }

            // Q17 JC Outcomes Actuals
            if (k === 'Q17') {
                const jcActFields = [
                    'JC_NEW_BIZ_FY3', 'JC_NEW_BIZ_FY2', 'JC_NEW_BIZ_FY1',
                    'JC_NEW_JOBS_FY3', 'JC_NEW_JOBS_FY2', 'JC_NEW_JOBS_FY1',
                    'JC_EXIST_BIZ_FY3', 'JC_EXIST_BIZ_FY2', 'JC_EXIST_BIZ_FY1',
                    'JC_EXIST_JOBS_FY3', 'JC_EXIST_JOBS_FY2', 'JC_EXIST_JOBS_FY1',
                    'JC_COST_FY3', 'JC_COST_FY2', 'JC_COST_FY1'
                ];
                for (const f of jcActFields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '' || Number(v) < 0) {
                        this._toastError('Please fill in all non-negative outcome actuals for Job Creation.');
                        return;
                    }
                }
            }

            // Q18 JC Outcomes Projections
            if (k === 'Q18') {
                const jcProjFields = ['JC_NEW_BIZ_PROJ', 'JC_NEW_JOBS_PROJ', 'JC_EXIST_BIZ_PROJ', 'JC_EXIST_JOBS_PROJ', 'JC_COST_PROJ'];
                for (const f of jcProjFields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '' || Number(v) < 0) {
                        this._toastError('Please fill in all non-negative outcome projections for Job Creation.');
                        return;
                    }
                }
            }

            // Q19 Livelihood Approach
            if (k === 'Q19') {
                if (!this.stripHtml(this.formValues.Livelihood_Approach__c).trim()) {
                    this._toastError('Livelihood Upliftment Approach is required.');
                    return;
                }
            }

            // Q20 Livelihood Programs
            if (k === 'Q20') {
                if (!this.livelihoodProgramRows || this.livelihoodProgramRows.length === 0) {
                    this._toastError('Please add at least one Livelihood Program.');
                    return;
                }
                for (const row of this.livelihoodProgramRows) {
                    if (!row.name?.trim() || !row.supportType?.trim() || row.manHours === '' || Number(row.manHours) < 0 || row.enrollment === '' || Number(row.enrollment) < 0) {
                        this._toastError('Please complete all program rows in Question 20 with valid non-negative values.');
                        return;
                    }
                }
            }

            // Q21 Communities
            if (k === 'Q21') {
                if (!this.communityRows || this.communityRows.length === 0) {
                    this._toastError('Please add at least one Community row.');
                    return;
                }
                for (const row of this.communityRows) {
                    if (!row.state?.trim() || !row.district?.trim() || row.fy3 === '' || Number(row.fy3) < 0 || row.fy2 === '' || Number(row.fy2) < 0 || row.fy1 === '' || Number(row.fy1) < 0 || row.proj === '' || Number(row.proj) < 0) {
                        this._toastError('Please complete all community rows in Question 21 with valid non-negative numbers.');
                        return;
                    }
                }
            }

            // Q22 Livelihood Outcomes Actuals
            if (k === 'Q22') {
                const livActFields = [
                    'LIV_SERVED_FY3', 'LIV_SERVED_FY2', 'LIV_SERVED_FY1',
                    'LIV_ENROLL_FY3', 'LIV_ENROLL_FY2', 'LIV_ENROLL_FY1',
                    'LIV_OUTCOME_FY3', 'LIV_OUTCOME_FY2', 'LIV_OUTCOME_FY1',
                    'LIV_COST_FY3', 'LIV_COST_FY2', 'LIV_COST_FY1'
                ];
                for (const f of livActFields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '' || Number(v) < 0) {
                        this._toastError('Please fill in all non-negative outcome actuals for Livelihood in Question 22.');
                        return;
                    }
                }
            }

            // Q23 Livelihood Outcomes Projections
            if (k === 'Q23') {
                const livProjFields = ['LIV_SERVED_PROJ', 'LIV_ENROLL_PROJ', 'LIV_OUTCOME_PROJ', 'LIV_COST_PROJ'];
                for (const f of livProjFields) {
                    const v = this.formValues[f];
                    if (v === undefined || v === null || String(v).trim() === '' || Number(v) < 0) {
                        this._toastError('Please fill in all non-negative outcome projections for Livelihood in Question 23.');
                        return;
                    }
                }
            }

            // Q24 Verification
            if (k === 'Q24') {
                if (this.isQ24VerifiedYes && !this.hasQ24UploadedFiles) {
                    this._toastError('Please upload a Verification Report (PDF) as required for Question 24.');
                    return;
                }
            }

            // Q25 Sustainability
            if (k === 'Q25') {
                if (!this.stripHtml(this.formValues.Organizational_Sustainability__c).trim()) {
                    this._toastError('Organizational Sustainability Plan is required.');
                    return;
                }
            }

            // Q26 Direction for Additional Funding
            if (k === 'Q26') {
                if (!this.stripHtml(this.formValues.Use_of_Additional_Funding__c).trim()) {
                    this._toastError('Desired Use of Additional Funding / Investment is required.');
                    return;
                }
            }
        }

        if (!this.selectedTracks || this.selectedTracks.length === 0) {
            this._toastError('Application must have at least one track selected before resubmitting.');
            return;
        }

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

    _toastError(msg) {
        this.dispatchEvent(new ShowToastEvent({
            title: 'Validation Error',
            message: msg,
            variant: 'error'
        }));
    }

    handleCancel() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }

    handleBackToDashboard() {
        this.dispatchEvent(new CustomEvent('cancel'));
    }
}