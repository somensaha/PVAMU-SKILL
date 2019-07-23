const allFuctions = require('../functions');

const EmployerInformation = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'EmployerInformation';
    },
    handle(handlerInput) {
        console.log("VisitorCenter Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

const MyResume = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'MyResume';
    },
    handle(handlerInput) {
        console.log("FinancialAid Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

module.exports = [EmployerInformation, MyResume];