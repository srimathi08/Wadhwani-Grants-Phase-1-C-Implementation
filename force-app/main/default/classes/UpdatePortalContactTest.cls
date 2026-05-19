@IsTest
public class UpdatePortalContactTest {

    // ------------------------------------------------------------
    // TEST: Successful update of valid contacts
    // ------------------------------------------------------------
    @IsTest
    static void testUpdatePortalContact_Success() {

        // Create a test Contact
        Contact c = new Contact(
            FirstName = 'Test',
            LastName = 'User',
            Phone = '1111111111',
            Category_of_Applicant__c = 'Entrepreneur',
            Designation__c = 'Old Designation',
            Department__C = 'Old Dept'
        );
        insert c;

        // Prepare Invocable input
        UpdatePortalContact.ContactInput input = new UpdatePortalContact.ContactInput();
        input.ContactId = c.Id;
        input.Phone = '2222222222';
        input.CategoryOfApplicant = 'Student';
        input.Designation = 'New Designation';
        input.Department = 'New Dept';

        List<UpdatePortalContact.ContactInput> inputList = new List<UpdatePortalContact.ContactInput>{ input };

        Test.startTest();
        UpdatePortalContact.updateContact(inputList);
        Test.stopTest();

        // Validate the update
        Contact updated = [
            SELECT Phone, Category_of_Applicant__c, Designation__c, Department__c
            FROM Contact
            WHERE Id = :c.Id
        ];

        System.assertEquals('2222222222', updated.Phone);
        System.assertEquals('Student', updated.Category_of_Applicant__c);
        System.assertEquals('New Designation', updated.Designation__c);
        System.assertEquals('New Dept', updated.Department__c);
    }

    // ------------------------------------------------------------
    // TEST: Ignore invalid ContactId (record does not exist)
    // ------------------------------------------------------------
    @IsTest
    static void testUpdatePortalContact_InvalidIdIgnored() {

        // Valid contact
        Contact c = new Contact(
            FirstName = 'Tester',
            LastName = 'UserTwo'
        );
        insert c;

        // Input 1 → valid contact  
        UpdatePortalContact.ContactInput validInput = new UpdatePortalContact.ContactInput();
        validInput.ContactId = c.Id;
        validInput.Phone = '9999999999';

        // Input 2 → invalid (fake) Id  
        UpdatePortalContact.ContactInput invalidInput = new UpdatePortalContact.ContactInput();
        invalidInput.ContactId = '003000000000000AAA'; // non-existing
        invalidInput.Phone = '5555555555';

        List<UpdatePortalContact.ContactInput> requestList = 
            new List<UpdatePortalContact.ContactInput>{ validInput, invalidInput };

        Test.startTest();
        UpdatePortalContact.updateContact(requestList);
        Test.stopTest();

        // Validate only valid contact was updated
        Contact updated = [
            SELECT Phone FROM Contact WHERE Id = :c.Id
        ];
        System.assertEquals('9999999999', updated.Phone, 'Valid contact should be updated');

        // No exception → invalid id was ignored successfully
    }
}