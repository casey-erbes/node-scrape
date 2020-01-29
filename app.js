'use-strict';
// const rp = require('request-promise');
const puppeteer = require('puppeteer');
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

//---------------------------------------------------------------------------
// Globals

const tgt = .05;

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const getHTML = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    // click button toggle for ELO predictions
    // await page.$eval('input#r2', el => el.click());
    // await sleep(5000); // give time to propagate ELO predictions

    const html = await page.evaluate(() => document.body.innerHTML);
    await browser.close();
    return html;
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

const printESPNBets = (odds) => {
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
        div = $(divs[i]);
        if(div.attr('id') == "upcoming-days") {
            upcomingDiv = div;
            break;
        }
    }

    // most imminent upcoming section of games
    section = $(upcomingDiv.find('section')[0]);

    tables = section.find('table');
    const odds = [];
    for(let i=0;i<tables.length;i++) {
        table = $(tables[i]);
        rows = table.find('tr');

        const matchup = {
            awayTeam: {},
            homeTeam: {}
        };
        for(let j=0;j<rows.length;j++) {
            row = $(rows[j]);
            if(row.hasClass("team")) {
                cells = row.find('td');
                for(let k=0;k<cells.length;k++) {
                    cell = $(cells[k]);
		    if(cell.hasClass("team")) {
                        if(matchup.awayTeam.name == null) {
                            matchup.awayTeam.name = cell.text();
                        } else {
                            matchup.homeTeam.name = cell.text();
                        }
                    }
                    if(cell.hasClass("chance")) {
                        if(matchup.awayTeam.chance == null) {
                            matchup.awayTeam.chance = cell.text();
                            matchup.awayTeam.pct = parseInt(cell.text().replace(/%/g, ""))/100.0;
                        } else {
                            matchup.homeTeam.chance = cell.text();
                            matchup.homeTeam.pct = parseInt(cell.text().replace(/%/g, ""))/100.0;
                        }
                    }
                }
            }
        }
        odds.push(matchup);
    }

    return odds;
};

const print538Bets = (odds) => {
    for(let i=0;i<odds.length;i++) {
        let awayMagicNum = 100*(tgt + 1 - odds[i].awayTeam.pct)/(odds[i].awayTeam.pct);
        if (awayMagicNum < 100) {
            awayMagicNum = -10000/awayMagicNum;
        }
        awayMagicNum = Math.ceil(awayMagicNum);
        console.log("Bet " + odds[i].awayTeam.name + " over " + odds[i].homeTeam.name + " if moneyline is over " + awayMagicNum);
        let homeMagicNum = 100*(tgt + 1 - odds[i].homeTeam.pct)/(odds[i].homeTeam.pct);
        if (homeMagicNum < 100) {
            homeMagicNum = -10000/homeMagicNum;
        }
        homeMagicNum = Math.ceil(homeMagicNum);
        console.log("Bet " + odds[i].homeTeam.name + " over " + odds[i].awayTeam.name + " if moneyline is over " + homeMagicNum + "\n");
    }
};

//---------------------------------------------------------------------------

getHTML(dataURL)
.then(html => {
    // const odds = parseESPNData(html);
    // printESPNBets(odds);
    odds = parse538Data(html);
    print538Bets(odds);
});
