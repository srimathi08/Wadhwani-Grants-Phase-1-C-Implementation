@IsTest
public class AdminProposalDashboardControllerTest {

    @TestSetup
    static void setupData() {

        // Insert one record for every status so all branches get covered
        List<IndividualApplication> apps = new List<IndividualApplication>{
            
            // COE Statuses
            new IndividualApplication(Status = 'Proposal Submitted to COE Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Proposal Approved by COE Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Proposal Rejected by COE Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Asked for Resubmission by COE Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Proposal Resubmitted to COE Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            // WIN Statuses
            new IndividualApplication(Status = 'Proposal Submitted to WIN Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Proposal Approved by WIN Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Proposal Rejected by WIN Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Asked for Resubmission by WIN Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Proposal Resubmitted to WIN Admin',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            // Funding outcomes
            new IndividualApplication(Status = 'Approved for Funding',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application'),

            new IndividualApplication(Status = 'Not Recommended for Funding',
                                      ApplicationType = 'WIN Project Proposal', Category = 'Grant Application')
        };

        insert apps;
    }

    // --------------------------------------------------------------------
    // TEST: getAllProposalCounts
    // --------------------------------------------------------------------
    @IsTest
    static void testGetAllProposalCounts() {

        Test.startTest();
        Map<String, Integer> result = AdminProposalDashboardController.getAllProposalCounts();
        Test.stopTest();

        // ---------------- COE ----------------
        System.assertEquals(1, result.get('SubmittedToCOE'));
        System.assertEquals(1, result.get('ApprovedByCOE'));
        System.assertEquals(1, result.get('RejectedByCOE'));
        System.assertEquals(1, result.get('ResubmissionByCOE'));
        System.assertEquals(1, result.get('ResubmittedToCOE'));

        // ---------------- WIN ----------------
        System.assertEquals(1, result.get('SubmittedToWIN'));
        System.assertEquals(1, result.get('ApprovedByWIN'));
        System.assertEquals(1, result.get('RejectedByWIN'));
        System.assertEquals(1, result.get('ResubmissionByWIN'));
        System.assertEquals(1, result.get('ResubmittedToWIN'));

        // ---------------- Funding outcomes ----------------
        System.assertEquals(1, result.get('ApprovedForFunding'));
        System.assertEquals(1, result.get('NotRecommendedForFunding'));
    }
}