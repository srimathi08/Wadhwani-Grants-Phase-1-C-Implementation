import { LightningElement, track, api } from 'lwc';
import searchCity from '@salesforce/apex/OpenStreetMapService.searchLocation';
export default class AddOpenstreetMap extends LightningElement {
    @track label = {};
    connectedCallback() {   
       this.label = {
        cityCustomLabel: cityCustomLabel,
        countryCustomLabel: countryCustomLabel
    }; 
    } 
    

    @track searchKey = '';
    @track results = [];
    @track isLoading = false;
    @track showNoResults = false;
    @api selectedValue = '';
    @api selectedLabel = '';
    @api selectedCountry = '';
    @api
    set prefillValue(val) {
    if (val && !this.searchKey) {
        const parts = String(val).split(',').map(p => p.trim());
        this.searchKey = parts[0] || '';
        this.selectedCountry = parts[1] || '';
    }
}
get prefillValue() { return this.searchKey; }
    delayTimeout;

    // ─── Getters ───────────────────────────────────────────
    get hasResults() {
        return this.results && this.results.length > 0;
    }

    get noResults() {
        return this.showNoResults 
            && !this.isLoading 
            && this.results.length === 0 
            && this.searchKey.length > 1;
    }

    // ─── Events ────────────────────────────────────────────
    handleFocus() {
        if (this.searchKey && this.searchKey.length > 1 && this.results.length > 0) {
            // Re-show results if input is focused again
            this.results = [...this.results];
        }
    }

    handleBlur() {
        // Small delay so click on dropdown item fires first
        setTimeout(() => {
            this.results = [];
            this.showNoResults = false;
        }, 200);
    }

    handleChange(event) {
        this.searchKey = event.target.value;
        this.showNoResults = false;

        // Keep the parent in sync with free-typed text (before/without a dropdown pick)
        this.dispatchEvent(new CustomEvent('citychange', {
            detail: {
                city: this.searchKey,
                country: this.selectedCountry,
                fullValue: [this.searchKey, this.selectedCountry].filter(Boolean).join(', ')
            }
        }));

        window.clearTimeout(this.delayTimeout);

        if (!this.searchKey || this.searchKey.trim().length === 0) {
            this.results = [];
            this.isLoading = false;
            return;
        }

        if (this.searchKey.trim().length > 1) {
            this.isLoading = true;
            this.delayTimeout = setTimeout(() => {
                this.fetchLocations();
            }, 300);
        } else {
            this.results = [];
        }
    }

    // ─── Fetch Locations ───────────────────────────────────
    async fetchLocations() {
        try {
            const response = await searchCity({ query: this.searchKey });
            const data = JSON.parse(response);

            const seen = new Set();
            const tempResults = [];

            (data.features || []).forEach(feature => {
                const props = feature.properties || {};

                const cityName = props.name || props.city;
                const state    = props.state || '';
                const country  = props.country || '';

                if (!cityName) return;

                // Filter: match typed text
                const typed = this.searchKey.toLowerCase().trim();
                if (!cityName.toLowerCase().startsWith(typed) &&
                    !cityName.toLowerCase().includes(typed)) {
                    return;
                }

                // Full display value
                const value = [cityName, state, country].filter(Boolean).join(', ');

                // Sub display (state, country shown small)
                const subDisplay = [state, country].filter(Boolean).join(', ');

                if (!seen.has(value)) {
                    seen.add(value);
                    tempResults.push({
                        label: cityName,
                        subDisplay: subDisplay,
                        display: value,
                        value: value,
                        country:country
                    });
                }
            });

            this.results = tempResults;
            this.showNoResults = tempResults.length === 0;

        } catch (error) {
            console.error('Error fetching locations:', error);
            this.results = [];
            this.showNoResults = true;
        } finally {
            this.isLoading = false;
        }
    }

    // ─── Select ────────────────────────────────────────────
    handleSelect(event) {
        const value = event.currentTarget.dataset.value;
        const label = event.currentTarget.dataset.label;
        const country = event.currentTarget.dataset.country || '';
        console.log('Selected city:', label, 'Country:', country);
        this.searchKey     = label;
        this.selectedValue = label;
        this.selectedLabel = label;
        this.results       = [];
        this.showNoResults = false;
        this.selectedCountry = country;
        // Fire event to parent
        this.dispatchEvent(new CustomEvent('cityselect', {
            detail: {
                city: label,
                country: country,
                fullValue: value
            }
        }));
    }

    // ─── Clear ─────────────────────────────────────────────
    @api
    clearSelection() {
        this.searchKey     = '';
        this.selectedValue = '';
        this.selectedLabel = '';
        this.results       = [];
        this.showNoResults = false;
    }
}