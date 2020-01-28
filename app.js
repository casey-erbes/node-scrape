'use-strict';
const rp = require('request-promise');
const jsdom = require('jsdom');
const $ = require('jquery')(new jsdom.JSDOM().window);

// ESPN
// const dataURL = 'https://www.espn.com/nfl/scoreboard';
// const dataURL = 'https://www.espn.com/mlb/scoreboard';
// const dataURL = 'https://www.espn.com/mlb/scoreboard/_/date/20191017';
// const dataRegex = /<script>.*scoreboardData[\s]*=[\s]*({.*};?).*<\/script>/g;

// 538
// const dataURL = 'https://projects.fivethirtyeight.com/2019-nfl-predictions/games';
const dataURL = 'https://projects.fivethirtyeight.com/2020-nba-predictions/games';

// NumberFire
// const nfDataURL = 'https://www.numberfire.com/nfl/games';

const tgt = .05;

const getHTML = async (url) => {
    return rp(url);
};

//---------------------------------------------------------------------------
// ESPN

// works as of 09/18/2019
const parseESPNData = (html) => {
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
const parseESPNOdds = (eventArr) => {
    const odds = [];
    for(let i=0;i<eventArr.length;i++) {
        for(let j=0;j<eventArr[i].competitions.length;j++) {
	    if(!eventArr[i].competitions[j].odds) {
		continue
	    }
	    for(let k=0;k<eventArr[i].competitions[j].odds.length;k++) {
		if(eventArr[i].competitions[j].odds[k].provider.name == "numberfire") {
		    const o = eventArr[i].competitions[j].odds[k];
                    odds.push(o);
		}
	    }
	}
    }
    return odds;
};

// works as of 09/18/2019
const printBets = (odds) => {
    for(let i=0;i<odds.length;i++) {
	let awayMagicNum = 100*(tgt + 1 - odds[i].awayTeamOdds.winPercentage/100)/(odds[i].awayTeamOdds.winPercentage/100);
	if (awayMagicNum < 100) {
	    awayMagicNum = -10000/awayMagicNum;
	}
	awayMagicNum = Math.ceil(awayMagicNum);
	console.log("Bet " + odds[i].awayTeamOdds.team.abbreviation + " over " + odds[i].homeTeamOdds.team.abbreviation + " if moneyline is over " + awayMagicNum);
	let homeMagicNum = 100*(tgt + 1 - odds[i].homeTeamOdds.winPercentage/100)/(odds[i].homeTeamOdds.winPercentage/100);
	if (homeMagicNum < 100) {
	    homeMagicNum = -10000/homeMagicNum;
	}
	homeMagicNum = Math.ceil(homeMagicNum);
	console.log("Bet " + odds[i].homeTeamOdds.team.abbreviation + " over " + odds[i].awayTeamOdds.team.abbreviation + " if moneyline is over " + homeMagicNum + "\n");
    }
};

//---------------------------------------------------------------------------
// 538

// works as of 01/28/2019
const parse538Data = (html) => {
    html = $(html);
    divs = html.find('div');

    let upcomingDiv;
    for(let i=0;i<divs.length;i++) {
        d = $(divs[i]);
        if(d.attr('id') == 'upcoming-days') {
            upcomingDiv = d;
        }
    }

    section = $(upcomingDiv.find('section')[0]);

    tables = section.find('table');
    for(let i=0;i<tables.length;i++) {
        table = $(tables[i]);
        clss = table.attr('class').split(" ");
	homeTeam = clss[clss.length-1];
	awayTeam = clss[clss.length-2];
	console.log(awayTeam + " vs " + homeTeam);

        rows = table.find('tr');
        for(let j=0;j<rows.length;j++) {
            row = $(rows[j]);
            if(row.hasClass("team")) {
                cells = row.find('td');
                for(let k=0;k<cells.length;k++) {
                    cell = $(cells[k]);
                    if(cell.hasClass("chance")) {
                        console.log(cell.text());
                    }
                }
            }
        }
    }
};

//---------------------------------------------------------------------------

getHTML(dataURL)
.then(html => {
    const eventArr = parse538Data(html);
    // const eventArr = parseESPNData(html);
    // const odds = parseESPNOdds(eventArr);
    // printBets(odds);
});
