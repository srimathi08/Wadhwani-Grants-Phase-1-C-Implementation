/**
 * @description Controller for the WCFChangePassword Visualforce page.
 * Provides custom branded password change functionality matching Wadhwani portal standards.
 */
public with sharing class WCFChangePasswordController {
    public String oldPassword { get; set; }
    public String newPassword { get; set; }
    public String errorMessage { get; set; }

    public WCFChangePasswordController() {
        errorMessage = null;
    }

    public PageReference doChangePassword() {
        errorMessage = null;

        if (String.isBlank(oldPassword)) {
            errorMessage = 'Please enter your current password.';
            return null;
        }

        if (String.isBlank(newPassword)) {
            errorMessage = 'Please enter your new password.';
            return null;
        }

        // Salesforce Site.changePassword requires (newPassword, verifyNewPassword, oldPassword)
        // Passing newPassword as verifyNewPassword removes the redundant 3rd field to match UI requirements
        PageReference redirect = Site.changePassword(newPassword, newPassword, oldPassword);

        // Check if Salesforce returned any password policy or validation error messages
        if (ApexPages.hasMessages()) {
            List<String> msgList = new List<String>();
            for (ApexPages.Message msg : ApexPages.getMessages()) {
                msgList.add(msg.getSummary());
            }
            errorMessage = String.join(msgList, ' ');
            return null;
        }

        if (redirect != null) {
            return redirect;
        }

        // Default redirect back to portal home upon successful password change
        PageReference portalHome = new PageReference('/wcf/s/');
        portalHome.setRedirect(true);
        return portalHome;
    }
}