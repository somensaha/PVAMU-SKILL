const allFuctions = require('../functions');

const AthleticsNextSportsEvent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
                && handlerInput.requestEnvelope.request.intent.name === 'AthleticsNextSportsEvent' 
    }, handle(handlerInput) {
        console.log("AthleticsNextSportsEvent Handler::", handlerInput.requestEnvelope.request.intent.name);
        var intentName = handlerInput.requestEnvelope.request.intent.name;
        var skillSlotValue = handlerInput.requestEnvelope.request.intent.slots.pvamusportsevent.value;
        console.log("AthleticsNextSportsEvent===============slot value==" + skillSlotValue +" Intent Name::" +intentName);
        if (typeof skillSlotValue != 'undefined' && skillSlotValue != null) {
            var skillSlotValueLower = skillSlotValue.toLowerCase().trim();
            console.log("AthleticsNextSportsEvent===============slot lower value==" + skillSlotValueLower);
            slotnamereplaced = skillSlotValueLower;
            
            if (skillSlotValueLower.includes("men's hockey") && skillSlotValueLower.includes("women's hockey") != true) {
				slotnamereplaced = skillSlotValueLower.replace("men's hockey", "men's ice hockey");
				console.log("AthleticsNextSportsEvent===============slot lower mens ice hockey ==" + slotnamereplaced);
			}

			if (skillSlotValueLower.includes("women's hockey")) {
				slotnamereplaced = skillSlotValueLower.replace("women's hockey", "women's ice hockey");
            }
            
            slotnamereplaced = slotnamereplaced.replace("game","");
			slotnamereplaced = slotnamereplaced.replace("meet","");
			slotnamereplaced = slotnamereplaced.replace("event","");
			slotnamereplaced = slotnamereplaced.replace("meat","");
			
			if (slotnamereplaced.includes("country") && slotnamereplaced.includes("cross country") != true) {
				slotnamereplaced = slotnamereplaced.replace("country","cross country");
			}
			slotnamereplaced = slotnamereplaced.replace("snooker","soccer");
			slotnamereplaced = slotnamereplaced.replace("boxi","ice hockey");
			
			
            console.log("Final Slot Name replaced: " +slotnamereplaced);
            
            if (skillSlotValueLower.includes("men's") && skillSlotValueLower.includes("women's") != true) {

				var params = {
					TableName: allFuctions.PVAMUDynamicTable,
					FilterExpression: "#intent = :intent_val and contains (#answer, :answer_val) and not contains(#answer, :women_val)",
					ExpressionAttributeNames: {
						"#intent": 'IntentName',
						"#answer": 'Answer'
					},
					ExpressionAttributeValues: {
						":intent_val": intentName.trim(),
						":answer_val": slotnamereplaced,
						":women_val": "women's"
					},
					ProjectionExpression: "IntentName, Slot, Answer,EventTitle,EventDateTime,SportsEventLocation"
				};
			}
			else { // all conditions women
				var params = {
					TableName: allFuctions.PVAMUDynamicTable,
					FilterExpression: "#intent = :intent_val and contains (#answer, :answer_val)",
					ExpressionAttributeNames: {
						"#intent": 'IntentName',
						"#answer": 'Answer'
					},
					ExpressionAttributeValues: {
						":intent_val": intentName.trim(),
						":answer_val": slotnamereplaced
					},
					ProjectionExpression: "IntentName, Slot, Answer,EventTitle,EventDateTime,SportsEventLocation"
				};
            }
            
            console.log('params :  ', params);

            return allFuctions.scanSportingEventItem(slotnamereplaced, params).then((myResult) => {
                var obj = {
                    speechText: myResult + "What else would you like to know?",
                    displayText: myResult + "What else would you like to know?",
                    sessionEnd: false
                };
				return allFuctions.formSpeech(handlerInput, obj);
			})
        } else {
            const unhandled = require('./unhandled');
            return unhandled.handle(handlerInput);
        }
    }
}

const DefinedSlotIntents = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && (
                handlerInput.requestEnvelope.request.intent.name === 'GetBuildingAddress'
                || handlerInput.requestEnvelope.request.intent.name === 'GetPhoneNumber'
            );
    },
    handle(handlerInput) {
        console.log("DefinedSlotIntents Handler::", handlerInput.requestEnvelope.request.intent.name);
        var intentName = handlerInput.requestEnvelope.request.intent.name;
        var slot = allFuctions.getSlotValue(handlerInput).toLowerCase().replace(/[^A-Z0-9]+/ig, "");
        // if (intentName === 'GetPhoneNumber') {
        //     slot = handlerInput.requestEnvelope.request.intent.slots.OfficePhoneNumber.value.toLowerCase().replace(/[^A-Z0-9]+/ig, "");
        //     console.log("slot for GetPhoneNumber::"+slot)
        // } else {
        //     slot = handlerInput.requestEnvelope.request.intent.slots.buildingname.value.toLowerCase().replace(/[^A-Z0-9]+/ig, "");
        // }
        return allFuctions.DynamoDBScan(slot, handlerInput.requestEnvelope.request.intent.name, allFuctions.PVAMUStaticTable).then((data) => {
            var obj = {
                speechText: allFuctions.noValueReturned,
                displayText: allFuctions.noValueReturned,
                repromptSpeechText: allFuctions.listenspeech
            };
            if(data !== null) {
                obj = {
                    speechText: data.Answer + ' What else would you like to know?',
                    displayText: data.Answer + ' What else would you like to know?',
                    repromptSpeechText: allFuctions.listenspeech
                }
            }
            return allFuctions.formSpeech(handlerInput, obj);
        });
    }
}

const getPVAMUEventsHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'getPVAMUEvents';
    },
    handle(handlerInput) {
        var intentName = handlerInput.requestEnvelope.request.intent.name;
        var slot = handlerInput.requestEnvelope.request.intent.slots.eventdate.value;
        console.log("getPVAMUEvents Handler::", intentName, slot);
        return allFuctions.fnGetPVAMUEvents(handlerInput, intentName, slot);
    }
}

module.exports = [ 
    AthleticsNextSportsEvent,
    getPVAMUEventsHandler,
    DefinedSlotIntents
];