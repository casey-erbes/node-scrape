'use-strict';
const rp = require('request-promise');
const otcsv = require('objects-to-csv');
const cheerio = require('cheerio');

const getHTML = async (url) => {
    return rp(url);
};

const toCSV = async (arr) => {
    const csv = new otcsv(arr);
    return csv.toDisk('output.csv');
};

getHTML('http://www.google.com')
.then(result => {
    console.log(result);
    console.log("okay then");
    toCSV([{email: "whatever@example.com", favNum: 1}, {email: "yo@example.com", favNum: 2}])
    .then(() => {
	console.log("done");
    });
});
