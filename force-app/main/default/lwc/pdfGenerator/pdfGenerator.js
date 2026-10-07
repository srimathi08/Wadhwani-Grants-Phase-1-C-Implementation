import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

import JSPDF from '@salesforce/resourceUrl/downloadjs'; // must contain jsPDF (jspdf.umd.min.js), NOT download.js
import AUTO_TABLE from '@salesforce/resourceUrl/autotable';
import ROBOTO_FONT from '@salesforce/resourceUrl/PdfRobotoFont';
import ROBOTO_BOLD_FONT from '@salesforce/resourceUrl/PdfRobotoBoldFont';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';

import getApplicationWithRelatedData
    from '@salesforce/apex/PdfGeneratorController.getApplicationWithRelatedData';

/* ---------- layout constants (mm, A4) ---------- */
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 20;
const LEFT_X = 20;
const TEXT_WIDTH = 170;
const LINE_H = 6;
const BULLET_INDENT = 6;

const BRAND_RED = [191, 32, 38];
const TITLE_RED = [178, 42, 42];
const SECTION_COLOR = [255, 111, 97];
const MUTED = [110, 110, 110];
const BLACK = [0, 0, 0];

const EMPTY_TEXT = 'Not provided';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* =====================================================================
   QUESTION LISTS
   Each list is in the SAME ORDER as the application record (review portal).
   Questions are numbered from their position, so to reorder a question just
   move its line - the numbers follow automatically.
   `text` is the question wording printed in the PDF, without a number.
   `followUp` is printed (unnumbered) right after its question, only when it has a value.
   ===================================================================== */
const GENERAL_QUESTIONS = [
    { field: 'Project_Title__c', text: 'Project Title' },
    {
        field: 'Primary_Focus_Area__c', text: 'Primary Focus Area',
        followUp: { field: 'Primary_Focus_Area_Other__c', text: 'Other (Please Specify)' }
    },
    {
        field: 'Sub_Focus_Area__c', text: 'Sub-Focus Area', multiSelect: true,
        followUp: { field: 'Sub_Focus_Area_Other__c', text: 'Other (Please Specify)' }
    },
    { field: 'Project_Duration__c', text: 'Project Duration (In Months)' },
    { field: 'Project_Website_if_any__c', text: 'Laboratory / Dept / Organization Website' },
    { field: 'Keywords__c', text: 'Keywords that describe your Project' },
    { field: 'Describe_Objective_Relevance_of_Project__c', text: 'Describe the Objective, Relevance and Outcome of the project' }
];

// Order matches the record: 3.1 ... 3.13
const PROJECT_QUESTIONS = [
    { field: 'Project_Summary__c', text: 'Project Summary' },
    { field: 'Objectives_of_the_Project__c', text: 'Objectives of the Project' },
    { field: 'Project_Approach_and_Work_Plan__c', text: 'Project Approach and Work Plan' },
    { field: 'Key_Problem_Being_Solved__c', text: 'Key Problem Being Solved' },
    { field: 'Proposed_Solution__c', text: 'Proposed Solution' },
    { field: 'Current_status_of_the_Project_Work_und__c', text: 'Current status of the Project / Work undertaken' },
    {
        field: 'Current_Technology_Readiness_Level_TRL__c', text: 'Current Technology Readiness Level (TRL)',
        // Not shown on the record page; printed under 3.7 only when older records have it filled
        followUp: { field: 'Work_undertaken_supporting_current_TRL__c', text: 'Details of activities supporting the current TRL of the Project' }
    },
    { field: 'Expected_TRL_at_the_end_of_the_Project__c', text: 'Expected TRL at the end of the Project' },
    { field: 'Novelty_of_the_Project__c', text: 'Novelty of the Project' },
    { field: 'Competitive_Advantage__c', text: 'Competitive Landscape' },
    { field: 'Details_of_IPR_Filed_Granted__c', text: 'Details of IPR Filed / Granted' },
    { field: 'Details_of_Ethical_Received__c', text: 'Details of Ethical / Regulatory / Safety Approval sought / received' },
    { field: 'Full_Proposal_Citations__c', text: 'References with full citations relevant to the Proposal' }
];

const COMMERCIALIZATION_QUESTIONS = [
    { field: 'Target_Market_Industry_Application__c', text: 'Target Market, Market Demand and Plans to Expand it Further' },
    { field: 'Customer_and_Beneficiaries__c', text: 'Details of Customers, End-users, and Beneficiaries' },
    { field: 'Plan_for_Commercialization__c', text: 'Plan for Commercialization and Market Entry' },
    { field: 'Business_Model_for_Commercialization__c', text: 'Business Model for Commercialization' },
    { field: 'Project_Revenue_Strategy__c', text: 'Potential Revenue Generation Strategy for Project' },
    { field: 'Main_Risks_and_Barriers__c', text: 'Main Risks and Barriers' },
    { field: 'Relevant_Partnerships__c', text: 'Partnerships with Relevant Industry / Potential Adopters' },
    { field: 'Potential_for_Startup_Formation__c', text: 'Details of Startup Incorporation, if applicable' },
    { field: 'Incubator_Association_Details__c', text: 'Details of Association with Technology Business Incubator' },
    { field: 'Strategy_for_transfer_of_technology__c', text: 'Strategy for transfer of technology to industry / potential adopters' },
    { field: 'Strategy_for_raising_funds_from_Investor__c', text: 'Strategy for raising funds from Investors / other funding sources on completion of this project' }
];

const OUTCOME_QUESTIONS = [
    { field: 'Proposed_Outcomes_Deliverables_under_t__c', text: 'Proposed Outcomes / Deliverables under the Project' },
    { field: 'Envisioned_Project_Impact__c', text: 'Envisaged Impact of the Project' },
    { field: 'Future_Plan_for_next_3_5_on_comple__c', text: 'Future Plan on completion of Project' }
];

export default class PdfGenerator extends NavigationMixin(LightningElement) {
    @api recordId;

    isJsLoaded = false;
    resourcesLoaded = false;
    isGenerating = false;
    loadError;

    // Retry bookkeeping: pieces that already loaded are not fetched again on a retry
    loadAttempt = 0;
    jsPdfScriptLoaded = false;
    autoTableScriptLoaded = false;

    fontRegularBase64;
    fontBoldBase64;
    logoBase64;
    pdfLib; // { jsPDF, runAutoTable }

    // Loading = first load, or a retry after a failure, is in progress
    get isLoading() {
        return !this.resourcesLoaded && !this.loadError;
    }

    // Disabled while loading or generating. After a FAILED load the button is
    // enabled again, so the next click can retry (otherwise it would stay disabled forever).
    get isDisabled() {
        return this.isGenerating || this.isLoading;
    }

    get buttonLabel() {
        if (this.isLoading) return 'Loading...';
        if (this.isGenerating) return 'Generating PDF...';
        return 'Download PDF';
    }

    /* =====================================================================
       RESOURCE LOADING
       jsPDF and jspdf-autotable are loaded SEQUENTIALLY: the plugin needs
       jsPDF to exist when it executes, or jsPDF.API.autoTable is never registered.
       ===================================================================== */
    renderedCallback() {
        if (this.isJsLoaded) return;
        this.isJsLoaded = true;
        this.loadResources();
    }

    async loadResources() {
        this.loadAttempt += 1;
        try {
            // Load order is kept: jsPDF first, then autotable. Scripts that loaded on an
            // earlier attempt are skipped.
            if (!this.jsPdfScriptLoaded) {
                await loadScript(this, this.attemptUrl(JSPDF));      // 1st: jsPDF must exist ...
                this.jsPdfScriptLoaded = true;
            }
            if (!this.autoTableScriptLoaded) {
                await loadScript(this, this.attemptUrl(AUTO_TABLE)); // 2nd: ... before the plugin runs
                this.autoTableScriptLoaded = true;
            }

            // Each file is kept as soon as it arrives, so a retry only re-fetches what failed
            await Promise.all([
                this.fontRegularBase64 ? null : this.fetchResource(ROBOTO_FONT, 'PdfRobotoFont', 'arrayBuffer')
                    .then(buffer => { this.fontRegularBase64 = this.arrayBufferToBase64(buffer); }),
                this.fontBoldBase64 ? null : this.fetchResource(ROBOTO_BOLD_FONT, 'PdfRobotoBoldFont', 'arrayBuffer')
                    .then(buffer => { this.fontBoldBase64 = this.arrayBufferToBase64(buffer); }),
                this.logoBase64 ? null : this.fetchResource(WIN_LOGO, 'WIN_Logo', 'blob')
                    .then(blob => this.blobToDataUrl(blob))
                    .then(dataUrl => { this.logoBase64 = dataUrl; })
                    .catch(err => {
                        console.warn('[PDF] Logo could not be loaded; PDF will be generated without it.', err);
                    })
            ]);

            this.pdfLib = this.resolvePdfLibrary();
            this.loadError = undefined;
            this.resourcesLoaded = true;
        } catch (error) {
            this.loadError = error?.body?.message || error?.message || 'One or more PDF resources failed to load.';
            console.error(`[PDF] Resource load failed (attempt ${this.loadAttempt})`, error);
            this.showError('PDF setup failed', error?.permanent
                ? `${this.loadError} Please contact your Salesforce administrator.`
                : `${this.loadError} Click Download PDF to try again.`);
        }
    }

    // A retry uses a new URL so the browser / script loader cannot hand back the
    // earlier failed attempt. The static resource ignores the extra parameter.
    attemptUrl(url) {
        if (this.loadAttempt <= 1) return url;
        return `${url}${url.includes('?') ? '&' : '?'}attempt=${this.loadAttempt}`;
    }

    async fetchResource(url, name, as) {
        const response = await fetch(url);
        if (!response.ok) {
            const err = new Error(`Static resource "${name}" could not be loaded (${response.status} ${response.statusText}).`);
            // 403/404 = missing or no access: retrying cannot fix it, an admin has to
            err.permanent = response.status === 403 || response.status === 404;
            throw err;
        }
        return as === 'blob' ? response.blob() : response.arrayBuffer();
    }

    /**
     * Finds jsPDF and autoTable regardless of which library build is in the static
     * resources, re-applies the autotable plugin if it ran before jsPDF, and reports
     * precisely which library is missing.
     */
    resolvePdfLibrary() {
        const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF; // jsPDF 2.x UMD | jsPDF 1.x
        const atGlobal = window.jspdfAutoTable;                // jspdf-autotable 3.x/5.x UMD namespace

        console.log('[PDF] Library globals after load', JSON.stringify({
            'window.jspdf.jsPDF': typeof window.jspdf?.jsPDF,
            'window.jsPDF': typeof window.jsPDF,
            'window.jspdfAutoTable': typeof atGlobal,
            'window.applyPlugin': typeof window.applyPlugin,
            'window.autoTable': typeof window.autoTable,
            'jsPDF.API.autoTable': typeof jsPDFCtor?.API?.autoTable,
            'window.download (download.js)': typeof window.download
        }));

        if (typeof jsPDFCtor !== 'function') {
            const hint = typeof window.download === 'function'
                ? 'The "downloadjs" static resource contains the download.js library, not jsPDF.'
                : 'The "downloadjs" static resource did not define jsPDF.';
            throw new Error(`jsPDF not found. ${hint} Upload jspdf.umd.min.js (jsPDF 2.x) to that static resource.`);
        }

        // Plugin executed before jsPDF existed, or autotable v5 (no auto-registration): apply it now.
        if (typeof jsPDFCtor.API?.autoTable !== 'function') {
            const applyPlugin = atGlobal?.applyPlugin || window.applyPlugin;
            if (typeof applyPlugin === 'function') {
                applyPlugin(jsPDFCtor);
            }
        }

        if (typeof jsPDFCtor.API?.autoTable === 'function') {
            return { jsPDF: jsPDFCtor, runAutoTable: (doc, options) => doc.autoTable(options) };
        }

        // Fall back to the standalone function form: autoTable(doc, options)
        const standalone = [
            typeof atGlobal === 'function' ? atGlobal : null,
            atGlobal?.autoTable,
            atGlobal?.default,
            window.jspdf?.autoTable,
            window.autoTable
        ].find(fn => typeof fn === 'function');

        if (standalone) {
            return { jsPDF: jsPDFCtor, runAutoTable: (doc, options) => standalone(doc, options) };
        }

        throw new Error('jsPDF loaded, but jspdf-autotable was not found. Upload jspdf.plugin.autotable.min.js to the "autotable" static resource.');
    }

    /* =====================================================================
       GENERATE
       ===================================================================== */
    async handleGeneratePdf() {
        if (this.isDisabled) return; // button is disabled anyway; guards against a fast double click

        if (!this.recordId) {
            this.showError('Cannot generate PDF', 'No record Id found on this page.');
            return;
        }

        this.isGenerating = true;
        try {
            // Retry a failed load (e.g. a network blip) instead of requiring a page refresh.
            // Clearing loadError switches the button to "Loading..." while this runs.
            if (this.loadError) {
                this.loadError = undefined;
                await this.loadResources();
                if (this.loadError) return; // still failing; loadResources already showed the toast
            }

            const result = await getApplicationWithRelatedData({ recordId: this.recordId });
            const app = result?.application || {};
            const doc = this.buildPdf(result || {});
            const safeName = String(app.Name || 'Summary').replace(/[^\w-]+/g, '_');
            doc.save(`WIN_Project_Proposal_${safeName}.pdf`);
        } catch (error) {
            console.error('[PDF] Generation failed', error);
            this.showError('PDF generation failed', this.errorMessage(error));
        } finally {
            this.isGenerating = false;
        }
    }

    buildPdf(result) {
        const { jsPDF, runAutoTable } = this.pdfLib;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        doc.addFileToVFS('Roboto-Regular.ttf', this.fontRegularBase64);
        doc.addFileToVFS('Roboto-Bold.ttf', this.fontBoldBase64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        doc.setFont('Roboto', 'normal');

        const app = result.application || {};
        const milestones = result.milestones || [];
        const budgets = result.budgets || [];
        const coFounders = result.coFounders || [];
        const fileUrls = result.fileUrls || [];

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomLimit = pageHeight - MARGIN_BOTTOM;
        let y = MARGIN_TOP;

        /* ---------- helpers bound to this document ---------- */
        const setBody = () => {
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(...BLACK);
        };

        // Font, size and colour carry over to the new page, so a label that
        // breaks onto the next page keeps its bold / grey styling.
        const ensureSpace = (height) => {
            if (y + height > bottomLimit) {
                doc.addPage();
                y = MARGIN_TOP + 5;
            }
        };

        const section = (title) => {
            ensureSpace(22);
            y += 4;
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(...SECTION_COLOR);
            doc.text(title, 15, y);
            y += 7;
            setBody();
        };

        const subSection = (title) => {
            ensureSpace(18);
            y += 2;
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(...BLACK);
            doc.splitTextToSize(title, TEXT_WIDTH + 5).forEach(line => {
                doc.text(line, 15, y);
                y += 6;
            });
            setBody();
        };

        const note = (text) => {
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...MUTED);
            doc.splitTextToSize(text, TEXT_WIDTH).forEach(line => {
                ensureSpace(5);
                doc.text(line, LEFT_X, y);
                y += 5;
            });
            y += 2;
            setBody();
        };

        // Label + value block (handles rich text, bullets, empty values)
        const field = (label, value) => {
            const text = this.toPlainText(value);

            doc.setFont('Roboto', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(...BLACK);
            const labelLines = doc.splitTextToSize(label, TEXT_WIDTH);
            ensureSpace(labelLines.length * LINE_H + LINE_H); // keep label with first line of its value
            labelLines.forEach(line => {
                doc.text(line, LEFT_X, y);
                y += LINE_H;
            });
            y += 1;
            doc.setFont('Roboto', 'normal');

            if (!text) {
                doc.setTextColor(...MUTED);
                doc.text(EMPTY_TEXT, LEFT_X, y);
                doc.setTextColor(...BLACK);
                y += LINE_H + 3;
                return;
            }

            text.split('\n').forEach(rawLine => {
                const line = rawLine.trimEnd();
                if (!line.trim()) return;

                if (line.trimStart().startsWith('• ')) {
                    const wrapped = doc.splitTextToSize(line.trimStart().substring(2), TEXT_WIDTH - BULLET_INDENT);
                    wrapped.forEach((w, i) => {
                        ensureSpace(LINE_H);
                        if (i === 0) doc.text('•', LEFT_X, y);
                        doc.text(w, LEFT_X + BULLET_INDENT, y);
                        y += LINE_H;
                    });
                } else {
                    doc.splitTextToSize(line, TEXT_WIDTH).forEach(w => {
                        ensureSpace(LINE_H);
                        doc.text(w, LEFT_X, y);
                        y += LINE_H;
                    });
                }
            });
            y += 3;
        };

        // A numbered list of questions; numbers follow the list order (3.1, 3.2 ...)
        const questionList = (questions, sectionNo) => {
            questions.forEach((q, i) => {
                const value = q.multiSelect ? this.formatMultiSelect(app[q.field]) : app[q.field];
                field(`${sectionNo}.${i + 1}. ${q.text}`, value);
                if (q.followUp && app[q.followUp.field]) {
                    field(q.followUp.text, app[q.followUp.field]);
                }
            });
        };

        const table = (options) => {
            ensureSpace(25);
            const baseStyles = {
                font: 'Roboto',
                fontStyle: 'normal',
                fontSize: 9,
                cellPadding: 2.5,
                overflow: 'linebreak',
                lineColor: BRAND_RED,
                lineWidth: 0.3,
                textColor: BLACK,
                valign: 'top'
            };
            runAutoTable(doc, {
                startY: y,
                theme: 'grid',
                margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: 15, right: 15 },
                ...options,
                styles: { ...baseStyles, ...(options.styles || {}) },
                headStyles: {
                    fillColor: BRAND_RED,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    ...(options.headStyles || {})
                }
            });
            y = (doc.lastAutoTable?.finalY || y) + 8;
            setBody();
        };

        /* ---------- first-page header ---------- */
        if (this.logoBase64) {
            try {
                const props = doc.getImageProperties(this.logoBase64);
                const w = 50;
                const h = Math.min(25, (w * props.height) / props.width);
                const format = this.logoBase64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
                doc.addImage(this.logoBase64, format, (pageWidth - w) / 2, 10, w, h);
                y = 10 + h + 7;
            } catch (e) {
                console.warn('[PDF] Logo could not be drawn', e);
            }
        }
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...TITLE_RED);
        doc.text('PROJECT PROPOSAL FORM', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text(`Application ID: ${app.Name || '-'}    Generated: ${this.formatDate(new Date().toISOString())}`,
            pageWidth / 2, y, { align: 'center' });
        y += 8;
        setBody();

        /* ================= 1. GENERAL DETAILS ================= */
        section('1. General Details');
        questionList(GENERAL_QUESTIONS, 1);

        /* ================= 2. APPLICANT DETAILS ================= */
        section('2. Applicant Details');
        // The COE institution is the application's Account (the form shows the Account name here),
        // not the PI's institution.
        field('COE Institution Name', app.Account?.Name || app.PI_Institution_Organization_Name__c);

        subSection('2.1. Details of Principal Investigator');
        field('Principal Investigator (PI)', app.PI_Name__c);
        field('Designation', app.PI_Designation__c);
        field('Institution / Organization', app.PI_Institution__c || app.PI_Institution_Organization_Name__c);
        field('Mobile Number', app.PI_Phone__c);
        field('Email ID', app.PI_Email__c);

        subSection('2.2. Details of Co-Principal Investigator');
        field('Co-Principal Investigator (Co-PI)', app.Co_Principal_Investigator_Co_PI__c);
        field('Designation', app.CO_PI_Designation__c);
        field('Institution / Organization', app.CO_PI_Institution__c);
        field('Mobile Number', app.CO_PI_Phone__c);
        field('Email ID', app.CO_PI_Email__c);

        field('2.3. Details of Team Members / Mentors / Advisers involved in the Project', app.Project_Team_Members__c);
        field('2.4. Expertise and Experience of Team in Specific Focus Area of Project', app.Expertise_and_Experience_of_Team_in_Spec__c);

        subSection('2.5. Start-up Details');
        note('(applicable if the applicant is a Start-up, not an academic/faculty team; PI and one of the founders shall be same)');
        field('2.5.1. Name of Start-up', app.Startup_Name__c);

        subSection('2.5.2. Details of Founder/Co-Founder');
        field('Name', app.Founder_Name__c);
        field('Designation', app.Founder_Designation__c);
        field('Institution / Organization', app.Founder_Institution__c);
        field('Mobile Number', app.Founder_Mobile__c);
        field('Email ID', app.Founder_Email__c);

        subSection('2.5.3. Details of Co-Founder(s)');
        if (coFounders.length) {
            table({
                head: [['S.No.', 'Name', 'Designation', 'Institution / Organization', 'Mobile Number', 'Email ID']],
                body: coFounders.map((cf, i) => [
                    i + 1,
                    this.cell(cf.Name),
                    this.cell(cf.Designation__c),
                    this.cell(cf.Institution__c),
                    this.cell(cf.Mobile__c),
                    this.cell(cf.Email__c)
                ]),
                styles: { fontSize: 8 },
                columnStyles: { 0: { cellWidth: 14 } }
            });
        } else {
            note('No co-founders added.');
        }

        field('2.5.4. Is the start-up registered?', app.Is_Startup_Registered__c);
        if (app.Is_Startup_Registered__c === 'Yes') {
            field('Date of Incorporation', this.formatDate(app.Startup_Registration_Date__c));
            field('Registration No. / CIN', app.Startup_Registration_No__c);
        }
        field('2.5.5. Is the start-up DPIIT registered?', app.Is_Startup_DPIIT_Registered__c);
        if (app.Is_Startup_DPIIT_Registered__c === 'Yes') {
            field('DPIIT Registration No.', app.DPIIT_Registration_No__c);
        }

        /* ================= 3. PROJECT DETAILS ================= */
        section('3. Project Details');
        questionList(PROJECT_QUESTIONS, 3);

        /* ================= 4. COMMERCIALIZATION ================= */
        section('4. Project Commercialization Details');
        questionList(COMMERCIALIZATION_QUESTIONS, 4);

        /* ================= 5. BUDGET =================
           The current form collects USD only. Older proposals were filed with INR amounts,
           so every INR field / column is printed whenever the record carries an INR value. */
        const budgetsHaveInr = budgets.some(b => this.hasValue(b.Total_Amount_INR__c));
        const milestonesHaveInr = milestones.some(m => this.hasValue(m.Budget_Required_INR__c));

        section('5. Budgetary Requirements');
        field('5.1. Total Project Budget (in USD$)', this.formatUsd(app.Total_Project_Budget_in_USD__c));
        if (this.hasValue(app.Total_Project_Budget_INR__c)) {
            field('Total Project Budget (in INR)', this.formatInr(app.Total_Project_Budget_INR__c));
        }

        subSection('5.2. Details of Project Cost');
        const totalUsd = budgets.reduce((s, b) => s + (parseFloat(b.Total_Amount__c) || 0), 0);
        const totalInr = budgets.reduce((s, b) => s + (parseFloat(b.Total_Amount_INR__c) || 0), 0);
        if (budgets.length) {
            const amountCell = (text, bold) => ({ content: text, styles: { halign: 'right', ...(bold ? { fontStyle: 'bold' } : {}) } });
            table({
                head: [[
                    'S.No.', 'Budget Head',
                    ...(budgetsHaveInr ? ['Total Amount (INR)'] : []),
                    'Total Amount (USD)', 'Detailed Justification'
                ]],
                body: [
                    ...budgets.map((b, i) => [
                        i + 1,
                        this.cell(b.Name),
                        ...(budgetsHaveInr ? [amountCell(this.formatInr(b.Total_Amount_INR__c))] : []),
                        amountCell(this.formatUsd(b.Total_Amount__c)),
                        this.hasHtmlTable(b.Justification__c)
                            ? 'See detailed breakdown below'
                            : this.cell(b.Justification__c)
                    ]),
                    [
                        { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold' } },
                        ...(budgetsHaveInr ? [amountCell(this.formatInr(totalInr), true)] : []),
                        amountCell(this.formatUsd(totalUsd), true),
                        ''
                    ]
                ],
                columnStyles: budgetsHaveInr
                    ? { 0: { cellWidth: 14 }, 1: { cellWidth: 36 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 } }
                    : { 0: { cellWidth: 14 }, 1: { cellWidth: 40 }, 2: { cellWidth: 32 } }
            });

            budgets.forEach(b => {
                if (!this.hasHtmlTable(b.Justification__c)) return;
                const nestedRows = this.extractTableData(b.Justification__c);
                if (!nestedRows.length) return;
                ensureSpace(30);
                doc.setFont('Roboto', 'bold');
                doc.text(`Detailed Breakdown – ${b.Name || ''}`, LEFT_X, y);
                y += 6;
                table({ body: nestedRows, styles: { fontSize: 8, lineColor: [150, 150, 150] } });
            });
        } else {
            note('No budget heads entered.');
        }

        const declaredBudget = parseFloat(app.Total_Project_Budget_in_USD__c);
        if (budgets.length && !isNaN(declaredBudget) && Math.round(declaredBudget) !== Math.round(totalUsd)) {
            note(`Note: the budget heads total ${this.formatUsd(totalUsd)}, which differs from the declared Total Project Budget of ${this.formatUsd(declaredBudget)}.`);
        }

        field('5.3. Details of Prior Funding received / approved under this Project', app.Previous_Funding_Details__c);
        field('5.4. Any other Support required from WIN', app.WIN_Support__c);

        /* ================= 6. MILESTONES ================= */
        section('6. Milestones and Deliverables');
        subSection('6.1. Key milestones, with timelines for completion');

        if (milestones.length) {
            const lastIndex = milestones.length - 1;
            // Fixed widths always add up to the full 190 mm row (A4 minus 10 mm margins);
            // a shortfall makes autotable log "Of the table content, N units width could not fit page".
            const widths = milestonesHaveInr
                ? [13, 22, 27, 28, 28, 15, 15, 21, 21]
                : [13, 22, 32, 34, 34, 16, 16, 23];
            const columnStyles = {};
            widths.forEach((w, i) => { columnStyles[i] = { cellWidth: w }; });

            table({
                margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: 10, right: 10 },
                head: [['S.No.', 'Installment of Funds', 'Milestone Description',
                        'Activities under this Milestone', 'Outputs and Deliverables',
                        'Month of Start', 'Month of End',
                        ...(milestonesHaveInr ? ['Budget Required (INR)'] : []),
                        'Budget Required (USD)']],
                body: milestones.map((m, i) => {
                    // Same labels the form shows (M1, M2 ... Mn – Completion Report)
                    const milestoneLabel = i === lastIndex ? `M${i + 1} – Completion Report` : `M${i + 1}`;
                    const description = this.cell(m.Milestone_Description__c);
                    return [
                        i + 1,
                        [1, 2, 3, 4, 5, 6]
                            .map(n => m[`Installment_of_Funds_${n}__c`])
                            .filter(v => v)
                            .join(', ') || `Instalment – ${i + 1}`,
                        description ? `${milestoneLabel}\n${description}` : milestoneLabel,
                        this.cell(m.Activities_under_this_Milestone__c),
                        this.cell(m.Output_and_Deliverables__c),
                        this.cell(this.formatMaybeDate(m.Project_Start_Date__c)),
                        this.cell(this.formatMaybeDate(m.Project_End_Date__c)),
                        ...(milestonesHaveInr
                            ? [{ content: this.formatInr(m.Budget_Required_INR__c), styles: { halign: 'right' } }]
                            : []),
                        { content: this.formatUsd(m.Budget_Required__c), styles: { halign: 'right' } }
                    ];
                }),
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: { fontSize: 8 },
                columnStyles
            });

            const totalMilestoneUsd = milestones.reduce((s, m) => s + (parseFloat(m.Budget_Required__c) || 0), 0);
            const totalMilestoneInr = milestones.reduce((s, m) => s + (parseFloat(m.Budget_Required_INR__c) || 0), 0);
            ensureSpace(16);
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(10);
            if (milestonesHaveInr) {
                doc.text(`Total Milestone Budget (INR): ${this.formatInr(totalMilestoneInr)}`, LEFT_X, y);
                y += 6;
            }
            doc.text(`Total Milestone Budget (USD): ${this.formatUsd(totalMilestoneUsd)}`, LEFT_X, y);
            y += 10;
            setBody();
        } else {
            note('No milestones entered.');
        }

        /* ================= 7. OUTCOMES ================= */
        section('7. Project Outcomes and Impact');
        questionList(OUTCOME_QUESTIONS, 7);

        /* ================= 8. SUPPORTING DOCUMENTS ================= */
        section('8. Supporting Documents');
        note('Uploaded files are not embedded in this PDF. Open them from the Files tab of the application.');
        if (!fileUrls.length) {
            note('No documents uploaded.');
        } else {
            table({
                head: [['S.No.', 'Uploaded Document']],
                body: fileUrls.map((f, i) => [i + 1, this.fileNameFromEntry(f)]),
                columnStyles: { 0: { cellWidth: 14 } }
            });
        }

        /* ---------- footer on EVERY page (incl. pages autoTable added) ---------- */
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFont('Roboto', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...MUTED);
            doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            if (app.Name) {
                doc.text(String(app.Name), pageWidth - 15, pageHeight - 10, { align: 'right' });
            }
        }

        return doc;
    }

    /* =====================================================================
       TEXT / FORMAT HELPERS
       ===================================================================== */

    // Rich text (contenteditable HTML) -> plain text with line breaks and bullets
    toPlainText(value) {
        if (value === null || value === undefined) return '';
        let s = String(value)
            .replace(/\r\n?/g, '\n')
            .replace(/<li\b[^>]*>/gi, '\n• ')
            .replace(/<\/li>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/?(p|div|h[1-6]|ul|ol|tr|table|tbody|thead)\b[^>]*>/gi, '\n')
            .replace(/<\/t[dh]>/gi, ' | ')
            .replace(/<[^>]+>/g, '');
        s = this.decodeEntities(s);
        return this.pdfSafe(s)
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // Single table cell text
    cell(value) {
        return this.toPlainText(value).replace(/\n{2,}/g, '\n');
    }

    decodeEntities(s) {
        return s
            .replace(/&nbsp;/gi, ' ')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;|&apos;/gi, "'")
            .replace(/&#(\d+);/g, (_, d) => this.safeFromCodePoint(Number(d)))
            .replace(/&#x([0-9a-f]+);/gi, (_, h) => this.safeFromCodePoint(parseInt(h, 16)))
            .replace(/&amp;/gi, '&');
    }

    safeFromCodePoint(code) {
        try {
            return String.fromCodePoint(code);
        } catch (e) {
            return '';
        }
    }

    // Keep only characters the embedded Roboto font can draw (Latin, Greek, Cyrillic,
    // punctuation, currency). Anything else (emoji, Indic scripts) would print as garbage.
    pdfSafe(s) {
        return s
            .replace(/\u00A0/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[^\u0009\u000A\u0020-\u024F\u0370-\u03FF\u0400-\u04FF\u2010-\u2027\u2030-\u205E\u20A0-\u20BF]/g, '');
    }

    formatMultiSelect(value) {
        if (!value) return '';
        return Array.isArray(value) ? value.join(', ') : String(value).split(';').map(v => v.trim()).filter(v => v).join(', ');
    }

    hasValue(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    }

    formatUsd(value) {
        if (value === null || value === undefined || value === '') return '';
        const n = Number(value);
        if (isNaN(n)) return String(value);
        return `$ ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }

    // Indian digit grouping (12,34,567) for legacy INR amounts
    formatInr(value) {
        if (value === null || value === undefined || value === '') return '';
        const n = Number(value);
        if (isNaN(n)) return String(value);
        return `Rs. ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    formatDate(value) {
        if (!value) return '';
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
        if (!match) return String(value);
        return `${match[3]} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
    }

    // Milestone month fields are free text in the form; format only real ISO dates
    formatMaybeDate(value) {
        if (!value) return '';
        return /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? this.formatDate(value) : String(value);
    }

    // Apex returns "Title.ext: https://..." - split on the URL, not the first colon
    fileNameFromEntry(entry) {
        const s = String(entry || '');
        const idx = s.lastIndexOf(': http');
        return this.pdfSafe(idx > 0 ? s.substring(0, idx) : s);
    }

    hasHtmlTable(html) {
        return !!html && /<table[\s\S]*?>[\s\S]*?<\/table>/i.test(html);
    }

    extractTableData(html) {
        const rows = [];
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const tableEl = parsed.querySelector('table');
        if (!tableEl) return rows;
        tableEl.querySelectorAll('tr').forEach(tr => {
            const row = [];
            tr.querySelectorAll('th,td').forEach(td => row.push(this.pdfSafe((td.textContent || '').trim())));
            if (row.length) rows.push(row);
        });
        return rows;
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000;
        let binary = '';
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return window.btoa(binary);
    }

    blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    errorMessage(error) {
        if (!error) return 'Unknown error.';
        if (Array.isArray(error.body)) return error.body.map(e => e.message).join(', ');
        return error.body?.message || error.message || 'Unknown error calling Apex. Check the console for details.';
    }

    showError(title, message) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant: 'error', mode: 'sticky' }));
    }
}