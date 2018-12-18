// Setup:
//
//  > apt-get nodejs # Linux
//  (Or install nodejs under Windows)
//  > npm install node-fetch
//  > npm install js-yaml
//
//  Create an Atlassian API token for the username you use with JIRA at https://id.atlassian.com/manage/api-tokens, and save it in PullRequestsParams.y ml with your JIRA username
//  Enter your Bitbucket username and password in PullRequestsParams.yml
//     or more securely, base64-encode them (instructions in the yaml file)
//
// Run: (not on Blue network, or the Dell vpn):
//  > node PullRequests.js
//

'use strict';



///// get parameters from file /////

function setUpParams(yamlFile) { // e.g. scriptParams = setUpParams("myfile.yaml");

  const
    yaml = require('js-yaml'),
    fs = require('fs'),
    jsonObj = yaml.load(fs.readFileSync(yamlFile, {encoding: 'utf-8'}));

    console.log("In setUpParams, jsonObj = " + JSON.stringify(jsonObj));
  
  return jsonObj;
}

var scriptParams = setUpParams('PullRequestsParams.yml'); // this provides access to properties in the parameter file, for example scriptParams.Bitbucket.repos.name.



////////////////////// Sort an array of objects /////////////////////////////////

// E.g. const peopleSorted = People.sort(dynamicSortMultiple("last_nom", "first_nom"));

////////Won't work with nested keys right now, but could be extended to do this


function dynamicSort(property) { // Thanks Wogan @ https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
    var sortOrder = 1;

    if(property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }

    return function (a, b) {

      var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
      return result * sortOrder;
    }
}

function dynamicSortMultiple(...sortOrderArr) { // Thanks Ege Özcan @ https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value

    return function (obj1, obj2) {
        var i = 0, result = 0, numberOfProperties = sortOrderArr.length;
        /* try getting a different result from 0 (equal)
         * as long as we have extra properties to compare
         */
          while(result === 0 && i < numberOfProperties) {
            result = dynamicSort(sortOrderArr[i])(obj1, obj2);
            i++;
        }
        return result;
    }
}



/////////////////////// Create JSON object of data from Bitbucket and JIRA, ordered by review priority /////////////////////////

const fetch = require("node-fetch");


function consoleLog(str) {;
  console.log(str); // comment or change this for eliminating or changing diagnostic messages
}


function parseJIRA(JIRA) {
  consoleLog("In parseJIRA, key = " + JIRA.key);

  consoleLog("In parseJIRA, JIRA = " + JSON.stringify(JIRA));

  const parsedJIRAOut = {};
  parsedJIRAOut.key = JIRA.key;
  parsedJIRAOut.summary = JIRA.fields.summary;
  parsedJIRAOut.status = JIRA.fields.status.name;
  parsedJIRAOut.team = JIRA.fields.customfield_10400.value;
  consoleLog("In parsedJIRA, parsedJIRAOut = " + JSON.stringify(parsedJIRAOut));
  return parsedJIRAOut;
}


async function requestJIRA(JIRAKey) {
  let url = "https://boomii.atlassian.net/rest/api/2/issue/" + JIRAKey + "?expand=changelog&maxResults = 100";

  consoleLog("In requestJIRA, JIRAKey = " + JIRAKey);

  let base64unpw;

  if (typeof scriptParams.JIRA.credentials.base64unpw != "undefined") { // the params file contains bas64unpw line
    consoleLog("In requestJIRA, using base64unpw from params");
    base64unpw = scriptParams.JIRA.credentials.base64unpw;
  } else { // the params file does not contain the base64 encoded username and password, so it must contain plain text username and APIToken entries
    consoleLog("In requestJIRA, using username and password from params");
    const un = scriptParams.JIRA.credentials.username;
    const pw = scriptParams.JIRA.credentials.APIToken;
    const buff = new Buffer(un + ":" + pw);
    base64unpw = buff.toString('base64');
  }

  consoleLog("In requestJIRA, base64unpw = " + base64unpw); // you can put this value in the params file instead of username and password

  try {
    // Default options are marked with *
    const response = await fetch(url, {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": "Basic " + base64unpw,
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        //body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
    const JIRAjson = await response.json();
    consoleLog("In requestJIRA, key = " + JIRAjson.key);
    consoleLog("In requestJIRA, json = " + JSON.stringify(JIRAjson));

    return parseJIRA(JIRAjson);

  } catch(err) {
    console.error("In requestJIRA, caught error on fetch: " + err + err.stack);
    process.exit(1);
  }
}


async function parsePR(repoName, repoShortName, PR) {

  //consoleLog("In parsePR, PR = " + JSON.stringify(PR));

  let PROut = {};

  const regExp = /pullrequests\/(.*)/;
  let PRNum;
  try {PRNum = regExp.exec(PR.links.self.href)[1];} catch (error) {PRNum = "PR Num not found";}
  consoleLog("In parsePr, PRNUm = " + PRNum);

  if (PRNum !== "PR Num not found") { // should be found
    const PRKey = repoShortName + "_" + PRNum;
    PROut["key"] = PRKey;
    PROut["reponame"] = repoName;
    PROut["reposhortname"] = repoShortName;
    PROut["pr_num"] = PRNum;
    consoleLog("In parsePR, PROut = " + JSON.stringify(PROut));

    PROut["branch"] = PR.destination.branch.name;

    PROut["title"] = PR.title;
    PROut["summary"] = PR.summary.raw;
    PROut["author"] = PR.author.display_name;
    PROut["updated_on"] = PR.updated_on;

    switch (PROut["branch"]) {
      case "master":
        PROut["status"] = "Staged for prod";
        PROut["review_priority"] = 1;
        break;
      case "qa":
        PROut["status"] = "Staged for QA";
        PROut["review_priority"] = 2;
        break;
      case "dev":
          if (PROut.title.startsWith("RTM")) {
            PROut["status"] = "Ready for merging";  // usually a bunch of JIRAs (listed in the summary.raw field)
            PROut["review_priority"] = 3;
          } else {
            if (PROut.title.startsWith("DEV")) {
              PROut["status"] = "Initial code review";
              PROut["review_priority"] = 4;
            } else {
              if (PROut.title.startsWith("TEST")) {
                PROut["status"] = "Team testing";
                PROut["review_priority"] = 5;
              } else {
                PROut["status"] = "What does the team want?";
                PROut["review_priority"] = 6;
                }
              }
            }
            break;
      default: // some other branch      
        PROut["status"] = "Team development";
        PROut["review_priority"] = 7;
        break;
    };

    PROut["JIRAs"] = [];  // maybe don't do this if there are no JIRAs

    const JIRAPattern = /BOOMI-[0-9]*/g;

    PROut["JIRAs"] = [];

    let JIRAKeysArr = [];
    let JIRAKeysMatched = null;

    ["title", "summary"].forEach(element => { // find JIRA numbers in the summary and title fields
      JIRAKeysMatched = PROut[element].match(JIRAPattern);
   
      consoleLog("In parsePR, JIRAKeysMatched = " + JIRAKeysMatched);
 
      if (JIRAKeysMatched !== null) {
        JIRAKeysArr = JIRAKeysArr.concat(JIRAKeysMatched);
      }
    });

    const JIRAKeysArrUnique = JIRAKeysArr.filter((value, index, self) => self.indexOf(value) == index); // get rid of duplicate JIRA keys

    let requestJIRAPromiseArr = [];

    JIRAKeysArrUnique.forEach(JIRAKey => {
      requestJIRAPromiseArr.push(requestJIRA(JIRAKey));
    });

    const JIRAjsonArr = await Promise.all(requestJIRAPromiseArr);

    JIRAjsonArr.forEach(JIRAjson => {
      PROut.JIRAs.push(JIRAjson);
    });
  }
  consoleLog("In parsePR, PROut = " + JSON.stringify(PROut));
  return PROut;
}


async function parsePRs(repoName, repoShortName, PRs) {

  //consoleLog("In parsePRs");
  //consoleLog("In parsePRs, PRs.values = " + JSON.stringify(PRs.values));

  let parsePRPromiseArr = [];

  PRs.values.forEach(PR => {
    //consoleLog("In parsePRs, for loop");
    //consoleLog("In parsePRs, PR = " + JSON.stringify(PR));
    //consoleLog("In parsePRs, PR.json.values = " + PR.json.values);
    parsePRPromiseArr.push(parsePR(repoName, repoShortName, PR));
  });

  consoleLog("In parsePRs, before awaiting all parsePR promises");
  const PROutArr = await Promise.all(parsePRPromiseArr);
  consoleLog("In parsePRs, after awaiting all parsePR promises, PROutArr = " + JSON.stringify(PROutArr));


  consoleLog("In parsePRs, PROutArr = " + JSON.stringify(PROutArr));

  return PROutArr;
}



async function processPRs(repoName, repoShortName) {

  consoleLog("In processPRs, repoName = " + repoName);


    let base64unpw;

    if (typeof scriptParams.Bitbucket.credentials.base64unpw != "undefined") { // the params file contains bas64unpw line 
      consoleLog("In processPRs, using base64unpw from params");
      base64unpw = scriptParams.Bitbucket.credentials.base64unpw;
    } else { // the params file does not contain the base64 encoded username and password, so it must contain plain text username and password entries
      consoleLog("In processPRs, using username and password from params");
      const un = scriptParams.Bitbucket.credentials.username;
      const pw = scriptParams.Bitbucket.credentials.password;
      const buff = new Buffer(un + ":" + pw);
      base64unpw = buff.toString('base64');
    }
  
    consoleLog("In processPRs, base64unpw = " + base64unpw); // you can put this value in the params file instead of username and password


  try {
    // Default options are marked with *
    const response = await fetch('https://bitbucket.org/api/2.0/repositories/BOOMII/' + repoName + '/pullrequests', {
        method: "GET", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": "Basic " + base64unpw,
        },
        redirect: "follow", // manual, *follow, error
        referrer: "no-referrer", // no-referrer, *client
        //body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
  
    const PRsjson = await response.json();

    consoleLog("In processPRs, PRsjson = " + JSON.stringify(PRsjson));
    consoleLog("In processPRs, shortname = " + repoShortName);

    const parsePRsResponse = await parsePRs(repoName, repoShortName, PRsjson);

    consoleLog("In processPRs, parsePRsResponse = " + JSON.stringify(parsePRsResponse));
    return parsePRsResponse;

  } catch(err) {
      console.error("In processPRs, caught error on fetch: " + err + err.stack);
      process.exit(1);
  }
}


async function processRepos() {

  let processPRsPromiseArr = [];

  console.log("In processRepos, scriptParams.Bitbucket.repos = " + JSON.stringify(scriptParams.Bitbucket.repos));

  scriptParams.Bitbucket.repos.forEach(repo => {
    //consoleLog("In processRepos, repo = " + JSON.stringify(repo));
    consoleLog("In processRepos, repo.name = " + repo.name);
      
    processPRsPromiseArr.push(processPRs(repo.name, repo.shortName));
  });


  consoleLog("In processRepos, before awaiting all processRepos promises");

  let processPRsOutArr = await Promise.all(processPRsPromiseArr);

  let repoPRs = [];

  processPRsOutArr.forEach(PRs => {
    PRs.forEach(PR => {
      repoPRs.push(PR);
    });
  });

  let repoPRsSorted = {};

  repoPRsSorted["PRs"] = repoPRs.sort(dynamicSortMultiple("review_priority", "updated_on"));

  consoleLog("In processRepos, repoPRsSorted = " + JSON.stringify(repoPRsSorted));


  return repoPRsSorted; // Since this is an async function, must access this in caller.then fuction
}

////////////////////// Create a JSON table in the format accepted by the FactBoard web app  //////

/////Input: returned value from processRepos() above - a json of pull requests and their JIRAs in priority order


async function buildFactBoardTable() {

  var pullRequests = await processRepos();

  consoleLog("In buildFactBoardTable, pullRequests = " + JSON.stringify(pullRequests));

  var factBoardPage = {}; // a row for each PR is pushed to the end in the below loop

  factBoardPage["tables"] = [];
  factBoardPage.tables[0] = {rows: [{cells: [{text: "Infrastructure Pull Requests"}], isHeading: true}]};


  factBoardPage.tables[1] = {};
  factBoardPage.tables[1]["rows"] = [];
  factBoardPage.tables[1].rows[0] = {};
  factBoardPage.tables[1].rows[0]["isHeading"] = true;
  factBoardPage.tables[1].rows[0]["cells"] = [];

  // Load the heading row with text to display:
  factBoardPage.tables[1].rows[0]["cells"] = [];
  factBoardPage.tables[1].rows[0].cells[0] = {};
  factBoardPage.tables[1].rows[0].cells[0]["text"] = "PR";
  factBoardPage.tables[1].rows[0].cells[0]["isHeading"] = true;
  factBoardPage.tables[1].rows[0].cells[0]["popupMenus"] = [];
  factBoardPage.tables[1].rows[0].cells[0].popupMenus[0] = {};
  let i = 0;
  scriptParams.Bitbucket.repos.forEach(repo => {
    consoleLog("In buildFactBoardTable, repo = " + JSON.stringify(repo));
    factBoardPage.tables[1].rows[0].cells[0].popupMenus[i] = {};
    factBoardPage.tables[1].rows[0].cells[0].popupMenus[i]["text"] = repo.shortName + " pull requests";
    factBoardPage.tables[1].rows[0].cells[0].popupMenus[i]["url"] = 'https://bitbucket.org/boomii/' + repo.name + "/pull-requests";
    i = i + 1;
  });

  factBoardPage.tables[1].rows[0].cells[1] = {};
  factBoardPage.tables[1].rows[0].cells[1]["text"] = "Repo";
  factBoardPage.tables[1].rows[0].cells[1]["popupMenus"] = [];
  i = 0;
  scriptParams.Bitbucket.repos.forEach(repo => {
    consoleLog("In buildFactBoardTable, repo = " + JSON.stringify(repo));
    factBoardPage.tables[1].rows[0].cells[1].popupMenus[i] = {};
    factBoardPage.tables[1].rows[0].cells[1].popupMenus[i]["text"] = repo.shortName + " - " + repo.name;
    factBoardPage.tables[1].rows[0].cells[1].popupMenus[i]["url"] = 'https://bitbucket.org/boomii/' + repo.name + "/src/master";
    i = i + 1;
  });

  factBoardPage.tables[1].rows[0].cells[2] = {};
  factBoardPage.tables[1].rows[0].cells[2]["text"] = "Title";

  factBoardPage.tables[1].rows[0].cells[3] = {};
  factBoardPage.tables[1].rows[0].cells[3]["text"] = "Branch";
  factBoardPage.tables[1].rows[0].cells[3]["popupMenus"] = [];
  i = 0;
  scriptParams.Bitbucket.repos.forEach(repo => {
    consoleLog("In buildFactBoardTable, repo = " + JSON.stringify(repo));
    factBoardPage.tables[1].rows[0].cells[3].popupMenus[i] = {};
    factBoardPage.tables[1].rows[0].cells[3].popupMenus[i]["text"] = repo.shortName + " branches";
    factBoardPage.tables[1].rows[0].cells[3].popupMenus[i]["url"] = 'https://bitbucket.org/boomii/' + repo.name + "/branches";
    i = i + 1;
  });

  factBoardPage.tables[1].rows[0].cells[4] = {};
  factBoardPage.tables[1].rows[0].cells[4]["text"] = "Author";

  factBoardPage.tables[1].rows[0].cells[5] = {};
  factBoardPage.tables[1].rows[0].cells[5]["text"] = "Disposition";
  factBoardPage.tables[1].rows[0].cells[5]["popupMenus"] = [];
  factBoardPage.tables[1].rows[0].cells[5].popupMenus[0] = {};
  factBoardPage.tables[1].rows[0].cells[5].popupMenus[0]["text"] = "Black - merge to master\nMerge to dev\nPink - merge to QA\nBlue - review the code\nGray - no action";
 "Black - merge to master\nMerge to dev\nPink - merge to QA\nBlue - review the code\nGray - no action";
  factBoardPage.tables[1].rows[0].cells[5].popupMenus[0]["url"] = "https://andrewjpatrick.files.wordpress.com/2016/01/get-on-with-it1.png";


  factBoardPage.tables[1].rows[0].cells[6] = {};
  factBoardPage.tables[1].rows[0].cells[6]["text"] = "Last updated";
  factBoardPage.tables[1].rows[0].cells[6]["popupMenus"] = [];
  factBoardPage.tables[1].rows[0].cells[6].popupMenus[0] = {};
  factBoardPage.tables[1].rows[0].cells[6].popupMenus[0]["text"] = "Pink if action overdue by more than one day\nRed if action overdue by more than three days";
  factBoardPage.tables[1].rows[0].cells[6].popupMenus[0]["url"] = "https://andrewjpatrick.files.wordpress.com/2016/01/get-on-with-it1.png";


  factBoardPage.tables[1].rows[0].cells[7] = {};
  factBoardPage.tables[1].rows[0].cells[7]["text"] = "JIRA";

  factBoardPage.tables[1].rows[0].cells[8] = {};
  factBoardPage.tables[1].rows[0].cells[8]["text"] = "JIRA Status";

  factBoardPage.tables[1].rows[0].cells[9] = {};
  factBoardPage.tables[1].rows[0].cells[9]["text"] = "JIRA Team";
  factBoardPage.tables[1].rows[0].cells[9]["popupMenus"] = [];
  factBoardPage.tables[1].rows[0].cells[9].popupMenus[0] = {};
  factBoardPage.tables[1].rows[0].cells[9].popupMenus[0]["text"] = "BOOMI R&D Agile Teams";
  factBoardPage.tables[1].rows[0].cells[9].popupMenus[0]["url"] = "https://docs.google.com/spreadsheets/d/17WPr_DZJsVe3PeeHlZh3HO9h8fN6Ws58Qyji0AqFZes/edit?usp=sharing";

  consoleLog("In buildFactBoardTable, header row = " + JSON.stringify(factBoardPage));


  ////// Create a detail row for each PR:

  consoleLog("In buildFactBoardTable before creating table rows, pullRequests = " + JSON.stringify(pullRequests));

  pullRequests.PRs.forEach(PR => {
    consoleLog("In buildFactBoardTable, PR = " + JSON.stringify(PR));

    let row = {};
    row["cells"] = [];
    let columnNum = 0;

    row.cells[columnNum] = {}; // Pull request left hand column
    row.cells[columnNum]["text"] = PR.pr_num;
    row.cells[columnNum]["popupMenus"] = [];
    row.cells[columnNum].popupMenus[0] = {};
    row.cells[columnNum].popupMenus[0]["text"] = "PR in Bitbucket";
    row.cells[columnNum].popupMenus[0]["url"] = 'https://bitbucket.org/boomii/' + PR.reponame + '/pull-requests/' + PR.pr_num;

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // Repo
    row.cells[columnNum]["text"] = PR.reposhortname;
    row.cells[columnNum]["popupMenus"] = [];
    row.cells[columnNum].popupMenus[0] = {};
    row.cells[columnNum].popupMenus[0]["text"] = PR.reposhortname + " - " + PR.reponame;
    row.cells[columnNum].popupMenus[0]["url"] = 'https://bitbucket.org/boomii/' + PR.reponame;

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // PR text column/cell
    row.cells[columnNum]["text"] = PR.title.replace(/\\/g, '');
    if (PR.summary != "") {
      row.cells[columnNum]["popupMenus"] = [];
      row.cells[columnNum].popupMenus[0] = {};
      row.cells[columnNum].popupMenus[0]["text"] = PR.summary.replace(/\r\n/g, '\n').replace(/\\/g, '');
      row.cells[columnNum].popupMenus[0]["url"] = 'https://bitbucket.org/boomii/' + PR.reponame + '/pull-requests/' + PR.pr_num;
    }

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // PR Branch column/cell
    row.cells[columnNum]["text"] = PR.branch;
    row.cells[columnNum]["popupMenus"] = [];
    row.cells[columnNum].popupMenus[0] = {};
    row.cells[columnNum].popupMenus[0]["text"] = "Branch in Bitbucket";
    row.cells[columnNum].popupMenus[0]["url"] = 'https://bitbucket.org/boomii/' + PR.reponame + '/branch/' + PR.branch;

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // PR text column/cell
    row.cells[columnNum]["text"] = PR.author;

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // PR Disposition (next steps)
    row.cells[columnNum]["text"] = PR.status;
    row.cells[columnNum]["data-blackif"] = "isValue('Staged for prod')";
    row.cells[columnNum]["data-pinkif"] = "isValue('Staged for QA')";
    row.cells[columnNum]["data-orangeif"] = "isValue('Ready for merging')";
    row.cells[columnNum]["data-blueif"] = "isIn('Initial code review')";
    row.cells[columnNum]["data-grayif"] = "isIn('Team testing', 'Team development')";
    row.cells[columnNum]["popupMenus"] = [];
    row.cells[columnNum].popupMenus[0] = {};
    row.cells[columnNum].popupMenus[0]["text"] = "Black - merge to master\nMerge to dev\nPink - merge to QA\nBlue - review the code\nGray - no action";
    row.cells[columnNum].popupMenus[0]["url"] = "https://andrewjpatrick.files.wordpress.com/2016/01/get-on-with-it1.png";

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // PR last updated date column/cell
    row.cells[columnNum]["text"] = PR.updated_on;
    row.cells[columnNum]["data-transformvalue"] = "iso8601toDisplay()";
    if (['Staged for QA', 'Ready for merging', 'Initial code review'].indexOf(PR.status) > -1) {
      row.cells[columnNum]["data-pinkif"] = "moreWorkDaysThan(1, 'MM/DD/YYYY HH:mm')";
      row.cells[columnNum]["data-redif"] = "moreWorkDaysThan(3, 'MM/DD/YYYY HH:mm')";
      row.cells[columnNum]["popupMenus"] = [];
      row.cells[columnNum].popupMenus[0] = {};
      row.cells[columnNum].popupMenus[0]["text"] = "Pink - action overdue by more than one day\nRed - action overdue by more than three days";
      row.cells[columnNum].popupMenus[0]["url"] = "https://andrewjpatrick.files.wordpress.com/2016/01/get-on-with-it1.png";
    }

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // JIRA column/cell
    if (typeof PR.JIRAs[0] != "undefined") { // there is at least one JIRA
      row.cells[columnNum]["text"] = "";
      row.cells[columnNum]["popupMenus"] = [];
      row.cells[columnNum].popupMenus[0] = {};
      row.cells[columnNum]["popupMenus"] = [];
      let delim = "";
      let i = 0;
      PR.JIRAs.forEach(JIRA => {
        row.cells[columnNum].text = row.cells[columnNum].text + delim + JIRA.key;
        console.log("In buildFactBoardTable, row.cells[columnNum].text = " + row.cells[columnNum].text);
        delim = "\n";  // the two-character string, not a newline char. It will be translated into <br> in the browser javascript
        row.cells[columnNum].popupMenus[i] = {};
        row.cells[columnNum].popupMenus[i]["text"] = JIRA.key + " " + JIRA.summary;
        row.cells[columnNum].popupMenus[i]["url"] = 'https://boomii.atlassian.net/browse/' + JIRA.key;
        console.log("In buildFactBoardTable, row.cells[columnNum].popupMenus[i] = " + JSON.stringify(row.cells[columnNum].popupMenus[i]));
        console.log("In buildFactBoardTable, JIRA.key = " + JIRA.key + ", row.cells[columnNum].popupMenus = " + JSON.stringify(row.cells[columnNum].popupMenus)); 
        i = i + 1;
      });
    } else {
      row.cells[columnNum]["text"] = "(No JIRAs)";
    }

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // JIRA status column/cell
    if (typeof PR.JIRAs[0] != "undefined") { // there is at least one JIRA
      row.cells[columnNum]["text"] = "";
      let delim = "";
      PR.JIRAs.forEach(JIRA => {
        row.cells[columnNum].text = row.cells[columnNum].text + delim + JIRA.status;
        console.log("In buildFactBoardTable, row.cells[columnNum].text = " + row.cells[columnNum].text);
        delim = "\n";  // the two-character string, not a newline char. It will be translated into <br> in the browser javascript
      });
    } else {
      row.cells[columnNum]["text"] = "";
    }

    columnNum = columnNum + 1;
    row.cells[columnNum] = {}; // JIRA team column/cell
    if (typeof PR.JIRAs[0] != "undefined") { // there is at least one JIRA
      row.cells[columnNum]["text"] = "";
      let delim = "";
      PR.JIRAs.forEach(JIRA => {
        row.cells[columnNum].text = row.cells[columnNum].text + delim + JIRA.team;
        console.log("In buildFactBoardTable, row.cells[columnNum].text = " + row.cells[columnNum].text);
        delim = "\n";  // the two-character string, not a newline char. It will be translated into <br> in the browser javascript
      });
    } else {
      row.cells[columnNum]["text"] = "";
    }


    consoleLog("In buildFactBoardTable, row = " + JSON.stringify(row));
    factBoardPage.tables[1].rows.push(row);
  });



////// Add help line/table to the end

   factBoardPage.tables[2] = {rows: [{cells: [{text: "Need help?",isHeading: true}, {text: "Steps for Infrastructure JIRAs", popupMenus: [{text: "Steps for Infrastructure JIRAs", url: "https://docs.google.com/document/d/1zl8_s6SBfmNSK09KUHAubVPOgLUvY5dsJDfZRLuIZ-c/edit"}]}, {text: "How Infrastructure Changes Get to Production", popupMenus: [{text: "Infrastructure Workflow",url: "https://docs.google.com/document/d/1z8-v-mypDJhNrPBaIvveNmaui6fbxAHqCvbGi6eZztE/edit?ts=5bc5f5b2#heading=h.rr0szdhuyghb"}]}]}]};


////// Write the JSON file that the html page uses to load:

  consoleLog("In buildFactBoardTable, tables = " + JSON.stringify(factBoardPage));

  const fs = require('fs');

  const factBoardDir = scriptParams.FactBoard.directory.replace(/\/$/, "") + "/";

  fs.writeFile(factBoardDir + 'prfactboard.json', JSON.stringify(factBoardPage, null, 2), (err) => {  
      // throws an error, you could also catch it here
      if (err) throw err;

      // success case, the file was saved
      consoleLog(factBoardDir  + "prfactboard.json saved");
  });


  const  d = new Date();
  
  const fileContent = "Built: " + ("0" + (d.getMonth()+1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2) + "/" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)+ ":" + ("0" + d.getSeconds()).slice(-2);

  fs.writeFile(factBoardDir + 'prfactboard_last_built.txt', fileContent, (err) => {

      if (err) throw err;

      // success case, the file was saved
      consoleLog(factBoardDir + "prfactboard_last_built.txt saved");
  });

}


/////////////////////////////////////// Main logic ///////////////////////////////////////////////

consoleLog("In logic, starting");

buildFactBoardTable();

// Remember that async functions are async, so the return value is only available in .then (or an await, if inside another async function)

consoleLog("In main logic, ending");
