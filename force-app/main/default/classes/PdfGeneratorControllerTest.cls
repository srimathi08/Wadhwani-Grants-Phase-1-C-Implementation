@isTest
public class PdfGeneratorControllerTest {

    @isTest
    static void testPdfGeneration() {

        // Create Account
        Account acc = new Account(Name = 'Draft Test Institution');
        insert acc;

        // Create Contact
        Contact admin = new Contact(
            LastName = 'Admin',
            Email = 'admin@example.com',
            AccountId = acc.Id
        );
        insert admin;

        // Create Funding Opportunity
        FundingOpportunity fo = new FundingOpportunity(
            Name = 'Active FO',
            Status = 'Active',
            FO_Type__c = 'Project Proposal'
        );
        insert fo;

        // SAFELY get RecordTypeId
        Id rtId;
        Map<String, Schema.RecordTypeInfo> rtMap =
            Schema.SObjectType.IndividualApplication.getRecordTypeInfosByName();

        if (rtMap.containsKey('WIN Project Proposal')) {
            rtId = rtMap.get('WIN Project Proposal').getRecordTypeId();
        } else {
            rtId = Schema.SObjectType.IndividualApplication.getRecordTypeInfos()[0].getRecordTypeId();
        }

        // Create Application
        IndividualApplication appData = new IndividualApplication(
            Project_Title__c = 'Draft App',
            FundingOpportunityId = fo.Id,
            AccountId = acc.Id,

            PI_Email__c = 'pi@draft.com',
            PI_Name__c = 'Dr Draft',
            PI_Phone__c = '1111111',
            PI_Designation__c = 'Scientist',

            CO_PI_Email__c = 'copi@draft.com',
            CO_PI_Institution__c = 'Draft Institute',
            Co_Principal_Investigator_Co_PI__c = 'Dr CoDraft',
            CO_PI_Phone__c = '2222222',
            CO_PI_Designation__c = 'Lead',

            RecordTypeId = rtId,
            Status = 'Draft',
            Category = 'Grant Application',
            ApplicationType = 'WIN Project Proposal',
            Target_Market_Industry_Application__c = 'HealthTech'
        );
        insert appData;

        // Create Milestone (ALL FIELDS FIXED FOR YOUR ORG)
        Milestone__c ms = new Milestone__c(
            Individual_Application__c = appData.Id,
            Milestone_Description__c = 'Execution',

            Target_Completion_Months__c = '5/25',
            Budget_Required__c = 1000,
            Budget_Required_INR__c = 80000,

            Installment_of_Funds_1__c = 'Inst 1',
            Installment_of_Funds_2__c = 'Inst 2',
            Installment_of_Funds_3__c = 'Inst 3',
            Installment_of_Funds_4__c = 'Inst 4',

            Activities_under_this_Milestone__c = 'Activity A',
            Output_and_Deliverables__c = 'Deliverable A',

            // THESE FIELDS ARE TEXT IN YOUR ORG → MUST USE STRINGS
            Project_Start_Date__c = '2025-01-01',
            Project_End_Date__c = '2025-01-31',

            Status__c = 'Draft'
        );
        insert ms;

        // Create Budget (with INR)
        Budget bd = new Budget(
            Proposal__c = appData.Id,
            Name = 'Ops',
            Year_1__c = 3000,
            Year_2__c = 4000,
            Year_3_USD__c = 5000,
            Total_Amount__c = 12000,
            Total_Amount_INR__c = 900000,
            Justification__c = 'Logistics',
            Status = 'Draft'
        );
        insert bd;

        // Create ContentDocument
        ContentVersion cv = new ContentVersion(
            Title = 'TestDocument',
            PathOnClient = 'test.pdf',
            VersionData = Blob.valueOf('test')
        );
        insert cv;

        // Get ContentDocumentId
        Id docId = [
            SELECT ContentDocumentId
            FROM ContentVersion
            WHERE Id = :cv.Id
        ].ContentDocumentId;

        // Link file to Application
        ContentDocumentLink link = new ContentDocumentLink(
            ContentDocumentId = docId,
            LinkedEntityId = appData.Id,
            ShareType = 'V'
        );
        insert link;

        // Run Test
        Test.startTest();
        PdfGeneratorController.getApplicationWithRelatedData(appData.Id);
        Test.stopTest();
    }
}