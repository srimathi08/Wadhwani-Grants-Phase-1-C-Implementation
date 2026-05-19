public with sharing class recTypeClass {

    public recTypeClass(ApexPages.StandardController acon) { 

    }

    Public string recId {get;set;} 

    public List<SelectOption> getReco() {

        UserAppInfo userAppInfo = [SELECT Id, AppDefinitionId FROM UserAppInfo WHERE UserId = :UserInfo.getUserId() LIMIT 1];

        AppDefinition appDefinition = [SELECT DurableId, Label FROM AppDefinition Where DurableId = :userAppInfo.AppDefinitionId LIMIT 1];

        RecordType[] recList = new RecordType[0];

        if(appDefinition.Label == 'WCF Grant Managment')

            recList = [select Id, Name, DeveloperName from RecordType where SobjectType='Account' and name in ('WCF', 'WCF Reviewer')];

        else 

            recList = [select Id, Name, DeveloperName from RecordType where SobjectType='Account' and name in ('COE', 'Reviewer')];

        List<SelectOption> options = new List<SelectOption>();

        for(RecordType rt : recList) {

            options.add(new selectOption(rt.Id, rt.name));

        }

        return options; 

    }}