import { LightningElement, track } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import initiateSignUp from '@salesforce/apex/WFGrantsSignUpController.initiateSignUp';
import completeSignUp from '@salesforce/apex/WFGrantsSignUpController.completeSignUp';
import logo from '@salesforce/resourceUrl/WCF_Logo';
import flagTelpicker from '@salesforce/resourceUrl/flagTelpicker';

export default class WFGrantsSignUp extends LightningElement {

    // ── Assets ────────────────────────────────────────────────────────────────
    logoimg = logo;
    @track logoFailed = false;

    handleLogoError() {
        this.logoFailed = true;
    }

    // ── Step state: 'details' | 'phoneOtp' ────────────────────────────────────
    // NOTE: the OTP step is now verifying EMAIL (not phone) — see comments
    // below. Kept the internal name 'phoneOtp' / phone-based vars around
    // since phone is still collected, but the OTP itself goes to email now.
    @track step = 'details';

    // ── Form fields ───────────────────────────────────────────────────────────
    @track firstName = '';
    @track lastName = '';
    @track organizationName = '';
    @track email = '';
    @track password = '';
    @track confirmPassword = '';
    @track showPassword = false;
    @track showConfirmPassword = false;
    @track acceptedTerms = false;   // Terms of Use + Privacy Policy consent (mandatory, compendium §12)

    // ── Language (picklist Preferred_Laungage__c) ─────────────────────────────
    // Read from the ?language= URL param; must match an allowed picklist value
    // or we fall back to the default so a restricted picklist write can't fail.
    ALLOWED_LANGUAGES = ['en_US', 'pt_BR', 'es'];
    DEFAULT_LANGUAGE = 'en_US';

    // ── intl-tel-input ────────────────────────────────────────────────────────
    iti = null;
    scriptsLoaded = false;
    itiInitialized = false;
    localPhone = '';
    countryCode = '';

    // Inline field-level validation messages
    @track firstNameError = '';
    @track lastNameError = '';
    @track orgNameError = '';
    @track phoneError = '';
    @track emailError = '';
    @track passwordError = '';

    // Standard country-specific phone validation rules aligned with wcfDynamicForm
    PHONE_LENGTH_BY_COUNTRY_CODE = {
        '+1': { min: 10, max: 10, example: '2025551234' },
        '+20': { min: 9, max: 10, example: '1001234567' },
        '+234': { min: 10, max: 10, example: '8031234567' },
        '+27': { min: 9, max: 9, example: '821234567' },
        '+31': { min: 9, max: 9, example: '612345678' },
        '+33': { min: 9, max: 9, example: '612345678' },
        '+34': { min: 9, max: 9, example: '612345678' },
        '+39': { min: 9, max: 10, example: '3123456789' },
        '+41': { min: 9, max: 9, example: '781234567' },
        '+44': { min: 10, max: 10, example: '7123456789' },
        '+49': { min: 7, max: 11, example: '15123456789' },
        '+52': { min: 10, max: 10, example: '5512345678' },
        '+54': { min: 10, max: 11, example: '91123456789' },
        '+55': { min: 10, max: 11, example: '11987654321' },
        '+60': { min: 9, max: 10, example: '123456789' },
        '+61': { min: 9, max: 9, example: '412345678' },
        '+63': { min: 10, max: 10, example: '9171234567' },
        '+64': { min: 8, max: 10, example: '211234567' },
        '+65': { min: 8, max: 8, example: '81234567' },
        '+7': { min: 10, max: 10, example: '9123456789' },
        '+81': { min: 10, max: 10, example: '9012345678' },
        '+82': { min: 9, max: 10, example: '1012345678' },
        '+86': { min: 11, max: 11, example: '13123456789' },
        '+91': { min: 10, max: 10, example: '9812345678' },
        '+966': { min: 9, max: 9, example: '512345678' },
        '+971': { min: 9, max: 9, example: '501234567' }
    };

    // ── Flow state ────────────────────────────────────────────────────────────
    @track token = '';   // self-registration token from initSelfRegistration
    @track otp = '';

    // ── UI helpers ────────────────────────────────────────────────────────────
    @track showErrorMessage = false;
    @track errorMessage = '';
    @track showSuccessMessage = false;
    @track successMessage = '';
    @track isSending = false;
    @track isVerifying = false;

    // ── Resend timer ──────────────────────────────────────────────────────────
    @track resendCountdown = 0;
    @track canResend = false;
    _timerInterval = null;

    RESEND_SECONDS = 30;
    CIRCUMFERENCE = 2 * Math.PI * 18;

    // ─────────────────────────────────────────────────────────────────────────
    // URLs
    // ─────────────────────────────────────────────────────────────────────────
    get startUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('startURL') || params.get('startUrl') || '/';
        } catch (e) {
            return '/';
        }
    }

    // Language code from the site URL, e.g. .../SelfRegister?language=en_US
    // Falls back to DEFAULT_LANGUAGE when missing or not an allowed value.
    get selectedLanguage() {
        try {
            const params = new URLSearchParams(window.location.search);
            const lang = (params.get('language') || params.get('lang') || '').trim();
            return this.ALLOWED_LANGUAGES.includes(lang) ? lang : this.DEFAULT_LANGUAGE;
        } catch (e) {
            return this.DEFAULT_LANGUAGE;
        }
    }

    get loginUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const qs = params.toString();
            const pathParts = window.location.pathname.split('/');
            const sitePath = `/${pathParts[1]}/s`;

            return `${sitePath}/login${qs ? '?' + qs : ''}`;
        } catch (e) {
            return '/login';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────
    renderedCallback() {
        if (!this.scriptsLoaded) {
            this.scriptsLoaded = true;
            Promise.all([
                loadStyle(this, flagTelpicker + '/css/intlTelInput.css'),
                loadStyle(this, flagTelpicker + '/css/demo.css'),
                loadScript(this, flagTelpicker + '/js/utils.js'),
                loadScript(this, flagTelpicker + '/js/intlTelInput.js')
            ])
                .then(() => { this._tryInitIti(); })
                .catch(err => { console.error('flagTelpicker load error', err); });
            return;
        }
        this._tryInitIti();
    }

    disconnectedCallback() {
        this._destroyIti();
        this._clearTimer();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Timer helpers
    // ─────────────────────────────────────────────────────────────────────────
    _startTimer() {
        this._clearTimer();
        this.resendCountdown = this.RESEND_SECONDS;
        this.canResend = false;
        this._timerInterval = setInterval(() => {
            this.resendCountdown -= 1;
            if (this.resendCountdown <= 0) {
                this.resendCountdown = 0;
                this.canResend = true;
                this._clearTimer();
            }
        }, 1000);
    }

    _clearTimer() {
        if (this._timerInterval) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        }
    }

    get timerDashoffset() {
        const fraction = this.resendCountdown / this.RESEND_SECONDS;
        return (this.CIRCUMFERENCE * (1 - fraction)).toFixed(2);
    }

    get timerDisplay() {
        return String(this.resendCountdown).padStart(2, '0');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // intl-tel-input helpers
    // ─────────────────────────────────────────────────────────────────────────
    _tryInitIti() {
        if (this.itiInitialized || this.step !== 'details') return;
        const input = this.template.querySelector('[data-id="phone"]');
        if (!input || typeof window.intlTelInput !== 'function') return;

        this.iti = window.intlTelInput(input, {
            separateDialCode: true,
            showFlags: false,
            excludeCountries: ['il'],
            initialCountry: 'IN',
            preferredCountries: ['in', 'us', 'gb', 'ae', 'sg', 'au'],
            utilsScript: flagTelpicker + '/js/utils.js',
            customPlaceholder: (placeholder) => {
                return placeholder.startsWith('0') ? placeholder.slice(1).trim() : placeholder;
            }
        });

        const wrapper = input.closest('.iti');
        if (wrapper) wrapper.style.width = '100%';

        // Restore a previously entered number when the user comes back via
        // "Edit details" so the phone field isn't wiped.
        if (this.localPhone) {
            try {
                this.iti.setNumber('+' + this.countryCode + this.localPhone);
            } catch (e) {
                input.value = this.localPhone;
            }
        }

        input.addEventListener('countrychange', () => {
            const p = this._readPhone();
            if (p && p.localPhone) {
                this.phoneError = this._validatePhoneNumber(p.countryCode, p.localPhone);
            } else {
                this.phoneError = '';
            }
        });

        this.itiInitialized = true;
    }

    _destroyIti() {
        if (this.iti) {
            try { this.iti.destroy(); } catch (e) { /* ignore */ }
            this.iti = null;
            this.itiInitialized = false;
        }
    }

    _readPhone() {
        const input = this.template.querySelector('[data-id="phone"]');
        if (!input) return null;
        if (this.iti) {
            const countryData = this.iti.getSelectedCountryData();
            const countryCode = (countryData && countryData.dialCode) ? countryData.dialCode : '91';
            const localPhone = input.value.replace(/\D/g, '');
            return { countryCode, localPhone };
        }
        return { countryCode: '91', localPhone: input.value.replace(/\D/g, '') };
    }

    _validatePhoneNumber(countryCode, localPhone) {
        if (!localPhone) return '';
        const digitsOnly = String(localPhone).replace(/\D/g, '');
        if (!digitsOnly) return '';

        const cc = String(countryCode || '91').replace(/\D/g, '');
        const dialKey = '+' + cc;
        const rule = this.PHONE_LENGTH_BY_COUNTRY_CODE[dialKey];

        // The dial code is shown separately (separateDialCode), so the input
        // normally holds only the national number. Strip a leading dial code
        // ONLY when the number is not already a valid length as typed: a valid
        // national number can legitimately start with the same digits as the
        // dial code (e.g. Indian mobiles beginning 91…).
        let cleanDigits = digitsOnly;
        if (cleanDigits.startsWith(cc) && cleanDigits.length > cc.length) {
            const validAsTyped = rule
                ? (cleanDigits.length >= rule.min && cleanDigits.length <= rule.max)
                : false;
            if (!validAsTyped) {
                cleanDigits = cleanDigits.substring(cc.length);   // NB: .length is a property, not a function
            }
        }

        if (rule) {
            if (cleanDigits.length < rule.min || cleanDigits.length > rule.max) {
                const expected = rule.min === rule.max
                    ? `${rule.min} digits`
                    : `${rule.min}–${rule.max} digits`;
                return `Enter a valid phone number for the selected country (expected ${expected}, e.g. ${dialKey} ${rule.example}).`;
            }
            return '';
        }

        const itiValid = (this.iti && typeof this.iti.isValidNumber === 'function')
            ? this.iti.isValidNumber()
            : cleanDigits.length >= 7;
        if (!itiValid || cleanDigits.length < 6) {
            return 'Enter a valid phone number for the selected country.';
        }
        return '';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Input handlers
    // ─────────────────────────────────────────────────────────────────────────

    // Name rules (Unicode-aware, so José, Nişantaşı and Tamil/Hindi names work).
    //   • \p{L}  letters in any script
    //   • \p{M}  combining marks. REQUIRED for Indic scripts (Tamil, Hindi, …),
    //            where vowel signs are marks, not letters; also covers accents
    //            typed in decomposed form.
    //   • space, hyphen, straight apostrophe (') and curly apostrophe (’,
    //            which mobile keyboards insert automatically)
    // Digits are NOT allowed. Instead of silently deleting them, we leave the
    // value as typed and show an inline message, so the user can fix it
    // (and pasted text is never altered behind their back).
    NAME_VALID = /^[\p{L}\p{M} '\u2019-]+$/u;
    NAME_HAS_LETTER = /\p{L}/u;
    NAME_HAS_DIGIT = /\p{Nd}/u;
    // Downstream limit (U07: Submitter Name is max 30). Confirm with QB and
    // keep in sync with WFGrantsSignUpController.NAME_MAX_LENGTH.
    NAME_MAX_LENGTH = 30;

    // Returns '' when valid, otherwise a user-facing message. Empty values are
    // not flagged here; "required" is enforced on Continue.
    _nameError(label, rawValue) {
        const value = (rawValue || '').trim();
        if (!value) return '';
        if (value.length > this.NAME_MAX_LENGTH) {
            return `${label} can be at most ${this.NAME_MAX_LENGTH} characters.`;
        }
        if (this.NAME_HAS_DIGIT.test(value)) {
            return `${label} can't contain numbers.`;
        }
        if (!this.NAME_VALID.test(value) || !this.NAME_HAS_LETTER.test(value)) {
            return `${label} can contain only letters, spaces, hyphens (-) and apostrophes (').`;
        }
        return '';
    }

    handleTextInput(event) {
        const field = event.target.dataset.field;
        let value = event.target.value;

        if (field === 'email') {
            value = value.trim();
        }

        this[field] = value;

        // Live, non-destructive name validation: nothing is removed from what
        // the user typed; the inline message appears and clears as they edit.
        if (field === 'firstName') this.firstNameError = this._nameError('First name', value);
        if (field === 'lastName') this.lastNameError = this._nameError('Last name', value);

        // Clear the inline error for this field while the user is correcting it
        if (field === 'email') this.emailError = '';
        if (field === 'password') this.passwordError = '';
        if (field === 'organizationName') this.orgNameError = '';

        this.clearError();
    }

    handlePhoneInput(event) {
        // Phone must be numeric — strip any letters/symbols the user types or pastes
        const input = event && event.target;
        if (input) {
            const cleaned = input.value.replace(/[^\d\s]/g, '');
            if (cleaned !== input.value) {
                input.value = cleaned;
            }
        }
        this.phoneError = '';   // clear inline error while the user is editing
        this.clearError();
    }

    // Validate the phone number when the field loses focus (onblur is the usual
    // pattern — validate once the user finishes entering, not on every keystroke).
    handlePhoneBlur() {
        const phone = this._readPhone();
        if (!phone || !phone.localPhone) {
            this.phoneError = '';
            return;
        }
        this.phoneError = this._validatePhoneNumber(phone.countryCode, phone.localPhone);
    }

    // Validate email once the user leaves the field (empty is caught on Continue)
    handleEmailBlur() {
        const value = (this.email || '').trim();
        if (!value) { this.emailError = ''; return; }
        this.emailError = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            ? ''
            : 'Enter a valid email address.';
    }

    // Letters (any language), marks, digits, space and . , & ' ( ) / -
    // Emojis, @, $, # and other symbols are NOT in this set, so they are rejected.
    ORG_ALLOWED = /^[\p{L}\p{M}\p{N} .,&'()\/-]+$/u;
    ORG_BLOCKED_SYMBOLS = /[@$#]/;
    ORG_EMOJI = /\p{Extended_Pictographic}/u;
    ORG_FAKE_NAMES = ['test', 'testing', 'demo', 'sample', 'asdf', 'qwerty', 'abc', 'xyz',
        'na', 'n/a', 'none', 'null', 'nil', 'nothing', 'unknown', 'dummy', 'fake'];

    _validateOrgName(raw) {
        const value = (raw || '').trim().replace(/\s+/g, ' ');
        if (!value) return 'Enter your organization name.';
        if (value.length < 2 || value.length > 80) {
            return 'Organization name must be between 2 and 80 characters.';
        }
        if (this.ORG_BLOCKED_SYMBOLS.test(value) || this.ORG_EMOJI.test(value)) {
            return 'Organization name cannot contain @, $, # or emojis.';
        }
        if (!this.ORG_ALLOWED.test(value)) {
            return "Use only letters, numbers, spaces and . , & ' ( ) / - in the organization name.";
        }
        if (!/\p{L}.*\p{L}/u.test(value)) {
            return 'Enter a valid organization name (it must contain letters).';
        }
        if (/(.)\1{3,}/u.test(value) || this.ORG_FAKE_NAMES.includes(value.toLowerCase())) {
            return 'Enter your real organization name.';
        }
        return '';
    }

    handleOrgNameBlur() {
        this.organizationName = (this.organizationName || '').trim().replace(/\s+/g, ' ');
        this.orgNameError = this.organizationName
            ? this._validateOrgName(this.organizationName) : '';
    }

    // Validate password rules on blur (empty is caught on Continue)
    handlePasswordBlur() {
        const value = this.password || '';
        if (!value) { this.passwordError = ''; return; }
        this.passwordError = (value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value))
            ? ''
            : 'Password must be at least 8 characters, with at least one letter and one number.';
    }

    // ── Live password-strength meter (updates as the user types) ─────────────
    get passwordStrength() {
        const pw = this.password || '';
        if (!pw) return { show: false, segments: [] };

        // Until the password meets the real minimum (8+ chars, a letter AND a
        // number) it's always Weak — a short but "complex" value shouldn't look
        // reassuring. Beyond the minimum, extra complexity raises the rating.
        const meetsBase = pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);

        let level, label, mod;
        if (!meetsBase) {
            level = 1; label = 'Weak'; mod = 'weak';
        } else {
            let bonus = 0;
            if (pw.length >= 12) bonus++;   // longer
            if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) bonus++;   // mixed case
            if (/[^A-Za-z0-9]/.test(pw)) bonus++;   // a symbol

            if (bonus === 0) { level = 2; label = 'Fair'; mod = 'fair'; }
            else if (bonus === 1) { level = 3; label = 'Good'; mod = 'good'; }
            else { level = 4; label = 'Strong'; mod = 'strong'; }
        }

        const segments = [1, 2, 3, 4].map(i => ({
            key: i,
            class: i <= level ? `strength-seg strength-seg--${mod}` : 'strength-seg'
        }));

        return {
            show: true,
            label,
            labelClass: `strength-label strength-label--${mod}`,
            segments
        };
    }

    // ── Live "passwords match" indicator (updates as the user types) ──────────
    // Only shown once the user has started typing the confirmation.
    get showPasswordMatch() {
        return (this.confirmPassword || '').length > 0;
    }
    get passwordsMatch() {
        return (this.confirmPassword || '').length > 0
            && this.confirmPassword === this.password;
    }
    get matchHintClass() {
        return this.passwordsMatch
            ? 'match-hint match-hint--ok'
            : 'match-hint match-hint--bad';
    }
    get matchHintText() {
        return this.passwordsMatch ? 'Passwords match' : "Passwords don't match";
    }

    handleTermsChange(event) {
        this.acceptedTerms = event.target.checked;
        this.clearError();
    }

    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }

    // Confirm password has its OWN toggle so it stays masked until the user
    // clicks its own Show icon (independent from the Create password field).
    toggleConfirmPasswordVisibility() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Computed getters
    // ─────────────────────────────────────────────────────────────────────────
    get detailsPage() { return this.step === 'details'; }
    get phoneOtpPage() { return this.step === 'phoneOtp'; }

    get step1Class() { return this.step === 'details' ? 'step-dot step-current' : 'step-dot step-done'; }
    // Step 2 label now reflects EMAIL verification (SMS label kept below, commented, for later)
    // get step2Class() { return this.step === 'phoneOtp' ? 'step-dot step-current' : 'step-dot'; } // 'Verify phone' (SMS)
    get step2Class() { return this.step === 'phoneOtp' ? 'step-dot step-current' : 'step-dot'; }

    get passwordInputType() { return this.showPassword ? 'text' : 'password'; }
    get confirmPasswordInputType() { return this.showConfirmPassword ? 'text' : 'password'; }

    get otpDigits() {
        const val = (this.otp || '').padEnd(6, ' ');
        return [0, 1, 2, 3, 4, 5].map(i => ({ index: i, value: val[i].trim() }));
    }

    get disableVerifyButton() {
        return this.otp.replace(/\s/g, '').length !== 6 || this.isVerifying;
    }

    // ── SMS verification used to mask the phone number here (disabled for now) ──
    // get maskedPhone() {
    //     const d = this.localPhone;
    //     return `+${this.countryCode} ${'*'.repeat(Math.max(d.length-4,4))}${d.slice(-4)}`;
    // }

    // ── EMAIL verification (active for now): mask the email address instead ──
    get maskedEmail() {
        const parts = (this.email || '').split('@');
        if (parts.length !== 2) return this.email;
        const [user, domain] = parts;
        const visible = user.slice(0, Math.min(2, user.length));
        return `${visible}${'*'.repeat(Math.max(user.length - visible.length, 3))}@${domain}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 → Continue: duplicate check + initSelfRegistration (Email OTP)
    // ─────────────────────────────────────────────────────────────────────────
    handleContinue() {
        this.clearError();

        if (!this.firstName.trim()) { this.showError('Enter your first name.'); return; }
        if (!this.lastName.trim()) { this.showError('Enter your last name.'); return; }

        this.firstNameError = this._nameError('First name', this.firstName);
        if (this.firstNameError) { this.showError(this.firstNameError); return; }
        this.lastNameError = this._nameError('Last name', this.lastName);
        if (this.lastNameError) { this.showError(this.lastNameError); return; }

        const orgErr = this._validateOrgName(this.organizationName);
        if (orgErr) {
            this.orgNameError = orgErr;
            this.showError(orgErr);
            return;
        }
        this.orgNameError = '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            this.emailError = 'Enter a valid email address.';
            this.showError('Enter a valid email address.');
            return;
        }
        this.emailError = '';

        const phone = this._readPhone();
        if (!phone || !phone.localPhone) {
            this.phoneError = 'Enter a valid phone number.';
            this.showError('Enter a valid phone number.');
            return;
        }
        const phoneValidationErr = this._validatePhoneNumber(phone.countryCode, phone.localPhone);
        if (phoneValidationErr) {
            this.phoneError = phoneValidationErr;
            this.showError(phoneValidationErr);
            return;
        }
        this.phoneError = '';

        if (this.password.length < 8
            || !/[A-Za-z]/.test(this.password)
            || !/\d/.test(this.password)) {
            this.passwordError = 'Password must be at least 8 characters, with at least one letter and one number.';
            this.showError('Password must be at least 8 characters, with at least one letter and one number.');
            return;
        }
        this.passwordError = '';
        if (this.password !== this.confirmPassword) {
            this.showError('Passwords do not match.');
            return;
        }
        if (!this.acceptedTerms) {
            this.showError('You must read and accept the Terms of Use and Privacy Policy to continue.');
            return;
        }

        this.localPhone = phone.localPhone;
        this.countryCode = phone.countryCode;

        this._sendOtp(true);
    }

    handleResendOtp() {
        if (!this.canResend) return;
        this._sendOtp(false);
    }

    _sendOtp(moveToOtpStep) {
        this.clearError();
        this.isSending = true;

        initiateSignUp({
            firstName: this.firstName.trim(),
            lastName: this.lastName.trim(),
            email: this.email,
            phone: this.localPhone,
            countryCode: this.countryCode,
            organizationName: this.organizationName.trim(),
            acceptedTerms: this.acceptedTerms,
            language: this.selectedLanguage,
            timeZone: this._browserTimeZone()
        })
            .then(result => {
                if (result.status === 'otp_sent') {
                    this.token = result.token;
                    this.otp = '';
                    if (moveToOtpStep) {
                        this._destroyIti();
                        this.step = 'phoneOtp';
                    } else {
                        // Resend path — confirm to the user the code was resent
                        this.showSuccess('The verification code has been resent to your email.');
                    }
                    this._startTimer();
                } else {
                    this.showError(result.message || 'Something went wrong. Please try again.');
                }
            })
            .catch(err => this.showError(this._extractError(err)))
            .finally(() => { this.isSending = false; });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 → verifySelfRegistration: create user + store password
    // (Email OTP is the active verification channel for now)
    // ─────────────────────────────────────────────────────────────────────────
    handleCompleteSignUp() {
        this.clearError();
        this.isVerifying = true;

        completeSignUp({
            token: this.token,
            otp: this.otp.replace(/\s/g, ''),
            email: this.email,
            password: this.password,
            startUrl: this.startUrl
        })
            .then(result => {
                if (result.status === 'success') {
                    window.location.href = result.redirectUrl;
                } else {
                    // showError() maps technical wording (e.g. "Token not valid",
                    // "Token not exists") onto friendly text via _friendlyError().
                    this.showError(result.message || 'Sign up failed.');
                    this._handleVerifyFailure(result.message);
                }
            })
            .catch(err => {
                const raw = this._extractError(err);
                this.showError(raw);
                this._handleVerifyFailure(raw);
            })
            .finally(() => { this.isVerifying = false; });
    }

    // When too many wrong attempts kill the verification token, Salesforce
    // rejects further tries ("Too many attempts" / "Token not exists"). The
    // only way forward is a fresh code, so enable Resend immediately and clear
    // the stale digits instead of leaving the user stuck on the countdown.
    _handleVerifyFailure(rawMessage) {
        if (!this._isDeadToken(rawMessage)) return;
        this._clearTimer();
        this.resendCountdown = 0;
        this.canResend = true;
        this.otp = '';
        this.template.querySelectorAll('.otp-box').forEach(box => { box.value = ''; });
    }

    _isDeadToken(rawMessage) {
        const msg = (rawMessage || '').toString().toLowerCase();
        return msg.includes('too many') || msg.includes('limit')
            || msg.includes('expired') || msg.includes('not exist')
            || msg.includes('no longer');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Back to details
    // ─────────────────────────────────────────────────────────────────────────
    backToDetails() {
        this._clearTimer();
        this.step = 'details';
        this.token = '';
        this.otp = '';
        this.resendCountdown = 0;
        this.canResend = false;
        this.itiInitialized = false;
        this.clearError();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OTP box handlers
    // ─────────────────────────────────────────────────────────────────────────
    handleOtpDigitInput(event) {
        const index = Number(event.target.dataset.index);
        const digit = (event.target.value || '').replace(/\D/g, '').slice(-1);
        const chars = (this.otp || '').padEnd(6, ' ').split('');
        chars[index] = digit || ' ';
        this.otp = chars.join('');
        event.target.value = digit;
        if (digit && index < 5) {
            const next = this.template.querySelector(`.otp-box[data-index="${index + 1}"]`);
            if (next) next.focus();
        }
    }

    handleOtpDigitKeydown(event) {
        const index = Number(event.target.dataset.index);
        if (event.key === 'Backspace' && !event.target.value && index > 0) {
            const prev = this.template.querySelector(`.otp-box[data-index="${index - 1}"]`);
            if (prev) { prev.focus(); prev.value = ''; }
            const chars = (this.otp || '').padEnd(6, ' ').split('');
            chars[index - 1] = ' ';
            this.otp = chars.join('');
        }
    }

    handleOtpPaste(event) {
        event.preventDefault();
        const pasted = (event.clipboardData || window.clipboardData)
            .getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        this.otp = pasted.padEnd(6, ' ');
        const boxes = this.template.querySelectorAll('.otp-box');
        boxes.forEach((box, i) => { box.value = pasted[i] || ''; });
        const lastFilled = Math.min(pasted.length, 5);
        if (boxes[lastFilled]) boxes[lastFilled].focus();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utilities
    // ─────────────────────────────────────────────────────────────────────────
    showError(msg) {
        this.errorMessage = this._friendlyError(msg);
        this.showErrorMessage = true;
        this.showSuccessMessage = false;
    }

    clearError() {
        this.errorMessage = '';
        this.showErrorMessage = false;
        this.showSuccessMessage = false;
    }

    showSuccess(msg) {
        this.successMessage = msg;
        this.showSuccessMessage = true;
        this.showErrorMessage = false;
    }

    _extractError(err) {
        return (err && err.body && err.body.message)
            ? err.body.message
            : (err && err.message) || 'An unexpected error occurred.';
    }

    // The registrant's IANA time zone (e.g. "Asia/Kolkata", "America/New_York").
    // Validated server-side; falls back to the org default if blank/unknown.
    _browserTimeZone() {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (e) {
            return '';
        }
    }

    // Maps raw server/technical messages onto clear, user-friendly text so
    // internal wording (e.g. "Unable to generate security token",
    // "Token not valid") is never shown to end users.
    _friendlyError(raw) {
        const msg = (raw || '').toString().toLowerCase();

        if (msg.includes('security token') ||
            (msg.includes('generate') && msg.includes('token'))) {
            return 'Too many attempts. Please wait a moment before requesting another OTP.';
        }
        if (msg.includes('too many') || msg.includes('limit')) {
            return 'Too many incorrect attempts. Please tap Resend to get a new code.';
        }
        if (msg.includes('expired') || msg.includes('not exist') ||
            msg.includes('no longer')) {
            return 'This code is no longer valid. Please tap Resend to get a new code.';
        }
        if (msg.includes('token not valid') || msg.includes('not valid') ||
            msg.includes('invalid')) {
            return 'Invalid OTP. Please try again.';
        }
        return raw || 'Something went wrong. Please try again.';
    }

    get currentYear() {
        return new Date().getFullYear();
    }
}