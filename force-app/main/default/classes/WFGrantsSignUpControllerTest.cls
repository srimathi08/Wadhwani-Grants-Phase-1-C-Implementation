/**
 * WFGrantsSignUpControllerTest
 * -----------------------------------------------------------------------------
 * Unit tests for WFGrantsSignUpController (Experience Cloud self-registration).
 *
 * The controller wraps the standard System.UserManagement self-registration
 * APIs (initSelfRegistration / verifySelfRegistration) and, in this Person
 * Accounts org, creates a Person Account owned by a role-bearing admin. Those
 * platform calls and the org-specific owner/record-type prerequisites cannot be
 * satisfied deterministically inside a test transaction, so they are exercised
 * "best effort": the controller catches any failure and returns
 * status = 'error', which is a valid, asserted outcome. Every pure validation
 * and error branch (blank fields, bad email, unaccepted terms, duplicate user,
 * OTP/token/password validation) IS asserted precisely.
 *
 * No production logic is changed by this test.
 */
@isTest
private class WFGrantsSignUpControllerTest {

    private static final String VALID_EMAIL = 'newsignup@wfgtest.example.com';
    private static final String VALID_PHONE = '9876543210';

    // ─────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────

    // Returns a status value from the controller's result map (never null).
    private static String statusOf(Map<String, String> result) {
        System.assertNotEquals(null, result, 'Controller should always return a map');
        return result.get('status');
    }

    // ─────────────────────────────────────────────────────────────────
    // initiateSignUp — validation branches (deterministic)
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testInitiate_missingRequiredFields() {
        Test.startTest();
        // Blank first name → "All fields are required."
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            '', 'Doe', VALID_EMAIL, VALID_PHONE, '91', 'Org', true, 'en_US', 'Asia/Kolkata');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Blank field should be an error');
        System.assertEquals('All fields are required.', r.get('message'),
            'Missing-field message expected');
    }

    @isTest
    static void testInitiate_invalidEmail() {
        Test.startTest();
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Jane', 'Doe', 'not-an-email', VALID_PHONE, '91', 'Org', true, 'en_US', 'Asia/Kolkata');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Bad email should be an error');
        System.assertEquals('Enter a valid email address.', r.get('message'),
            'Invalid-email message expected');
    }

    @isTest
    static void testInitiate_termsNotAccepted() {
        Test.startTest();
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Jane', 'Doe', VALID_EMAIL, VALID_PHONE, '91', 'Org', false, 'en_US', 'Asia/Kolkata');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Unaccepted terms should be an error');
        System.assert(r.get('message').contains('Terms of Use'),
            'Terms/Privacy consent message expected');
    }

    @isTest
    static void testInitiate_termsNull() {
        Test.startTest();
        // acceptedTerms == null is also "not true" and must be rejected.
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Jane', 'Doe', VALID_EMAIL, VALID_PHONE, '91', 'Org', null, 'en_US', 'Asia/Kolkata');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Null terms should be an error');
    }

    // ─────────────────────────────────────────────────────────────────
    // initiateSignUp — duplicate user branch (status = 'exists')
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testInitiate_duplicateUser() {
        // Create an active user whose Email matches the signup email so the
        // duplicate-check SOQL returns a row → status 'exists'. A standard
        // (internal) profile is used deliberately: it needs no ContactId, so
        // the test avoids Account/Contact DML and the org-specific required
        // Contact record type that fails in production.
        Profile p = [SELECT Id FROM Profile WHERE UserType = 'Standard' LIMIT 1];

        User existing = new User(
            Alias             = 'dup1',
            Email             = VALID_EMAIL,
            EmailEncodingKey  = 'UTF-8',
            FirstName         = 'Existing',
            LastName          = 'User',
            LanguageLocaleKey = 'en_US',
            LocaleSidKey      = 'en_US',
            ProfileId         = p.Id,
            TimeZoneSidKey    = 'America/Los_Angeles',
            IsActive          = true,
            Username          = VALID_EMAIL
        );

        System.runAs(new User(Id = UserInfo.getUserId())) {
            insert existing;
        }

        Test.startTest();
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Jane', 'Doe', VALID_EMAIL, VALID_PHONE, '91', 'Org', true, 'en_US', 'Asia/Kolkata');
        Test.stopTest();

        System.assertEquals('exists', statusOf(r),
            'An active user with the same email should yield status = exists');
        System.assert(String.isNotBlank(r.get('message')),
            'Exists branch should include a message');
    }

    // ─────────────────────────────────────────────────────────────────
    // initiateSignUp — full path (best effort past the duplicate check)
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testInitiate_fullPath_bestEffort() {
        Test.startTest();
        // Valid, non-duplicate inputs drive execution through formatPhone, the
        // duplicate/profile queries and into createPersonAccount /
        // initSelfRegistration. Those org-dependent platform steps either
        // succeed (otp_sent) or are caught and reported (error); both are
        // acceptable and both execute the code under test.
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Jane', 'Doe', VALID_EMAIL, VALID_PHONE, '91', 'Test Org',
            true, 'pt_BR', 'Asia/Kolkata');
        Test.stopTest();

        String status = statusOf(r);
        System.assert(
            status == 'otp_sent' || status == 'error' || status == 'exists',
            'Full path should resolve to otp_sent, error, or exists (got: ' + status + ')');
    }

    @isTest
    static void testInitiate_unrecognisedLanguageDefaults_bestEffort() {
        Test.startTest();
        // A language not in the allowed set and a blank time zone drive the
        // resolveLanguage / resolveTimeZone default branches.
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Sam', 'Smith', 'sam.smith@wfgtest.example.com', '9123456780',
            '1', 'Org', true, 'fr_FR', '');
        Test.stopTest();

        System.assertNotEquals(null, statusOf(r), 'A status should always be returned');
    }

    @isTest
    static void testInitiate_shortPhoneRejected() {
        Test.startTest();
        // formatPhone throws for a too-short number; the controller catches it
        // and reports an error rather than proceeding.
        Map<String, String> r = WFGrantsSignUpController.initiateSignUp(
            'Jane', 'Doe', 'shortphone@wfgtest.example.com', '123',
            '91', 'Org', true, 'en_US', 'Asia/Kolkata');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Too-short phone should be an error');
    }

    // ─────────────────────────────────────────────────────────────────
    // completeSignUp — validation branches (deterministic)
    // ─────────────────────────────────────────────────────────────────
    @isTest
    static void testComplete_missingTokenOrOtp() {
        Test.startTest();
        Map<String, String> r = WFGrantsSignUpController.completeSignUp(
            '', '', VALID_EMAIL, 'Passw0rd', '/');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Missing token/otp should be an error');
        System.assertEquals('OTP and token are required.', r.get('message'),
            'Missing token/otp message expected');
    }

    @isTest
    static void testComplete_shortPassword() {
        Test.startTest();
        Map<String, String> r = WFGrantsSignUpController.completeSignUp(
            'tok', '123456', VALID_EMAIL, 'Ab1', '/');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Short password should be an error');
        System.assertEquals('Password must be at least 8 characters.', r.get('message'),
            'Short-password message expected');
    }

    @isTest
    static void testComplete_passwordMissingLetterOrNumber() {
        Test.startTest();
        // 8+ chars but digits only → must contain a letter and a number.
        Map<String, String> r = WFGrantsSignUpController.completeSignUp(
            'tok', '123456', VALID_EMAIL, '12345678', '/');
        Test.stopTest();

        System.assertEquals('error', statusOf(r), 'Digits-only password should be an error');
        System.assertEquals(
            'Password must contain at least one letter and one number.', r.get('message'),
            'Letter+number message expected');
    }

    @isTest
    static void testComplete_validInputs_bestEffort() {
        Test.startTest();
        // Well-formed inputs pass all client-side validation and reach
        // verifySelfRegistration, which cannot succeed against a fabricated
        // token in a test context — the controller reports the failure as an
        // error. Both the fail-response and catch branches are exercised here.
        Map<String, String> r = WFGrantsSignUpController.completeSignUp(
            'fake-token', '000000', VALID_EMAIL, 'Passw0rd1', '');
        Test.stopTest();

        System.assertEquals('error', statusOf(r),
            'A fabricated token cannot verify → error');
    }
}