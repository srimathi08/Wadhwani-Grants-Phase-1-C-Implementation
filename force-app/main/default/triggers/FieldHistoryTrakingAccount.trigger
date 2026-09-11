trigger FieldHistoryTrakingAccount on Account (
    after insert,
    after update,
    before delete,
    after undelete
) {
    if(Trigger.isAfter) {
        if(Trigger.isUpdate) {
            EFH.API_EnhancedFieldHistoryAsync.api_createTrackingRecordAsync(
                'Account',
                Trigger.oldMap,
                Trigger.new
            );
        }
    }
}