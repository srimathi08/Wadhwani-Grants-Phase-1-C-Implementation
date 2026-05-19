public with sharing class VolodyContractFlowInvoker {

    public class Input {
        @InvocableVariable(required=true)
        public Id contractId;
    }

    @InvocableMethod(label='Invoke Future Volody Contract Callout')
    public static void invokeFutureCall(List<Input> inputs) {
        for (Input input : inputs) {
            if (input.contractId != null) {
                System.debug(' Triggering future callout for: ' + input.contractId);
                VolodyContractFlow_OBCallout.sendVolodyContract(input.contractId);
            }
        }
    }
}