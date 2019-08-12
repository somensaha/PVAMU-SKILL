const allFuctions = require('../functions');
const AWS = require('aws-sdk');


const UserInfo = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'UserInfo';
    },
    handle(handlerInput) {
        console.log("UserInfo Handler::", JSON.stringify(handlerInput.requestEnvelope.request.intent.slots));
        const currentIntent = handlerInput.requestEnvelope.request.intent.name;
        const name = handlerInput.requestEnvelope.request.intent.slots.name.value;
        const contacttype = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.contacttype);
        const userdepartment = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.userdepartment);
        console.log('slots are::', name, contacttype, userdepartment);
        let obj = null;
        const  contacttypeArr = new Map([
            ["Office","office address"], 
            ["TelephoneNo","telephone number"],
            ["EmailAddress","email address"],
            ["Department","department name"]
        ]);
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

        if (name && contacttype) {
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
            
            return fnFetchUserInfo(params, 'scan').then(res => {
                console.log(JSON.stringify(res));
                if (res === null || res.length === 0) {
                    speechText = 'Sorry no records found for ' + name + '. '+ allFuctions.repromptSpeechText;
                    obj = {
                        speechText: speechText,
                        displayText: speechText,
                        repromptSpeechText: allFuctions.listenspeech,
                        sessionEnd: false
                    }
                } else if (res.length === 1) {
                    const fullname = res[0].FirstName + " " + res[0].LastName;
                    if (contacttype === 'all') {
                        speechText = fullname+" belongs to the "+res[0]['Department']+". His email address would be '"+res[0]['EmailAddress']+"' You can also dial him up at "+res[0]['TelephoneNo']+" or reach his office at "+res[0]['Office']+"."
                        obj = {
                            speechText: speechText + ' ' + allFuctions.repromptSpeechText,
                            displayText: speechText + ' ' + allFuctions.repromptSpeechText,
                            repromptSpeechText: allFuctions.listenspeech,
                            sessionEnd: false
                        }
                    } else {
                        const contacttypeVal = contacttypeArr.get(contacttype);
                        contacttypeArr.delete(contacttype);
                        const proposedContactTypes = Array.from(contacttypeArr.values());
                        speechText = fullname + "'s " + contacttypeVal + ' is ' + 
                                        res[0][contacttype] + '. '+ 
                                        "Would you also like to know " + fullname + "'s "+ proposedContactTypes.join(', ') +"?"
                                        ;
                        obj = {
                            speechText: speechText,
                            displayText: speechText,
                            addElicitSlotDirective: 'contacttype'
                        }
                    }
                } else if (res.length > 1) {
                    const userlist = [];
                    res.forEach(item => {
                        userlist.push(item.FirstName+" "+item.LastName+" from "+item['Department']);
                    });
                    speechText = "Would you like to contact "+userlist.join(" or ")+"?";
                    obj = {
                        speechText: speechText,
                        displayText: speechText,
                        addElicitSlotDirective: 'name'                        
                    }
                }
                return allFuctions.formSpeech(handlerInput, obj);
            });
        } else if (name && !contacttype) {
            speechText = "I can assist you with the " + Array.from(contacttypeArr.values()).join(', ') + " of " + name + ".";
            obj = {
                speechText: speechText,
                displayText: speechText,
                addElicitSlotDirective: 'contacttype'
            }
            return allFuctions.formSpeech(handlerInput, obj);
        } else {

        }
    }
}


const fnFetchUserInfo = function(params, scanType) {
    return new Promise((resolve, reject) => {
        var docClient = new AWS.DynamoDB.DocumentClient();
        if (scanType === 'scan') {
            docClient.scan(params, onScan);            
        } else if (scanType === 'query') {
            docClient.query(params, onScan);
        }
        function onScan(err, data) {
            if (err) {
                console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                resolve(null);
            } else {
                console.log("Query Scan succeeded." + JSON.stringify(data));
                if (scanType === 'scan') {
                    if (typeof data.LastEvaluatedKey != "undefined") {
                        console.log("Scanning for more...");
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        docClient.scan(params, onScan);
                    }
                }
                resolve(data.Items);
            }
        }
    });
}

module.exports = [UserInfo];
