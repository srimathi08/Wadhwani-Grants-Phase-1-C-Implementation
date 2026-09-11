public with sharing class CoeWelcomeController {

    private static final String DEFAULT_NAME = 'Your COE Portal';

    // Test-only hook to deterministically exercise the catch block.
    // Test.isRunningTest() guard means this branch can NEVER fire outside
    // a running test, regardless of this flag's value — safe in production.
    @TestVisible
    private static Boolean forceExceptionForTest = false;

    @AuraEnabled(cacheable=true)
    public static String getCoeName() {
        try {
            if (Test.isRunningTest() && forceExceptionForTest) {
                throw new QueryException('Forced exception for test coverage');
            }

            User u = [
                SELECT Contact.Account.Name, Contact.AccountId, Name
                FROM User
                WHERE Id = :UserInfo.getUserId()
                LIMIT 1
            ];
            return resolveAccountName(u.Contact);
        } catch (Exception e) {
            System.debug('CoeWelcomeController error: ' + e.getMessage());
            return DEFAULT_NAME;
        }
    }

    @TestVisible
    private static String resolveAccountName(Contact con) {
        if (con != null && con.Account != null && String.isNotBlank(con.Account.Name)) {
            return con.Account.Name;
        }
        if (con != null && con.AccountId != null) {
            Account acc = [SELECT Name FROM Account WHERE Id = :con.AccountId LIMIT 1];
            return acc.Name;
        }
        return DEFAULT_NAME;
    }
}