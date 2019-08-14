const allFuctions = require('../functions');

const DepartmentInfo = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'DepartmentInfo';
    },
    handle(handlerInput) {
        console.log("DepartmentInfo Handler::", JSON.stringify(handlerInput.requestEnvelope.request.intent.slots));
        var userdepartment = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.userdepartment);
        var usertitle = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.usertitle);
        var obj = null;
        if (userdepartment) {
            var params = {
                TableName : "AskPVAMUUserMaster"
            };
            if (usertitle) {
                params['FilterExpression'] = "contains (Title,:Title) and contains(Department,:Department)";
                params['ExpressionAttributeValues'] = {
                    ":Title" : usertitle,
                    ":Department" : userdepartment
                }

                return allFuctions.fnDynamoScan(params, 'scan').then(res => {
                    console.log(JSON.stringify(res));
                    if (res === null || res.length === 0) {
                        speechText = 'Unfortunately we don\'t have any records for '+usertitle+' of '+userdepartment+'. '+ allFuctions.repromptSpeechText;
                        obj = {
                            speechText: speechText,
                            displayText: speechText,
                            repromptSpeechText: allFuctions.listenspeech,
                            sessionEnd: false
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    } else if (res.length > 1) {
                        speechText = 'We have found '+res.length+' records under '+usertitle+' from '+userdepartment+'. You may find the list below. ';
                        let users = [];
                        res.forEach((item) => {
                            users.push(item.FirstName+' '+item.LastName);
                        });
                        const usersStr = users.join(', ');
                        speechText += usersStr+'. '+allFuctions.repromptSpeechText;
                        obj = {
                            speechText: speechText,
                            displayText: speechText,
                            repromptSpeechText: allFuctions.listenspeech,
                            sessionEnd: false
                        }
                        return allFuctions.formSpeech(handlerInput, obj);

                    } else if (res.length === 1) {
                        speechText = res[0].FirstName+' '+res[0].LastName+' is the '+usertitle+' of '+userdepartment+'. Do you wanna get details?';
                        obj = {
                            speechText: speechText,
                            displayStandardCardText: speechText,
                            addConfirmIntentDirective: 'UserInfo',
                            slots: {
                                "name": {
                                    "name": "name",
                                    "value": res[0].FirstName+' '+res[0].LastName
                                },
                                "userdepartment": {
                                    "name": "userdepartment",
                                    "value": userdepartment

                                }
                            }
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    }
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

module.exports = [DepartmentInfo];
