'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()

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
    if (req.query['hub.verify_token'] === process.env.WEBHOOK_ACCESS_TOKEN) {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

const { Wit, log } = require('node-wit');

const client = new Wit({
    accessToken: process.env.WIT_ACCESS_TOKEN,
    // accessToken: 'UH7OOY34YWNIK5IMUJO7NRVGKHENN2UG',
    // logger: new log.Logger(log.DEBUG) // optional
});

// client.message('สวัสดีจ้าา').then(function(result) {
//     let maxConfidence = 0;
//     let entities = "";
//     for (let i = 0; i < Object.keys(result.entities).length; i++) {
//         if (i === 0) {
//             maxConfidence = result.entities[Object.keys(result.entities)[i]][0].confidence;
//             entities = Object.keys(result.entities)[i];
//         } else if (result.entities[Object.keys(result.entities)[i]][0].confidence > maxConfidence) {
//             maxConfidence = result.entities[Object.keys(result.entities)[i]][0].confidence;
//             entities = Object.keys(result.entities)[i];
//         }
//     }
//     console.log(maxConfidence);
//     console.log(entities);
//     // console.log(Object.keys(result.entities).length) //will log results.
// })

let stateConversation = "";
let realBirthday = [];

var fs = require('fs');
let predictionJSON = JSON.parse(fs.readFileSync('prediction.json', 'utf8'));
let monthJSON = JSON.parse(fs.readFileSync('month.json', 'utf8'));

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
let nothingWord = ["คืออะไรหรอ?", "ไม่พบสิ่งที่คุณต้องการ", "อยากจะคุยด้วยจริงๆนะ แต่เราถูกสอนมาแค่ดูดวงอย่างเดียวอ่ะ"];
let entitiesBirthday = ["date", "month", "year"];
let askBirthdaySentence = "ส่งวันเกิดของคุณมาเลย\nเช่น 28 มิถุนายน 2538";

function setMainState(newState) {
    mainState = newState;
}

function getMainState() {
    return mainState;
}

function setSupState(newState) {
    supState = newState;
}

function getSupState() {
    return supState;
}

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
            let stdConfidence = 0.4;
            let messageFromUser = "";
            let checkCountBirthday = 0;
            let date = new Date();
            let currentYear = date.getFullYear();
            client.message(text.substring(0, 200)).then(function(result) {
                //get birthdate or other entities
                let tempBirthday = [];
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
                    if (Object.keys(result.entities).length === 3 && maxConfidence > 0.7) {
                        if (i === 0 && entitiesBirthday[i] === "date") {
                            checkCountBirthday++;
                        } else if (i === 1 && entitiesBirthday[i] === "month") {
                            checkCountBirthday++;
                        } else if (i === 2 && entitiesBirthday[i] === "year") {
                            checkCountBirthday++;
                        }
                    }
                    tempBirthday.push(result.entities[Object.keys(result.entities)[i]][0].value);
                }
                console.log(maxConfidence);
                console.log(entities);
                console.log(messageFromUser);

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
                        send(sender, "สวัสดีครับคุณ " + first_name + " ต้องการดูดวงกับเรามั้ย?")
                        mainState = "greeting";
                        supState = "1";
                    })
                } else if (maxConfidence > stdConfidence && entities === "accept" && mainState === "greeting" && supState === "1") {
                    send(sender, askBirthdaySentence)
                    mainState = "horoscope"
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "cancel" && mainState === "greeting" && supState === "1") {
                    send(sender, "แต่เราไม่สามารถตอบคุณนอกจากเรื่องดูดวงได้แล้วนะ!!")
                    supState = "2";
                } else if (maxConfidence > stdConfidence && entities === "horoscope" && mainState === "greeting" && supState === "2") {
                    send(sender, askBirthdaySentence)
                    mainState = "horoscope"
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "horoscope") {
                    send(sender, askBirthdaySentence)
                    mainState = "horoscope"
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "bye") {
                    send(sender, "แล้วเจอกันใหม่จ้า!!")
                    mainState = "bye";
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "askDetail") {
                    send(sender, "สิ่งที่เราทำได้ตอนนี้คือ แค่ดูดวงตามวันเกิดเองนะ")
                    mainState = "askDetail";
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "thank") {
                    send(sender, "ยินดีครับ :)")
                    mainState = "thank";
                    supState = "1";
                } else if (maxConfidence > stdConfidence && checkCountBirthday < 3 && mainState === "horoscope" && supState === "1") {
                    send(sender, "ดูเหมือนคุณจะใส่ข้อมูลผิดนะ อยากลองอีกรอบมั้ย?")
                    supState = "1-1";
                } else if (maxConfidence > stdConfidence && entities === "accept" && mainState === "horoscope" && supState === "1-1") {
                    send(sender, askBirthdaySentence)
                    supState = "1";
                } else if (maxConfidence > stdConfidence && entities === "cancel" && mainState === "horoscope" && supState === "1-1") {
                    send(sender, "ตอนนี้เราดูดวงได้แค่จากวันเกิดเอง ถ้าอยากดูดวงอย่างอื่นด้วยคงต้องรออัพเดตครั้งหน้านะครับ")
                    supState = "1-2";
                } else if (maxConfidence > stdConfidence && entities === "accept" && mainState === "horoscope" && supState === "1-2") {
                    // do notthing with this condition
                    supState = "";
                } else if (maxConfidence > stdConfidence && entities === "cancel" && mainState === "horoscope" && supState === "1-2") {
                    send(sender, "ต้องขอโทษด้วยนะครับที่เราทำได้แค่นี้ คุณยังอยากจะดูดวงมั้ย")
                    supState = "1-3";
                } else if (maxConfidence > stdConfidence && entities === "cancel" && mainState === "horoscope" && supState === "1-3") {
                    send(sender, "งั้นไว้เจอกันใหม่ครับ :)")
                } else if (maxConfidence > stdConfidence && entities === "accept" && mainState === "horoscope" && supState === "1-3") {
                    send(sender, askBirthdaySentence)
                    supState = "1";
                } else if (maxConfidence > stdConfidence && checkCountBirthday === 3 && mainState === "horoscope" && supState === "1") {
                    realBirthday.push(tempBirthday[0]);
                    realBirthday.push(tempBirthday[1]);
                    if (tempBirthday[2] > currentYear) {
                        realBirthday.push((tempBirthday[2] - 543) + "");
                    } else {
                        realBirthday.push(tempBirthday[2]);
                    }
                    send(sender, "คุณเกิดวันที่ " + tempBirthday[0] + " " + tempBirthday[1] + " " + tempBirthday[2] + " ใช่หรือไม่?")
                    supState = "2";
                } else if (maxConfidence > stdConfidence && entities === "accept" && mainState === "horoscope" && supState === "2") {
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
                    send(sender, resultMessagePrediction)
                    supState = "4";
                } else if (maxConfidence > stdConfidence && entities === "cancel" && mainState === "horoscope" && supState === "2") {
                    send(sender, askBirthdaySentence)
                    supState = "1";
                } else {
                    let lengthRandom = nothingWord.length - 1;
                    let index = Math.round(Math.random() * lengthRandom);
                    if (index === 0) {
                        send(sender, messageFromUser + " " + nothingWord[index])
                        mainState = "nothing";
                        supState = "1";
                    } else {
                        send(sender, nothingWord[index])
                        mainState = "nothing";
                        supState = "1";
                    }
                }
            })
        }
        if (event.postback) {
            let text = JSON.stringify(event.postback)
            send(sender, "Postback received: " + text.substring(0, 200), token)
            continue
        }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN;
// const token = 'EAACjWLHUVZAoBABQlUfgvr7VP2FMLOF1bDBffcN9FZBN3ml5nRh72dS9nZBQ32yNfhiyWbymseRWtGlTzLiZBwZCG3SWYcDR51tZAaudv60t4kggD7hJhB1dlx7ZCqt84VyfsKxtnyC6gTnVU2NI09q5my0zrSgOrToXtKkZBEWNAwZDZD';

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