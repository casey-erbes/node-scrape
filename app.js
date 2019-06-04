'use-strict';
const rp = require('request-promise');
const otcsv = require('objects-to-csv');
const cheerio = require('cheerio');

const dataUrl = 'http://www.espn.com/mlb/scoreboard';
const dataRegex = /<script>.*scoreboardData[\s]*=[\s]*({.*};?).*<\/script>/g;

const getHTML = async (url) => {
    return rp(url);
};

const toCSV = async (arr) => {
    const csv = new otcsv(arr);
    return csv.toDisk('output.csv');
};

// works as of 06/04/2019
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

// works as of 06/04/2019
const parseNumberFireOdds = (eventArr) => {
    const nfOdds = [];
    for(let i=0;i<eventArr.length;i++) {
        for(let j=0;j<eventArr[i].competitions.length;j++) {
	    for(let k=0;k<eventArr[i].competitions[j].odds.length;k++) {
		if(eventArr[i].competitions[j].odds[k].provider.name == "numberfire") {
		    const odd = eventArr[i].competitions[j].odds[k];
		    odd.teams = [];
		    for(let l=0;l<eventArr[i].competitions[j].competitors.length;l++) {
			const team = eventArr[i].competitions[j].competitors[l].team;
			team.homeAway = eventArr[i].competitions[j].competitors[l].homeAway;
			odd.teams.push(team);
		    }
                    nfOdds.push(odd);
		}
	    }
	}
    }
    return nfOdds;
};

getHTML(dataUrl)
.then(html => {
    const eventArr = parseEventData(html);
    const nfOdds = parseNumberFireOdds(eventArr);

    console.log(nfOdds);
    console.log(nfOdds[0].teams);
    // next: calculate which odds are best and keep a tally of how they do over time

    /* toCSV([{email: "whatever@example.com", favNum: 1}, {email: "yo@example.com", favNum: 2}])
    .then(() => {
	console.log("done");
    }); */
});
