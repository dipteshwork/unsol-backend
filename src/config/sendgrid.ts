const rp = require('request-promise');
const sgMail = require('@sendgrid/mail');

const { env, sendgridApiUrl, sendgridApiKey } = require('./vars');
sgMail.setApiKey(sendgridApiKey);


exports.sendBulkEmailTemplate = data => new Promise((resolve, reject) => {
  // if (env === 'development') resolve({ status: true });

  const options = {
    uri: `${sendgridApiUrl}/mail/send`,
    method: 'post',
    headers: {
      Authorization: `Bearer ${sendgridApiKey}`
    },
    body: {
      personalizations: [
        {
            to: [
                {
                    email: data.to
                }
            ],
          dynamic_template_data: {
            // title: data.title,
            // content: data.content,
            Sender_Name: 'UNICC Team',
            Sender_Address: '45 Boulevard Victor hugo clichy',
            Sender_Zip: '92110 FRA'
          }
        }
      ],
      from: {
        email: data.from
      },
      template_id: 'd-f60a8c706c5c437d9ad8c2b530b90e6a'
    },
    json: true
  };

  rp(options)
    .then((result) => {
      console.log(result);
      resolve({status: true});
    })
    .catch((err) => {
      console.log(err);
      reject(err);
    });
});


exports.sendBulkEmail = data => new Promise((resolve, reject) => {

    const msg = {
        to: data.to,
        from: 'hello@biodiversity.solutions',
        subject: 'Notification',
        text: data.title,
        html: data.content,
    };
    sgMail.send(msg)
        .then(res => {
            console.log('Email Sending Result::', res);
            resolve({status: true})
        })
        .catch((err) => {
            console.log(err);
            reject(err);
        });

});