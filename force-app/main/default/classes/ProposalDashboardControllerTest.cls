@isTest
public class ProposalDashboardControllerTest {

    @testSetup
    static void setupData() {

        // -----------------------------
        // 1. Create Account
        // -----------------------------
        Account acc = new Account(
            Name = 'Test COE Account'
        );
        insert acc;

        // -----------------------------
        // 2. Create Contact
        // -----------------------------
        Contact coeContact = new Contact(
            LastName = 'COE Admin',
            AccountId = acc.Id,
            COE_Admin__c = true
        );
        insert coeContact;

        // -----------------------------
        // 3. Get Profile
        // -----------------------------
        Profile partnerProfile = [
            SELECT Id FROM Profile
            WHERE Name = 'COE User Profile'
            LIMIT 1
        ];

        // -----------------------------
        // 4. Create User
        // -----------------------------
        User coeUser = new User(
            Username = 'coeadmin@test123.com',
            LastName = 'COE User',
            Email = 'coeadmin@test123.com',
            Alias = 'coe',
            CommunityNickname = 'coeuser',
            TimeZoneSidKey = 'Asia/Kolkata',
            LocaleSidKey = 'en_US',
            EmailEncodingKey = 'UTF-8',
            LanguageLocaleKey = 'en_US',
            ProfileId = partnerProfile.Id,
            ContactId = coeContact.Id
        );
        insert coeUser;

        // -----------------------------
        // 5. Create IndividualApplication Records
        // -----------------------------
        List<IndividualApplication> apps = new List<IndividualApplication>();

        Map<String, String> statuses = new Map<String, String>{
            'Proposal Submitted to COE Admin'        => 'SubmittedToCOE',
            'Proposal Approved by COE Admin'         => 'ApprovedByCOE',
            'Proposal Rejected by COE Admin'         => 'RejectedByCOE',
            'Asked for Resubmission by COE Admin'    => 'ResubmissionByCOE',
            'Proposal Resubmitted to COE Admin'      => 'ResubmittedByPI',
            'Proposal Submitted to WIN Admin'        => 'SubmittedToWIN',
            'Proposal Approved by WIN Admin'         => 'ApprovedByWIN',
            'Proposal Rejected by WIN Admin'         => 'RejectedByWIN',
            'Asked for Resubmission by WIN Admin'    => 'AskedResubmissionWIN', // ✅ FIXED
            'Proposal Resubmitted to WIN Admin'      => 'ResubmittedToWIN',
            'Approved for Funding'                   => 'ApprovedForFunding',
            'Not Recommended for Funding'            => 'NotRecommendedFunding'
        };

        for (String status : statuses.keySet()) {
            apps.add(new IndividualApplication(
                Status = status,
                AccountId = acc.Id,
                ApplicationType = 'WIN Project Proposal',
                Category = 'Grant Application'
            ));
        }

        insert apps;
    }

    // --------------------------------------------------
    // Test Method
    // --------------------------------------------------
    @isTest
    static void testProposalCounts() {

        User coeUser = [
            SELECT Id FROM User
            WHERE Username = 'coeadmin@test123.com'
            LIMIT 1
        ];

        System.runAs(coeUser) {

            Test.startTest();
            Map<String, Integer> counts =
                ProposalDashboardController.getProposalCounts();
            Test.stopTest();

            System.assertNotEquals(null, counts);

            System.assertEquals(1, counts.get('SubmittedToCOE'));
            System.assertEquals(1, counts.get('ApprovedByCOE'));
            System.assertEquals(1, counts.get('RejectedByCOE'));
            System.assertEquals(1, counts.get('ResubmissionByCOE'));
            System.assertEquals(1, counts.get('ResubmittedByPI'));

            System.assertEquals(1, counts.get('SubmittedToWIN'));
            System.assertEquals(1, counts.get('ApprovedByWIN'));
            System.assertEquals(1, counts.get('RejectedByWIN'));
            System.assertEquals(1, counts.get('AskedResubmissionWIN'));
            System.assertEquals(1, counts.get('ResubmittedToWIN'));

            System.assertEquals(1, counts.get('ApprovedForFunding'));
            System.assertEquals(1, counts.get('NotRecommendedFunding'));
        }
    }
}