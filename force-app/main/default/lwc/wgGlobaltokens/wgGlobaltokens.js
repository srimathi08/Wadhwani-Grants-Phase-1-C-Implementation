/**
 * wgGlobalTokens
 * -----------------------------------------------------------------
 * Loads the WCF Portal global design-token stylesheet (wgTokens.css,
 * bundled inside the "wgFonts" static resource) into the document
 * once, so every LWC on the page can read the --wg-* custom
 * properties and use the self-hosted Barlow / Open Sans faces.
 *
 * Placement: drop this component ONCE into a region that renders on
 * every page (e.g. the site Header in Experience Builder) so it
 * loads before other content. loadStyle de-dupes by URL, so it is
 * harmless even if it ends up on the page more than once.
 * -----------------------------------------------------------------
 */

import { LightningElement } from 'lwc';
import { loadStyle } from 'lightning/platformResourceLoader';
import wgFonts from '@salesforce/resourceUrl/wgFonts';

export default class WgGlobaltokens extends LightningElement {
    tokensLoaded = false;

    renderedCallback() {
        if (this.tokensLoaded) {
            return;
        }
        this.tokensLoaded = true;

        loadStyle(this, `${wgFonts}/wgTokens.css`).catch((error) => {
            // eslint-disable-next-line no-console
            console.error('wgGlobalTokens: failed to load wgTokens.css', error);
        });
    }

}