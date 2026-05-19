public with sharing class ReviewerQueryController {

    /*-------------------------------------------------------
        CREATE QUERY (Reviewer Portal)
    -------------------------------------------------------*/
    @AuraEnabled
    public static Id createQuery(Id proposalId, String queryComment){

        if(proposalId == null){
            throw new AuraHandledException('Proposal Id is required.');
        }

        if(String.isBlank(queryComment)){
            throw new AuraHandledException('Query cannot be empty.');
        }

        Reviewer_Query__c query = new Reviewer_Query__c();
        query.Proposal__c = proposalId;
        query.Reviewer__c = UserInfo.getUserId();
        query.Query__c = queryComment;
        query.Status__c = 'Raised';

        insert query;

        return query.Id;
    }


    /*-------------------------------------------------------
        GET ALL QUERIES (Admin Dashboard)
    -------------------------------------------------------*/
    @AuraEnabled(cacheable=true)
    public static List<Reviewer_Query__c> getReviewerQueries(){

        return [
            SELECT Id,
                   Name,
                   Proposal__c,
                   Proposal__r.Name,
                   Proposal__r.PI__r.Name,
                   Query__c,
                   Reply_from_COE__c,
                   Reply_from_PI__c,
                   Status__c,
                   Reviewer__c,
                   Reviewer__r.Name,
                   CreatedDate
            FROM Reviewer_Query__c
            ORDER BY CreatedDate DESC
        ];
    }


    /*-------------------------------------------------------
        GET QUERIES FOR REVIEWER
    -------------------------------------------------------*/
    @AuraEnabled(cacheable=true)
    public static List<Reviewer_Query__c> getQueriesForReviewer(){

        return [
            SELECT Id,
                   Name,
                   Proposal__c,
                   Proposal__r.Name,
                   Query__c,
                   Reply_from_COE__c,
                   Reply_from_PI__c,
                   Status__c,
                   CreatedDate
            FROM Reviewer_Query__c
            WHERE Reviewer__c = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
        ];
    }


    /*-------------------------------------------------------
        GET QUERIES FOR COE DASHBOARD
    -------------------------------------------------------*/
    @AuraEnabled(cacheable=true)
    public static List<Reviewer_Query__c> getQueriesForCOE(){

        return [
            SELECT Id,
                   Name,
                   Proposal__c,
                   Proposal__r.Name,
                   Proposal__r.PI__r.Name,
                   Query__c,
                   Reply_from_PI__c,
                   Status__c,
                   CreatedDate
            FROM Reviewer_Query__c
            WHERE Status__c = 'Sent to COE'
            ORDER BY CreatedDate DESC
        ];
    }


    /*-------------------------------------------------------
        GET QUERIES FOR PI DASHBOARD
    -------------------------------------------------------*/
    @AuraEnabled(cacheable=true)
    public static List<Reviewer_Query__c> getQueriesForPI(){

        return [
            SELECT Id,
                   Name,
                   Proposal__c,
                   Proposal__r.Name,
                   Query__c,
                   Reply_from_COE__c,
                   Status__c,
                   CreatedDate
            FROM Reviewer_Query__c
            WHERE Status__c = 'Sent to PI'
            ORDER BY CreatedDate DESC
        ];
    }


    /*-------------------------------------------------------
        SHARE QUERY WITH COE
    -------------------------------------------------------*/
    @AuraEnabled
    public static void shareWithCOE(Id queryId){

        Reviewer_Query__c rq = [
            SELECT Id, Status__c, Proposal__r.AccountId
            FROM Reviewer_Query__c
            WHERE Id = :queryId
            LIMIT 1
        ];

        if(rq.Proposal__r.AccountId == null){
            throw new AuraHandledException('COE Account not found on Proposal.');
        }

        List<User> coeUsers = [
            SELECT Id
            FROM User
            WHERE Contact.AccountId = :rq.Proposal__r.AccountId
            AND Contact.COE_Admin__c = true
            AND IsActive = true
        ];

        if(coeUsers.isEmpty()){
            throw new AuraHandledException(
                'No active COE Admin user found for this COE.'
            );
        }

        Set<Id> userIds = new Set<Id>();
        for(User u : coeUsers){
            userIds.add(u.Id);
        }

        List<Reviewer_Query__Share> existingShares = [
            SELECT UserOrGroupId
            FROM Reviewer_Query__Share
            WHERE ParentId = :queryId
            AND UserOrGroupId IN :userIds
        ];

        Set<Id> alreadyShared = new Set<Id>();
        for(Reviewer_Query__Share s : existingShares){
            alreadyShared.add(s.UserOrGroupId);
        }

        List<Reviewer_Query__Share> shareList = new List<Reviewer_Query__Share>();

        for(User u : coeUsers){
            if(!alreadyShared.contains(u.Id)){
                shareList.add(new Reviewer_Query__Share(
                    ParentId = queryId,
                    UserOrGroupId = u.Id,
                    AccessLevel = 'Edit',
                    RowCause = Schema.Reviewer_Query__Share.RowCause.Manual
                ));
            }
        }

        if(!shareList.isEmpty()){
            insert shareList;
        }

        rq.Status__c = 'Sent to COE';
        update rq;
    }


    /*-------------------------------------------------------
        SHARE QUERY WITH REVIEWER
    -------------------------------------------------------*/
    @AuraEnabled
    public static void shareWithReviewer(Id queryId){

        Reviewer_Query__c rq = [
            SELECT Id, Status__c
            FROM Reviewer_Query__c
            WHERE Id = :queryId
            LIMIT 1
        ];

        rq.Status__c = 'Sent to Reviewer';
        update rq;
    }


    /*-------------------------------------------------------
        COE REPLY
    -------------------------------------------------------*/
    @AuraEnabled
    public static void replyFromCOE(Id queryId, String replyText){

        if(String.isBlank(replyText)){
            throw new AuraHandledException('Reply cannot be empty.');
        }

        Reviewer_Query__c rq = [
            SELECT Id, Reply_from_COE__c, Status__c
            FROM Reviewer_Query__c
            WHERE Id = :queryId
            LIMIT 1
        ];

        rq.Reply_from_COE__c = replyText;
        rq.Status__c = 'Answered by COE';

        update rq;
    }


    /*-------------------------------------------------------
        PI REPLY
    -------------------------------------------------------*/
    @AuraEnabled
    public static void replyFromPI(Id queryId, String replyText){

        if(String.isBlank(replyText)){
            throw new AuraHandledException('Reply cannot be empty.');
        }

        Reviewer_Query__c rq = [
            SELECT Id, Reply_from_PI__c, Status__c
            FROM Reviewer_Query__c
            WHERE Id = :queryId
            LIMIT 1
        ];

        rq.Reply_from_PI__c = replyText;
        rq.Status__c = 'Answered by PI';

        update rq;
    }


    /*-------------------------------------------------------
        SHARE WITH PI (FIXED)
    -------------------------------------------------------*/
    @AuraEnabled
    public static void shareWithPI(Id queryId){

        Reviewer_Query__c rq = [
            SELECT Id, Status__c, Proposal__r.PI__c
            FROM Reviewer_Query__c
            WHERE Id = :queryId
            LIMIT 1
        ];

        if(rq.Proposal__r.PI__c == null){
            throw new AuraHandledException('PI not found on Proposal.');
        }

        // FIX 1: PI__c is a User lookup, query by Id directly
        List<User> piUsers = [
            SELECT Id
            FROM User
            WHERE Id = :rq.Proposal__r.PI__c
            AND IsActive = true
        ];

        if(piUsers.isEmpty()){
            throw new AuraHandledException('No active user found for PI.');
        }

        Set<Id> userIds = new Set<Id>();
        for(User u : piUsers){ userIds.add(u.Id); }

        List<Reviewer_Query__Share> existingShares = [
            SELECT UserOrGroupId
            FROM Reviewer_Query__Share
            WHERE ParentId = :queryId
            AND UserOrGroupId IN :userIds
        ];

        Set<Id> alreadyShared = new Set<Id>();
        for(Reviewer_Query__Share s : existingShares){
            alreadyShared.add(s.UserOrGroupId);
        }

        List<Reviewer_Query__Share> shareList = new List<Reviewer_Query__Share>();
        for(User u : piUsers){
            if(!alreadyShared.contains(u.Id)){
                shareList.add(new Reviewer_Query__Share(
                    ParentId = queryId,
                    UserOrGroupId = u.Id,
                    AccessLevel = 'Edit',
                    RowCause = Schema.Reviewer_Query__Share.RowCause.Manual
                ));
            }
        }

        // FIX 2: Use without sharing inner class to insert share records
        // FIX 2: Use without sharing inner class to insert share records
        new ShareInserter().insertShares(shareList);
        rq.Status__c = 'Sent to PI';
        update rq;
    }


    /*-------------------------------------------------------
        INNER CLASS - Insert share records without sharing rules
    -------------------------------------------------------*/
    private without sharing class ShareInserter {
        public  void insertShares(List<Reviewer_Query__Share> shares){
            if(!shares.isEmpty()){
                insert shares;
            }
        }
    }

}