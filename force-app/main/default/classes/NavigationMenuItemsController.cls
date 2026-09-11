global with sharing class NavigationMenuItemsController {

    @AuraEnabled(cacheable=true)
    public static List<ConnectApi.NavigationMenuItem> getNavigationMenuItems(
        String navigationLinkSetMasterLabel,
        String publishStatus,
        Boolean addHomeMenuItem,
        Boolean includeImageUrl
    ) {
        try{
        String navigationLinkSetDeveloperName = getNavigationLinkSetDeveloperName(navigationLinkSetMasterLabel);

        ConnectApi.PublishStatus publishStatusEnum =
            publishStatus.equalsIgnoreCase('Draft') ?
            ConnectApi.PublishStatus.Draft :
            ConnectApi.PublishStatus.Live;

        List<ConnectApi.NavigationMenuItemType> menuItemsToSkip = new List<ConnectApi.NavigationMenuItemType>{
            ConnectApi.NavigationMenuItemType.Event,
            ConnectApi.NavigationMenuItemType.SystemLink
        };

        String networkId = Network.getNetworkId();

        ConnectApi.NavigationMenuItemCollection menu =
            ConnectApi.NavigationMenu.getCommunityNavigationMenu(
                networkId,
                null,
                navigationLinkSetDeveloperName,
                publishStatusEnum,
                includeImageUrl,
                addHomeMenuItem,
                menuItemsToSkip
            );

        return menu.menuItems;
    } catch (Exception e) {
            System.debug(e.getMessage());
            throw e;
        }
    }

    private static String getNavigationLinkSetDeveloperName(String navigationLinkSetMasterLabel) {
        try{
        String networkId = Network.getNetworkId();

        return [
            SELECT DeveloperName
            FROM NavigationLinkSet
            WHERE NetworkId = :networkId
            AND MasterLabel = :navigationLinkSetMasterLabel
            LIMIT 1
        ].DeveloperName;
        } catch (Exception e) {
            System.debug(e.getMessage());
            throw e;
        }
    }

    public class LanguageWrapper {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        @AuraEnabled public String code;
        @AuraEnabled public Boolean isSelected;
    }

    // Available languages are the Account.Preferred_Laungage__c picklist values
    // (en_US, pt_BR, es). Hardcoded on purpose — no Language__c query needed.
    private static final String DEFAULT_LANGUAGE = 'en_US';
    private static final List<String> LANGUAGE_ORDER =
        new List<String>{ 'en_US', 'pt_BR', 'es' };
    private static final Map<String, String> LANGUAGE_LABELS =
        new Map<String, String>{
            'en_US' => 'English',
            'pt_BR' => 'Português (Brasil)',
            'es'    => 'Español'
        };

    // Build the language options, flagging the current selection (defaults to en_US).
    private static List<LanguageWrapper> buildLanguages(String selectedCode) {
        String selected = LANGUAGE_LABELS.containsKey(selectedCode)
            ? selectedCode
            : DEFAULT_LANGUAGE;

        List<LanguageWrapper> result = new List<LanguageWrapper>();
        for (String code : LANGUAGE_ORDER) {
            LanguageWrapper lw = new LanguageWrapper();
            lw.label      = LANGUAGE_LABELS.get(code);
            lw.value      = code;
            lw.code       = code;
            lw.isSelected = (code == selected);
            result.add(lw);
        }
        return result;
    }

    // Read the user's preferred language from their Account:
    //   User.ContactId → Contact.Account.Preferred_Laungage__c
    // Falls back to en_US when there is no contact / account / stored value.
    @AuraEnabled(cacheable=true)
    public static List<LanguageWrapper> getCurrentUserLanguage(String Id) {
        try {
            String preferred = DEFAULT_LANGUAGE;

            if (String.isNotBlank(Id) && Id.startsWith('005')) {
                List<User> users = [
                    SELECT Id, ContactId
                    FROM User
                    WHERE Id = :Id
                    LIMIT 1
                ];

                if (!users.isEmpty() && users[0].ContactId != null) {
                    List<Contact> contacts = [
                        SELECT Id, Account.Preferred_Laungage__c
                        FROM Contact
                        WHERE Id = :users[0].ContactId
                        LIMIT 1
                    ];

                    if (!contacts.isEmpty()
                            && String.isNotBlank(contacts[0].Account.Preferred_Laungage__c)) {
                        preferred = contacts[0].Account.Preferred_Laungage__c;
                    }
                }
            }

            return buildLanguages(preferred);
        } catch (Exception e) {
            System.debug(e.getMessage());
            throw e;
        }
    }

    // Persist a language change onto the user's Account:
    //   User.ContactId → Contact.AccountId → Account.Preferred_Laungage__c
    @AuraEnabled
    public static void updateUserLanguage(String userId, String languageCode) {
        try {
            if (String.isBlank(userId) || String.isBlank(languageCode)) return;
            if (!LANGUAGE_LABELS.containsKey(languageCode)) {
                languageCode = DEFAULT_LANGUAGE;
            }
            if (!userId.startsWith('005')) return;

            List<User> users = [
                SELECT Id, ContactId
                FROM User
                WHERE Id = :userId
                LIMIT 1
            ];
            if (users.isEmpty() || users[0].ContactId == null) return;

            List<Contact> contacts = [
                SELECT Id, AccountId
                FROM Contact
                WHERE Id = :users[0].ContactId
                LIMIT 1
            ];
            if (contacts.isEmpty() || contacts[0].AccountId == null) return;

            update new Account(
                Id                    = contacts[0].AccountId,
                Preferred_Laungage__c = languageCode
            );
        } catch (Exception e) {
            System.debug(e.getMessage());
            throw e;
        }
    }

    // ── Navbar login state ───────────────────────────────────────────────────
    public class UserContextWrapper {
        @AuraEnabled public Boolean isGuest;
        @AuraEnabled public String displayName;
        @AuraEnabled public String initials;
    }

    // Tells the navbar whether to render "Log in" or the account chip, and
    // (when logged in) what name/initials to show. UserInfo.getUserType()
    // returns 'Guest' for unauthenticated Experience Cloud visitors.
    @AuraEnabled(cacheable=true)
    public static UserContextWrapper getCurrentUserContext() {
        UserContextWrapper wrapper = new UserContextWrapper();
        try {
            Boolean guest = (UserInfo.getUserType() == 'Guest');
            wrapper.isGuest = guest;

            if (!guest) {
                String fullName = UserInfo.getName();
                wrapper.displayName = fullName;
                wrapper.initials = buildInitials(fullName);
            } else {
                wrapper.displayName = '';
                wrapper.initials = '';
            }

            return wrapper;
        } catch (Exception e) {
            System.debug(e.getMessage());
            throw e;
        }
    }

    private static String buildInitials(String fullName) {
        if (String.isBlank(fullName)) return '';
        List<String> parts = fullName.trim().split('\\s+');
        String initials = '';
        if (parts.size() > 0 && parts[0].length() > 0) {
            initials += parts[0].substring(0, 1);
        }
        if (parts.size() > 1 && parts[parts.size() - 1].length() > 0) {
            initials += parts[parts.size() - 1].substring(0, 1);
        }
        return initials.toUpperCase();
    }
}