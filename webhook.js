const rp = require('request-promise');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// bot service
const getExchangeRate = async (currency = 'USD') => {
  const today = moment()
    .subtract(2, 'days')
    .format('YYYY-MM-DD');
  const options = {
    uri: 'https://iapi.bot.or.th/Stat/Stat-ExchangeRate/DAILY_AVG_EXG_RATE_V1/',
    headers: {
      'Content-Type': 'application/json',
      'api-key': 'U9G1L457H6DCugT7VmBaEacbHV9RX0PySO05cYaGsm',
      'Cache-Control': 'no-cache'
    },
    qs: {
      start_period: today,
      end_period: today,
      currency: currency
    },
    json: true
  };

  return await rp.get(options);
};

const replyExchangeRate = async (replyToken, type, message, replyMessage) => {
  const options = {
    uri: 'https://api.line.me/v2/bot/message/reply',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${replyToken}`
    },
    body: {
      replyToken: 'nHuyWiB7yP5Zw52FIkcQobQuGDXCTA',
      messages: [
        {
          type: 'text',
          text: `ราคาขาย อยู่ที่ ${replyMessage}`
        }
      ]
    },
    json: true
  };

  return await rp.post(options);
};

// webhook
app.post('/webhook', async (req, res) => {
  const { replyToken, type, ...message } = req.body.events[0];
  let replyMessage = await getExchangeRate('USD');
  replyMessage = replyMessage.result.data.data_detail[0].selling;
  
  replyExchangeRate(replyToken, type, message, replyMessage);
  res.status(200).send('OK');
});

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
