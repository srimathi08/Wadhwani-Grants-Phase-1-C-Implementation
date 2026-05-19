global without sharing class WINReviewerUserManager {

    @InvocableMethod(label='WIN Create WIN Reviewer Users')
    global static List<WINReviewerUserResult> createReviewerUsers(List<WINReviewerUserInput> inputs) {

        System.debug('================= 🚀 START WINReviewerUserManager.createReviewerUsers =================');

        List<WINReviewerUserResult> results = new List<WINReviewerUserResult>();
        if (inputs == null || inputs.isEmpty()) return results;

        Map<Id, WINReviewerUserResult> resultByAccId = new Map<Id, WINReviewerUserResult>();
        Set<Id> accIds = new Set<Id>();

        // Prepare result map
        for (WINReviewerUserInput inp : inputs) {
            if (inp == null || inp.accountId == null) continue;

            WINReviewerUserResult r = new WINReviewerUserResult();
            r.accountId = inp.accountId;
            results.add(r);
            resultByAccId.put(inp.accountId, r);
            accIds.add(inp.accountId);
        }

        if (accIds.isEmpty()) return results;

        // Query Person Accounts
        Map<Id, Account> accMap = new Map<Id, Account>([
            SELECT Id, FirstName, LastName, PersonEmail, PersonContactId
            FROM Account WHERE Id IN :accIds
        ]);

        // Query Profile for Reviewer
        Profile reviewerProfile = [
            SELECT Id FROM Profile WHERE Name = 'Reviewer' LIMIT 1
        ];

        // Check existing users
        Set<String> emails = new Set<String>();
        for (Account acc : accMap.values()) {
            if (!String.isBlank(acc.PersonEmail)) emails.add(acc.PersonEmail.trim());
        }

        Map<String, User> existingUsers = new Map<String, User>([
            SELECT Id, Email FROM User WHERE Email IN :emails
        ]);

        List<User> newUsers = new List<User>();
        List<Id> orderedAccIds = new List<Id>();

        // Build new user list
        for (Id accId : accIds) {

            WINReviewerUserResult r = resultByAccId.get(accId);
            Account acc = accMap.get(accId);

            if (acc == null) {
                r.status = 'ERROR';
                r.message = 'Account not found.';
                continue;
            }

            String email = acc.PersonEmail;
            if (String.isBlank(email)) {
                r.status = 'ERROR';
                r.message = 'PersonEmail is missing.';
                continue;
            }

            if (existingUsers.containsKey(email)) {
                User u = existingUsers.get(email);
                r.status = 'USER_ALREADY_EXISTS';
                r.userId = u.Id;
                r.message = 'User already exists.';
                continue;
            }

            // Create new User
            String fName = String.isBlank(acc.FirstName) ? 'Reviewer' : acc.FirstName;
            String lName = String.isBlank(acc.LastName)  ? 'User'      : acc.LastName;

            String aliasVal = (fName.substring(0,1) + 'rev').toLowerCase().left(8);
            String nickBase = (fName + '.' + lName).toLowerCase().replaceAll('[^a-z0-9\\.]', '');
            String communityNick = nickBase + '.' + String.valueOf(Datetime.now().getTime()).substring(8);

            User u = new User(
                Username          = email,
                Email             = email,
                FirstName         = fName,
                LastName          = lName,
                Alias             = aliasVal,
                CommunityNickname = communityNick,
                TimeZoneSidKey    = 'Asia/Kolkata',
                LocaleSidKey      = 'en_US',
                EmailEncodingKey  = 'UTF-8',
                LanguageLocaleKey = 'en_US',
                ProfileId         = reviewerProfile.Id,
                ContactId         = acc.PersonContactId,
                IsActive          = true
            );

            newUsers.add(u);
            orderedAccIds.add(acc.Id);
        }

        // Insert users only
        if (!newUsers.isEmpty()) {
            Database.SaveResult[] srList = Database.insert(newUsers, false);

            for (Integer i = 0; i < srList.size(); i++) {
                WINReviewerUserResult r = resultByAccId.get(orderedAccIds[i]);

                if (srList[i].isSuccess()) {
                    r.userId = srList[i].getId();
                    r.status = 'SUCCESS';
                    r.message = 'User created.';
                } else {
                    r.status = 'ERROR';
                    r.message = srList[i].getErrors()[0].getMessage();
                }
            }
        }

        return results;
    }
}