trigger FieldHistoryTrackingIndividualApplication on IndividualApplication (
    after insert,
    after update,
    before delete,
    after undelete
) {
    if(Trigger.isAfter) {
        if(Trigger.isInsert) {
            EFH.API_EnhancedFieldHistoryAsync.api_createTrackingRecordAsync(
                'IndividualApplication',
                null,                // no oldMap on insert
                Trigger.new
            );
        }
        if(Trigger.isUpdate) {
            EFH.API_EnhancedFieldHistoryAsync.api_createTrackingRecordAsync(
                'IndividualApplication',
                Trigger.oldMap,
                Trigger.new
            );
        }
        if(Trigger.isUndelete) {
            EFH.API_EnhancedFieldHistoryAsync.api_createTrackingRecordAsync(
                'IndividualApplication',
                null,
                Trigger.new
            );
        }
    }
}