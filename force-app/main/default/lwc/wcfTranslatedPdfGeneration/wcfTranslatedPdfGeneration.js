import { LightningElement, api } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getWCFApplicationWithRelatedData from '@salesforce/apex/wcfTranslatePdfGeneratorController.getWCFApplicationWithRelatedData';
import JSPDF from '@salesforce/resourceUrl/downloadjs';
import AUTO_TABLE from '@salesforce/resourceUrl/autotable';
import WIN_LOGO from '@salesforce/resourceUrl/WIN_Logo';

export default class WcfTranslatedPdfGeneration extends NavigationMixin(LightningElement) {
    @api recordId;
    isJsLoaded = false;
    logoBase64;

    renderedCallback() {
        if (this.isJsLoaded) return;
        this.isJsLoaded = true;

        Promise.all([
            loadScript(this, JSPDF),
            loadScript(this, AUTO_TABLE)
        ]).then(() => {
            if (window.jspdf && window.jspdf.jsPDF) {
                console.log('✅ jsPDF and AutoTable loaded');
            } else {
                console.error('❌ jsPDF or AutoTable not loaded correctly');
            }

            // Load WIN logo as base64
            fetch(WIN_LOGO)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        this.logoBase64 = reader.result;
                        console.log('✅ Logo loaded as Base64');
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(err => console.error('❌ Failed to load logo:', err));
        }).catch(error => {
            console.error('❌ Failed to load PDF libraries:', error);
            this.showToast('Error', 'Failed to load PDF libraries.', 'error');
        });
    }

    // Utility to convert rich text to plain text
    parseHtmlToText(html) {
        if (!html) return '';
        const tempEl = document.createElement('div');
        tempEl.innerHTML = html;
        let result = '';
        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                result += node.nodeValue;
            } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
                node.childNodes.forEach(processNode);
                result += '\n';
            } else if (node.nodeName === 'BR') {
                result += '\n';
            } else if (node.nodeName === 'OL') {
                let index = 1;
                node.childNodes.forEach(li => {
                    if (li.nodeName === 'LI') result += `${index++}. ${li.textContent.trim()}\n`;
                });
            } else if (node.nodeName === 'UL') {
                node.childNodes.forEach(li => {
                    if (li.nodeName === 'LI') result += `• ${li.textContent.trim()}\n`;
                });
            } else {
                node.childNodes.forEach(processNode);
            }
        };
        tempEl.childNodes.forEach(processNode);
        return result.trim();
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    handleGeneratePdf() {
        console.log('📄 Generating Translated WCF PDF for recordId:', this.recordId);

        getWCFApplicationWithRelatedData({ recordId: this.recordId })
            .then(result => {
                console.log('📦 Apex Result:', JSON.parse(JSON.stringify(result)));

                try {
                    const jsPDFLib = window.jspdf?.jsPDF;
                    const autoTable = window.jspdf?.autoTable || jsPDFLib?.API?.autoTable;
                    if (!jsPDFLib || !autoTable) {
                        throw new Error('jsPDF or AutoTable not loaded.');
                    }

                    const doc = new jsPDFLib();
                    let y = 20;
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    let pageCount = 1;

                    const checkPageSpace = (requiredHeight = 20) => {
                        if (y + requiredHeight >= pageHeight - 20) {
                            doc.addPage();
                            pageCount++;
                            y = 20;
                            addHeaderFooter();
                        }
                    };

                    const wrapText = (label, value) => {
                        if (value) {
                            const plainText = this.parseHtmlToText(value);
                            const labelHeight = 6;
                            const lineHeight = 6;
                            const lines = doc.splitTextToSize(plainText, 160);
                            const valueHeight = lines.length * lineHeight;

                            checkPageSpace(labelHeight + valueHeight);

                            doc.setFont(undefined, 'bold');
                            doc.text(label, 20, y);
                            y += labelHeight;

                            doc.setFont(undefined, 'normal');
                            doc.text(lines, 25, y);
                            y += valueHeight;
                        }
                    };

                    const section = title => {
                        checkPageSpace(20);
                        y += 4;
                        doc.setFontSize(14);
                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(255, 110, 97);
                        doc.text(title, 15, y);
                        y += 6;
                        doc.setFontSize(11);
                        doc.setFont(undefined, 'normal');
                        doc.setTextColor(0, 0, 0);
                    };

                    const addHeaderFooter = () => {
                        if (pageCount === 1 && this.logoBase64) {
                            const imgWidth = 50;
                            const imgHeight = 20;
                            const x = (pageWidth - imgWidth) / 2;
                            doc.addImage(this.logoBase64, 'PNG', x, 10, imgWidth, imgHeight);
                            y = 10 + imgHeight + 6;

                            doc.setFontSize(14);
                            doc.setFont(undefined, 'bold');
                            doc.setTextColor(128, 0, 0);
                            doc.text('WCF PROPOSAL FORM', pageWidth / 2, y, { align: 'center' });

                            y += 10;
                        } else {
                            y = 30;
                        }
                    };

                    // Begin PDF
                    addHeaderFooter();

                    const orgInfo = result.app;
                    if (!orgInfo) throw new Error('Translated Proposal data not found.');


        // Section 1: Org Info
            section('1. Organizational Information');
            wrapText('1.1. Organizational Area For Funding', orgInfo.Organizational_Area_s_for_Funding__c);
            wrapText('1.2. Organization Name', orgInfo.Organization_Name__c);
            wrapText('1.3. Headquarters City and Country', orgInfo.Headquarters_City_and_Country__c);
            wrapText('1.4. Primary Service Regions', orgInfo.Primary_Service_Regions__c);
            wrapText('1.5. Leader Name', orgInfo.Leader_Name__c);
            wrapText('1.6. Leader Title', orgInfo.Leader_Title__c);

         // Section 2: Submitter Info
            section('2. Submitter Contact Information');
            wrapText('2.1. Name', orgInfo.Submitter_Name__c);
            wrapText('2.2. Title', orgInfo.Job_Title__c);
            wrapText('2.3. Email Address', orgInfo.Work_Email_ID__c);
            wrapText('2.4. Phone Number', orgInfo.Phone_number__c);
                
         // Section 3: Legal Structure
            section('3. Legal Structure');
            const legalQ = '3.1 Please describe the legal structure of your entity. Include details about how the entity operates under local law, including context about whether the entity is considered for-profit, non-profit, or some specific hybrid form. Also include any information about related entities, such as subsidiaries and owners.';
            const labelLines = doc.splitTextToSize(legalQ, 160);
            doc.setFont(undefined, 'bold');
            doc.text(labelLines, 20, y);
            y += labelLines.length * 6;
            if (orgInfo.Legal_Structure__c) {
                const valueLines = doc.splitTextToSize(this.parseHtmlToText(orgInfo.Legal_Structure__c), 160);
                valueLines.forEach(line => {
                    checkPageSpace(6);
                    doc.setFont(undefined, 'normal');
                    doc.text(line, 25, y);
                    y += 6;
                });
            }

// Section 4: Historical Data
            const hist = result.historical;
            if (hist) {
                section('4. Historical Financial Data');
                doc.autoTable({
                    startY: y,
                    head: [['', 'Prior Fiscal Year', 'Two Years Prior', 'Three Years Prior']],
                    body: [
                        ['Balance at Start of Year', hist.CY1_Balance_Start_CFY_1__c || '', hist.CY2_Balance_Start_CFY_2__c || '', hist.CY3_Balance_Start_CFY_3__c || ''],
                        ['Revenue', hist.CY1_Revenue__c || '', hist.CY2_Revenue__c || '', hist.CY3_Revenue__c || ''],
                        ['Expense', hist.CY1_Expense__c || '', hist.CY2_Expense__c || '', hist.CY3_Expense__c || ''],
                        ['Balance at End of Year', hist.CY1_Balance_End__c || '', hist.CY2_Balance_End__c || '', hist.CY3_Balance_End__c || '']
                    ],
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [191, 32, 38], textColor: 255 }
                });
                y = doc.lastAutoTable.finalY + 12;
            }
            
         // Section 5: Current FY Data
            const fy = result.fiscalYear;
            if (fy) {
                section('5. Current Fiscal Year Data');
                doc.autoTable({
                    startY: y,
                    head: [['', 'Budget', 'Current Projection', 'Variance', 'Explanation']],
                    body: [
                        ['Revenue', fy.Revenue_Budget__c || '', fy.Revenue_Projection__c || '', fy.Revenue_Variance__c || '', this.parseHtmlToText(fy.Revenue_Explanation__c)],
                        ['Expense', fy.Expense_Budget__c || '', fy.Expense_Projection__c || '', fy.Expense_Variance__c || '', this.parseHtmlToText(fy.Expense_Explanation__c)],
                        ['Revenue - Expense', fy.Net_Budget__c || '', fy.Net_Projection__c || '', fy.Net_Variance__c || '', this.parseHtmlToText(fy.Net_Position_Explanation__c)]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [191, 32, 38], textColor: 255 }
                });
                y = doc.lastAutoTable.finalY + 12;
            }


// Section 6: Organizational Stability
            section('6. Organizational Stability');
            const stabQ = '6.1 Describe your plan to ensure organizational sustainability...';
            const stabLines = doc.splitTextToSize(stabQ, 160);
            doc.setFont(undefined, 'bold');
            doc.text(stabLines, 20, y);
            y += stabLines.length * 6;
            if (orgInfo.Organizational_Sustainability__c) {
                const valueLines = doc.splitTextToSize(this.parseHtmlToText(orgInfo.Organizational_Sustainability__c), 160);
                valueLines.forEach(line => {
                    checkPageSpace(6);
                    doc.setFont(undefined, 'normal');
                    doc.text(line, 25, y);
                    y += 6;
                });
            }

 // Section 7 & 8: Outcome Data (Tables)
            const fundingArea = orgInfo.Organizational_Area_s_for_Funding__c || '';
            const outcome = (result.outcomes && result.outcomes.length) ? result.outcomes[0] : {};
            const plain = (v) => this.parseHtmlToText(v);

            if (fundingArea.includes('Job Fulfillment Only') || fundingArea === 'Both Job Fulfillment and Job Creation') {
                section('7. Outcome Data: Job Fulfillment');
                doc.autoTable({
                    startY: y,
                    head: [['', 'Current Fiscal Year', 'Prior Fiscal Year', 'Two Years Prior', 'Three Years Prior']],
                    body: [
                        ['List of organizational skilling domains', plain(outcome.Skills_Duration_CFY__c), plain(outcome.Skills_Duration_FY_1__c), plain(outcome.Skills_Duration_FY_2__c), plain(outcome.Skills_Duration_FY_3__c)],
                        ['# of learner enrollments', outcome.Projected_Learner_Enrollments_CFY__c || '', outcome.Projected_Learner_Enrollments_FY_1__c || '', outcome.Projected_Learner_Enrollments_FY_2__c || '', outcome.Projected_Learner_Enrollments_FY_3__c || ''],
                        ['# of learner placements', outcome.Projected_Learner_Placements_CFY__c || '', outcome.Projected_Learner_Placements_FY_1__c || '', outcome.Projected_Learner_Placements_FY_2__c || '', outcome.Projected_Learner_Placements_FY_3__c || ''],
                        ['Learner placement %', outcome.Projected_Learner_placement_CFY__c || '', outcome.Projected_Learner_placement_FY_1__c || '', outcome.Projected_Learner_placement_FY_2__c || '', outcome.Projected_Learner_placement_FY_3__c || ''],
                        ['Average cost per placement', outcome.Avg_Cost_per_Placement_CFY__c || '', outcome.Avg_Cost_per_Placement_FY_1__c || '', outcome.Avg_Cost_per_Placement_FY_2__c || '', outcome.Avg_Cost_per_Placement_FY_3__c || ''],
                        ['Placement verification via 3rd party', outcome.X3rd_Party_Placement_Verification_CFY__c || '', outcome.X3rd_Party_Placement_Verification_FY_1__c || '', outcome.X3rd_Party_Placement_Verification_FY_2__c || '', outcome.X3rd_Party_Placement_Verification_FY_3__c || ''],
                        ['3rd-Party Verification Description', plain(outcome.X3rd_Party_Verification_Description_CFY__c), plain(outcome.X3rd_Party_Verification_Description_FY_1__c), plain(outcome.X3rd_Party_Verification_Description_FY_2__c), plain(outcome.X3rd_Party_Verification_Description_FY_3__c)],
                        ['Long-Term Outcomes', outcome.Long_Term_Outcomes_CFY__c || '', outcome.Long_Term_Outcomes_FY_1__c || '', outcome.Long_Term_Outcomes_FY_2__c || '', outcome.Long_Term_Outcomes_FY_3__c || ''],
                        ['Long-term outcomes research', plain(outcome.Outcome_Tracking_Details_CFY__c), plain(outcome.Outcome_Tracking_Details_FY_1__c), plain(outcome.Outcome_Tracking_Details_FY_2__c), plain(outcome.Outcome_Tracking_Details_FY_3__c)]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [191, 32, 38], textColor: 255 }
                });
                y = doc.lastAutoTable.finalY + 12;
            }


          if (fundingArea.includes('Job Creation Only') || fundingArea === 'Both Job Fulfillment and Job Creation') {
                section('8. Outcome Data: Job Creation');
                doc.autoTable({
                    startY: y,
                    head: [['', 'Current Fiscal Year', 'Prior Fiscal Year', 'Two Years Prior', 'Three Years Prior']],
                    body: [
                        ['List of Target Business sectors', plain(outcome.Target_Business_Sectors_CFY__c), plain(outcome.Target_Business_Sectors_FY_1__c), plain(outcome.Target_Business_Sectors_FY_2__c), plain(outcome.Target_Business_Sectors_FY_3__c)],
                        ['# of new businesses started', outcome.Projected_New_Businesses_CFY__c || '', outcome.Projected_New_Businesses_FY_1__c || '', outcome.Projected_New_Businesses_FY_2__c || '', outcome.Projected_New_Businesses_FY_3__c || ''],
                        ['# of jobs created by new businesses', outcome.Projected_Jobs_from_New_Businesses_CFY__c || '', outcome.Projected_Jobs_from_New_Businesses_FY1__c || '', outcome.Projected_Jobs_from_New_Businesses_FY2__c || '', outcome.Projected_Jobs_from_New_Businesses_FY3__c || ''],
                        ['# of existing businesses helped to grow', outcome.Growing_Businesses_Supported_CFY__c || '', outcome.Growing_Businesses_Supported_FY_1__c || '', outcome.Growing_Businesses_Supported_FY_2__c || '', outcome.Growing_Businesses_Supported_FY_3__c || ''],
                        ['# of jobs created by existing businesses', outcome.Jobs_from_Growing_Businesses_CFY__c || '', outcome.Jobs_from_Growing_Businesses_FY_1__c || '', outcome.Jobs_from_Growing_Businesses_FY_2__c || '', outcome.Jobs_from_Growing_Businesses_FY_3__c || ''],
                        ['Total average cost per job created', outcome.Avg_Cost_per_Job_CFY__c || '', outcome.Avg_Cost_per_Job_FY_1__c || '', outcome.Avg_Cost_per_Job_FY_2__c || '', outcome.Avg_Cost_per_Job_FY_3__c || ''],
                        ['Job creation verification via 3rd party', outcome.Job_Verification_3rd_Party_CFY__c || '', outcome.Job_Verification_3rd_Party_FY1__c || '', outcome.Job_Verification_3rd_Party_FY2__c || '', outcome.Job_Verification_3rd_Party_FY3__c || ''],
                        ['3rd party verification details', plain(outcome.X3rd_party_verification_details_CFY__c), plain(outcome.X3rd_party_verification_details_FY1__c), plain(outcome.X3rd_party_verification_details_FY2__c), plain(outcome.X3rd_party_verification_details_FY3__c)]
                    ],
                    theme: 'grid',
                    styles: { fontSize: 10 },
                    headStyles: { fillColor: [191, 32, 38], textColor: 255 }
                });
                y = doc.lastAutoTable.finalY + 12;
            }

         // Support from Wadhwani
        section('9. Support From Wadhwani');
        const UseFund = '9.1 Desired Use of Additional Funding/Investment: Please describe how you would deploy additional funding/investment to scale your impact across more beneficiaries and how you would measure this impact effectively. For this question, assume funding/investment of \$1M per year over 5 years. (Alternatively, please feel free to specify a lesser amount and/or shorter timeframe if you do not need \$1M over 5 years.) Be specific about the use of funds and the measurable impact. Preferably use similar outcome parameters as indicated in the “Outcomes” question above – 500 words maximum.';
       const UseFundLines = doc.splitTextToSize(UseFund, 160);

// Print the question
doc.setFont(undefined, 'bold');
doc.text(UseFundLines, 20, y);
y += UseFundLines.length * 6;

// Print the answer with proper paging
if (orgInfo.Use_of_Additional_Funding__c) {
    const plainText = this.parseHtmlToText(orgInfo.Use_of_Additional_Funding__c);
    const valueLines = doc.splitTextToSize(plainText, 160);
    const lineHeight = 6;
    const bottomMargin = 20; // keep gap at bottom

    doc.setFont(undefined, 'normal');

    valueLines.forEach(line => {
        if (y + lineHeight > pageHeight - bottomMargin) {
            doc.addPage();
            pageCount++;
            y = 30; // reset margin for new page
            addHeaderFooter();
        }
        doc.text(line, 25, y);
        y += lineHeight;
    });
}
       
// --- Operational Synergies ---
let operSynQ = '';
let operSynValue = '';

switch (orgInfo.Organizational_Area_s_for_Funding__c) {
    case 'Job Fulfillment Only':
        console.log('inside case JF');
        operSynQ = '9.2. Please describe your organization’s interest in adopting the GenieAI Platform for your target entrepreneurs/businesses and target employment candidates at no charge. If interested, please include the estimated number of entrepreneurs/companies and number of skilling beneficiaries using the platform annually and describe how the adoption would deepen and accelerate your organization’s impact. For more information, refer to the links below. (100 words maximum)';
        operSynValue = orgInfo.Operational_Synergies_with_WOF__c;
        break;

    case 'Job Creation Only':
        operSynQ = '9.2. Please describe your organization’s interest in adopting the GenieAI Platform for your target entrepreneurs/businesses at no charge. If interested, please include the estimated number of entrepreneurs/companies using the platform annually and describe how the adoption would deepen and accelerate your organization’s impact. More information about GenieAI’s support for entrepreneurs/businesses is available below. (100 words maximum)';
        operSynValue = orgInfo.Operational_Synergies_with_WOF_JC__c;
        break;

    case 'Both Job Fulfillment and Job Creation':
        operSynQ = '9.2. Please describe your organization’s interest in adopting the GenieAI Platform for your target entrepreneurs/businesses and target employment candidates at no charge. If interested, please include the estimated number of entrepreneurs/companies and no. of skilling beneficiaries using the platform annually and describe how the adoption would deepen and accelerate your organization’s impact. More information about GenieAI’s support for entrepreneurs/businesses is available here and that for skilling is available below.';
        operSynValue = orgInfo.Operational_Synergies_with_WOF_Both__c;
        break;
}

// Render only if filled
if (operSynValue) {
    const operSynLines = doc.splitTextToSize(operSynQ, 160);

    // Print the question
    doc.setFont(undefined, 'bold');
    doc.text(operSynLines, 20, y);
    y += operSynLines.length * 6;

    // Print the answer with paging
    const plainText = this.parseHtmlToText(operSynValue);
    const valueLines = doc.splitTextToSize(plainText, 160);
    const lineHeight = 6;
    const bottomMargin = 20;

    doc.setFont(undefined, 'normal');
    valueLines.forEach(line => {
        if (y + lineHeight > pageHeight - bottomMargin) {
            doc.addPage();
            pageCount++;
            y = 30;
            addHeaderFooter();
        }
        doc.text(line, 25, y);
        y += lineHeight;
    });
}     

        

          // Attachments
            if (result.fileUrls && result.fileUrls.length) {
                section('10. Attachments');
                result.fileUrls.forEach(fileStr => wrapText('', fileStr));
            }

          doc.save('Translated_WCF_Grant_Application.pdf');
                    console.log('✅ PDF Generated Successfully');
                } catch (jsErr) {
                    console.error('⚠️ PDF Generation Error:', jsErr);
                    this.showToast('PDF Generation Failed', jsErr.message || 'An unknown error occurred.', 'error');
                }
            })
            .catch(apexErr => {
                console.error('⚠️ Apex Error:', apexErr);
                this.showToast('Server Error', apexErr.body?.message || JSON.stringify(apexErr), 'error');
            });
    }
}