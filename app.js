'use-strict';
const rp = require('request-promise');
const otcsv = require('objects-to-csv');
const cheerio = require('cheerio');

// const dataUrl = 'http://www.espn.com/mlb/scoreboard';
const dataUrl = 'https://www.espn.com/mlb/scoreboard/_/date/20190918';
const dataRegex = /<script>.*scoreboardData[\s]*=[\s]*({.*};?).*<\/script>/g;
const tgt = .05;

const getHTML = async (url) => {
    return rp(url);
};

const toCSV = async (arr) => {
    const csv = new otcsv(arr);
    return csv.toDisk('output.csv');
};

// works as of 09/18/2019
const parseEventData = (html) => {
    const match = dataRegex.exec(html);
    let jsonStr = match[1] || match[0];
    jsonStr = jsonStr.substring(jsonStr.indexOf("{"), jsonStr.length);
    while (jsonStr.lastIndexOf("};") > 0 || jsonStr.lastIndexOf("];") > 0) {
        jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf(";"));
    }
    const gameData = JSON.parse(jsonStr);
    const eventArr = gameData.events;
    return eventArr;
};

// works as of 09/18/2019
const parseNumberFireOdds = (eventArr) => {
    const nfOdds = [];
    for(let i=0;i<eventArr.length;i++) {
        for(let j=0;j<eventArr[i].competitions.length;j++) {
	    if(!eventArr[i].competitions[j].odds) {
		continue
	    }
	    for(let k=0;k<eventArr[i].competitions[j].odds.length;k++) {
		if(eventArr[i].competitions[j].odds[k].provider.name == "numberfire") {
		    const odds = eventArr[i].competitions[j].odds[k];
                    nfOdds.push(odds);
		}
	    }
	}
    }
    return nfOdds;
};

// works as of 09/18/2019
const printBets = (nfOdds) => {
    for(let i=0;i<nfOdds.length;i++) {
	let awayMagicNum = 100*(tgt + 1 - nfOdds[i].awayTeamOdds.winPercentage/100)/(nfOdds[i].awayTeamOdds.winPercentage/100);
	if (awayMagicNum < 100) {
	    awayMagicNum = 10000/awayMagicNum;
	}
	awayMagicNum = Math.ceil(awayMagicNum);
	console.log("Bet " + nfOdds[i].awayTeamOdds.team.abbreviation + " over " + nfOdds[i].homeTeamOdds.team.abbreviation + " if moneyline is over " + awayMagicNum);
	let homeMagicNum = 100*(tgt + 1 - nfOdds[i].homeTeamOdds.winPercentage/100)/(nfOdds[i].homeTeamOdds.winPercentage/100);
	if (homeMagicNum < 100) {
	    homeMagicNum = -10000/homeMagicNum;
	}
	homeMagicNum = Math.ceil(homeMagicNum);
	console.log("Bet " + nfOdds[i].homeTeamOdds.team.abbreviation + " over " + nfOdds[i].awayTeamOdds.team.abbreviation + " if moneyline is over " + homeMagicNum);
	console.log();
    }
};

getHTML(dataUrl)
.then(html => {
    const eventArr = parseEventData(html);
    const nfOdds = parseNumberFireOdds(eventArr);
    printBets(nfOdds);
});
