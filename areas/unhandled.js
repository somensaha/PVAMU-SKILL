const allFuctions = require('../functions');

const UnhandledHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && (handlerInput.requestEnvelope.request.intent.name === 'Unhandled'
            || handlerInput.requestEnvelope.request.intent.name === 'HealthInsurance'
            );
    },
    handle(handlerInput) {
        console.log("UnhandledHandler Handler::");
        var obj = {
            speechText: allFuctions.noValueReturned,
            displayText: allFuctions.noValueReturned,
            repromptSpeechText: allFuctions.listenspeech
        }
        return allFuctions.formSpeech(handlerInput, obj);
    }
}


module.exports = UnhandledHandler;