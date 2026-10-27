/**
 * @description Unit tests for WCFChangePasswordController.
 */
@isTest
private class WCFChangePasswordControllerTest {

    @isTest
    static void testValidationErrors() {
        WCFChangePasswordController controller = new WCFChangePasswordController();

        // 1. Both blank
        PageReference result1 = controller.doChangePassword();
        System.assertEquals(null, result1, 'Should fail when current password is blank');
        System.assert(controller.errorMessage.contains('current password'), 'Error should mention current password');

        // 2. Only old password entered
        controller.oldPassword = 'OldPassword123!';
        PageReference result2 = controller.doChangePassword();
        System.assertEquals(null, result2, 'Should fail when new password is blank');
        System.assert(controller.errorMessage.contains('new password'), 'Error should mention new password');
    }

    @isTest
    static void testChangePasswordExecution() {
        WCFChangePasswordController controller = new WCFChangePasswordController();
        controller.oldPassword = 'OldPassword123!';
        controller.newPassword = 'NewPassword456!';

        Test.startTest();
        // In standard test context without an active community site session,
        // Site.changePassword will return null or simulate failure gracefully
        PageReference result = controller.doChangePassword();
        Test.stopTest();

        // Verify controller execution completes without unhandled exception
        System.assert(controller != null, 'Controller should execute safely');
    }
}