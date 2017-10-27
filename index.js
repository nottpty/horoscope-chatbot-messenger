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
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge'])
    }
    res.send('Error, wrong token')
})

const { Wit, log } = require('node-wit');

const client = new Wit({
    accessToken: 'UH7OOY34YWNIK5IMUJO7NRVGKHENN2UG',
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
let predictionJSON = [];
let monthJSON = [];

var fs = require('fs');
predictionJSON = JSON.parse(fs.readFileSync('prediction.json', 'utf8'));
monthJSON = JSON.parse(fs.readFileSync('month.json', 'utf8'));

// $.getJSON("prediction.json", function(json) {
//     predictionJSON = json;
// });
// $.getJSON("month.json", function(json) {
//     month = json;
// });

function findNumberPrediction(resultBirthday) {
    let convertToStr = n + "";
    while (convertToStr.length() != 1) {
        let firstNum = parseInt(convertToStr.charAt(0) + "");
        let secondNum = parseInt(convertToStr.charAt(1) + "");
        let result = firstNum + secondNum;
        convertToStr = result + "";
    }
    return convertToStr;
}

app.post('/webhook/', function(req, res) {
    let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
        let event = req.body.entry[0].messaging[i]
        let sender = event.sender.id
        if (event.message && event.message.text) {
            let text = event.message.text
            if (text === 'Generic') {
                sendGenericMessage(sender)
                continue
            }
            let maxConfidence = 0;
            let entities = "";
            client.message(text.substring(0, 200)).then(function(result) {
                let tempBirthday = [];
                for (let i = 0; i < Object.keys(result.entities).length; i++) {
                    if (i === 0) {
                        maxConfidence = result.entities[Object.keys(result.entities)[i]][0].confidence;
                        entities = Object.keys(result.entities)[i];
                    } else if (result.entities[Object.keys(result.entities)[i]][0].confidence > maxConfidence) {
                        maxConfidence = result.entities[Object.keys(result.entities)[i]][0].confidence;
                        entities = Object.keys(result.entities)[i];
                    }
                    tempBirthday.push(result.entities[Object.keys(result.entities)[i]][0].value);
                }
                console.log(maxConfidence);
                console.log(entities);
                if (maxConfidence > 0.7 && entities === "greeting") {
                    sendTextMessage(sender, "สวัสดีครับ...คุณต้องการดูดวงกับเรามั้ย?")
                } else if (maxConfidence > 0.7 && entities === "horoscope") {
                    sendTextMessage(sender, "งั้นก็ส่งวันเกิดของคุณมาเลย!!\n(เช่น 28 มิถุนายน 1996)\nปีเกิดขอเป็น ค.ศ. นะครับ")
                } else if (maxConfidence > 0.7 && entities === "accept") {
                    if (stateConversation === "greeting") {
                        sendTextMessage(sender, "งั้นก็ส่งวันเกิดของคุณมาเลย!!\n(เช่น 28 มิถุนายน 1996)\nปีเกิดขอเป็น ค.ศ. นะครับ")
                    } else if (stateConversation === "date" || stateConversation === "month" || stateConversation === "year") {
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
                            if (Object.keys(predictionJSON)[i] === result) {
                                resultMessagePrediction = predictionJSON[Object.keys(predictionJSON)[i]];
                            }
                        }
                        sendTextMessage(sender, resultMessagePrediction)
                    }
                } else if (maxConfidence > 0.7 && entities === "cancel") {
                    sendTextMessage(sender, "ไม่อยากดูจริงๆหรอ?")
                } else if (maxConfidence > 0.7 && entities === "bye") {
                    sendTextMessage(sender, "แล้วเจอกันใหม่จ้า")
                } else if (maxConfidence > 0.7 && entities === "askDetail") {
                    sendTextMessage(sender, "ตอนนี้เราสามารถดูดวงได้แค่ตามวันเกิดเอง")
                } else if (maxConfidence > 0.7 && (entities === "date" || entities === "month" || entities === "year")) {
                    realBirthday.push(tempBirthday[0]);
                    realBirthday.push(tempBirthday[1]);
                    realBirthday.push(tempBirthday[2]);
                    sendTextMessage(sender, "คุณเกิดวันที่ " + tempBirthday[0] + " " + tempBirthday[1] + " " + tempBirthday[2] + " ใช่หรือไม่?")
                } else {
                    sendTextMessage(sender, "กรุณาใส่ข้อความให้ถูกต้องด้วยครับ")
                    sendTextMessage(sender, "ตอนนี้เราสามารถดูดวงได้แค่ตามวันเกิดเอง")
                }
                stateConversation = entities;
                // console.log(Object.keys(result.entities).length) //will log results.
            })
        }
        if (event.postback) {
            let text = JSON.stringify(event.postback)
            sendTextMessage(sender, "Postback received: " + text.substring(0, 200), token)
            continue
        }
    }
    res.sendStatus(200)
})

const token = process.env.FB_PAGE_ACCESS_TOKEN;

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