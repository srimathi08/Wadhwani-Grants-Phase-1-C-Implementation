public without sharing class UserLocaleSetter {
    @InvocableMethod
    public static void setUserLocale(List<LocaleRequest> requests) {
        if (requests == null || requests.isEmpty()) return;

        // Language name to Language code
        Map<String,String> nameToLang = new Map<String,String>{
            'English'          => 'en_US',
            'Spanish' => 'es_MX',
            'Portuguese'       => 'pt_BR'
        };
        // Language name to Locale code
        Map<String,String> nameToLocale = new Map<String,String>{
            'English'          => 'en_US',
            'Spanish' => 'es_MX',
            'Portuguese'       => 'pt_BR'
        };
        String chosen = requests[0].languageCode;

        String langKey   = nameToLang.containsKey(chosen)   ? nameToLang.get(chosen)   : chosen;
        String localeKey = nameToLocale.containsKey(chosen) ? nameToLocale.get(chosen) : langKey;

        if (String.isBlank(langKey) || String.isBlank(localeKey)) return;

        User me = [
            SELECT Id, LanguageLocaleKey, LocaleSidKey
            FROM User
            WHERE Id = :UserInfo.getUserId()
            LIMIT 1
        ];
        me.LanguageLocaleKey = langKey;
        me.LocaleSidKey = localeKey;
        update me;
    }

    public class LocaleRequest {
        @InvocableVariable(required=true)
        public String languageCode;
    }
}