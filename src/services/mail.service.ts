import * as fs from "fs";
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import * as SMTPTransport from "nodemailer/lib/smtp-transport";
const { mailCredential } = require('../config/vars');

export const sendEmail = (filePath: string, to: string, subject: string, data: any) => {
    return new Promise((resolve, reject) => {
        const transporter = nodemailer.createTransport({
            host: mailCredential.host,
            port: mailCredential.port,
        } as SMTPTransport.Options);

        readHTMLFile(filePath, function (err, html) {
            const template = handlebars.compile(html);
            const htmlToSend = template(data);
            const mailOptions = {
                from: mailCredential.from,
                to: to,
                subject: subject,
                html: htmlToSend
            };
            transporter.sendMail(mailOptions, function (error, response) {
                if (error) {
                    reject(error.message);
                } else {
                    resolve(true);
                }
            });
        });
    });
};

const readHTMLFile = (path, callback) => {
    fs.readFile(path, {encoding: 'utf-8'}, (err, html) => {
        if (err) {
            throw err;
            callback(err);
        } else {
            callback(null, html);
        }
    });
};

export const sendTestEmail = async (to: string, name: string) => {
    await sendEmail("src/config/emailTemplates/init.html", to, "Activate your account", {
        name
    });
};
