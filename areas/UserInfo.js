const allFuctions = require('../functions');

const UserInfo = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'UserInfo';
    },
    handle(handlerInput) {
        console.log("UserInfo Handler::", JSON.stringify(handlerInput.requestEnvelope.request.intent.slots));
        const currentIntent = handlerInput.requestEnvelope.request.intent.name;
        var name = handlerInput.requestEnvelope.request.intent.slots.name.value;
        var contacttype = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.contacttype);
        var userdepartment = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.userdepartment);
        console.log('slots are::', name, contacttype, userdepartment);
        let obj = null;
        const  contacttypeArr = new Map([
            ["Office","office address"], 
            ["TelephoneNo","telephone number"],
            ["EmailAddress","email address"],
            ["Department","department"]
        ]);

        try {
            var params = {
                TableName : "AskPVAMUUserMaster"
            };
            let speechText = '';

            if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED') {
                obj = {
                    speechText: allFuctions.YesPrompt,
                    displayText: allFuctions.YesPrompt,
                    repromptSpeechText: allFuctions.listenspeech,
                    sessionEnd: false
                }
                return allFuctions.formSpeech(handlerInput, obj);
            }

            if (name) {
                if (userdepartment) {
                    params['FilterExpression'] = "contains (FullName,:FullName) and contains(Department,:Department)";
                    params['ExpressionAttributeValues'] = {
                        ":FullName" : name.replace(/\s/g,'').toLowerCase(),
                        ":Department" : userdepartment
                    }
                } else {
                    params['FilterExpression'] = "contains (FullName,:FullName)";
                    params['ExpressionAttributeValues'] = {
                        ":FullName" : name.replace(/\s/g,'').toLowerCase()
                    }
                }

                return allFuctions.fnDynamoScan(params, 'scan').then(res => {
                    console.log(JSON.stringify(res));
                    if (res === null || res.length === 0) {
                        speechText = 'Sorry no records found for ' + name + '. '+ allFuctions.repromptSpeechText;
                        obj = {
                            speechText: speechText,
                            displayText: speechText,
                            repromptSpeechText: allFuctions.listenspeech,
                            sessionEnd: false
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    } else if (res.length > 1) {
                        const userlist = [];
                        res.forEach(item => {
                            userlist.push(item.FirstName+" "+item.LastName+" from "+item['Department']);
                        });
                        speechText = "Would you like to contact "+userlist.join(" or ")+"?";
                        obj = {
                            speechText: speechText,
                            displayStandardCardText: speechText,
                            addElicitSlotDirective: 'name'                        
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    } else {
                        const fullname = res[0].FirstName + " " + res[0].LastName;
                        if (contacttype || handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED') {
                            if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED') {
                                speechText = fullname+" belongs to the "+res[0]['Department']+'. Email address would be <say-as interpret-as="characters">'+res[0]['EmailAddress']+'</say-as>, you can also dial him up at <say-as interpret-as="telephone">'+res[0]['TelephoneNo']+'</say-as> or reach his office at <say-as interpret-as="address">'+res[0]['Office']+"</say-as>."
                                obj = {
                                    speechText: speechText + ' ' + allFuctions.repromptSpeechText,
                                    displayText: speechText + ' ' + allFuctions.repromptSpeechText,
                                    repromptSpeechText: allFuctions.listenspeech,
                                    sessionEnd: false
                                }
                                return allFuctions.formSpeech(handlerInput, obj);
                            } else if (contacttype) {
                                const contacttypeVal = contacttypeArr.get(contacttype);
                                contacttypeArr.delete(contacttype);
                                const proposedContactTypes = Array.from(contacttypeArr.values());
                                let ansVal = '';
                                if (contacttype === 'TelephoneNo') {
                                    ansVal = '<say-as interpret-as="telephone">'+res[0][contacttype]+'</say-as>';
                                } else if (contacttype === 'EmailAddress') {
                                    ansVal = '<say-as interpret-as="characters">'+res[0][contacttype]+'</say-as>';                                
                                    // ansVal = '<sub alias="'+res[0][contacttype]+'">'+res[0][contacttype]+'</say-as>';
                                } else if (contacttype === 'Office') {
                                    ansVal = '<say-as interpret-as="address">'+res[0][contacttype]+'</say-as>';
    
                                } else {
                                    ansVal = res[0][contacttype];
                                }
                                speechText = fullname + "'s " + contacttypeVal + ' is ' + ansVal +'. '+ 
                                                "Would you also like to know " + fullname + "'s "+ proposedContactTypes.join(', ') +"?"
                                                ;
                                obj = {
                                    speechText: speechText,
                                    displayStandardCardText: speechText,
                                    addConfirmIntentDirective: currentIntent,
                                    slots: handlerInput.requestEnvelope.request.intent.slots
                                }
                                return allFuctions.formSpeech(handlerInput, obj);
                            }
        
                        } else if (!contacttype) {
                            speechText = "I can assist you with the " + Array.from(contacttypeArr.values()).join(', ') + " of " + name + ". Which contact information you want to know?";
                            obj = {
                                speechText: speechText,
                                displayStandardCardText: speechText,
                                addElicitSlotDirective: 'contacttype'
                            }
                            return allFuctions.formSpeech(handlerInput, obj);
                        }
                    }
                });
            } else {
                speechText = 'I could not get person name. Please say again.'
                obj = {
                    speechText: speechText,
                    displayStandardCardText: speechText,
                    addElicitSlotDirective: 'name'                        
                }
                return allFuctions.formSpeech(handlerInput, obj);
            }
        } catch (error) {
             console.log(error);   
        }
    }
}

module.exports = [UserInfo];
