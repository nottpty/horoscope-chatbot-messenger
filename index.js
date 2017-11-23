'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
const stringSimilarity = require('string-similarity');

app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function(req, res) {
    res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function(req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    } else {
        res.send('Error, wrong token')
    }
})

const { Wit, log } = require('node-wit');

const client = new Wit({
    accessToken: process.env.WIT_ACCESS_TOKEN,
    // accessToken: 'UH7OOY34YWNIK5IMUJO7NRVGKHENN2UG',
    // logger: new log.Logger(log.DEBUG) // optional
});
const token = process.env.FB_PAGE_ACCESS_TOKEN;
// const token = 'EAACjWLHUVZAoBABQlUfgvr7VP2FMLOF1bDBffcN9FZBN3ml5nRh72dS9nZBQ32yNfhiyWbymseRWtGlTzLiZBwZCG3SWYcDR51tZAaudv60t4kggD7hJhB1dlx7ZCqt84VyfsKxtnyC6gTnVU2NI09q5my0zrSgOrToXtKkZBEWNAwZDZD';

let stateConversation = "";
let realBirthday = [];
let tempBirthday = [];

var fs = require('fs');
let predictionJSON = JSON.parse(fs.readFileSync('prediction.json', 'utf8'));
let monthJSON = JSON.parse(fs.readFileSync('month.json', 'utf8'));
let availableListJSON = JSON.parse(fs.readFileSync('availableList.json', 'utf8'));
let fortuneStickJSON = JSON.parse(fs.readFileSync('fortuneSticks.json', 'utf8'));
let tarotJSON = JSON.parse(fs.readFileSync('tarot.json', 'utf8'));

function findNumberPrediction(resultBirthday) {
    let convertToStr = resultBirthday + "";
    while (convertToStr.length != 1) {
        let firstNum = parseInt(convertToStr.charAt(0) + "");
        let secondNum = parseInt(convertToStr.charAt(1) + "");
        let result = firstNum + secondNum;
        convertToStr = result + "";
    }
    return convertToStr;
}

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});

let mainState = "";
let supState = "";
let nothingWord = ["คืออะไรหรอ?", "ไม่พบสิ่งที่คุณต้องการ"];
let takeToHoroscopeSentence = "เราคือบอทดูดวง หากคุณอยากรู้ว่าเราดูอะไรได้บ้าง ให้คลิกปุ่มด้านล่างนี้"
let entitiesBirthday = ["date", "month", "year"];
let askBirthdaySentence = "คุณเกิดวันที่เท่าไหร่ เช่น 1, 3, 5";
let askMonth = "เดือนอะไร ขอเป็นตัวหนังสือนะครับ เช่น มกราคม";
let askYear = "ปีอะไรครับ เป็น พ.ศ. หรือ ค.ศ. ก็ได้ครับ";
let dateArr = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
let monthArr = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม', ];

app.post('/webhook/', function(req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
                // if (text === 'Generic') {
                //     sendGenericMessage(sender)
                //     continue
                // }
            let maxConfidence = 0;
            let entities = "";
            let stdConfidence = 0.7;
            let messageFromUser = "";
            let checkCountBirthday = 0;
            let date = new Date();
            let currentYear = date.getFullYear();
            client.message(text.substring(0, 200)).then(function(result) {
                //get birthdate or other entities
                // let tempBirthday = [];
                console.log(result.entities);
                for (let i = 0; i < Object.keys(result.entities).length; i++) {
                    if (i === 0) {
                        maxConfidence = result.entities[Object.keys(result.entities)[i]][0].confidence;
                        entities = Object.keys(result.entities)[i];
                        messageFromUser = result.entities[Object.keys(result.entities)[i]][0].value;
                    } else if (result.entities[Object.keys(result.entities)[i]][0].confidence > maxConfidence) {
                        maxConfidence = result.entities[Object.keys(result.entities)[i]][0].confidence;
                        entities = Object.keys(result.entities)[i];
                        messageFromUser = result.entities[Object.keys(result.entities)[i]][0].value;
                    }
                }


                //Greeting State
                if (maxConfidence > stdConfidence && entities === "greeting") {
                    let url = 'https://graph.facebook.com/v2.6/' + sender
                    let qs = { fields: 'first_name', access_token: token }
                    request({
                        url: url,
                        method: 'GET',
                        qs,
                        json: true
                    }, function(error, response, body) {
                        var first_name = body.first_name
                        sendAskDetailButtonMessage("สวัสดีครับคุณ " + first_name + " ต้องการดูดวงกับเรามั้ย?", sender);
                        mainState = "greeting";
                        supState = "1";
                    })
                } else if (entities === "date" && maxConfidence > 0.8 && mainState === "doBirthday" && supState === "1") {
                    if (parseInt(messageFromUser) > 0 && parseInt(messageFromUser) < 32) {
                        tempBirthday = []
                        supState = "date";
                        tempBirthday.push(messageFromUser);
                        send(sender, askMonth)
                    } else {
                        sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่วันผิดนะ อยากลองอีกรอบมั้ย?", sender)
                        supState = "1";
                    }
                } else if (entities === "date" && maxConfidence < 0.8 && mainState === "doBirthday" && supState === "1") {
                    sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่วันผิดนะ โปรดลองอีกครั้งหรือกลับไปเมนูหลัก", sender)
                    supState = "1";
                } else if (entities !== "date" && mainState === "doBirthday" && supState === "1") {
                    sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่วันผิดนะ โปรดลองอีกครั้งหรือกลับไปเมนูหลัก", sender)
                    supState = "1";
                } else if (entities === "month" && maxConfidence > 0.8 && mainState === "doBirthday" && supState === "date") {
                    supState = "month";
                    tempBirthday.push(messageFromUser);
                    send(sender, askYear)
                } else if (entities === "month" && maxConfidence < 0.8 && mainState === "doBirthday" && supState === "date") {
                    let tempIndex = 0;
                    let rating = 0.0;
                    for (let i = 0; i < monthArr.length; i++) {
                        let similarity = stringSimilarity.compareTwoStrings(messageFromUser, monthArr[i]);
                        if (i === 0) {
                            tempIndex = i
                            rating = similarity
                        } else if (similarity > rating) {
                            rating = similarity
                            tempIndex = i;
                        }
                    }
                    console.log(rating)
                    if (rating > 0.6) {
                        supState = "month";
                        tempBirthday.push(monthArr[tempIndex]);
                        send(sender, askYear)
                    } else {
                        sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่เดือนผิดนะ โปรดลองอีกครั้งหรือกลับไปเมนูหลัก", sender)
                        supState = "date";
                    }
                } else if (entities !== "month" && mainState === "doBirthday" && supState === "date") {
                    let tempIndex = 0;
                    let rating = 0.0;
                    for (let i = 0; i < monthArr.length; i++) {
                        let similarity = stringSimilarity.compareTwoStrings(messageFromUser, monthArr[i]);
                        if (i === 0) {
                            tempIndex = i
                            rating = similarity
                        } else if (similarity > rating) {
                            rating = similarity
                            tempIndex = i;
                        }
                    }
                    console.log(rating)
                    if (rating > 0.6) {
                        supState = "month";
                        tempBirthday.push(monthArr[tempIndex]);
                        send(sender, askYear)
                    } else {
                        sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่เดือนผิดนะ โปรดลองอีกครั้งหรือกลับไปเมนูหลัก", sender)
                        supState = "date";
                    }
                } else if (maxConfidence > stdConfidence && entities === "horoscope") {
                    mainState = "askDetail";
                    supState = "1";
                    sendDetailButtonMessage("คุณต้องการจะดูดวงแบบไหนหรอ?", sender);
                } else if (maxConfidence > stdConfidence && entities === "bye") {
                    send(sender, "แล้วเจอกันใหม่จ้า!!")
                    mainState = "bye";
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "askDetail") {
                    mainState = "askDetail";
                    supState = "1";
                    sendDetailButtonMessage("สิ่งที่เราทำได้ตอนนี้ได้แก่...", sender);
                } else if (maxConfidence > stdConfidence && entities === "birthday" && mainState === "askDetail") {
                    send(sender, askBirthdaySentence)
                    mainState = "doBirthday"
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "furtuneSticks" && mainState === "askDetail") {
                    sendRandomFortuneSticksMessage("ก่อนกดสุ่มอย่าลืมอธิษฐานด้วยนะครับ", sender)
                    mainState = "doFortunesticks"
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "tarot" && mainState === "askDetail") {
                    mainState = "doTarot"
                    supState = "1";
                    let numberCardArr = [];
                    let amount = 10;
                    while (numberCardArr.length < amount) {
                        let randomNum = Math.round(Math.random() * (Object.keys(tarotJSON).length - 1));
                        if (numberCardArr.indexOf(randomNum.toString()) < 0) {
                            numberCardArr.push(randomNum.toString())
                        }
                    }
                    console.log(numberCardArr)
                    send(sender, "คุณสามารถกดเลื่อนซ้ายขวาเพื่อเลื่อนไปเลือกไพ่ใบอื่นได้")
                    sendTarotPack(numberCardArr, "https://pre00.deviantart.net/2379/th/pre/i/2011/206/c/e/tarot_card_backside_by_willawanda-d41l36o.jpg", sender)
                } else if (maxConfidence > stdConfidence && entities === "thank") {
                    send(sender, "ยินดีครับ :)")
                    mainState = "thank";
                    supState = "1";
                } else if (((entities === "year" && maxConfidence > 0.8) || (messageFromUser > 1000 && messageFromUser <= currentYear + 543)) && mainState === "doBirthday" && supState === "month") {
                    tempBirthday.push(messageFromUser);
                    realBirthday.push(tempBirthday[0]);
                    realBirthday.push(tempBirthday[1]);
                    if (tempBirthday[2] > currentYear) {
                        realBirthday.push((tempBirthday[2] - 543) + "");
                    } else {
                        realBirthday.push(tempBirthday[2]);
                    }
                    // send(sender, "คุณเกิดวันที่ " + tempBirthday[0] + " " + tempBirthday[1] + " " + tempBirthday[2] + " ใช่หรือไม่?")
                    sendYesNoButtonMessage("คุณเกิดวันที่ " + tempBirthday[0] + " " + tempBirthday[1] + " " + tempBirthday[2] + " ใช่หรือไม่?", sender);
                    supState = "2";
                } else if (entities !== "year" && mainState === "doBirthday" && supState === "month") {
                    sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่ปีผิดนะ โปรดลองอีกครั้งหรือกลับไปเมนูหลัก", sender)
                    supState = "month";
                } else if (entities === "year" && maxConfidence < 0.8 && mainState === "doBirthday" && supState === "month") {
                    sendTryAgainButtonMessage("ดูเหมือนคุณจะใส่ปีผิดนะ โปรดลองอีกครั้งหรือกลับไปเมนูหลัก", sender)
                    supState = "month";
                } else if (maxConfidence > stdConfidence && entities === "accept" && mainState === "doBirthday" && supState === "2") {
                    for (let i = 0; i < Object.keys(monthJSON).length; i++) {
                        if (monthJSON[Object.keys(monthJSON)[i]] === realBirthday[1]) {
                            realBirthday[1] = Object.keys(monthJSON)[i];
                        }
                    }
                    let firstDigit = parseInt(realBirthday[2].charAt(0));
                    let secondDigit = parseInt(realBirthday[2].charAt(1));
                    let thirdDigit = parseInt(realBirthday[2].charAt(2));
                    let fourthDigit = parseInt(realBirthday[2].charAt(3));
                    let result = parseInt(realBirthday[0]) + parseInt(realBirthday[1]) + firstDigit + secondDigit + thirdDigit + fourthDigit;
                    let numberPrediction = findNumberPrediction(result);
                    let resultMessagePrediction = "";
                    for (let i = 0; i < Object.keys(predictionJSON).length; i++) {
                        if (Object.keys(predictionJSON)[i] === numberPrediction) {
                            console.log(predictionJSON[Object.keys(predictionJSON)[i]]);
                            resultMessagePrediction = predictionJSON[Object.keys(predictionJSON)[i]];
                        }
                    }
                    // send(sender, resultMessagePrediction)
                    // mainState = "askDetail";
                    // supState = "1";
                    sendTryAgainButtonMessage(resultMessagePrediction, sender)
                } else if (maxConfidence > stdConfidence && entities === "cancel" && mainState === "doBirthday" && supState === "2") {
                    send(sender, askBirthdaySentence)
                    supState = "1";
                } else {
                    let lengthRandom = nothingWord.length - 1;
                    let index = Math.round(Math.random() * lengthRandom);
                    if (index === 0) {
                        // send(sender, messageFromUser + " " + nothingWord[index])
                        sendAskDetailButtonMessage(messageFromUser + " " + nothingWord[index] + " " + takeToHoroscopeSentence, sender);
                        mainState = "nothing";
                        supState = "1";
                    } else {
                        // send(sender, nothingWord[index])
                        sendAskDetailButtonMessage(nothingWord[index] + " " + takeToHoroscopeSentence, sender);
                        mainState = "nothing";
                        supState = "1";
                    }
                }
            })
        }
        if (event.postback) {
            let text = JSON.stringify(event.postback)
                // send(sender, "Postback received: " + text.substring(0, 200), token)
            let payload = Object.keys(event.postback).map(function(key) {
                return event.postback[key];
            });
            if (payload[0] === "วันเกิด") {
                send(sender, askBirthdaySentence)
                mainState = "doBirthday"
                supState = "1";
            } else if (payload[0] === "ไพ่ทาโร่") {
                mainState = "doTarot"
                supState = "1";
                let numberCardArr = [];
                let amount = 10;
                while (numberCardArr.length < amount) {
                    let randomNum = Math.round(Math.random() * (Object.keys(tarotJSON).length - 1));
                    if (numberCardArr.indexOf(randomNum.toString()) < 0) {
                        numberCardArr.push(randomNum.toString())
                    }
                }
                console.log(numberCardArr)
                send(sender, "คุณสามารถกดเลื่อนซ้ายขวาเพื่อเลื่อนไปเลือกไพ่ใบอื่นได้")
                sendTarotPack(numberCardArr, "https://pre00.deviantart.net/2379/th/pre/i/2011/206/c/e/tarot_card_backside_by_willawanda-d41l36o.jpg", sender)
            } else if (payload[0] >= 0 && payload[0] <= 21 && mainState === "doTarot") {
                let indexCard = payload[0];
                let objectCard = tarotJSON[Object.keys(tarotJSON)[indexCard]];
                let answer = objectCard[Object.keys(objectCard)[0]];
                let image_url = objectCard[Object.keys(objectCard)[1]];
                sendImage(image_url, sender)
                sendTryAgainButtonMessage(answer, sender)
            } else if (payload[0] === "สุ่มเซียมซี") {
                let randomN = Math.round(Math.random() * Object.keys(fortuneStickJSON).length);
                let answer = fortuneStickJSON[Object.keys(fortuneStickJSON)[randomN]];
                sendTryAgainButtonMessage(answer, sender)
            } else if (payload[0] === "เซียมซี") {
                sendRandomFortuneSticksMessage("ก่อนกดสุ่มอย่าลืมอธิษฐานด้วยนะครับ", sender)
                mainState = "doFortunesticks"
                supState = "1";
            } else if (payload[0] === "ทำอะไรได้บ้าง") {
                mainState = "askDetail";
                supState = "1";
                sendDetailButtonMessage("สิ่งที่เราดูได้ตอนนี้ได้แก่...", sender);
            } else if (payload[0] === "ใช่" && mainState === "doBirthday" && supState === "2") {
                for (let i = 0; i < Object.keys(monthJSON).length; i++) {
                    if (monthJSON[Object.keys(monthJSON)[i]] === realBirthday[1]) {
                        realBirthday[1] = Object.keys(monthJSON)[i];
                    }
                }
                let firstDigit = parseInt(realBirthday[2].charAt(0));
                let secondDigit = parseInt(realBirthday[2].charAt(1));
                let thirdDigit = parseInt(realBirthday[2].charAt(2));
                let fourthDigit = parseInt(realBirthday[2].charAt(3));
                let result = parseInt(realBirthday[0]) + parseInt(realBirthday[1]) + firstDigit + secondDigit + thirdDigit + fourthDigit;
                let numberPrediction = findNumberPrediction(result);
                let resultMessagePrediction = "";
                for (let i = 0; i < Object.keys(predictionJSON).length; i++) {
                    if (Object.keys(predictionJSON)[i] === numberPrediction) {
                        console.log(predictionJSON[Object.keys(predictionJSON)[i]]);
                        resultMessagePrediction = predictionJSON[Object.keys(predictionJSON)[i]];
                    }
                }
                sendTryAgainButtonMessage(resultMessagePrediction, sender)
            } else if (payload[0] === "ไม่" && mainState === "doBirthday" && supState === "2") {
                send(sender, askBirthdaySentence);
                supState = "1";
            } else if (payload[0] === "เมนูหลัก") {
                mainState = "askDetail";
                supState = "1";
                sendDetailButtonMessage("คุณต้องการจะดูดวงแบบไหนหรอ?", sender);
            } else {
                let lengthRandom = nothingWord.length - 1;
                let index = Math.round(Math.random() * lengthRandom);
                if (index === 0) {
                    // send(sender, messageFromUser + " " + nothingWord[index])
                    sendAskDetailButtonMessage(messageFromUser + " " + nothingWord[index] + " " + takeToHoroscopeSentence, sender);
                    mainState = "nothing";
                    supState = "1";
                } else {
                    // send(sender, nothingWord[index])
                    sendAskDetailButtonMessage(nothingWord[index] + " " + takeToHoroscopeSentence, sender);
                    mainState = "nothing";
                    supState = "1";
                }
            }
            // send(sender, payload)
            continue
        }
    }
    res.sendStatus(200)
})

const typingBubble = (id, text) => {

    var body = JSON.stringify({
        recipient: { id },
        "sender_action": "typing_on"
    });

    const qs = 'access_token=' + encodeURIComponent(token);
    return fetch('https://graph.facebook.com/me/messages?' + qs, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        })
        .then(rsp => rsp.json())
        .then(json => {
            if (json.error && json.error.message) {
                throw new Error(json.error.message);
            }
            return json;
        });
};

function sendTextMessage(sender, text) {
    let messageData = { text: text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function send(sessionId, text) {
    const recipientId = sessionId;
    if (recipientId) {
        return typingBubble(recipientId, text), sendTextMessage(recipientId, text);
    } else {
        console.error('Oops! Couldn\'t find user for session:', sessionId);
        return Promise.resolve()
    }
}

function sendRandomFortuneSticksMessage(askText, sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": askText,
                "buttons": [{
                    "type": "postback",
                    "title": "กดเพื่อสุ่ม",
                    "payload": "สุ่มเซียมซี"
                }, {
                    "type": "postback",
                    "title": "กลับไปเมนูหลัก",
                    "payload": "เมนูหลัก"
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        console.log(response.body);
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendDetailButtonMessage(askText, sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": askText,
                "buttons": availableListJSON
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        console.log(response.body);
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendYesNoButtonMessage(askText, sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": askText,
                "buttons": [{
                    "type": "postback",
                    "title": "ใช่",
                    "payload": "ใช่"
                }, {
                    "type": "postback",
                    "title": "ไม่ใช่",
                    "payload": "ไม่"
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        console.log(response.body);
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendTryAgainButtonMessage(askText, sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": askText,
                "buttons": [{
                    "type": "postback",
                    "title": "กลับไปเมนูหลัก",
                    "payload": "เมนูหลัก"
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        console.log(response.body);
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendAskDetailButtonMessage(askText, sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "button",
                "text": askText,
                "buttons": [{
                    "type": "postback",
                    "title": "ดูอะไรได้บ้าง",
                    "payload": "ทำอะไรได้บ้าง"
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        console.log(response.body);
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendImage(image_url, sender) {
    let messageData = {
        "attachment": {
            "type": "image",
            "payload": {
                "is_reusable": true,
                "url": image_url
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    });
}

function sendTarotPack(numberCardArr, backgroundCardImageURL, sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "ใบที่ 1",
                    "subtitle": "ใบที่ 1 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[0],
                    }],
                }, {
                    "title": "ใบที่ 2",
                    "subtitle": "ใบที่ 2 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[1],
                    }],
                }, {
                    "title": "ใบที่ 3",
                    "subtitle": "ใบที่ 3 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[2],
                    }],
                }, {
                    "title": "ใบที่ 4",
                    "subtitle": "ใบที่ 4 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[3],
                    }],
                }, {
                    "title": "ใบที่ 5",
                    "subtitle": "ใบที่ 5 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[4],
                    }],
                }, {
                    "title": "ใบที่ 6",
                    "subtitle": "ใบที่ 6 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[5],
                    }],
                }, {
                    "title": "ใบที่ 7",
                    "subtitle": "ใบที่ 7 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[6],
                    }],
                }, {
                    "title": "ใบที่ 8",
                    "subtitle": "ใบที่ 8 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[7],
                    }],
                }, {
                    "title": "ใบที่ 9",
                    "subtitle": "ใบที่ 9 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[8],
                    }],
                }, {
                    "title": "ใบที่ 10",
                    "subtitle": "ใบที่ 10 จากทั้งหมด 10 ใบ",
                    "image_url": backgroundCardImageURL,
                    "buttons": [{
                        "type": "postback",
                        "title": "เลือกใบนี้",
                        "payload": numberCardArr[9],
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: token },
        method: 'POST',
        json: {
            recipient: { id: sender },
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})