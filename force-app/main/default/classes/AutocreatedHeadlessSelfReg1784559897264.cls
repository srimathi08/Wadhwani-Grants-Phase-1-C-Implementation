/*
* Auto Generated Headless Registration Handler
*/
global class AutocreatedHeadlessSelfReg1784559897264 implements Auth.HeadlessSelfRegistrationHandler {

    // TO DO: Update this constant with the actual value for your use case
    private static final String CUSTOMER_ACCOUNT = 'My Account';

    /*
    * Retrieve an existing account or create a new one if it doesn't exist
    *
    * @param accountName - The name of the account to find or create
    * @return Account - The found or newly created account
    */
    private Account findOrCreateAccount(String accountName) {
        List<Account> existingAccounts = [SELECT Id FROM Account WHERE Name=:accountName LIMIT 1];
        if (existingAccounts.isEmpty()) {
            Account newAccount = new Account(Name = accountName);

            insert(newAccount);

            return newAccount;
        }

        return existingAccounts[0];
    }

    /*
    * Create a contact and associate it with an account
    *
    * @param account - The Account object to associate the contact with
    * @param user - The User object containing the first and last name for the contact
    * @return Contact - The newly created contact
    */
    private Contact createContact(Account account, User user) {
        Contact c = new Contact();
        c.accountId = account.Id;
        c.firstName = user.firstName;
        c.lastName = user.lastName;

        insert(c);

        return c;
    }

    /*
    * Initialize a User record with common fields from the Auth.UserData object
    * when an attribute is missing, the default value is change-me
    *
    * @param data - Auth.UserData object containing the user information
    * @param user - The User to be populated
    */
    private void prepareUserData(Auth.UserData data, User u){
        String name, firstName, lastName, username, alias, email, phone;

        // Initialize the attributes essential for creating a new user with dummy values
        // when attributes are missing
        firstName = 'change-me';
        lastName = 'change-me';
        email = 'change@me.com';
        if(data.email != null && data.email != '')
            email = data.email;
        if(data.firstName != null && data.firstName != '')
            firstName = data.firstName;
        if(data.LastName != null && data.lastName != '')
            lastName = data.lastName;
        if(data.attributeMap.containsKey('full_name'))
            name = data.attributeMap.get('full_name');
        if(data.attributeMap.containsKey('name'))
            name = data.attributeMap.get('name');
        if(firstName == 'change-me' && name != '')
            firstName = name.substringBefore(' ');
        if(lastName == 'change-me' && name.substringAfter(' ') != '')
            lastName = name.substringAfter(' ');
        if(data.attributeMap.containsKey('phone') && data.attributeMap.get('phone') != null && data.attributeMap.get('phone') != '')
            phone = data.attributeMap.get('phone');

        // Generate a random username
        Integer rand = Math.round(Math.random()*100000000);
        if(data.attributeMap.containsKey('username')){
            username = data.attributeMap.get('username');
        }else{
            username = lastName + '.' + rand + '@social-sign-on.com';
        }
        alias = firstName;

        // Alias must be 8 characters or less
        if(alias.length() > 8)
            alias = alias.substring(0, 8);
        u.Username = username;
        u.Email = email;
        u.LastName = lastName;
        u.FirstName = firstName;
        u.MobilePhone = phone;
        u.Alias = alias;
        u.LanguageLocaleKey = UserInfo.getLocale();
        u.LocaleSidKey = UserInfo.getLocale();
        u.EmailEncodingKey = 'UTF-8';
        u.TimeZoneSidKey = UserInfo.getTimezone().getID();
    }

    // TO DO: Implement any additional password validation that you want in this method. 
    // In this example, the password was already checked to ensure that it complies with the org's password policy,
    // and the password, if present, is set automatically for the new user when they are returned from the createUser method.
    private Boolean isPasswordValid(String password) {
        return true;
    }

    global User createUser(Id profileId, Auth.UserData data, String customUserDataMap, String experienceId, String password){
        if (!isPasswordValid(password)) {
            return null;
        }

        User u = new User();
        prepareUserData(data, u);
        u.ProfileId = profileId;

        /*
        * Deserialize the custom data into a apex class structure. 
        * Below shows how you could do this, however you must define the appropriate apex class
        */
        // MyClass customDataClass = (MyClass)JSON.deserialize(customUserDataMap, MyClass.class);

        Account a = findOrCreateAccount(CUSTOMER_ACCOUNT);
        Contact c = createContact(a, u);
        u.ContactId = c.Id;

        return u;
    }
}