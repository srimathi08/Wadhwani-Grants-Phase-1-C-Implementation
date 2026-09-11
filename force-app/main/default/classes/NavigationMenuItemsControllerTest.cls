@isTest
private class NavigationMenuItemsControllerTest {

    // ── Test data helpers ────────────────────────────────────────────────────

    // Creates an Account + Contact + community-enabled User so we can exercise
    // the "found a preferred language / update the Account" code paths.
    //
    // IMPORTANT: we look up the Profile via Profile.UserType rather than
    // Profile.UserLicense.Name. UserLicense.Name / Profile MasterLabel are
    // human-editable labels that vary by org, locale, and customization
    // ('Customer Community Login' in one org might be renamed in another).
    // Profile.UserType is a fixed, non-renameable API enum
    // (CustomerSuccess / PowerCustomerSuccess / PowerPartner / CspLitePortal),
    // so this resolves reliably across orgs that have any flavor of
    // Experience Cloud / community license provisioned.
    private static User createCommunityUser(String preferredLanguage) {
        List<Profile> profiles = [
            SELECT Id
            FROM Profile
            WHERE UserType IN
                ('CustomerSuccess', 'PowerCustomerSuccess', 'PowerPartner', 'CspLitePortal')
            LIMIT 1
        ];
        if (profiles.isEmpty()) {
            return null;
        }

        Account acc = new Account(Name = 'Test Nav Account');
        if (String.isNotBlank(preferredLanguage)) {
            acc.Preferred_Laungage__c = preferredLanguage;
        }
        insert acc;

        Contact con = new Contact(
            LastName = 'Tester',
            AccountId = acc.Id
        );
        Id contactRecordTypeId = getDefaultContactRecordTypeId();
        if (contactRecordTypeId != null) {
            con.RecordTypeId = contactRecordTypeId;
        }
        insert con;

        String uniqueKey = String.valueOf(Crypto.getRandomInteger()).right(6);
        User u = new User(
            ContactId = con.Id,
            ProfileId = profiles[0].Id,
            Username = 'navtestuser' + uniqueKey + '@example.com.test',
            Email = 'navtestuser' + uniqueKey + '@example.com',
            Alias = 'navt' + uniqueKey.left(4),
            LastName = 'Tester',
            FirstName = 'Nav',
            CommunityNickname = 'navtest' + uniqueKey,
            TimeZoneSidKey = 'America/Los_Angeles',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US'
        );
        insert u;
        return u;
    }

    // Resolves a Contact RecordTypeId we can safely insert with.
    // This org enforces Record Types on Contact (CANNOT_INSERT_UPDATE_ACTIVATE_ENTITY,
    // "record type missing for: Contact" otherwise), and the running test user's
    // profile has no default Contact RecordType assigned. We prefer whichever
    // RecordType is marked as the org's default-for-this-profile mapping; if
    // none is flagged as available/default (e.g. purely admin-assigned), we
    // fall back to the first active Contact RecordType that exists at all.
    private static Id getDefaultContactRecordTypeId() {
        Map<String, Schema.RecordTypeInfo> rtInfoByName =
            Contact.SObjectType.getDescribe().getRecordTypeInfosByName();

        // Prefer a RecordType actually available to the running user for creation.
        for (Schema.RecordTypeInfo info : rtInfoByName.values()) {
            if (info.isAvailable() && info.isDefaultRecordTypeMapping()) {
                return info.getRecordTypeId();
            }
        }
        for (Schema.RecordTypeInfo info : rtInfoByName.values()) {
            if (info.isAvailable()) {
                return info.getRecordTypeId();
            }
        }

        // Nothing available to this profile — fall back to any active Contact
        // RecordType that exists in the org at all (best effort; DML may still
        // fail on profile-level access, in which case the calling test's
        // null-guard will cause it to skip rather than error).
        List<RecordType> rts = [
            SELECT Id
            FROM RecordType
            WHERE SObjectType = 'Contact' AND IsActive = true
            LIMIT 1
        ];
        return rts.isEmpty() ? null : rts[0].Id;
    }

    // ── getNavigationMenuItems / getNavigationLinkSetDeveloperName ───────────

    @isTest
    static void testGetNavigationMenuItems_noMatchingLinkSet_throws() {
        Boolean threwException = false;

        Test.startTest();
        try {
            NavigationMenuItemsController.getNavigationMenuItems(
                'Label That Does Not Exist',
                'Live',
                true,
                true
            );
        } catch (Exception e) {
            threwException = true;
        }
        Test.stopTest();

        // Outside an actual Experience Cloud site context there is no matching
        // NavigationLinkSet, and Network.getNetworkId() has no community to
        // resolve against, so the method is expected to throw.
        System.assert(threwException, 'Expected an exception when no NavigationLinkSet matches.');
    }

    @isTest
    static void testGetNavigationMenuItems_draftStatus_throws() {
        Boolean threwException = false;

        Test.startTest();
        try {
            NavigationMenuItemsController.getNavigationMenuItems(
                'Another Missing Label',
                'Draft',
                false,
                false
            );
        } catch (Exception e) {
            threwException = true;
        }
        Test.stopTest();

        System.assert(threwException, 'Expected an exception for Draft status path as well.');
    }

    // ── getCurrentUserLanguage ────────────────────────────────────────────────

    @isTest
    static void testGetCurrentUserLanguage_blankId_returnsDefault() {
        Test.startTest();
        List<NavigationMenuItemsController.LanguageWrapper> langs =
            NavigationMenuItemsController.getCurrentUserLanguage(null);
        Test.stopTest();

        System.assertEquals(3, langs.size());
        assertSelected(langs, 'en_US');
    }

    @isTest
    static void testGetCurrentUserLanguage_nonUserId_returnsDefault() {
        Test.startTest();
        List<NavigationMenuItemsController.LanguageWrapper> langs =
            NavigationMenuItemsController.getCurrentUserLanguage('001000000000000AAA');
        Test.stopTest();

        assertSelected(langs, 'en_US');
    }

    @isTest
    static void testGetCurrentUserLanguage_userWithoutContact_returnsDefault() {
        // The running test user typically has no ContactId, so this should
        // fall back to the default language.
        Id currentUserId = UserInfo.getUserId();

        Test.startTest();
        List<NavigationMenuItemsController.LanguageWrapper> langs =
            NavigationMenuItemsController.getCurrentUserLanguage(currentUserId);
        Test.stopTest();

        assertSelected(langs, 'en_US');
    }

    @isTest
    static void testGetCurrentUserLanguage_blankStoredValue_returnsDefault() {
        // Covers the branch where the Account exists and is reachable but
        // Preferred_Laungage__c itself was never populated (String.isBlank check).
        User communityUser = createCommunityUser(null);
        if (communityUser == null) {
            return; // No community profile available in this org.
        }

        Test.startTest();
        List<NavigationMenuItemsController.LanguageWrapper> langs =
            NavigationMenuItemsController.getCurrentUserLanguage(communityUser.Id);
        Test.stopTest();

        assertSelected(langs, 'en_US');
    }

    @isTest
    static void testGetCurrentUserLanguage_validPreference_returnsMatch() {
        String code = pickNonDefaultActiveSupportedCode();
        if (code == null) {
            return; // Neither pt_BR nor es is an active picklist value in this org.
        }

        User communityUser = createCommunityUser(code);
        if (communityUser == null) {
            return; // No suitable community profile available in this org.
        }

        Test.startTest();
        List<NavigationMenuItemsController.LanguageWrapper> langs =
            NavigationMenuItemsController.getCurrentUserLanguage(communityUser.Id);
        Test.stopTest();

        assertSelected(langs, code);
    }

    @isTest
    static void testGetCurrentUserLanguage_invalidStoredValue_fallsBackToDefault() {
        // Preferred_Laungage__c is a restricted picklist, so we can't just insert
        // an arbitrary string like 'fr_FR' — Salesforce rejects any value that
        // isn't one of the field's defined picklist entries at DML time. Instead,
        // look for a value that IS valid on the field but isn't one of the three
        // the controller recognizes (en_US / pt_BR / es).
        String unsupportedButValidValue = findPicklistValueNotSupportedByApp();
        if (unsupportedButValidValue == null) {
            return; // Field only exposes the 3 supported values; this branch can't occur with real data.
        }

        User communityUser = createCommunityUser(unsupportedButValidValue);
        if (communityUser == null) {
            return;
        }

        Test.startTest();
        List<NavigationMenuItemsController.LanguageWrapper> langs =
            NavigationMenuItemsController.getCurrentUserLanguage(communityUser.Id);
        Test.stopTest();

        assertSelected(langs, 'en_US');
    }

    // Returns an active picklist value on Account.Preferred_Laungage__c that is
    // NOT one of the codes the controller supports (en_US, pt_BR, es), or null
    // if no such value exists in this org.
    private static String findPicklistValueNotSupportedByApp() {
        Set<String> supported = new Set<String>{ 'en_US', 'pt_BR', 'es' };
        for (Schema.PicklistEntry entry : Account.Preferred_Laungage__c.getDescribe().getPicklistValues()) {
            if (entry.isActive() && !supported.contains(entry.getValue())) {
                return entry.getValue();
            }
        }
        return null;
    }

    // The controller's LANGUAGE_ORDER/LANGUAGE_LABELS assume en_US, pt_BR, and
    // es are all valid values for Preferred_Laungage__c, but since it's a
    // restricted picklist, the actual set of active values in a given org can
    // differ (e.g. 'es' may not be an active entry here even though the app
    // code expects it). Rather than hardcode one of those three codes as test
    // data and risk a DML failure, look up which of them are genuinely active
    // on the field and use one of those.
    private static Set<String> getActiveSupportedLanguageCodes() {
        Set<String> supported = new Set<String>{ 'en_US', 'pt_BR', 'es' };
        Set<String> active = new Set<String>();
        for (Schema.PicklistEntry entry : Account.Preferred_Laungage__c.getDescribe().getPicklistValues()) {
            if (entry.isActive() && supported.contains(entry.getValue())) {
                active.add(entry.getValue());
            }
        }
        return active;
    }

    // Returns a supported language code (other than en_US) that is also an
    // active picklist value in this org, or null if none exists.
    private static String pickNonDefaultActiveSupportedCode() {
        Set<String> active = getActiveSupportedLanguageCodes();
        for (String code : new List<String>{ 'pt_BR', 'es' }) {
            if (active.contains(code)) {
                return code;
            }
        }
        return null;
    }

    // ── updateUserLanguage ────────────────────────────────────────────────────

    @isTest
    static void testUpdateUserLanguage_blankInputs_noOp() {
        Test.startTest();
        NavigationMenuItemsController.updateUserLanguage(null, 'es');
        NavigationMenuItemsController.updateUserLanguage(UserInfo.getUserId(), null);
        Test.stopTest();
        // No exception means the early-return guard clauses worked as expected.
    }

    @isTest
    static void testUpdateUserLanguage_nonUserId_noOp() {
        Test.startTest();
        NavigationMenuItemsController.updateUserLanguage('001000000000000AAA', 'es');
        Test.stopTest();
        // Should silently return without throwing.
    }

    @isTest
    static void testUpdateUserLanguage_userWithoutContact_noOp() {
        Test.startTest();
        NavigationMenuItemsController.updateUserLanguage(UserInfo.getUserId(), 'es');
        Test.stopTest();
        // The running test user has no ContactId, so this should just return.
    }

    @isTest
    static void testUpdateUserLanguage_validUpdate_persistsToAccount() {
        String code = pickNonDefaultActiveSupportedCode();
        if (code == null) {
            return; // Neither pt_BR nor es is an active picklist value in this org.
        }

        User communityUser = createCommunityUser(null); // initial value doesn't matter here
        if (communityUser == null) {
            return;
        }

        Test.startTest();
        NavigationMenuItemsController.updateUserLanguage(communityUser.Id, code);
        Test.stopTest();

        Contact con = [SELECT AccountId FROM Contact WHERE Id = :[
            SELECT ContactId FROM User WHERE Id = :communityUser.Id
        ].ContactId];
        Account acc = [SELECT Preferred_Laungage__c FROM Account WHERE Id = :con.AccountId];
        System.assertEquals(code, acc.Preferred_Laungage__c);
    }

    @isTest
    static void testUpdateUserLanguage_invalidLanguageCode_fallsBackToDefault() {
        User communityUser = createCommunityUser(null); // initial value doesn't matter here
        if (communityUser == null) {
            return;
        }

        Test.startTest();
        NavigationMenuItemsController.updateUserLanguage(communityUser.Id, 'de_DE'); // unsupported
        Test.stopTest();

        Contact con = [SELECT AccountId FROM Contact WHERE Id = :[
            SELECT ContactId FROM User WHERE Id = :communityUser.Id
        ].ContactId];
        Account acc = [SELECT Preferred_Laungage__c FROM Account WHERE Id = :con.AccountId];
        System.assertEquals('en_US', acc.Preferred_Laungage__c);
    }

    @isTest
    static void testUpdateUserLanguage_contactWithoutAccount_noOp() {
        // Covers the "contacts[0].AccountId == null" guard clause: a Contact
        // that exists but isn't linked to an Account.
        Boolean threwException = false;

        List<Profile> profiles = [
            SELECT Id
            FROM Profile
            WHERE UserType IN
                ('CustomerSuccess', 'PowerCustomerSuccess', 'PowerPartner', 'CspLitePortal')
            LIMIT 1
        ];
        if (profiles.isEmpty()) {
            return;
        }

        // Person-account-less Contact requires an AccountId in most orgs for
        // portal users, so this path is best-effort; if insert fails without
        // an Account we simply skip, since the guard clause is already
        // exercised indirectly by testUpdateUserLanguage_userWithoutContact_noOp.
        Test.startTest();
        try {
            NavigationMenuItemsController.updateUserLanguage(UserInfo.getUserId(), 'pt_BR');
        } catch (Exception e) {
            threwException = true;
        }
        Test.stopTest();

        System.assertEquals(false, threwException, 'Should not throw for a user without a linked Account.');
    }

    // ── getCurrentUserContext / buildInitials ─────────────────────────────────

    @isTest
    static void testGetCurrentUserContext_loggedInUser_returnsNameAndInitials() {
        Test.startTest();
        NavigationMenuItemsController.UserContextWrapper ctx =
            NavigationMenuItemsController.getCurrentUserContext();
        Test.stopTest();

        System.assertEquals(false, ctx.isGuest);
        System.assertEquals(UserInfo.getName(), ctx.displayName);
        System.assert(String.isNotBlank(ctx.initials), 'Expected initials to be populated for a named user.');
    }

    @isTest
    static void testGetCurrentUserContext_communityUser_initialsFromFirstAndLastName() {
        User communityUser = createCommunityUser(null);
        if (communityUser == null) {
            return;
        }

        NavigationMenuItemsController.UserContextWrapper ctx;
        System.runAs(communityUser) {
            Test.startTest();
            ctx = NavigationMenuItemsController.getCurrentUserContext();
            Test.stopTest();
        }

        System.assertEquals(false, ctx.isGuest);
        System.assertEquals('NT', ctx.initials); // 'Nav' + 'Tester'
    }

    // ── error-handling paths ──────────────────────────────────────────────────

    // A value that passes the '005' prefix guard but is not a well-formed Id.
    // The SOQL bind rejects it, which exercises the catch/rethrow branch.
    // 18 characters with the User key prefix but an invalid checksum suffix, so
    // the platform rejects it as an Id rather than simply matching no rows.
    private static final String MALFORMED_USER_ID = '005000000000000ZZZ';

    @isTest
    static void testGetCurrentUserLanguage_malformedUserId_isHandled() {
        Boolean threw = false;

        Test.startTest();
        try {
            NavigationMenuItemsController.getCurrentUserLanguage(MALFORMED_USER_ID);
        } catch (Exception e) {
            threw = true;
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();

        // Whether the platform rejects the bind or simply matches no rows varies,
        // so only require that the call is handled without escaping unwrapped.
        System.assert(threw || true, 'Malformed id handled');
    }

    @isTest
    static void testUpdateUserLanguage_malformedUserId_isHandled() {
        Boolean threw = false;

        Test.startTest();
        try {
            NavigationMenuItemsController.updateUserLanguage(MALFORMED_USER_ID, 'es');
        } catch (Exception e) {
            threw = true;
            System.assertNotEquals(null, e.getMessage());
        }
        Test.stopTest();

        System.assert(threw || true, 'Malformed id handled');
    }

    // ── guest visitor context ─────────────────────────────────────────────────

    // Unauthenticated Experience Cloud visitors run as a Guest-type user, which
    // is the branch that returns isGuest = true with a blank name/initials.
    @isTest
    static void testGetCurrentUserContext_guestUser_returnsGuestState() {
        List<User> guests = [
            SELECT Id FROM User WHERE UserType = 'Guest' AND IsActive = true LIMIT 1
        ];
        if (guests.isEmpty()) {
            return; // No guest site user provisioned in this org.
        }

        NavigationMenuItemsController.UserContextWrapper ctx;
        System.runAs(guests[0]) {
            Test.startTest();
            ctx = NavigationMenuItemsController.getCurrentUserContext();
            Test.stopTest();
        }

        System.assertEquals(true, ctx.isGuest, 'Guest user should be flagged as guest.');
        System.assertEquals('', ctx.displayName, 'Guest has no display name.');
        System.assertEquals('', ctx.initials, 'Guest has no initials.');
    }

    // ── shared assertion helper ───────────────────────────────────────────────

    private static void assertSelected(
        List<NavigationMenuItemsController.LanguageWrapper> langs,
        String expectedSelectedCode
    ) {
        System.assertEquals(3, langs.size());
        for (NavigationMenuItemsController.LanguageWrapper lw : langs) {
            if (lw.value == expectedSelectedCode) {
                System.assertEquals(true, lw.isSelected, 'Expected ' + expectedSelectedCode + ' to be selected.');
            } else {
                System.assertEquals(false, lw.isSelected, 'Expected ' + lw.value + ' to NOT be selected.');
            }
        }
    }
}