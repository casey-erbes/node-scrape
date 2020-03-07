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
const f38DataURL = 'https://projects.fivethirtyeight.com/2020-nba-predictions/games';

// NumberFire
// const nfDataURL = 'https://www.numberfire.com/nfl/games';
const nfDataURL = 'https://www.numberfire.com/nba/games';

//---------------------------------------------------------------------------
// Globals

const tgt = .05;

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
const get538HTML = async (url, elo) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    if(elo) {
        // click button toggle for ELO predictions
        await page.$eval('input#r2', el => el.click());
        await sleep(5000); // give time to propagate ELO predictions
    }

    const html = await page.evaluate(() => document.body.innerHTML);
    await browser.close();
    return html;
};

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

//---------------------------------------------------------------------------
// NumberFire

const getNumberFireHTML = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const html = await page.evaluate(() => document.body.innerHTML);
    await browser.close();
    return html;
};

const parseNumberFireData = (html) => {
    html = $(html);

    sections = html.find('section');
    let section;
    for(let i=0;i<sections.length;i++) {
        s = $(sections[i]);
        if(s.hasClass("grid__two-col--main")) {
            section = s;
            break;
        }
    }

    divs = section.find('div');
    const odds = [];
    for(let i=0;i<divs.length;i++) {
        let div = $(divs[i]);
	if(div.hasClass("game-indiv__game-header__score")) {
            const matchup = {
                awayTeam: {},
                homeTeam: {}
            };

	    let innerDivs = div.find('div');
	    for(let j=0;j<innerDivs.length;j++) {
        	let innerDiv = $(innerDivs[j]);
		if(innerDiv.hasClass('team__info')) {
		    let spans = innerDiv.find('span');
		    for(let k=0;k<spans.length;k++) {
			let span = $(spans[k]);
			if(span.hasClass('abbrev')) {
                            if(matchup.awayTeam.abbrev == null) {
                                matchup.awayTeam.abbrev = span.text();
                            } else {
                                matchup.homeTeam.abbrev = span.text();
                            }
			} else if(span.hasClass('full')) {
                            if(matchup.awayTeam.name == null) {
                                matchup.awayTeam.name = span.text();
                            } else {
                                matchup.homeTeam.name = span.text();
                            }
			}
		    }
		} else if(innerDiv.hasClass('win-probability')) {
		    let h4s = innerDiv.find('h4');
		    for(let k=0;k<h4s.length;k++) {
			let h4 = $(h4s[k]);
			let abbrev = innerDiv.clone().children().remove().end().text().trim();
			let pct = parseFloat("0." + h4.text().trim().replace(/\./g, ""))
                        if(abbrev == matchup.awayTeam.abbrev) {
			    matchup.awayTeam.pct = pct;
			    matchup.homeTeam.pct = parseFloat((1-pct).toFixed(4));
			} else {
			    matchup.homeTeam.pct = pct;
			    matchup.awayTeam.pct = parseFloat((1-pct).toFixed(4));
			}
		    }
		}
	    }
            odds.push(matchup);
	}
    }

    return odds;
};

//---------------------------------------------------------------------------

const printBets = (odds) => {
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

// get 538 data with RAPTOR button selected
get538HTML(f38DataURL, false)
.then(html => {
    odds = parse538Data(html);
    console.log("\nRAPTOR Formulations:\n");
    printBets(odds);
});

// get 538 data with ELO button selected
get538HTML(f38DataURL, true)
.then(html => {
    odds = parse538Data(html);
    console.log("\nELO Formulations:\n");
    printBets(odds);
});

// get NumberFire data
getNumberFireHTML(nfDataURL)
.then(html => {
    odds = parseNumberFireData(html);
    console.log("\nNumberFire Formulations:\n");
    printBets(odds);
});
