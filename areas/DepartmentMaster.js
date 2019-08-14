const allFuctions = require('../functions');
const DepartmentAddressPhoneIntents = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && (
                handlerInput.requestEnvelope.request.intent.name === 'DepartmentAddress'
                || handlerInput.requestEnvelope.request.intent.name === 'DepartmentPhone'
            );
    },
    handle(handlerInput) {
        console.log("DefinedSlotIntents Handler::", handlerInput.requestEnvelope.request.intent.name);
        var intentName = handlerInput.requestEnvelope.request.intent.name;
        var department = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.departmentmaster);
        let obj = null;
        let speechText = null;
        if (department) {
            var params = {
                TableName : "AskPVAMUDeptMaster",
                FilterExpression: "contains(DeptName,:Department)",
                ExpressionAttributeValues: {
                    ":Department": department
                }
            }

            return allFuctions.fnDynamoScan(params, 'scan').then(res => {
                if (res === null || res.length === 0) {
                    obj = {
                        speechText: allFuctions.noValueReturned,
                        displayText: allFuctions.noValueReturned,
                        repromptSpeechText: allFuctions.listenspeech,
                        sessionEnd: false
                    }
                } else {
                    if (intentName === 'DepartmentAddress') {
                        speechText = department+' is located at <say-as interpret-as="address">'+res[0].Location+'</say-as>. '+allFuctions.repromptSpeechText;
                    } else if (intentName === 'DepartmentPhone') {
                        speechText = department+'\'s contact number is <say-as interpret-as="telephone">'+res[0].MainNumber+'</say-as>. '+allFuctions.repromptSpeechText;
                    }
                    obj = {
                        speechText: speechText,
                        displayText: speechText,
                        repromptSpeechText: allFuctions.listenspeech,
                        sessionEnd: false
                    }
                }

                return allFuctions.formSpeech(handlerInput, obj);
            });
        } else {
            obj = {
                speechText: allFuctions.noValueReturned,
                displayText: allFuctions.noValueReturned,
                repromptSpeechText: allFuctions.listenspeech,
                sessionEnd: false
            }
            return allFuctions.formSpeech(handlerInput, obj);
        }
    }
}
module.exports = [ 
    DepartmentAddressPhoneIntents
];