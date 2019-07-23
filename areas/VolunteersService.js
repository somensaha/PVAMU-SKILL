const allFuctions = require('../functions');

const ChurchVoulteeringQuery = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'ChurchVoulteeringQuery';
    },
    handle(handlerInput) {
        console.log("VisitorCenter Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

const UniversityServiceHour = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'UniversityServiceHour';
    },
    handle(handlerInput) {
        console.log("FinancialAid Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

const GreekLetterOrg = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'GreekLetterOrg';
    },
    handle(handlerInput) {
        console.log("FinancialAid Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

module.exports = [ChurchVoulteeringQuery,UniversityServiceHour,GreekLetterOrg];