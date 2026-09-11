import { LightningElement, api, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getNavigationMenuItems from '@salesforce/apex/NavigationMenuItemsController.getNavigationMenuItems';
import getCurrentUserLanguage from '@salesforce/apex/NavigationMenuItemsController.getCurrentUserLanguage';
import updateUserLanguage from '@salesforce/apex/NavigationMenuItemsController.updateUserLanguage';
import getCurrentUserContext from '@salesforce/apex/NavigationMenuItemsController.getCurrentUserContext';
import USER_ID from '@salesforce/user/Id';
import logo from '@salesforce/resourceUrl/WIN_Logo';

export default class NavigationMenu extends LightningElement {
    logoUrl = logo;
    @api linkSetMasterLabel;
    @api addHomeMenuItem = false;
    @api includeImageUrls = false;

    @api logoAlt = 'Company Logo';

    @track menuItems = [];
    @track isLoaded = false;
    @track error;

    @track selectedLanguage = null;
    @track isLoadingLang = false;
    @track languageOptions = [];
    @track leadOrUserid = USER_ID;
    publishStatus;

    // ── Login / account state (right corner) ────────────────────────────────
    @track isGuest = true;
    @track displayName = '';
    @track initials = '';
    @track showAccountMenu = false;

    isPageRefResolved = false;
    _handleDocumentClick;

    connectedCallback() {
        // Close the account menu when the user clicks anywhere outside it.
        this._handleDocumentClick = (evt) => {
            if (!this.showAccountMenu) return;
            const wrap = this.template.querySelector('.account-wrap');
            if (wrap && !wrap.contains(evt.target)) {
                this.showAccountMenu = false;
            }
        };
        document.addEventListener('click', this._handleDocumentClick);
    }

    disconnectedCallback() {
        if (this._handleDocumentClick) {
            document.removeEventListener('click', this._handleDocumentClick);
        }
    }

    // ✅ Read language from URL param
    getLanguageFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('language');
    }

    // ✅ Normalize against loaded options
    normalizeLang(lang) {
        if (!lang) return this.languageOptions[0]?.value || null;
        const match = this.languageOptions.find(l => l.value === lang);
        return match ? lang : (this.languageOptions[0]?.value || null);
    }

    get availableLanguages() {
        return this.languageOptions.map(lang => ({
            ...lang,
            isSelected: lang.value === this.selectedLanguage
        }));
    }

    get hasLanguages() {
        return this.languageOptions && this.languageOptions.length > 0;
    }

    @wire(getNavigationMenuItems, {
        navigationLinkSetMasterLabel: '$linkSetMasterLabel',
        publishStatus: '$publishStatus',
        addHomeMenuItem: '$addHomeMenuItem',
        includeImageUrl: '$includeImageUrls'
    })
    wiredMenuItems({ error, data }) {
        if (data && !this.isLoaded) {
            this.menuItems = data.map((item, index) => ({
                target: item.actionValue,
                id: index,
                label: item.label,
                type: item.actionType,
                subMenu: item.subMenu,
                imageUrl: item.imageUrl,
                windowName: item.target
            }));
            this.isLoaded = true;
        } else if (error) {
            this.error = error;
            this.menuItems = [];
            this.isLoaded = true;
            console.error(error);
        }
    }

    // ✅ Who's looking at the nav bar right now — drives Log in vs account chip
    @wire(getCurrentUserContext)
    wiredUserContext({ error, data }) {
        if (data) {
            this.isGuest = data.isGuest;
            this.displayName = data.displayName || '';
            this.initials = data.initials || '';
        } else if (error) {
            console.error('getCurrentUserContext error:', error);
            // Fail safe: treat as guest so we never show a broken account menu
            this.isGuest = true;
            this.displayName = '';
            this.initials = '';
        }
    }

    // ✅ Resolve page ref then fetch language
    @wire(CurrentPageReference)
    setCurrentPageReference(currentPageReference) {
        if (!currentPageReference) return;

        const app = currentPageReference?.state?.app;
        this.publishStatus = (app === 'commeditor') ? 'Draft' : 'Live';

        const leadId = currentPageReference?.state?.Leadid;
        this.leadOrUserid = leadId || USER_ID;

        if (!this.isPageRefResolved) {
            this.isPageRefResolved = true;
            this.fetchUserLanguage();
        }
    }

    // ✅ Fetch languages — honour URL param, then backend preference, then fallback
    async fetchUserLanguage() {
        this.isLoadingLang = true;
        try {
            const langs = await getCurrentUserLanguage({ Id: this.leadOrUserid });
            console.log('Language Data:', JSON.stringify(langs));

            if (!langs || langs.length === 0) {
                this.languageOptions = [];
                this.selectedLanguage = null;
                return;
            }

            // ✅ Build options using `code` as the value (matches URL param)
            this.languageOptions = langs.map(l => ({
                label: l.label,
                value: l.code
            }));

            // ✅ Priority 1: URL param already present — honour it, nothing to write
            const urlLang = this.getLanguageFromUrl();
            if (urlLang) {
                const match = this.languageOptions.find(l => l.value === urlLang);
                if (match) {
                    this.selectedLanguage = urlLang;
                    return; // URL already correct, skip replaceState
                }
            }

            // ✅ Priority 2: preferred language from backend (Contact/Lead)
            const preferred = langs.find(l => l.isSelected);
            if (preferred) {
                const match = this.languageOptions.find(l => l.value === preferred.code);
                this.selectedLanguage = match
                    ? preferred.code
                    : (this.languageOptions[0]?.value || null);
            } else {
                // ✅ Priority 3: fallback to first option
                this.selectedLanguage = this.languageOptions[0]?.value || null;
            }

            // ✅ Stamp resolved language into URL silently (no reload)
            if (this.selectedLanguage) {
                this._syncLanguageToUrl(this.selectedLanguage);
            }

        } catch (err) {
            console.error('fetchUserLanguage error:', err);
            this.languageOptions = [];
            this.selectedLanguage = null;
        } finally {
            this.isLoadingLang = false;
        }
    }

    // ✅ Silently adds/updates ?language= in URL without reloading the page
    _syncLanguageToUrl(lang) {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get('language') === lang) return; // already correct, no-op
            url.searchParams.set('language', lang);
            window.history.replaceState(null, '', url.toString());
        } catch (e) {
            console.warn('Could not sync language to URL', e);
        }
    }

    // ✅ On change → persist to Account.Preferred_Laungage__c, then set URL
    //    param and reload to re-render in the new language
    async handleLanguageChange(event) {
        const newLang = event.target.value;
        console.log('Language changed to:', newLang);
        this.selectedLanguage = newLang;

        // Persist the choice (best-effort; a failure must not block the switch)
        try {
            await updateUserLanguage({ userId: USER_ID, languageCode: newLang });
        } catch (err) {
            console.error('Failed to save preferred language:', err);
        }

        const url = new URL(window.location.href);
        url.searchParams.set('language', newLang);
        window.location.replace(url.toString());
    }

    // ── Login / account URLs & handlers ─────────────────────────────────────
    get sitePath() {
        try {
            const pathParts = window.location.pathname.split('/');
            return `/${pathParts[1]}`;
        } catch (e) {
            return '';
        }
    }

    get homeUrl() {
        return this.sitePath || '/';
    }

    get loginUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const qs = params.toString();
            return `${this.sitePath}/login${qs ? '?' + qs : ''}`;
        } catch (e) {
            return '/login';
        }
    }

    // ✅ Profile page — matches the "/profile/recordId" page URL,
    //    resolved to the current logged-in user's own record.
    get profileUrl() {
            return `${this.sitePath}/s/profile/home`;
    }

    get logoutUrl() {
        return `${this.sitePath}/secur/logout.jsp`;
    }

    toggleAccountMenu(event) {
        if (event) event.stopPropagation();
        this.showAccountMenu = !this.showAccountMenu;
    }

    handleLogoError(event) {
        event.target.style.display = 'none';
        console.warn('Logo failed to load');
    }

}