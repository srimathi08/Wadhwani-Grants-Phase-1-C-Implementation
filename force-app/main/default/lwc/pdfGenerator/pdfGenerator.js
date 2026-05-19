import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';

import JSPDF from '@salesforce/resourceUrl/downloadjs';
import AUTO_TABLE from '@salesforce/resourceUrl/autotable';
import ROBOTO_FONT from '@salesforce/resourceUrl/PdfRobotoFont';
import ROBOTO_BOLD_FONT from '@salesforce/resourceUrl/PdfRobotoBoldFont';

import getApplicationWithRelatedData
    from '@salesforce/apex/PdfGeneratorController.getApplicationWithRelatedData';

import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';
import { NavigationMixin } from 'lightning/navigation';

export default class PdfGenerator extends NavigationMixin(LightningElement) {

    @api recordId;
    isJsLoaded = false;

    fontRegularBuffer;
    fontBoldBuffer;
    logoBase64;

    /* =========================
       Load jsPDF, autoTable, Fonts
       ========================= */
    renderedCallback() {
        if (this.isJsLoaded) return;
        this.isJsLoaded = true;

        Promise.all([
            loadScript(this, JSPDF),
            loadScript(this, AUTO_TABLE),
            fetch(ROBOTO_FONT).then(r => r.arrayBuffer()),
            fetch(ROBOTO_BOLD_FONT).then(r => r.arrayBuffer()),
            fetch(WIN_LOGO).then(r => r.blob())
        ])
        .then(([, , regularFont, boldFont, logoBlob]) => {
            this.fontRegularBuffer = regularFont;
            this.fontBoldBuffer = boldFont;

            const reader = new FileReader();
            reader.onloadend = () => { this.logoBase64 = reader.result; };
            reader.readAsDataURL(logoBlob);
        })
        .catch(error => {
            console.error('[PDF] Resource load failed', error);
        });
    }

    /* =========================
       Generate PDF
       ========================= */
    handleGeneratePdf() {
        if (!this.recordId || !this.fontRegularBuffer || !this.fontBoldBuffer) return;

        getApplicationWithRelatedData({ recordId: this.recordId })
            .then(result => {

                const jsPDFLib = window.jspdf?.jsPDF;
                const autoTable =
                    window.jspdf?.autoTable ||
                    jsPDFLib?.API?.autoTable;

                if (!jsPDFLib || !autoTable) return;

                const doc = new jsPDFLib();

                /* =========================
                   Register Roboto Fonts
                   ========================= */
                doc.addFileToVFS(
                    'Roboto-Regular.ttf',
                    this.arrayBufferToBase64(this.fontRegularBuffer)
                );
                doc.addFileToVFS(
                    'Roboto-Bold.ttf',
                    this.arrayBufferToBase64(this.fontBoldBuffer)
                );

                doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
                doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
                doc.setFont('Roboto', 'normal');

                const app = result.application || {};
                const milestones = result.milestones || [];
                const budgets = result.budgets || [];

                let y = 20;
                const pageWidth = doc.internal.pageSize.getWidth();
                const pageHeight = doc.internal.pageSize.getHeight();
                let pageCount = 1;

                /* =========================
                   Header / Footer
                   ========================= */
                const addHeaderFooter = () => {
                    if (pageCount === 1 && this.logoBase64) {
                        const w = 50, h = 20;
                        doc.addImage(this.logoBase64, 'PNG', (pageWidth - w) / 2, 10, w, h);
                        y = 10 + h + 6;

                        doc.setFontSize(14);
                        doc.setFont('Roboto', 'bold');
                        doc.setTextColor(178, 42, 42);
                        doc.text('PROJECT PROPOSAL FORM', pageWidth / 2, y, { align: 'center' });
                        y += 10;
                    } else {
                        y = 30;
                    }

                    doc.setFontSize(10);
                    doc.setFont('Roboto', 'normal');
                    doc.setTextColor(0, 0, 0);
                    doc.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                };

                const checkPageSpace = (h = 20) => {
                    if (y + h >= pageHeight - 20) {
                        doc.addPage();
                        pageCount++;
                        y = 20;
                        addHeaderFooter();
                    }
                };

                /* =========================
                   HTML → Text
                   ========================= */
                const parseHtmlToText = html => {
                    if (!html) return '';
                    const div = document.createElement('div');
                    div.innerHTML = html;
                    let r = '';

                    const walk = n => {
                        if (n.nodeType === 3) r += n.nodeValue;
                        else if (n.nodeName === 'DIV' || n.nodeName === 'P') {
                            n.childNodes.forEach(walk);
                            r += '\n';
                        } else if (n.nodeName === 'BR') r += '\n';
                        else if (n.nodeName === 'OL') {
                            let i = 1;
                            n.childNodes.forEach(li => {
                                if (li.nodeName === 'LI') r += `${i++}. ${li.textContent.trim()}\n`;
                            });
                        } else if (n.nodeName === 'UL') {
                            n.childNodes.forEach(li => {
                                if (li.nodeName === 'LI') r += `• ${li.textContent.trim()}\n`;
                            });
                        } else n.childNodes.forEach(walk);
                    };

                    div.childNodes.forEach(walk);
                    return r.trim();
                };

                /* =========================
                   Label / Value Renderer
                   ========================= */
               /* const wrapText = (label, value) => {
                    const maxW = 160, lh = 6;
                    const ll = doc.splitTextToSize(label, maxW);
                    const vl = doc.splitTextToSize(value ? parseHtmlToText(value) : '', maxW);

                    checkPageSpace((ll.length + vl.length) * lh + 4);

                    doc.setFont('Roboto', 'bold');
                    ll.forEach(l => { doc.text(l, 20, y); y += lh; });

                    y += 1;
                    doc.setFont('Roboto', 'normal');
                    vl.forEach(l => { doc.text(l, 20, y); y += lh; });

                    y += 2;
                };*/
                const wrapText = (label, value) => {
    const maxW = 160;
    const lh = 6;

    const labelLines = doc.splitTextToSize(label, maxW);
    const valueText = value ? parseHtmlToText(value) : '';
    const valueLines = doc.splitTextToSize(valueText, maxW);

    /* ---------- LABEL ---------- */
    doc.setFont('Roboto', 'bold');
    labelLines.forEach(line => {
        checkPageSpace(lh);
        doc.text(line, 20, y);
        y += lh;
    });

    y += 1;

    /* ---------- VALUE (SAFE PAGINATION) ---------- */
    doc.setFont('Roboto', 'normal');
    valueLines.forEach(line => {
        checkPageSpace(lh);
        doc.text(line, 20, y);
        y += lh;
    });

    y += 3;
};

                const section = t => {
                    checkPageSpace(20);
                    y += 4;
                    doc.setFontSize(14);
                    doc.setFont('Roboto', 'bold');
                    doc.setTextColor(255, 111, 97);
                    doc.text(t, 15, y);
                    y += 6;
                    doc.setFontSize(11);
                    doc.setFont('Roboto', 'normal');
                    doc.setTextColor(0, 0, 0);
                };

                const subSection = t => {
                    checkPageSpace(18);
                    y += 3;
                    doc.setFontSize(12);
                    doc.setFont('Roboto', 'bold');
                    doc.text(t, 15, y);
                    y += 5;
                    doc.setFontSize(11);
                };

                /* =========================
                   CONTENT – ALL SECTIONS
                   ========================= */
                addHeaderFooter();

                /* 1 */
                section('1. General Details');
                wrapText('1.1. Project Title:', app.Project_Title__c);
                wrapText('1.2. Primary Focus Area:', app.Primary_Focus_Area__c);
                wrapText('1.3. Sub-Focus Area:', app.Sub_Focus_Area__c);
                wrapText('1.4. Project Duration (in months):', app.Project_Duration__c);
                wrapText('1.5. Laboratory / Dept / Organization Website:', app.Project_Website_if_any__c);
                wrapText('1.6. Keywords that describe your Project :', app.Keywords__c);

                /* 2 */
                section('2. Applicant Details');
                subSection('2.1. Details of Principal Investigator:');
                wrapText('COE Institution / Organization:', app.PI_Institution_Organization_Name__c);
                wrapText('Name:', app.PI_Name__c);
                wrapText('Designation:', app.PI_Designation__c);
                wrapText('PI Institution / Organization:', app.PI_Institution_Organization_Name__c);
                wrapText('Mobile Number:', app.PI_Phone__c);
                wrapText('Email ID:', app.PI_Email__c);

                subSection('2.2. Details of Co - Principal Investigator');
                wrapText('Name:', app.Co_Principal_Investigator_Co_PI__c);
                wrapText('Designation:', app.CO_PI_Designation__c);
                wrapText('Institution / Organization:', app.CO_PI_Institution__c);
                wrapText('Mobile Number:', app.CO_PI_Phone__c);
                wrapText('Email ID:', app.CO_PI_Email__c);
                wrapText('2.3. Details of Team Members / Mentors :', app.Project_Team_Members__c);
                wrapText('2.4. Expertise and Experience of Team :', app.Expertise_and_Experience_of_Team_in_Spec__c);

                /* 3 */
                section('3. Project Details');
                wrapText('3.1. Project Summary:', app.Project_Summary__c);
                wrapText('3.2. Key Problem being Solved :', app.Key_Problem_Being_Solved__c);
                wrapText('3.3. Proposed Solution :', app.Proposed_Solution__c);
                wrapText('3.4. Novelty of the Project :', app.Novelty_of_the_Project__c);
                wrapText('3.5. Objectives of the Project :', app.Objectives_of_the_Project__c);
                wrapText('3.6. Current TRL:', app.Current_Technology_Readiness_Level_TRL__c);
                wrapText('3.7. Details of activities supporting the current TRL of the Project:', app.Work_undertaken_supporting_current_TRL__c);
                wrapText('3.8. Expected TRL:', app.Expected_TRL_at_the_end_of_the_Project__c);
                wrapText('3.9. Current status of the Project :', app.Current_status_of_the_Project_Work_und__c);
                wrapText('3.10. Work Plan :', app.Project_Approach_and_Work_Plan__c);
                wrapText('3.11. Competitive Landscape', app.Competitive_Advantage__c);
                wrapText('3.12. IPR Filed/Granted :', app.Details_of_IPR_Filed_Granted__c);
                wrapText('3.13. Ethical / Regulatory Approvals :', app.Details_of_Ethical_Received__c);
                wrapText('3.14. References :', app.Full_Proposal_Citations__c);

                /* 4 */
                section('4. Project Commercialization Details');
                wrapText('4.1. Target Market :', app.Target_Market_Industry_Application__c);
                wrapText('4.2. Beneficiaries :', app.Customer_and_Beneficiaries__c);
                wrapText('4.3. Market Entry Plan :', app.Plan_for_Commercialization__c);
                wrapText('4.4. Business Model :', app.Business_Model_for_Commercialization__c);
                wrapText('4.5. Revenue Strategy :', app.Project_Revenue_Strategy__c);
                wrapText('4.6. Risks and Barriers :', app.Main_Risks_and_Barriers__c);
                wrapText('4.7. Partnerships :', app.Relevant_Partnerships__c);
                wrapText('4.8. Startup Incorporation :', app.Potential_for_Startup_Formation__c);
                wrapText('4.9. Association with TBI :', app.Incubator_Association_Details__c);
                wrapText('4.10. Tech Transfer Strategy :', app.Strategy_for_transfer_of_technology__c);
                wrapText('4.11. Funding Strategy :', app.Strategy_for_raising_funds_from_Investor__c);

                /* 5 */
                section('5. Budgetary Requirements');
                //wrapText('5.1. Total Project Budget (USD)', app.Total_Project_Budget_in_USD__c);
                 wrapText('5.1. Total Project Budget (INR): ', app.Total_Project_Budget_INR__c);

                subSection('Details of Project Cost');
                checkPageSpace(30);

                //let totalUSD = budgets.reduce((s, b) => s + (parseFloat(b.Total_Amount__c) || 0), 0);
                let totalINR = budgets.reduce((s, b) => s + (parseFloat(b.Total_Amount_INR__c) || 0), 0);

                autoTable.call(doc, {
                    startY: y,
                    head: [['S.No.', 'Budget Head', 'Total Amount (INR)', 'Detailed Justification']],
                    body: [
                        ...budgets.map((b, i) => [
                            i + 1,
                            b.Name || '',
                            b.Total_Amount_INR__c || '',
                            b.Justification__c || ''
                        ]),
                        [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, '',
                        // { content: `$ ${totalUSD.toLocaleString()}`, styles: { fontStyle: 'bold' } },
                         { content: `Rs. ${totalINR.toLocaleString()}`, styles: { fontStyle: 'bold' } }, '']
                    ],
                    styles: {
                        font: 'Roboto',
                        fontSize: 9,
                        textColor: [0, 0, 0],
                        lineColor: [191, 32, 38],
                        lineWidth: 0.4,
                        cellPadding: 3
                    },
                    headStyles: {
                        fillColor: [191, 32, 38],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    theme: 'grid'
                });

                y = doc.lastAutoTable.finalY + 10;

               
                wrapText('5.2. Prior Funding Details:', app.Previous_Funding_Details__c);
                wrapText('5.3. Support required from WIN:', app.WIN_Support__c);

                /* 6 */
                section('6. Milestones and Deliverables');
                subSection('6.1. Key Milestones :');
                checkPageSpace(30);

                const milestoneRows = milestones.map((m, i) => [
                    i + 1,
                    [
                        m.Installment_of_Funds_1__c,
                        m.Installment_of_Funds_2__c,
                        m.Installment_of_Funds_3__c,
                        m.Installment_of_Funds_4__c
                    ].filter(v => v).join(', ') || '',
                    m.Milestone_Description__c || '',
                    m.Activities_under_this_Milestone__c || '',
                    m.Output_and_Deliverables__c || '',
                    m.Project_Start_Date__c || '',
                    m.Project_End_Date__c || '',
                    m.Budget_Required_INR__c || ''
                ]);

                autoTable.call(doc, {
                    startY: y,
                    margin: { left: 10, right: 10 },
                    head: [['S.No.', 'Installment of Funds', 'Milestone Description',
                            'Activities under this Milestone', 'Outputs & Deliverables',
                            'Month Start', 'Month End', 'Budget (INR)']],
                    body: milestoneRows,
                    theme: 'grid',
                    columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 24 },
                        2: { cellWidth: 32 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 30 },
                        5: { cellWidth: 14 },
                        6: { cellWidth: 14 },
                        7: { cellWidth: 20 }
                    },
                    styles: {
                        font: 'Roboto',
                        fontSize: 8,
                        cellPadding: 2,
                        overflow: 'linebreak',
                        lineColor: [191, 32, 38],
                        lineWidth: 0.3,
                        textColor: [0, 0, 0]
                    },
                    headStyles: {
                        fillColor: [191, 32, 38],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 8.5
                    }
                });

                y = doc.lastAutoTable.finalY + 10;

                /* 7 */
                section('7. Project Outcomes and Impact');
                wrapText('7.1. Proposed Outcomes:', app.Proposed_Outcomes_Deliverables_under_t__c);
                wrapText('7.2. Envisaged Impact:', app.Envisioned_Project_Impact__c);
                wrapText('7.3. Future Plan:', app.Future_Plan_for_next_3_5_on_comple__c);

                /* 8 */
                section('8. Supporting Documents');

                checkPageSpace(10);
                doc.setFont('Roboto', 'bold');
                doc.text('Uploaded Documents:', 20, y);
                y += 10;
                doc.setFont('Roboto', 'normal');

                if (!result.fileUrls || result.fileUrls.length === 0) {
                    doc.text('(No documents uploaded)', 25, y);
                    y += 10;
                } else {
                    result.fileUrls.forEach(f => {
                        const name = f.split(':')[0];
                        checkPageSpace(12);
                        doc.text(`• ${name}`, 25, y);
                        y += 10;
                    });
                }

                doc.save('WIN_Project_Proposal_Summary.pdf');
            });
    }

    /* =========================
       ArrayBuffer → Base64
       ========================= */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
}