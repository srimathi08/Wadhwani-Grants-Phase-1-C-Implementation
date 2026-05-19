@IsTest
private class AssignedProposalsControllerTest {

    // -----------------------------------------
    // Test: Owned Applications
    // -----------------------------------------
    @IsTest
    static void testOwnedApplicationsOnly() {

        User currentUser = [
            SELECT Id
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        System.runAs(currentUser) {

            IndividualApplication app1 = new IndividualApplication(
                OwnerId = currentUser.Id,
                Project_Title__c = 'Project One',
                Primary_Focus_Area__c = 'HealthTech',
                Category = 'Grant Application'
            );

            IndividualApplication app2 = new IndividualApplication(
                OwnerId = currentUser.Id,
                Project_Title__c = 'Project Two',
                Primary_Focus_Area__c = 'HealthTech',
                Category = 'Grant Application'
            );

            insert new List<IndividualApplication>{ app1, app2 };

            Test.startTest();
            List<AssignedProposalsController.AssignedApplicationRow> results =
                AssignedProposalsController.getTotalAssignedApplications();
            Test.stopTest();

            System.assertEquals(
                2,
                results.size(),
                'Should return all applications owned by the user'
            );
        }
    }

    // -----------------------------------------
    // Test: No Assigned Applications
    // -----------------------------------------
    @IsTest
    static void testNoAssignedApplications() {

        User currentUser = [
            SELECT Id
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        System.runAs(currentUser) {

            Test.startTest();
            List<AssignedProposalsController.AssignedApplicationRow> results =
                AssignedProposalsController.getTotalAssignedApplications();
            Test.stopTest();

            System.assertEquals(
                0,
                results.size(),
                'Should return empty list when user owns no applications'
            );
        }
    }

    // -----------------------------------------
    // Test: Reject Proposal creates review
    // -----------------------------------------
    @IsTest
    static void testRejectProposalCreatesReview() {

        User currentUser = [
            SELECT Id
            FROM User
            WHERE Id = :UserInfo.getUserId()
        ];

        System.runAs(currentUser) {

            IndividualApplication app = new IndividualApplication(
                OwnerId = currentUser.Id,
                Project_Title__c = 'Rejected Project',
                Primary_Focus_Area__c = 'HealthTech',
                Category = 'Grant Application'
            );
            insert app;

            Test.startTest();
            AssignedProposalsController.rejectProposal(
                app.Id,
                'Not aligned with objectives'
            );
            Test.stopTest();

            ApplicationReview review = [
                SELECT
                    Id,
                    Status,
                    Comment,
                    ReviewedById,
                    ApplicationId
                FROM ApplicationReview
                WHERE ApplicationId = :app.Id
                LIMIT 1
            ];

            System.assertEquals(
                'Reviewer Rejected',
                review.Status,
                'Status should be Reviewer Rejected'
            );

            System.assertEquals(
                'Not aligned with objectives',
                review.Comment,
                'Comment should be saved'
            );

            System.assertEquals(
                currentUser.Id,
                review.ReviewedById,
                'ReviewedById should be current user'
            );
        }
    }
}