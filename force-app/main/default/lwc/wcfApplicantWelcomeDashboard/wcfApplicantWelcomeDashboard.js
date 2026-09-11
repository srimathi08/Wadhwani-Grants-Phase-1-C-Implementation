import { LightningElement, api } from 'lwc';
import setLanguage from '@salesforce/apex/WCFFormController.setLanguage';
import { NavigationMixin } from 'lightning/navigation';


// ── Custom Labels ──────────────────────────────────────────────
import CL_Welcome_to_your_dashboard from '@salesforce/label/c.CL_Welcome_to_your_dashboard';
import CL_NO_APPLICATION_YET from '@salesforce/label/c.CL_NO_APPLICATION_YET';
import CL_You_haven_t_started_an_application_yet from '@salesforce/label/c.CL_You_haven_t_started_an_application_yet';
import CL_When_you_re_ready_the_application_takes_you_through_a_four_section_form_cove from '@salesforce/label/c.CL_When_you_re_ready_the_application_takes_you_through_a_four_section_form_cove';
import CL_Start_your_application from '@salesforce/label/c.CL_Start_your_application';
import CL_Application_FAQ from '@salesforce/label/c.CL_Application_FAQ';
import CL_Eligibility_criteria from '@salesforce/label/c.CL_Eligibility_criteria';
import CL_Useful_links from '@salesforce/label/c.CL_Useful_links';
import CL_For_any_queries from '@salesforce/label/c.CL_For_any_queries';
import CL_No_Fee from '@salesforce/label/c.CL_No_Fee';
import CL_No_Fee_Disclaimer from '@salesforce/label/c.CL_No_Fee_Disclaimer';




const LANGUAGES = [
    //{ code: 'en_US', label: 'EN' },   // ← was 'en'
    //{ code: 'es',    label: 'ES' },
    //{ code: 'pt_BR', label: 'PT' }    // ← was 'pt'
];

export default class WcfApplicantWelcomeDashboard extends NavigationMixin(LightningElement) {
    @api applicantName;
    @api organizationName;
    @api headquarters;

    selectedLanguage = 'en_US';
    faqUrl = '';
    eligibilityUrl = '';

        // ── Expose labels to the template ──────────────────────────
    label = {
        welcomeToYourDashboard: CL_Welcome_to_your_dashboard,
        noApplicationYet: CL_NO_APPLICATION_YET,
        youHaventStarted: CL_You_haven_t_started_an_application_yet,
        fourSectionCopy: CL_When_you_re_ready_the_application_takes_you_through_a_four_section_form_cove,
        startYourApplication: CL_Start_your_application,
       ApplicationFaq: CL_Application_FAQ,
       EligiblityCri: CL_Eligibility_criteria,
       Usefullinks: CL_Useful_links,
       Queries:CL_For_any_queries,
       noFee: CL_No_Fee,                    // ← ADD
    noFeeDisclaimer: CL_No_Fee_Disclaimer // ← ADD
        
    };

    connectedCallback() {
        // Reflect whatever language was last chosen (by this page OR wcfForm)
        this.selectedLanguage = localStorage.getItem('selectedLanguage') || 'en_US';
         this.resolvePageUrls();
    }
        resolvePageUrls() {
        this[NavigationMixin.GenerateUrl]({
            type: 'comm__namedPage',
            attributes: { name: 'ApplicationFAQ__c' } // must match the page's exact API name
        }).then((url) => { this.faqUrl = url; });

        this[NavigationMixin.GenerateUrl]({
            type: 'comm__namedPage',
            attributes: { name: 'EligiblityCri__c' } // must match the page's exact API name
        }).then((url) => { this.eligibilityUrl = url; });
    }

    get languageOptions() {
        return LANGUAGES.map((l) => ({
            ...l,
            cssClass: l.code === this.selectedLanguage ? 'lang-btn lang-btn-active' : 'lang-btn'
        }));
    }

    handleLanguageSelect(event) {
        const selectedLang = event.currentTarget.dataset.code;
        this.selectedLanguage = selectedLang;

        // Persist immediately — this is what wcfForm.js reads on connectedCallback
        localStorage.setItem('selectedLanguage', selectedLang);

        // Update the user's Language field server-side so custom labels
        // resolve correctly (mirrors wcfForm.js's handleLanguageChange)
        setLanguage({ languageCode: selectedLang })
            .then(() => {
                window.location.reload();
            })
            .catch((error) => {
                console.error('Language update error', error);
            });
    }

    handleStartApplication() {
        this.dispatchEvent(new CustomEvent('start', {
            detail: { lang: this.selectedLanguage }
        }));
    }

handleOpenFaq(event) {
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('openfaq'));
}

handleOpenEligibility(event) {
    event.preventDefault();
    this.dispatchEvent(new CustomEvent('openeligibility'));
}
}