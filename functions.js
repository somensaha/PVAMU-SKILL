var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
var request = require('request');
const stripHtml = require("string-strip-html");
var dateFormat = require('dateformat');
const mainJson = require('./apl/main.json');
const dataJson = require('./apl/data.json');
// const studentCategoriesAPI = 'http://54.174.19.182:8081/students/getStudentDetails';
const googleAPIKey = process.env.googleAPIKey;
const stringSimilarity = require('string-similarity');


module.exports = {
    getColumn: "Answer",
    dayNames: {0:'Sunday',1:'Monday',2:'Tuesday',3:'Wednesday',4:'Thursday',5:'Friday',6:'Saturday'},
    PVAMUStaticTable: 'AskPVAMUStatic',
    PVAMUDynamicTable: 'AskPVAMUDynamic',
    PVAMUDepartmentMaster:'AskPVAMUDeptMaster',
    
    defaultImage: 'https://pvamu-prod.s3.amazonaws.com/pvamu-logo-large1.png',

    remindersArray: [
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Disability Center. ',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Health and Counseling. ',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Financial Aid.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Career Services.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Registrar.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about International.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Student Conduct.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Volunteers Services.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Student Engagement.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Housing.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Dean of Students.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Library.',
        'Thank you for using My Panther, Just a reminder, don\'t forget to ask about Student Employment. '
    ],

    daysArray: ['','monday','tuesday','wednesday','thursday','friday','saturday','sunday'],
    noInformation: 'Sorry I could not find any information. Please contact administrator',
    repromptSpeechText: 'What else would you like to know?',
    noValueReturned: "Sorry I couldn't find any information on that or maybe I misunderstood you. Please try again.",
    listenspeech: 'Is there anything else I can help you with?',
	helpspeech: 'My Panther is designed to answer your university questions. How may I help you?',
    YesPrompt: ' What would you like to know?',
    needtoLinkYourAccount: 'To access this service you need to link your account with Alexa.',
    optOutCategory: 'You have opted out of this category of questions.',
    welcomeMessage: "Welcome to the Prairie view <sub alias=\"A and M\">A & M</sub> University My Panther Skill. What would you like to know?",
    signUpMessage: 'You have not registered with PVAMU portal, Please sign up',
    semilinkWelcomeMessage: "Welcome to the My Panther Skill. ",
	

    stripSpeakOptions: {
        ignoreTags: ['amazon:effect', 'audio', 'break', 'emphasis', 'p', 'phoneme', 'prosody', 's', 'say-as', 'speak', 'sub', 'w'],
        stripTogetherWithTheirContents: ["script", "style", "xml"],
        skipHtmlDecoding: false,
        returnRangesOnly: false,
        trimOnlySpaces: false,
        dumpLinkHrefsNearby: false
    },

    stripCardOptions: {
        ignoreTags: [],
        stripTogetherWithTheirContents: ["script", "style", "xml"],
        skipHtmlDecoding: false,
        returnRangesOnly: false,
        trimOnlySpaces: false,
        dumpLinkHrefsNearby: false
    },

    checkVideoSupport: function(handlerInput) {
        if(typeof handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display !== "undefined") {
            return true;
        } else {
            return false;
        }
    },

    setDynamoParams: async function(handlerInput) {
        var intentName = handlerInput.requestEnvelope.request.intent.name;
        var slot = this.getSlotValue(handlerInput);
        console.log('slot', slot);
        if(slot !== null) {
            if (slot === 'staticNoSlot') {
                var params = {
                    TableName: this.PVAMUStaticTable,
                    FilterExpression: "#title = :title_val",
                    ExpressionAttributeNames: {
                        "#title": 'IntentName',
                    },
                    ExpressionAttributeValues: { ":title_val": intentName }
                };
            } else {
                slot = slot.toLowerCase().replace(/[^A-Z0-9]+/ig, "");
                var params = {
                    TableName: this.PVAMUStaticTable,
                    FilterExpression: "#title = :title_val AND #slot = :slot_val",
                    ExpressionAttributeNames: {
                        "#title": 'IntentName',
                        "#slot": 'Slot'
                    },
                    ExpressionAttributeValues: { ":title_val": intentName, ":slot_val": slot }
                };
            }
        } else {
            //emit to unhandle
            const unhandled = require('./areas/unhandled');
            return unhandled.handle(handlerInput);
        }
        

        var obj = await this.scanDynamoItem(params);
        return this.formSpeech(handlerInput, obj);
    },

    scanDynamoItem: function(params) {
        return new Promise((resolve, reject) => {
            var docClient = new AWS.DynamoDB.DocumentClient();
            docClient.scan(params, (err, data) => {
                console.log("Dynamo Scan params ==>", params, "<==> results ==>", data);
                var obj = null;
                obj = {
                    speechText: this.noValueReturned,
                    displayText: this.noValueReturned,
                    repromptSpeechText: this.listenspeech
                }
                if (err) {
                    console.error("Dynamo Scan Error ==>", JSON.stringify(err));
                } else {
                    var speechText = '';
                    if (data.Items.length !== 0) {
                        console.log("count of items:", data.Items.length);
                        data.Items.forEach(function (itemdata) {
                            speechText = speechText + itemdata.Answer;
                        });
                        console.log("Dynamo Scan Result", speechText);
                        obj = {
                            speechText: speechText + ' What else would you like to know?',
                            displayText: speechText + ' What else would you like to know?',
                            repromptSpeechText: this.listenspeech
                        }
                    }
                    resolve(obj);
                }                
            });
        });
    },

    formSpeech: function(handlerInput, obj = {}) {
        console.log('formSpeech::::', obj);
        var displaySupport = this.checkVideoSupport(handlerInput);
        var handler = handlerInput.responseBuilder;

        // if (obj.needtoAccountLinking !== undefined) {
        //     if (obj.needtoAccountLinking === true) {
        //         handler.withLinkAccountCard();
        //     }
        // } else {
            if (obj.displayText !== undefined && displaySupport === true) {
                obj.displayText = obj.displayText.replace(/<(?:.|\n)*?>/gm, '');
                handler.addDirective({
                        type: 'Alexa.Presentation.APL.RenderDocument',
                        version: '1.0',
                        document: mainJson,
                        datasources: this.setTemplateBody(obj.displayText)
                });
            } else if(obj.displayText !== undefined) {
                obj.displayText = obj.displayText.replace(/<(?:.|\n)*?>/gm, '');
                handler.withStandardCard('PVAMU', obj.displayText, this.defaultImage, this.defaultImage);
            }
        // }

        if (obj.displayStandardCardText !== undefined) {
            handler.withStandardCard('PVAMU', obj.displayStandardCardText.replace(/<(?:.|\n)*?>/gm, ''), this.defaultImage, this.defaultImage);
        }
        
        if (obj.speechText !== undefined && obj.speechText !== null) {
            obj.speechText = obj.speechText.replace('&', 'and').replace(' & ', ' and ');
            console.log('speechtext in function modified::', obj.speechText, typeof obj.speechText);
            handler.speak(obj.speechText);
        }
        if (obj.repromptSpeechText !== undefined && obj.repromptSpeechText !== null) {
            console.log('repromptSpeechText::', obj.repromptSpeechText, typeof obj.repromptSpeechText);
            obj.repromptSpeechText = obj.repromptSpeechText.replace('&', 'and').replace(' & ', ' and ');
            handler.reprompt(obj.repromptSpeechText);
        }

        if (obj.addConfirmIntentDirective !== undefined && obj.addConfirmIntentDirective !== null) {
            console.log('addConfirmIntentDirective', obj.addConfirmIntentDirective);
            handler.addConfirmIntentDirective({
                name: obj.addConfirmIntentDirective,
                confirmationStatus: 'CONFIRMED',
                slots: obj.slots
            })
        }

        if (obj.addElicitSlotDirective !== undefined && obj.addElicitSlotDirective !== null) {
            console.log('addElicitSlotDirective', obj.addElicitSlotDirective);
            handler.addElicitSlotDirective(obj.addElicitSlotDirective);
        }

        if (obj.addDelegateDirective !== undefined && obj.addDelegateDirective !== null) {
            console.log('addDelegateDirective', obj.addDelegateDirective);
            handler.addDelegateDirective({
                name: obj.addDelegateDirective,
                slots: obj.slots
            })
        }
        // if (handler.requestEnvelope !== undefined) {
        //     if (handler.requestEnvelope.session.new == true && handler.requestEnvelope.request.type == "IntentRequest") {
        //         handler.withShouldEndSession(true);
        //     } else {
        //         handler.withShouldEndSession(false);
        //     }
        // }
        if (obj.sessionEnd !== undefined && obj.sessionEnd === true) {
            console.log('end session id true');
            handler.withShouldEndSession(true);
        }

        if (obj.sessionEnd !== undefined && obj.sessionEnd === false) {
            console.log('end session id false');
            handler.withShouldEndSession(false);
        }
        // console.log('Ended Response time at', new Date());
        return handler.getResponse();
    },

    

    prependReminders: function(message,reminders) {
        if (reminders.length != 0){
            var item = reminders[Math.floor(Math.random() * reminders.length)];
            return item + " " + message;
        }else{
            return message;
        }
    },

    setTemplateBody: function(rawText, images = null) {
        var data = dataJson;
        rawText = rawText.replace(/&/g, " and ");
        rawText = rawText.replace(/quot;/g, " ");
        rawText = stripHtml(rawText, this.stripCardOptions);
        data.bodyTemplate3Data.textContent.primaryText.text = rawText;
        if (images === null) {
            data.bodyTemplate3Data.image.sources[0].url = this.defaultImage;
            data.bodyTemplate3Data.image.sources[1].url = this.defaultImage;
        }
        // console.log('setTemplateBody::data::::', JSON.stringify(data));
        return data;
    },

    getSlotValue: function(handlerInput) {
        if (handlerInput.requestEnvelope.request.intent.slots !== undefined) {
            console.log('slottt', handlerInput.requestEnvelope.request.intent.slots);
            var slotKeys = Object.keys(handlerInput.requestEnvelope.request.intent.slots);
            var slotObj = slotKeys.filter(item => {
                return handlerInput.requestEnvelope.request.intent.slots[item].resolutions !== undefined;
            });
            if (slotObj) {
                slotObj = slotObj[0];
            }
            if (slotObj !== undefined) {
                var slotValue = handlerInput.requestEnvelope.request.intent.slots[slotObj].resolutions.resolutionsPerAuthority[0].values[0].value.name.toLowerCase();    
            } else {
                var slotValue = null;                
            }
        } else {
            var intentName = handlerInput.requestEnvelope.request.intent.name;
            console.log('slot undefined', intentName);
            var slotValue = 'staticNoSlot';
        }
        console.log('getSloValue::slotValue', slotValue);
        return slotValue;
    },

    
    queryScan: function (params) {
        return new Promise((resolve, reject) => {
            var docClient = new AWS.DynamoDB.DocumentClient();
            docClient.query(params, onScan);
            function onScan(err, data) {
                if (err) {
                    console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
                    resolve(null);
                } else {
                    console.log("Query Scan succeeded." + JSON.stringify(data));
                    if (data.Items.length > 0) {
                        var itemdataFinal = data.Items[0];
                    } else {
                        var itemdataFinal = null;
                    }
                    resolve(itemdataFinal);
                }
            }
        });
    },

    slotForAllWhatIs: async function(handlerInput, slotName = null) {
        var ans = await this.searchQuery(slotName);
        var obj = null;
        if (ans === null) {
            obj = {
                speechText: this.noValueReturned,
                displayText: this.noValueReturned,
                repromptSpeechText: this.listenspeech
            }
        } else {
            obj = {
                speechText: ans + ' What else would you like to know?',
                displayText: ans + ' What else would you like to know?',
                repromptSpeechText: this.listenspeech
            }
        }
        return this.formSpeech(handlerInput, obj);
    },

    searchQuery: function(slotName = null) {
        return new Promise((resolve, reject) => {
			var params = {
				TableName: this.PVAMUStaticTable,
				FilterExpression: "#title = :title_val",
				ExpressionAttributeNames: {
					  "#title": 'IntentName',
				},
				ExpressionAttributeValues: { ":title_val": 'AllWHQuestions' }
			}

			// Scan DynamoDB
			var docClient = new AWS.DynamoDB.DocumentClient();
			docClient.scan(params, (err, data) => {
				if(err) {
                    console.log('stringSimilarityfn err =>' + JSON.stringify(err))
                    resolve(null);                    
				}
				var slots = [];
				if(data) {
					data.Items.forEach(function(itemdata) {
						slots.push(itemdata.Slot);
					});
                    if (slots.length === 0) {
                        resolve(null);
                    }
					// Levenstein best match result
					var matches = stringSimilarity.findBestMatch(slotName, slots);
					console.log('stringSimilarityfn best match slot ==> ' + slotName + '====with dynamodb slots ==>' + JSON.stringify(slots) + ' result ==> ' + JSON.stringify(matches));
                    if (matches.bestMatch.rating < 0.5) {
                        resolve(null);
                    } else {
                        var bestMatched = data.Items.filter(item => {
                            return item.Slot == matches.bestMatch.target;
                        });
                        console.log('stringSimilarityfn best match answer ======', bestMatched[0].Answer);
                        resolve(bestMatched[0].Answer);
                    }
				}
			});
		});
    },

    DynamoDBScan: function(slot = null, intentName = null, tableName = null) {
        return new Promise((resolve, reject) => {
            var params = {
                TableName: tableName,
				FilterExpression: "#title = :title_val",
				ExpressionAttributeNames: {
					  "#title": 'IntentName',
				},
				ExpressionAttributeValues: { ":title_val": intentName }
            };
            if (slot !== null) {
                params = {
                    TableName: tableName,
                    FilterExpression: "#slot = :slotval and #intent = :intentval",
                    ExpressionAttributeNames: {
                        "#slot": "Slot",
                        "#intent":"IntentName"
                    },
                    ExpressionAttributeValues: { ":slotval": slot ,":intentval":intentName}
                };
            }
            
			// Scan DynamoDB
			var docClient = new AWS.DynamoDB.DocumentClient();
			docClient.scan(params, (err, data) => {
				if(err) {
                    console.log('dynamodb scan err =>' + JSON.stringify(err))
                    resolve(null);                    
                }
                console.log('dynamodb scan res =>' + JSON.stringify(data))                
				if(data && data.Items.length > 0) {
                    resolve(data.Items[0]);
				} else {
                    resolve(null);
                }
			});
        });
    },

    dynamicDynamoScan: function(params = null) {
        return new Promise((resolve, reject) => {
            if (params !== null) {
                var docClient = new AWS.DynamoDB.DocumentClient();
                docClient.scan(params, onScan);
                function onScan(err, data) {
                    console.log("Dynamo Scan params ==>", params, "error", err, "<==> results ==>", data);
                    if (err) {
                        resolve(null);
                    } else {
                        if (typeof data.Items[0] === undefined ) {
                            // continue scanning if we have more items
                            if (typeof data.LastEvaluatedKey !== "undefined") {
                                console.log("Scanning for more...");
                                params.ExclusiveStartKey = data.LastEvaluatedKey;
                                docClient.scan(params, onScan);
                            } else {
                                resolve(null);
                            }
                        } else {
                            resolve(data.Items[0]);
                        }
                    }
                }
            } else {
                resolve(null);
            }
        });
    },

    

    scanSportingEventItem: function(slot, params) {
        return new Promise((resolve, reject) => {
            var docClient = new AWS.DynamoDB.DocumentClient();    
            docClient.scan(params, (err, data) => {
                console.log("within   docclient.scan param object ======" , params);
                console.log("within   docclient.scan data object ======" , data);
                if (err) {
                    //console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                    console.log("scanSportingEventItem  within error block docclient.scan======");
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err));
                    var speechText = '';
                    speechText = this.noValueReturned;
                } else {
                    var speechText = '';
                    var eventList = [];
                    if (data.Items.length == 0) {
                        speechText = this.noValueReturned;
                    }
                    else {
                        console.log("count of items:", data.Items.length);
                        var dataList = data.Items;
        
                        //filter data list
                        for (i = 0; i < data.Items.length; i++) {
                            //============== date logic current date in USA newyork time zone
                            var currentdate = new Date();
                            console.log("sportingevent currentdate =======" + currentdate);
                            var localoffset = currentdate.getTimezoneOffset() * 60000;
                            //console.log("sportingevent localoffset =======" + localoffset);
                            var localtime = currentdate.getTime();
                            //console.log("sportingevent localtime =======" + localtime);
                            var utc = localtime + localoffset;
                            //console.log("sportingevent utc =======" + utc);
                            var offset = -4;
                            var ustime = utc + (3600000 * offset);
                            //var currentdateinUSformat = currentdate.setTimeZone(TimeZone.getTimeZone("UTC-5"));
                            //console.log("sportingevent ustime =======" + ustime);
                            var usdate = new Date(ustime);
                            //console.log("sportingevent usdate =======" + usdate);
                            var y1 = usdate.getFullYear();
                            var m1 = usdate.getMonth() + 1;
                            //console.log("m1=====" + m1);
                            var d1 = usdate.getDate();
                            // date logic for slot date
                            var slotdate = new Date(dataList[i].Slot);
                            //console.log("sportingevent slotdate =======" + slotdate);
                            var y2 = slotdate.getFullYear();
                            var m2 = slotdate.getMonth() + 1;
                            //console.log("m2=====" + m2);
                            var d2 = slotdate.getDate();
                            //var currentdateinUSformat = currentdate.setTimeZone(TimeZone.getTimeZone("UTC-5"));
                            //console.log("sportingevent usdate1 =======" + slotdate);
                            if (y2 > y1) {
                                eventList.push(dataList[i]);
                            }
                            else if (y2 == y1) {
                                if (m2 > m1) {
                                    eventList.push(dataList[i]);
                                }
                                else if (m2 == m1) {
                                    if (d2 > d1 || d2 == d1) {
                                        eventList.push(dataList[i]);
                                    }
                                }
                            }
                        }
                        if (eventList != null) {
                            /* sort function to get latest and next dates */
                            eventList.sort(function (a, b) {
                                var dateA = new Date(a.Slot), dateB = new Date(b.Slot);
                                return dateA - dateB;
                            });
                        }
                    }
                    //console.log("scanSportingEventItem Scan succeeded after." + JSON.stringify(eventList[0]));
        
                    if (typeof eventList[0] != 'undefined' && eventList[0] != null) {
                        var datestr = JSON.stringify(eventList[0].Slot);
                        var modifieddate = dateFormat(datestr, "fullDate");
                        speechText = eventList[0].EventTitle + " is on " +eventList[0].EventDateTime+" at "+eventList[0].SportsEventLocation+ ". ";
                        //speechText = speechText + " is on " + modifieddate + ". ";
                    }
                    else if (typeof eventList[0] == 'undefined' || eventList[0] == null) {
                        console.log("Event: I am inside last else block printing " + slot);
                        speechText = "There are no upcoming events for "+ slot+". ";
        
                    }

                    speechText = speechText.charAt(0).toUpperCase() + speechText.slice(1);
        
                    console.log("speech text after loop:", speechText);
                }
                resolve(speechText);
            });
        });
    },

    fnGetPVAMUEvents: function(handlerInput, intentName = null, slot = null) {
        if (typeof slot != 'undefined' && slot != null) {
            var eventparams = {
                TableName: this.PVAMUDynamicTable,
                FilterExpression: "#slot = :slotval and #intent = :intentval",
                ExpressionAttributeNames: {
                    "#slot": "Slot",
                    "#intent":"IntentName"
                },
                ExpressionAttributeValues: { ":slotval": slot ,":intentval":intentName}					
            };

            return this.getPVAMUDataEvent(eventparams, slot).then((obj) => {
                return this.formSpeech(handlerInput, obj);
            })

        } else {
            var currentTime = new Date(new Date().toLocaleDateString('en-US', {hour: '2-digit', minute: '2-digit', timeZone: 'America/Chicago'})).getTime();
            var eventparams = {
                TableName: this.PVAMUDynamicTable,
                FilterExpression: "#SlotInMillis > :SlotInMillisVal and #intent = :intentval",
                ExpressionAttributeNames: {
                    "#SlotInMillis": "SlotInMillis",
                    "#intent":"IntentName"
                },
                ExpressionAttributeValues: { ":SlotInMillisVal": currentTime ,":intentval":intentName}					
            };
            return this.getPVAMUDataEvent(eventparams, slot).then((obj) => {
                return this.formSpeech(handlerInput, obj);
            })
        }
    },

    getPVAMUDataEvent: function(eventparams, slot) {
        return new Promise((resolve, reject) => {
            var docClient = new AWS.DynamoDB.DocumentClient();
            var dataText = [];
            var obj = null;
            var ch = this;
            docClient.scan(eventparams, (err, data) => {
                console.log("within scanFiterDynamoItem docclient.scan param object ======", eventparams, "data", data);
        
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err));
                    obj = {
                        speechText: 'I can not find any event data. What else would you like to know?',
                        displayText: 'I can not find any event data. What else would you like to know?',
                        repromptSpeechText: this.listenspeech,
                        sessionEnd: false
                    }
                    resolve (obj);
                } else {
                   if (data.Items.length != 0) {
                        console.log("count of items:", data.Items.length);
                        data.Items.forEach(function (itemdata) {
                            dataText.push(itemdata);
                        });
                        console.log("dataText::"+JSON.stringify(dataText));
                        var titlearr = [];
                        var answercount = 0;

                        var message = null;
                        var maxlength = 0;
                        var eventsDataArray = ch.sortEventsByKey(dataText, 'Slot');
                        console.log("eventsDataArray::", eventsDataArray);
                        message = '';
                        // .toLocaleDateString("en-US", options);
                                                 
                        var itemsNum = eventsDataArray.length;

                        for (var z = 0; z < itemsNum; z++) {
                           var answer = eventsDataArray[z].EventTitle + ' on ' + eventsDataArray[z].EventDateTime + (eventsDataArray[z].SportsEventLocation.trim() !== '' ? ' at <say-as interpret-as="address">' + eventsDataArray[z].SportsEventLocation + "</say-as>" : '');
                           answercount++;
                           titlearr.push(answer.trim());
                        }
                                if (answercount > 5) {
                                    answercount = 5;
                                    message = message + "Top five events are: ";
                                } else if (answercount == 1){
                                    message = message + "The event is: ";
                                }
                                else {
                                    message = message + "The events are: ";
                                }
                                
                                for (var y = 0; y < answercount; y++) {
                                    if (y === answercount - 1 && y !== 0) {
                                        message += " And " + titlearr[y] + ". ";
                                    } else if (answercount === 1) {
                                        message += titlearr[y] + ". ";
                                    } else {
                                        message += titlearr[y] + ", ";
                                    }
                                }

                                var sanatizeSSMLMessage =  message.replace(/&/g, " and ");
                                //sanatizeSSMLMessage =  sanatizeSSMLMessage.replace(/quot;/g, " ");
                                
                                console.log(sanatizeSSMLMessage);
                                obj = {
                                    speechText: sanatizeSSMLMessage + ' What else would you like to know?',
                                    displayText: sanatizeSSMLMessage + ' What else would you like to know?',
                                    repromptSpeechText: ch.listenspeech,
                                    sessionEnd: false
                                }
                    } else {
                                obj = {
                                    speechText: 'There are no events on campus. What else would you like to know?',
                                    displayText: 'There are no events on campus. What else would you like to know?',
                                    repromptSpeechText: ch.listenspeech,
                                    sessionEnd: false
                                }
                    }
                    resolve (obj);
                }
                           
                });
            });  
    },

    sortEventsByKey: function(array, key) {
        console.log("array::", JSON.stringify(array));
        console.log("key::"+key);
        return array.sort(function (a, b) {
            var x = a[key]; var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    },


    getDialogSlotValue: function(slotParam) {
        if (slotParam.value) {
            return slotParam.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        } else {
            return null;
        }
    },

    fnDynamoScan: function(params, scanType) {
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
}
