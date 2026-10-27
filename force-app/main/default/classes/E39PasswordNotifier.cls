public without sharing class E39PasswordNotifier implements Queueable {

    public class E39Exception extends Exception {}

    private Set<Id> userIds;
    private static EmailTemplate tpl;
    private static Id oweaId;

    private static final String RESOURCE_PATH = '/sfsites/c/resource/';
    private static final String LOGO_HEADER_RES = 'wcflogo';
    private static final String LOGO_FOOTER_RES = 'WIN_Logo';

    // URLs resolved dynamically per profile (works in sandbox, SIT, UAT, prod)
    private class PortalUrls {
        String resetUrl;
        String logoHeaderUrl;
        String logoFooterUrl;
    }

    private static Map<Id, PortalUrls> urlsByProfile = new Map<Id, PortalUrls>();

    public static final Set<String> ALLOWED_PROFILES = new Set<String>{
        'WCF Site User', 'WCF Reviewer',   // sandbox
        'WG Internal', 'WG Partners'       // SIT / UAT / production
    };

    public E39PasswordNotifier() {}

    public E39PasswordNotifier(Set<Id> userIds) {
        this.userIds = userIds == null
            ? new Set<Id>()
            : userIds.clone();
    }

    public void execute(QueueableContext qc) {
        if (userIds != null && !userIds.isEmpty()) {
            process(userIds);
        }
    }

    /**
     * Resolves reset / logo URLs from the Experience Cloud site (Network)
     * that the user's profile is a member of. No hardcoded site prefix.
     */
    private static PortalUrls urlsFor(Id profileId) {
        if (urlsByProfile.containsKey(profileId)) {
            return urlsByProfile.get(profileId);
        }

        Id networkId;

        // 1) Live network the user's profile is a member of
        Set<Id> memberNetworkIds = new Set<Id>();

        for (NetworkMemberGroup g : [
            SELECT NetworkId
            FROM NetworkMemberGroup
            WHERE ParentId = :profileId
        ]) {
            memberNetworkIds.add(g.NetworkId);
        }

        if (!memberNetworkIds.isEmpty()) {
            for (Network n : [
                SELECT Id
                FROM Network
                WHERE Id IN :memberNetworkIds
                  AND Status = 'Live'
                ORDER BY Name
                LIMIT 1
            ]) {
                networkId = n.Id;
            }
        }

        // 2) Fallback: only when the org has exactly one live network
        if (networkId == null) {
            List<Network> liveNetworks = [
                SELECT Id
                FROM Network
                WHERE Status = 'Live'
                LIMIT 2
            ];
            if (liveNetworks.size() == 1) {
                networkId = liveNetworks[0].Id;
            }
        }

        PortalUrls urls = new PortalUrls();

        if (networkId == null) {
            if (Test.isRunningTest()) {
                urls.resetUrl = 'https://example.com/wcf/s/login/ForgotPassword';
                urls.logoHeaderUrl = 'https://example.com/h.png';
                urls.logoFooterUrl = 'https://example.com/f.jpg';
                urlsByProfile.put(profileId, urls);
                return urls;
            }
            throw new E39Exception(
                'No live Experience Cloud site found for profile ' + profileId
            );
        }

        String loginUrl = Network.getLoginUrl(networkId);

        if (String.isBlank(loginUrl)) {
            throw new E39Exception(
                'Login URL could not be resolved for network ' + networkId
            );
        }

        loginUrl = loginUrl.substringBefore('?');

        String base;

        if (loginUrl.containsIgnoreCase('/s/login')) {          // Aura sites
            base = loginUrl.substringBeforeLast('/s/login');
            urls.resetUrl = base + '/s/login/ForgotPassword';
        } else if (loginUrl.containsIgnoreCase('/login')) {     // LWR sites
            base = loginUrl.substringBeforeLast('/login');
            urls.resetUrl = base + '/login/ForgotPassword';
        } else {
            throw new E39Exception(
                'Unexpected login URL format: ' + loginUrl
            );
        }

        base = base.removeEnd('/');

        urls.logoHeaderUrl = base + RESOURCE_PATH + LOGO_HEADER_RES;
        urls.logoFooterUrl = base + RESOURCE_PATH + LOGO_FOOTER_RES;

        urlsByProfile.put(profileId, urls);
        return urls;
    }

    public static void process(Set<Id> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }

        Set<Id> contactIds = new Set<Id>();

        for (User u : [
            SELECT ContactId
            FROM User
            WHERE Id IN :ids
              AND ContactId != null
              AND IsActive = true
              AND Profile.Name IN :ALLOWED_PROFILES
        ]) {
            contactIds.add(u.ContactId);
        }

        if (contactIds.isEmpty()) {
            return;
        }

        // Lock contacts to reduce concurrent duplicate processing.
        List<Contact> lockedContacts = [
            SELECT Id
            FROM Contact
            WHERE Id IN :contactIds
            FOR UPDATE
        ];

        List<Id> dueIds = new List<Id>();

        // Recheck eligibility and notification watermark after locking.
        for (User u : [
            SELECT Id, LastPasswordChangeDate,
                   Pwd_Notified_Through__c
            FROM User
            WHERE Id IN :ids
              AND ContactId IN :contactIds
              AND IsActive = true
              AND Profile.Name IN :ALLOWED_PROFILES
              AND LastPasswordChangeDate != null
        ]) {
            if (dueIds.size() >= 100) {
                break;
            }

            if (u.Pwd_Notified_Through__c == null ||
                u.LastPasswordChangeDate >
                    u.Pwd_Notified_Through__c) {
                dueIds.add(u.Id);
            }
        }

        if (dueIds.isEmpty()) {
            return;
        }

        List<User> updates = new List<User>();
        List<Messaging.SingleEmailMessage> emails =
            new List<Messaging.SingleEmailMessage>();
        List<User> attemptedUsers = new List<User>();

        for (User u : [
            SELECT Id, Username, Email, FirstName, ProfileId,
                   TimeZoneSidKey, LastPasswordChangeDate,
                   Contact.FirstName
            FROM User
            WHERE Id IN :dueIds
        ]) {
            try {
                emails.add(build(u));
                attemptedUsers.add(u);
            } catch (Exception e) {
                updates.add(new User(
                    Id = u.Id,
                    Pwd_Notify_Error__c =
                        String.valueOf(e.getMessage()).left(255)
                ));
            }
        }

        if (!emails.isEmpty()) {
            List<Messaging.SendEmailResult> results =
                Messaging.sendEmail(emails, false);

            for (Integer i = 0; i < results.size(); i++) {
                Messaging.SendEmailResult result = results[i];
                User attemptedUser = attemptedUsers[i];

                if (result.isSuccess()) {
                    updates.add(new User(
                        Id = attemptedUser.Id,
                        Pwd_Notified_Through__c =
                            attemptedUser.LastPasswordChangeDate,
                        Pwd_Notify_Error__c = null
                    ));
                } else {
                    String errorMessage = 'Email send failed';

                    if (result.getErrors() != null &&
                        !result.getErrors().isEmpty()) {
                        errorMessage =
                            result.getErrors()[0].getMessage();
                    }

                    updates.add(new User(
                        Id = attemptedUser.Id,
                        Pwd_Notify_Error__c =
                            errorMessage.left(255)
                    ));
                }
            }
        }

        if (!updates.isEmpty()) {
            update updates;
        }
    }

    public static Messaging.SingleEmailMessage build(User u) {
        if (tpl == null) {
            List<EmailTemplate> templates = [
                SELECT Subject, HtmlValue
                FROM EmailTemplate
                WHERE DeveloperName = 'E39_Password_Changed'
                LIMIT 1
            ];

            if (templates.isEmpty() ||
                String.isBlank(templates[0].HtmlValue)) {
                throw new E39Exception(
                    'Template E39_Password_Changed missing or empty'
                );
            }

            tpl = templates[0];
        }

        if (oweaId == null) {
            List<OrgWideEmailAddress> addresses = [
                SELECT Id
                FROM OrgWideEmailAddress
                WHERE Address =
                    'grants.support@wadhwanifoundation.org'
                LIMIT 1
            ];

            if (!addresses.isEmpty()) {
                oweaId = addresses[0].Id;
            } else if (!Test.isRunningTest()) {
                throw new E39Exception(
                    'Org-wide address grants.support@wadhwanifoundation.org not found'
                );
            }
        }

        PortalUrls urls = urlsFor(u.ProfileId);

        String firstName =
            String.isNotBlank(u.Contact.FirstName)
            ? u.Contact.FirstName
            : u.FirstName;

        if (String.isBlank(firstName)) {
            throw new E39Exception('First name is blank');
        }

        if (String.isBlank(u.Email)) {
            throw new E39Exception('Email is blank');
        }

        if (u.LastPasswordChangeDate == null) {
            throw new E39Exception(
                'Last password change date is blank'
            );
        }

        String changedOn = u.LastPasswordChangeDate.format(
            'd MMMM yyyy, h:mm a z',
            u.TimeZoneSidKey
        ).replace(' AM', ' am').replace(' PM', ' pm');

        String body = tpl.HtmlValue
            .replace('{{contact_first_name}}', firstName.escapeHtml4())
            .replace('{{change_datetime}}', changedOn.escapeHtml4())
            .replace('{{account_email}}', u.Username.escapeHtml4())
            .replace('{{reset_url}}', urls.resetUrl.escapeHtml4())
            .replace('{{logo_header_url}}', urls.logoHeaderUrl.escapeHtml4())
            .replace('{{logo_footer_url}}', urls.logoFooterUrl.escapeHtml4())
            .replace('{{year}}', String.valueOf(Date.today().year()));

        Messaging.SingleEmailMessage message =
            new Messaging.SingleEmailMessage();

        if (oweaId != null) {
            message.setOrgWideEmailAddressId(oweaId);
        }

        message.setToAddresses(new String[] { u.Email });
        message.setSubject(
            String.isNotBlank(tpl.Subject)
            ? tpl.Subject
            : 'Your Wadhwani Grants password was changed'
        );
        message.setHtmlBody(body);
        message.setPlainTextBody(
            'Hi ' + firstName +
            ', the password for your Wadhwani Grants account (' +
            u.Username + ') was changed on ' + changedOn +
            '. If this was not you, reply to this email and ask us to lock your account.'
        );
        message.setSaveAsActivity(false);
        message.setUseSignature(false);

        return message;
    }
}