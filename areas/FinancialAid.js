const allFuctions = require('../functions');

const FinancialAid = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'FinancialAid';
    },
    handle(handlerInput) {
        console.log("VisitorCenter Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

const ParentsSeparation = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'ParentsSeparation';
    },
    handle(handlerInput) {
        console.log("FinancialAid Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

const SpeialCircumstances = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'SpeialCircumstances';
    },
    handle(handlerInput) {
        console.log("FinancialAid Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

const FAFSAInformation = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'FAFSAInformation';
    },
    handle(handlerInput) {
        console.log("FinancialAid Handler::");
        return allFuctions.setDynamoParams(handlerInput);
    }
}

module.exports = [ FinancialAid,ParentsSeparation,SpeialCircumstances,FAFSAInformation];