const allFuctions = require('../functions');
const request = require('request');
const Fuse = require('fuse.js');

const GetBiteMenu = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' 
            && handlerInput.requestEnvelope.request.intent.name === 'GetBiteMenu';
    },
    handle(handlerInput) {
        console.log("GetBiteMenu Handler::", JSON.stringify(handlerInput.requestEnvelope.request.intent.slots));
        const currentIntent = handlerInput.requestEnvelope.request.intent.name;
        var fooditem = handlerInput.requestEnvelope.request.intent.slots.fooditem.value;
        // var fooditem = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.fooditem);
        var mealtime = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.mealtime);
        var calorieadj = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.calorieadj);
        var foodtype = allFuctions.getDialogSlotValue(handlerInput.requestEnvelope.request.intent.slots.foodtype);
        var eventdate = handlerInput.requestEnvelope.request.intent.slots.eventdate.value;
        var foodtypeArr = {
            'vegan': 'Vegan',
            'veg': "Vegeterian",
            'non-veg': 'Non-Vegetarian'
        }
        if (!eventdate) {
            eventdate = new Date().toISOString().split('T')[0];
        }
        var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        var eventDay = days[new Date(eventdate).getDay()].toLowerCase();
        console.log(fooditem, eventdate, mealtime, calorieadj, foodtype);
        console.log('eventDay', eventDay);
        var obj = null;
        var url = process.env.MENU_S3_URL;
        var speechText = null;

        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'DENIED') {
            console.log(currentIntent, 'denied');
            obj = {
                speechText: allFuctions.repromptSpeechText,
                displayText: allFuctions.repromptSpeechText,
                repromptSpeechText: allFuctions.listenspeech,
                sessionEnd: false
            }
            return allFuctions.formSpeech(handlerInput, obj);
        }

        if ((eventDay === 'sunday' || eventDay === 'saturday') && mealtime) {
            if (mealtime.toLowerCase() === 'breakfast' || mealtime.toLowerCase() === 'lunch') {
                speechText = 'On '+eventDay+' we serve brunch instead of breakfast and lunch. Would you like to know the menu for brunch or dinner?';
                obj = {
                    speechText: speechText,
                    displayStandardCardText: speechText,
                    addElicitSlotDirective: 'mealtime'
                }
                return allFuctions.formSpeech(handlerInput, obj);
            }
        }

        return getScrapperValue(url).then(body => {
            if (body) {
                console.log('body', body);
                body = JSON.parse(body);
                if (calorieadj) {
                    if (mealtime) {
                        body = body.filter(item => {
                            if (item['formalName'].trim() !== '' && item['meal'].toLowerCase() === mealtime.toLowerCase() && item['startTime'].split('T')[0] === eventdate) {
                                return item;
                            }
                        });
                    } else {
                        body = body.filter(item => {
                            if (item['formalName'].trim() !== '' && item['startTime'].split('T')[0] === eventdate) {
                                return item;
                            }
                        });
                    }

                    if (body.length === 0) {
                        if (mealtime) {
                            speechText = 'Unfortunately we do not have any menu for '+mealtime+' on '+eventDay;
                        } else {
                            speechText = 'Unfortunately we do not have any menu on '+eventDay;
                        }
                        obj = {
                            speechText: speechText + '. '+allFuctions.repromptSpeechText,
                            displayText: speechText + '. '+allFuctions.repromptSpeechText,
                            repromptSpeechText: allFuctions.listenspeech,
                            sessionEnd: false
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    }

                    if (calorieadj === 'highest') {
                        body = body.sort(function(a,b) {
                            return b.kcal - a.kcal;
                        });
                        obj = {
                            speechText: ''
                        }
                    } else if (calorieadj === 'lowest') {
                        body = body.sort(function(a,b) {
                            return a.kcal - b.kcal;
                        });
                    }

                    if (mealtime) {
                        speechText = 'The '+calorieadj+' caloried food for '+eventDay+'\'s '+mealtime+' is the '+body[0]['formalName']+' with '+body[0]['calories']+'kCal';
                    } else {
                        speechText = 'The '+calorieadj+' caloried food in '+eventDay+'\'s menu is the '+body[0]['formalName']+' with '+body[0]['calories']+'kCal';
                    }
                    obj = {
                        speechText: speechText + '. '+allFuctions.repromptSpeechText,
                        displayText: speechText + '. '+allFuctions.repromptSpeechText,
                        repromptSpeechText: allFuctions.listenspeech,
                        sessionEnd: false
                    }
                    return allFuctions.formSpeech(handlerInput, obj);

                }
                
                if (fooditem) {
                    var options = {
                        keys: ['formalName'],
                        threshold: 0.6,
                        includeScore: true,
                        shouldSort: true
                    };
                    var fuse = new Fuse(body, options);
                    let selectedFood = fuse.search(fooditem);
                    // let selectedFood = body.find(item => item.formalName === fooditem);
                    console.log('selectedFood', selectedFood);
                    if (selectedFood && selectedFood[0]['score'] < 0.5) {
                        selectedFood = selectedFood[0]['item'];
                        speechText = selectedFood['formalName']+' has '+selectedFood['calories']+' calories';
                    } else {
                        speechText = 'We do not have '+fooditem+' in the menu';
                    }
                    obj = {
                        speechText: speechText + '. '+allFuctions.repromptSpeechText,
                        displayText: speechText + '. '+allFuctions.repromptSpeechText,
                        repromptSpeechText: allFuctions.listenspeech,
                        sessionEnd: false
                    }
                    return allFuctions.formSpeech(handlerInput, obj);
                }

                if (eventdate) {
                    if (mealtime && foodtype) {
                        let selectedDayMenu = body.filter(item => {
                            // console.log(item, foodtype);
                            if (item['meal'].toLowerCase() === mealtime.toLowerCase() && item['formalName'].trim() !== '' && item['startTime'] && item['startTime'].split('T')[0] === eventdate) {
                                if (foodtype === 'vegan') {
                                    if (item['isVegan']) {
                                        return item;
                                    }
                                } else if (foodtype === 'veg') {
                                    if (item['isVegetarian']) {
                                        return item;
                                    }
                                } else if (foodtype === 'non-veg') {
                                    if (!item['isVegetarian'] && !item['isVegan']) {
                                        return item;
                                    }
                                }
                            }
                        });
                        eventdate = new Date(eventdate);
                        console.log('selectedDayMenu', selectedDayMenu);
                        if (selectedDayMenu.length === 0) {
                            speechText = 'Unfortunately we are not serving any '+foodtypeArr[foodtype]+' items under '+mealtime+' on '+eventdate.toLocaleDateString("en-US", {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
                            obj = {
                                speechText: speechText + '. '+allFuctions.repromptSpeechText,
                                displayText: speechText + '. '+allFuctions.repromptSpeechText,
                                repromptSpeechText: allFuctions.listenspeech,
                                sessionEnd: false
                            }
                            return allFuctions.formSpeech(handlerInput, obj);
                        }
                        if (handlerInput.requestEnvelope.request.intent.confirmationStatus === 'CONFIRMED') {
                            var menuItems = selectedDayMenu.map(menIt => {
                                return menIt['formalName']+' with '+menIt['calories']+'kCal';
                            });
                            speechText = 'For '+mealtime+' under '+foodtypeArr[foodtype]+' on '+eventdate.toLocaleDateString("en-US", {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})+' we have \n'+menuItems.join(', \n');
                            obj = {
                                speechText: speechText + '. \n'+allFuctions.repromptSpeechText,
                                displayText: speechText + '. \n'+allFuctions.repromptSpeechText,
                                repromptSpeechText: allFuctions.listenspeech,
                                sessionEnd: false
                            }
                            return allFuctions.formSpeech(handlerInput, obj);
                        } else {
                            var menuItems = selectedDayMenu.map(menIt => {
                                return menIt['formalName'];
                            });
                            speechText = 'For '+mealtime+' under '+foodtypeArr[foodtype]+' on '+eventdate.toLocaleDateString("en-US", {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})+' we have \n'+menuItems.join(', \n')+'.\n If you wish to know the calorie information try asking, "What is the calorie for '+menuItems[0]+'?"';
                            obj = {
                                speechText: speechText,
                                // displayText: speechText,
                                repromptSpeechText: allFuctions.listenspeech,
                                sessionEnd: false,
                                displayStandardCardText: speechText,
                                addElicitSlotDirective: 'fooditem'
                                // addConfirmIntentDirective: currentIntent,
                                // slots: handlerInput.requestEnvelope.request.intent.slots
                            }
                            return allFuctions.formSpeech(handlerInput, obj);
                        }
                    }else if (mealtime && !foodtype) {
                        let selectedDayMenu = body.filter(item => {
                            if (item['meal'].toLowerCase() === mealtime.toLowerCase() && item['formalName'].trim() !== '' && item['startTime'].split('T')[0] === eventdate) {
                                return item;
                            }
                        });

                        eventdate = new Date(eventdate);
                        console.log('selectedDayMenu', selectedDayMenu);
                        if (selectedDayMenu.length === 0) {
                            speechText = 'Unfortunately we do not have any menu for '+mealtime+' on '+eventdate.toLocaleDateString("en-US", {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
                            obj = {
                                speechText: speechText + '. '+allFuctions.repromptSpeechText,
                                displayText: speechText + '. '+allFuctions.repromptSpeechText,
                                repromptSpeechText: allFuctions.listenspeech,
                                sessionEnd: false
                            }
                            return allFuctions.formSpeech(handlerInput, obj);
                        }
                        // let menuItems = selectedDayMenu.map(menIt => {
                        //     return menIt['course'];
                        // });
                        // menuItems = [...new Set(menuItems)];
                        // console.log('menuItems', menuItems);
                        speechText = 'For '+mealtime+' on '+eventdate.toLocaleDateString("en-US", {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})+' I can assist you for Vegetarian, Vegan and Non-Vegetarian food. Which one would you like to know?';
                        obj = {
                            speechText: speechText,
                            displayStandardCardText: speechText,
                            addElicitSlotDirective: 'foodtype' 
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    } else if (!fooditem && handlerInput.requestEnvelope.request.dialogState === '') {

                    } else {
                        if (eventDay === 'sunday' || eventDay === 'saturday') {
                            speechText = 'Would you like to get the menu for brunch or dinner?';
                        } else {
                            speechText = 'Would you like to get the menu for breakfast, lunch or dinner?';
                        }
                        obj = {
                            speechText: speechText,
                            displayStandardCardText: speechText,
                            addElicitSlotDirective: 'mealtime'
                        }
                        return allFuctions.formSpeech(handlerInput, obj);
                    }
                }
                obj = {
                    speechText: allFuctions.noValueReturned,
                    displayText: allFuctions.noValueReturned,
                    repromptSpeechText: allFuctions.listenspeech,
                    sessionEnd: false
                }
                return allFuctions.formSpeech(handlerInput, obj);
            } else {
                obj = {
                    speechText: allFuctions.noValueReturned,
                    displayText: allFuctions.noValueReturned,
                    repromptSpeechText: allFuctions.listenspeech,
                    sessionEnd: false
                }
                return allFuctions.formSpeech(handlerInput, obj);
            }
        });
    }
}

const getScrapperValue = function(url) {
    return new Promise((resolve, reject) => {
        request.get(url,null, function(err, res, body) {
            if (err) {
                resolve(null);
            } else if(res.statusCode === 200) {
                resolve(body);
            } else {
                resolve(null);
            }
        });
    })
}

module.exports = [GetBiteMenu];
