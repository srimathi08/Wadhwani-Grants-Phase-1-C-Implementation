/**
 * WFGrantsSignUpController  (Person Accounts version)
 * ------------------------------------------------------------------
 * Self-registration for the WFGrants Experience Cloud site using ONLY the
 * standard System.UserManagement APIs — no custom objects.
 *
 * Flow (standard Salesforce self-registration pattern):
 *   1. initiateSignUp()  – duplicate check, build the User, then
 *                          System.UserManagement.initSelfRegistration(EMAIL, user)
 *                          → Salesforce sends the Email OTP and returns a token
 *   2. completeSignUp()  – System.UserManagement.verifySelfRegistration(...)
 *                          → creates the user with HasUserVerifiedEmail = true
 *                          and logs them in. The chosen password is stored with
 *                          System.setPassword.
 *
 * PERSON ACCOUNTS: this org has Person Accounts enabled. Unlike business
 * accounts, the self-registration API will NOT auto-create a person
 * account for you — it requires a real ContactId up front, or you get
 * "Cannot create a portal user without contact". So initiateSignUp
 * creates the Person Account itself and passes its PersonContactId.
 *
 *   *** DO NOT insert a standalone Contact — person accounts don't       ***
 *   *** support one; you must insert an Account (person-account record   ***
 *   *** type) and read back its PersonContactId.                        ***
 *
 *   The Person Account is inserted by this guest-context code, so its
 *   OWNER defaults to the guest user. Guest users can never have a Role,
 *   so we explicitly reassign OwnerId to the site admin (who has a Role)
 *   right after insert — otherwise you're back to:
 *   "Failed to create user: portal account owner must have a role"
 *
 * NOTE: Verification method is EMAIL for now. SMS verification code is kept
 * below, commented out, so it can be switched back on later.
 *
 * Org prerequisites:
 *   - Person Accounts enabled; Login & Registration Account field EMPTY
 *   - Self-registration enabled on the site with the 'WCF Site User' profile
 *     (person-account-compatible license, e.g. Customer Community / Ext. Identity)
 *   - Email identity verification enabled for the org
 *   - Guest user profile: Apex class access to this class
 */
public without sharing class WFGrantsSignUpController {

    // Profile assigned to self-registered site users. Production uses
    // 'WG Partners'; the sandbox still carries the older 'WCF Site User'
    // profile. Both names are accepted so the same code runs in either org.
    private static final Set<String> PROFILE_NAMES =
        new Set<String>{ 'WG Partners', 'WCF Site User' };

    // Base username of the role-bearing WCF site admin (wadhwani@admin.com).
    // Newly-created Person Accounts are reassigned to this owner so "portal
    // account owner must have a role" doesn't fire. Matched with LIKE so the
    // same code works in production (wadhwani@admin.com) and in sandboxes,
    // where Salesforce appends a sandbox suffix (e.g. wadhwani@admin.com.wfdev).
    private static final String PORTAL_ACCOUNT_OWNER_USERNAME = 'wadhwani@admin.com';

    // Allowed values for the Account picklist Preferred_Laungage__c. The
    // language code comes from the ?language= URL param; anything not in this
    // set (or blank) falls back to DEFAULT_LANGUAGE so a restricted-picklist
    // write can never fail.
    private static final Set<String> ALLOWED_LANGUAGES =
        new Set<String>{ 'en_US', 'pt_BR', 'es' };
    private static final String DEFAULT_LANGUAGE = 'en_US';

    // ─────────────────────────────────────────────────────────────
    // STEP 1 – duplicate check + start standard self-registration
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled
    public static Map<String, String> initiateSignUp(
            String firstName, String lastName, String email,
            String phone, String countryCode, String organizationName,
            Boolean acceptedTerms, String language, String timeZone) {

        Map<String, String> result = new Map<String, String>();
        try {
            email = normalizeEmail(email);

            if (String.isBlank(firstName) || String.isBlank(lastName)
                    || String.isBlank(email) || String.isBlank(phone)) {
                return err(result, 'All fields are required.');
            }
            if (!Pattern.matches('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', email)) {
                return err(result, 'Enter a valid email address.');
            }

            // Terms of Use + Privacy Policy consent is mandatory (compendium §12).
            // Enforced server-side too so signup can't complete unchecked even if
            // the client-side guard is bypassed.
            if (acceptedTerms != true) {
                return err(result,
                    'You must read and accept the Terms of Use and Privacy Policy to continue.');
            }

            String formattedPhone = formatPhone(countryCode, phone);

            // ── Duplicate check: does an active user already exist? ──
            List<User> existing = [
                SELECT Id FROM User
                WHERE (Email = :email OR Username = :email
                       OR MobilePhone = :formattedPhone)
                  AND IsActive = true
                WITH SYSTEM_MODE LIMIT 1
            ];
            if (!existing.isEmpty()) {
                result.put('status', 'exists');
                result.put('message',
                    'An account already exists for this email or phone number. Please log in instead.');
                return result;
            }

            Profile prf = [
                SELECT Id FROM Profile
                WHERE Name IN :PROFILE_NAMES
                WITH SYSTEM_MODE LIMIT 1
            ];

            // Person Accounts require a real ContactId up front — create one
            // and grab its auto-generated PersonContactId.
            Id personContactId = createPersonAccount(
                firstName, lastName, email, formattedPhone, organizationName,
                acceptedTerms, language);

            User u = new User(
                Username          = email,
                Email             = email,
                FirstName         = firstName,
                LastName          = lastName,
                MobilePhone       = formattedPhone,
                CompanyName       = String.isNotBlank(organizationName) ? organizationName.left(80) : null,
                ProfileId         = prf.Id,
                ContactId         = personContactId,
                Alias             = buildAlias(firstName, lastName),
                CommunityNickname = 'u' + String.valueOf(System.now().getTime() / 1000),
                EmailEncodingKey  = 'UTF-8',
                TimeZoneSidKey    = resolveTimeZone(timeZone),
                LocaleSidKey      = 'en_IN',
                LanguageLocaleKey = 'en_US'
            );

            // ── SMS verification (currently disabled — kept for later) ──
            // String token = System.UserManagement.initSelfRegistration(
            //     Auth.VerificationMethod.SMS, u);

            // ── EMAIL verification (active for now) ──
            String token = System.UserManagement.initSelfRegistration(
                Auth.VerificationMethod.EMAIL, u);

            result.put('status', 'otp_sent');
            result.put('token', token);

        } catch (Exception e) {
            System.debug('TYPE=' + e.getTypeName());
            System.debug('MESSAGE=' + e.getMessage());
            System.debug('STACK=' + e.getStackTraceString());
            return err(result, e.getMessage());
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 2 – verify Email OTP, create user, store password
    // ─────────────────────────────────────────────────────────────
    @AuraEnabled
    public static Map<String, String> completeSignUp(
            String token, String otp, String email,
            String password, String startUrl) {

        Map<String, String> result = new Map<String, String>();
        try {
            email = normalizeEmail(email);

            if (String.isBlank(token) || String.isBlank(otp)) {
                return err(result, 'OTP and token are required.');
            }
            String pwdError = validatePassword(password);
            if (pwdError != null) return err(result, pwdError);

            String landing = String.isBlank(startUrl) ? '/' : startUrl;

            // ── SMS verification (currently disabled — kept for later) ──
            // Auth.VerificationResult authResponse =
            //     System.UserManagement.verifySelfRegistration(
            //         Auth.VerificationMethod.SMS, token, otp, landing);

            // ── EMAIL verification (active for now) ──
            Auth.VerificationResult authResponse =
                System.UserManagement.verifySelfRegistration(
                    Auth.VerificationMethod.EMAIL, token, otp, landing);

            if (authResponse == null || !authResponse.success) {
                return err(result,
                    (authResponse != null && String.isNotBlank(authResponse.message))
                        ? authResponse.message
                        : 'Verification failed. Please try again.');
            }

            // Store the chosen password. Email is already verified via the
            // OTP step above, so no separate confirmation email is needed.
            List<User> created = [
                SELECT Id FROM User
                WHERE Username = :email
                WITH SYSTEM_MODE LIMIT 1
            ];
            if (!created.isEmpty()) {
                System.setPassword(created[0].Id, password);

                // ── SMS flow used to send a separate email confirmation link
                // here. Not needed while EMAIL is the verified channel.
                // System.UserManagement.sendAsyncEmailConfirmation(
                //     created[0].Id, null, null, landing);
            }

            result.put('status', 'success');
            result.put('redirectUrl',
                authResponse.redirect != null ? authResponse.redirect.getUrl() : landing);

        } catch (Exception e) {
            System.debug('TYPE=' + e.getTypeName());
            System.debug('MESSAGE=' + e.getMessage());
            System.debug('STACK=' + e.getStackTraceString());
            err(result, e.getMessage());
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────

    // Creates a Person Account for the new registrant and returns its
    // PersonContactId — required by initSelfRegistration in a person-account org.
    private static Id createPersonAccount(String firstName, String lastName,
            String email, String phone, String organizationName,
            Boolean acceptedTerms, String language) {

        // Idempotent: a resend / retry re-enters initiateSignUp before the user
        // is verified. Reuse the Person Account created on the first attempt
        // instead of inserting a duplicate every time (which also prevents a
        // duplicate/matching-rule exception from silently aborting the resend).
        List<Account> existingPa = [
            SELECT PersonContactId FROM Account
            WHERE PersonEmail = :email AND IsPersonAccount = true
            WITH SYSTEM_MODE
            ORDER BY CreatedDate DESC LIMIT 1
        ];
        if (!existingPa.isEmpty() && existingPa[0].PersonContactId != null) {
            return existingPa[0].PersonContactId;
        }

        Id personRtId = null;
        for (RecordType rt : [
                SELECT Id FROM RecordType
                WHERE SObjectType = 'Account' AND IsPersonType = true
                WITH SYSTEM_MODE
                ORDER BY DeveloperName LIMIT 1]) {
            personRtId = rt.Id;
        }

        // Owner assigned directly on insert (rather than a separate update)
        // avoids a moment where the guest user owns the record.
        String ownerUsernamePattern = PORTAL_ACCOUNT_OWNER_USERNAME + '%';
        User owner = [
            SELECT Id, UserRoleId FROM User
            WHERE Username LIKE :ownerUsernamePattern
            WITH SYSTEM_MODE
            ORDER BY CreatedDate LIMIT 1
        ];
        if (owner.UserRoleId == null) {
            // Fail loudly here rather than downstream inside verifySelfRegistration —
            // this is the exact condition that causes
            // "portal account owner must have a role".
            throw new AuraHandledException(
                'Registration is temporarily unavailable. Please contact support.');
        }

        Account pa = new Account(
            FirstName                    = firstName,
            LastName                     = lastName,
            PersonEmail                  = email,
            PersonMobilePhone            = phone,
            WCF_Organizational_Name__c   = organizationName,
            Concern__c                   = (acceptedTerms == true),   // Terms/Privacy consent (compendium §12)
            Preferred_Laungage__c        = resolveLanguage(language), // en_US | pt_BR | es (default en_US)
            OwnerId                      = owner.Id
        );
        if (personRtId != null) {
            pa.RecordTypeId = personRtId;
        }
        insert pa;

        pa = [
            SELECT PersonContactId FROM Account
            WHERE Id = :pa.Id
            WITH SYSTEM_MODE LIMIT 1
        ];
        return pa.PersonContactId;
    }

    private static String formatPhone(String countryCode, String phone) {
        String cc  = String.isBlank(countryCode) ? '91' : countryCode.replaceAll('\\D', '');
        String raw = phone == null ? '' : phone.replaceAll('\\D', '');
        if (raw.length() < 6) {
            throw new AuraHandledException('Enter a valid phone number.');
        }
        if (raw.startsWith(cc) && (raw.length() - cc.length()) >= 6) {
            raw = raw.substring(cc.length());
        }
        return System.UserManagement.formatPhoneNumber(cc, raw);
    }

    private static String validatePassword(String password) {
        if (String.isBlank(password) || password.length() < 8) {
            return 'Password must be at least 8 characters.';
        }
        if (!Pattern.matches('.*[A-Za-z].*', password)
                || !Pattern.matches('.*\\d.*', password)) {
            return 'Password must contain at least one letter and one number.';
        }
        return null;
    }

    private static String buildAlias(String firstName, String lastName) {
        String first = String.isBlank(firstName) ? '' : firstName.left(1);
        String last  = String.isBlank(lastName)  ? 'user' : lastName;
        return (first + last).replaceAll('[^a-zA-Z0-9]', '').left(8);
    }

    private static String normalizeEmail(String email) {
        return email == null ? '' : email.trim().toLowerCase();
    }

    // Maps the ?language= URL param onto an allowed Preferred_Laungage__c
    // picklist value, defaulting to en_US when blank or unrecognised.
    private static String resolveLanguage(String language) {
        if (String.isBlank(language)) return DEFAULT_LANGUAGE;
        String lang = language.trim();
        return ALLOWED_LANGUAGES.contains(lang) ? lang : DEFAULT_LANGUAGE;
    }

    // Maps the registrant's browser IANA time zone onto a valid User
    // TimeZoneSidKey, defaulting to the org's India default when it is blank
    // or not a recognised Salesforce time zone.
    private static final String DEFAULT_TIME_ZONE = 'Asia/Kolkata';
    private static Set<String> validTimeZones;

    private static String resolveTimeZone(String timeZone) {
        if (String.isBlank(timeZone)) return DEFAULT_TIME_ZONE;
        if (validTimeZones == null) {
            validTimeZones = new Set<String>();
            for (Schema.PicklistEntry e :
                    User.TimeZoneSidKey.getDescribe().getPicklistValues()) {
                validTimeZones.add(e.getValue());
            }
        }
        return validTimeZones.contains(timeZone.trim()) ? timeZone.trim() : DEFAULT_TIME_ZONE;
    }

    private static Map<String, String> err(Map<String, String> result, String message) {
        result.put('status', 'error');
        result.put('message', message);
        return result;
    }
}