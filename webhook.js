const rp = require('request-promise');
const express = require('express');
const moment = require('moment');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/**
 * ================================
 * ===== BANK OF THAILAND API =====
 * ================================
 */

const getExchangeRate = async (currency = 'USD', date) => {
  const today = moment().format('YYYY-MM-DD');
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

/**
 * ==============================
 * ===== LINE MESSAGING API =====
 * ==============================
 */

const handleReplyMessage = async (message) => {
  const regex = /^(\w+).(today)$/g;
  const scrubMessage = regex.exec(message);
  const currency = scrubMessage[1];
  const date = scrubMessage[2];

  let replyMessage = '';

  try {
    let exchangeRate = await getExchangeRate(currency.toUpperCase(), date);
    exchangeRate = exchangeRate.result.data;

    replyMessage = `
      Last update: ${exchangeRate.data_header.last_updated} 
      การค้นหา: ${exchangeRate.data_detail[0].currency_name_th}
      ราคารับซื้อ ${exchangeRate.data_detail[0].buying_transfer}
      ราคาขายออก ${exchangeRate.data_detail[0].buying_sight}
    `;

  } catch (e) {
    replyMessage = `
      ไม่พบข้อมูลการค้นหา รูปแบบการค้นหา <สกุลเงิน> เช่น usd
      และ ราคาจะมีการอัพเดต หลัง 18:00 เป็นต้นไปครับผม
    `;
  }

  return replyMessage;
};

const issueAccessToken = async () => {
  try {
    const options = {
      method: 'POST',
      uri: 'https://api.line.me/v2/oauth/accessToken',
      form: {
        'grant_type': 'client_credentials',
        'client_id': process.env.client_id,
        'client_secret': process.env.client_secret
      }
    };

    return await rp(options);
  } catch (e) {
    console.error(e);
  }
};

const sendReplyMessage = async (replyToken, type, replyMessage) => {
  const TOKEN = await issueAccessToken();

  let options = {
    uri: 'https://api.line.me/v2/bot/message/reply',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN.access_token}`
    },
    body: {
      replyToken: replyToken,
      messages: [
        {
          type: 'text',
          text: replyMessage
        }
      ]
    },
    json: true
  };

  return await rp.post(options);
};

/**
 * ===================
 * ===== WEBHOOK =====
 * ===================
 */

app.post('/webhook', async (req, res) => {
  const { replyToken, type, ...message } = req.body.events[0];
  const replyMessage = await handleReplyMessage(message.message);

  sendReplyMessage(replyToken, type, replyMessage);
  res.status(200).send('OK');
});

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
