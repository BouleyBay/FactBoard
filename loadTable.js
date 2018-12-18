    
var debug = true;

function debugMsg(...msg) {
   if (debug) {
      console.log(msg.join(" "));
   }
}
    
debugMsg("Debug is " + debug);

function forceMsg(msg) {
    console.log(msg);
}

// As of 4.11 we use localstorage instead cookies, so delete all the old cookies - thank you http://stackoverflow.com/questions/595228/how-can-i-delete-all-cookies-with-javascript
function createCookie(name, value, days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else {var expires = "";}
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}   

var cookies = document.cookie.split(";");
for (var i = 0; i < cookies.length; i++) {
  eraseCookie(cookies[i].split("=")[0]);
  debugMsg("Erased cookie " + cookies[i].split("=")[0]);
}  


var configDisplay = true;  // true if the configuration section is displayed for configuring what environments are shown, false if the minus icon

// TODO: put the above in a getter/setter (currently it's a global variable).  See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#Defining_getters_and_setters


function toggleConfigDisplay(element) {
    configDisplay = !configDisplay;  // toggle the plus/minus display boolean

    var selectRows = document.getElementById("selectRows");

    if (configDisplay == true) {
        element.src = "minus.png";
        selectRows.style.display = "table-row";
    }
    else {
        element.src = "plus.png";
        selectRows.style.display = "none";
    }
    setStoredValue(selectRows.id, selectRows.style.display); // we don't use this yet....
}

toggleConfigDisplay(document.getElementById("selectRows"));


// The below is used to display a popup menu. Thanks to javascript-array.com

var timeout = 200;
var closetimer = 0;
var ddmenuitem = 0;

// open hidden layer
function mopen(id, ele)
{
    var eleAnchor = ele.getElementsByTagName('a');
    // eleAnchor[0].style.fontWeight = "900";
    eleAnchor[0].style.cursor = "pointer";

    // cancel close timer
    mcancelclosetime(ele);

    // close old layer
    if(ddmenuitem) ddmenuitem.style.visibility = 'hidden';

    // get new layer and show it
    ddmenuitem = document.getElementById(id);
    ddmenuitem.style.visibility = 'visible';

}

// close showed layer
function mclose() {
    if(ddmenuitem) ddmenuitem.style.visibility = 'hidden';
}

// go close timer
function mclosetime(ele) {
    closetimer = window.setTimeout(mclose, timeout);

    if (typeof ele !== 'undefined') {
        var eleAnchor = ele.getElementsByTagName('a'); 
        eleAnchor[0].style.cursor = "text";
    }
}

// cancel close timer
function mcancelclosetime() {
    if(closetimer)
    {
        window.clearTimeout(closetimer);
        closetimer = null;
    }
}

// close layer when click-out
document.onclick = mclose; 



function loadEnvMenu(envEle, envIdx) { // Add the popup menus to a fact or heading cell

  debugMsg("In loadEnvMenu, typeof envEle = " + (typeof envEle.id) + ", envIdx = " + envIdx);
  var envMenuDiv = document.createElement('div');
  envMenuDiv.class = 'envdropdown';
  envMenuDiv.id = 'envdropdown' + envIdx;

  envMenuDiv.setAttribute('onmouseover', "mcancelclosetime()");
  envMenuDiv.setAttribute('onmouseout', "mclosetime()");

  var envAnchorArr = ["", "", "", "", "", "", "", "", "", "", "", "", ""] // 13 elements - keep in synch with the max number of menu items
  var envMenuItem;
  var envMenuDisp;
  var envMenuUri;
  var delimPos;
  var menuText;
  var prevMenuItemIdx = -1;
 
  // find menu items for the cell and add them to the list
  for (var i=13; i>=1; i--) {  // have to go in reverse order as there is no "insert after" in js [update - I believe there is] so have to insert before the previous menu line added
      // if you increase the max number of menu items (above), to be safe, add extra "" values to envAnchorArr.
  
      envMenuItem = envEle.getAttribute("data-menuitem" + i); // get the next item to add to the menu dropdown
      if (envMenuItem) {
          envAnchorArr[i] = document.createElement('a'); // create and anchor element for the dropdown
          delimPos = envMenuItem.indexOf(":") // find the first colon, which delimits what is displayed in the menu item and what the url is if clicked
          if (delimPos != -1) { // found the colon (otherwise it's a badly constructed menu item so ignore

              envMenuDisp = envMenuItem.substring(0, delimPos);  // the menu item display is the part before the colon
              envMenuUri = envMenuItem.substring(delimPos+1, envMenuItem.length);  // the uri when the menu item is clicked is the part after the colon 
              envAnchorArr[i].setAttribute("href", envMenuUri);  // set the action for clicking the menu item

             envAnchorArr[i].textContent = envMenuDisp;
             envAnchorArr[i].innerHTML = envAnchorArr[i].innerHTML.replace(/\n|\\n|<br>/g, "<br>");


              if (prevMenuItemIdx == -1) { // this is the first menu item to be added (actually the last on the list), so append as child of the div
                  envMenuDiv.appendChild(envAnchorArr[i]);
              } else { // subsequent menu items: insert before the previous menu item
                  envMenuDiv.insertBefore(envAnchorArr[i], envAnchorArr[prevMenuItemIdx]);                
              }
              prevMenuItemIdx = i;
          }
      }
    }


    // The below will contain the displayed value, so need to replace the href with putting in the side window

    var displayedValueAnchor = document.createElement('a');  // Create an anchor element to do inside the cell
    displayedValueAnchor.class = 'displayedvalueanchor';
    displayedValueAnchor.id = 'displayedvalueanchor' + envIdx;
    var envMenuDisp = document.createTextNode(envEle.innerHTML);  // crappy: move the row header text to the anchor
    envEle.innerHTML = "";  // remove the header text after moving it to the anchor (there are better ways to do this)
    displayedValueAnchor.appendChild(envMenuDisp);


    var cellUrl = envEle.getAttribute("data-versionuri"); // where the url associated with the clicked cell is displayed

    if (cellUrl != "" && cellUrl != null) {  // we are allowed to select the cell containing the url
        debugMsg("In loadEnvMenu, cellUrl not empty, = " + cellUrl);
        displayedValueAnchor.onclick = function() {refreshUrl(envEle, "clickedLink")}; // set the function to perform if (later) the url is clicked
        //displayedValueAnchor.title = envEle.getAttribute("data-versionuri"); // does not work - bug
    }

    if (prevMenuItemIdx != -1) { // there is at least one menu item
        envEle.appendChild(envMenuDiv);
        //displayedValueAnchor.href = envMenuUri;
        displayedValueAnchor.onmouseover = function(){mopen("envdropdown" + envIdx, envEle)};
        displayedValueAnchor.onmouseout = function(){mclosetime(envEle)};
        envEle.insertBefore(displayedValueAnchor, envMenuDiv);  // insert the anchor in the cell that will show the value
    } else { // no menu items
        envEle.appendChild(displayedValueAnchor);
    }    
}


function beforeGetUrl(cellDocObj, howAccessed){ // do stuff before the value is displayed
    var displayedValueAnchor = cellDocObj.getElementsByTagName('a'); // get the anchor element within the cell

    displayedValueAnchor[0].innerHTML = "?";  // temporarily put a question mark in the cell before we get the value to display from the server

    cellDocObj.style.backgroundColor = "yellow"; //...and make the cell yellow while the call back to the server to get the xmlHTTP response is in progress

    var cellUrl = cellDocObj.getAttribute("data-versionuri"); // uri that contains the value
    if (cellUrl != "" && cellUrl !== null) {  // we are allowed to select the cell containing the value

        if (howAccessed == "clickedLink" && cellDocObj.parentNode.style.display != "none") { // the row is not hidden
            var aTag = document.getElementById("displayedvalueanchor"); // get the right hand side "div" element (contains detailed info from the result of the AJAX call to get the value to display)
            aTag.setAttribute('href', cellDocObj.getAttribute("data-versionuri").replace("file://", "")); // set the line to the right hand (VersionUrl) result header anchor to get the url
            aTag.innerHTML = cellDocObj.getAttribute("data-versionuri"); // set the line to the right hand (VersionUrl) header to display the url to get
        }
    }
}



function getAttrValue(inText, attrName) { // find an attribute value after a given attribute name in the input text, e.g. find 1.2.3 in "Service version: 1.2.3"
    debugMsg("In getAttrValue, finding " + attrName);
    var attrValue; // return attrValue for example "1.2.3"
    var startAttrName = inText.indexOf(attrName);  // find the start of the attribute name in the text e.g. the start of "Service version: "
    debugMsg("startAttrName = " + startAttrName);

    if (startAttrName == -1) { // did not find the attribute name in the input text
        attrValue = "";
        return attrValue.trim();    
    }

    debugMsg("Start of attrName: " + inText.substr(startAttrName, 30));

    if (startAttrName != 0) { // the attribute name does not start on the first char of the input text
        if ((inText.substr(startAttrName-1, 1)).search(/[\n\t'"{<>,:; \/]/) == -1) { // determine if the character before the attribute name is part of the attribute name
            // for example if the attribute name to search for was "user", then
            //      user "user 'user, <user ;user would be OK (result != -1)
            //      appuser, xuser, my_user would not be OK (result == -1)
            debugMsg("The char before the attribute name we are searching for is part of another attribute name: '" + inText.substr(startAttrName-1, 1) + "'");
            attrValue = "";
            return attrValue.trim();                
        }
        if ((inText.substr(startAttrName+attrName.length, 1)).search(/[<>"|'{:\-}\.> \n\t]/) == -1) { // determine if the character after the attribute name is part of the attribute name
            // for example if the attribute name to search for was "user", then
            //      user user" user", user> user: would be OK (result != -1)
            //      user_a, userb, user} would not be OK (result == -1)
            debugMsg("The char after the attribute name we are searching for is part of another attribute name: " + inText.substr(startAttrName+attrName.length, 1));
            attrValue = "";
            return attrValue.trim();                
        }
    }
    
    var startAttrValue = startAttrName + attrName.length + inText.substr(startAttrName + attrName.length).search(/[^"|'{:}>\. \n]/); // find the starting pos of the attribute value

    debugMsg("Start of attrValue: " + startAttrValue + " " + inText.substr(startAttrValue, 20));
    
    var attrValueLen = inText.substr(startAttrValue).search(/[><"';,{|}\n\t\]]/);
    debugMsg("attrValueLen = " + attrValueLen);
    if (attrValueLen == -1) { // did not find a termination character for attribute value - the end of inText is the end of the attribute value
        attrValue = inText.substring(startAttrValue, inText.length);
        debugMsg("attrValue is at end of inText: " + attrValue);
    } else {
        attrValue = inText.substr(startAttrValue, attrValueLen);
        debugMsg("attrValue is: " + attrValue);
    };
    if (attrValue == 'null') {  // json null
        return "(None 2)";
    } else {
        return attrValue.trim();
    }
}


function refreshUrl(envEle, howAccessed) {
    debugMsg("In refreshUrl, envEle.id = " + envEle.id + " + howAccessed = " + howAccessed);

    if (envEle.parentNode.style.display == "table-row") { // the cell is not hidden

      const envAccessType = envEle.getAttribute("data-accesstype"); // get the value to display from a "uri" or a "cache"d file (created by a bash script under cron)

      if (envAccessType == "direct") { // get the actual resource, not the results cached in a file on the server
          getResponseUrl(envEle.getAttribute("data-versionuri"), envEle, howAccessed, beforeGetUrl, afterGetUrl, "urloutput");
          // TODO expand the above to allow HTTP request types other than GET, i.e POST, PUT,...
      } else {
          // right now, the default access type is "cache" (more common), which means get the cached results from the file created on the server
          getResponseUrl(makeCacheFileName(envEle), envEle, howAccessed, beforeGetUrl, afterGetUrl, "urloutput");
      }  

      if (howAccessed == "clickedLink") { // only display the info file if the cell was selected
          // the "info" (history, meta-data) is always obtained from the cache file created by the server
          getResponseUrl(makeInfoFileName(envEle), envEle, howAccessed, beforeGetUrlInfo, afterGetUrlInfo, "urlinfo");  
      }
    }
}



function hashThem(part1, part2, part3) {
    // the server creates a unique filename (a hash) with the results of the cached call to the url - recreate that hashed filename to find....

    debugMsg("In hashThem, part+part2+part3 = " + part1 + part2 + part3);

    var hashPart1 = "";
    var hashPart2 = "";
    var hashPart3 = "";

    if (part1 !== null) {hashPart1 = part1}
    if (part2 !== null) {hashPart2 = part2}
    if (part3 !== null) {hashPart3 = part3}

    debugMsg("in hashThem, hashPart+hashPart2+hashPart3 = " + hashPart1 + hashPart2 + hashPart3);
    // There is a risk that two sets of values could hash to the same: e,g "A", "B", "" would hash to the same as "A", "", "B"
    
    var hash = md5(hashPart1 + hashPart2 + hashPart3); 

    debugMsg("In hashThem, hash = " + hash);

    return hash;
}


function transformValue(rawValue, envTransformValue) { // converts the raw value returned by the web service to the value to be displayed
    // The output value needs transforming, e.g. adding commas, epoch date to display,...
    // E.g. if rawValue = "123456789" and envTransformValue = "subStr(2, 3)", then this function returns "345"

    debugMsg("In transformValue, found a data-transformValue: " + envTransformValue);
    debugMsg("In transformValue, rawValue = " + rawValue);
    
    
    var envTransformMethod = envTransformValue.split('(', 1)[0]; // get the method name, e.g. get substr from substr(1, 5)
    
    debugMsg("In transformValue, envTransformMethod = " + envTransformMethod);
    debugMsg('In transformValue, typeof rawValue[envTransformMethod] = ' + typeof rawValue[envTransformMethod]);

    var displayValue = false; // this is populated with the value transformed from rawValue to return
        
    if (typeof rawValue[envTransformMethod] === 'function' || rawValue[envTransformMethod] === 'number') {
        debugMsg("In transformValue, String method exists: " + envTransformMethod);
        
        var envTransformFunc = new Function("strObj", "return this." + envTransformValue + ";");
        
        debugMsg("In transformValue, transform Function is " + envTransformFunc);            

        debugMsg("In transformValue, invoking string method " + envTransformValue + ", rawValue = " + rawValue);
        try {
            displayValue = envTransformFunc.call(rawValue);
            
            debugMsg("In transformValue, after invoke of envTransformFunc.call(rawValue), Value = " + displayValue);
        }
        catch(err) {
            // in case the HTML data-transformValue attribute value is not a valid function 
            debugMsg("In transformValue, transform function failed " + err.message);

            displayValue = rawValue;  // instead return the raw value as a fallback
        }
    }
    else {
        debugMsg("In transformValue, string method '" + envTransformMethod + "' does not exist"); 
        displayValue = rawValue;  // return the original raw value as a fallback
    }

    debugMsg("In transformValue, result = " + displayValue); 

    return displayValue;
}



var prevClickedCell = document.createElement("td"); // Before changing styles
var prevClickedCellId = "";

var lastCacheUpdate; // the date/time the cache of cell values was last updated (from the server).  (If it is different from prevLastCacheUpdate, all cells on the page are updated.)
var prevLastCacheUpdate; // the previous date/time the server fileCache was last updated

var lastBuild; // the date/time the json for the web page tables was last rebuilt (from the server).  (If it is different from prevlastBuild, the whole json for the page is reloaded.)
var prevlastBuild; // the previous date/time the server rebuilt the json file

var valueCellArr;
var rowClassArr;


function loadMenusAndCheckboxes() {

    var factDivs = document.getElementsByClassName("facts");  // get all divs containing tables of facts on the page

    debugMsg("In loadMenusAndCheckboxes");

    for (h=0; h<factDivs.length; ++h) { // for each Div that contains tables of facts
        debugMsg("In loadMenusAndCheckboxes, factDivs.length = " + factDivs.length + ", div index h = " + h);

        var factTables = factDivs[h].children; // get the tables of facts

        for (var i=0; i<factTables.length; ++i) {  // for each fact table

            debugMsg("In loadMenusAndCheckboxes, factTables length = " + factTables.length + ", index = " + i);
            var factTheadOrTbody = factTables[i].children;  // get the <thead> or <tbody> element
/// >>>This needs updating to remove thead and tbody elements (j)
            for (var j=0; j<factTheadOrTbody.length; ++j) { // for each <thead> and each <tbody> element
                var factTableRows = factTheadOrTbody[j].children;  // get the <tr> (row) elements within the <thead> or <tbody> element within the <table> element

                for (var k=0; k<factTableRows.length; ++k) { // for each row in the fact table
                    
                    if (factTableRows[k].id == "" || factTableRows[k].id == null) {  // if the row does not have an id from the HTML
                        factTableRows[k].id = factTableRows[k].children[0].innerHTML.replace(/ /g, "_");   // create an id for the row using the text in the first (row heading) column
                        debugMsg("In loadMenusAndCheckboxes, factTableRows[k].id = " + factTableRows[k].id);

                    }
                    loadCheckbox(factTableRows[k]);  // load the check boxes on whether to hide or display each row of values

                    var factTableCells = factTableRows[k].children;

                    for (var m=0; m<factTableCells.length; ++m) {

                      loadEnvMenu(factTableCells[m], "H" + h + "i" + i + "j" + j + "k" + k + "m" + m);  // create popup menu for the cells in the row (make sure the menu div name used is unique)
                    }
                }
            }
        }
    }
}


function createTablesFromJson(outData, factsObj, errMsg, errColor, howAccessed) {

    debugMsg("In createTablesFromJson, outData starts with " + outData.substr(0, 50));

    clearInterval(); // if we have built the page content tables before, then stop the interval timer. setInterval will be called [again] after creating the tables (end of this function)
    prevLastBuild = lastBuild; // set the previous build date to be the same as the last one

    var factDisplay = "";

    if (outData != "") {
        try {
            factDisplay = JSON.parse(outData);  // convert the json file content of the tables, rows and cells to display into javascript objects
        } catch(err) {
            debugMsg("In createTablesFromJson, outData is not parse as JSON: error = " + err);
        }
    }

    var specialFactAttrs = {}; // this will be loaded with attribute names for the cell that are handled differently than the standard way

    if (typeof factDisplay.tables != "undefined") {   // there is a "tables" attribute (which there should be and it should be the outer json array)
        for (var i=0; i < factDisplay.tables.length; ++i) { // for each entry in tables array (i.e., for each table)
            debugMsg("In createTablesFromJson, table number = " + i);

            var factsTableObj = document.createElement('table');
            factsTableObj.className = "table";   
            factsTableObj.style.margin="0px 15px 15px 0px";
            factsObj.appendChild(factsTableObj);
            var nextFactsObj = factsTableObj;

            if (typeof factDisplay.tables[i].rows != "undefined") { // there are rows in the table (there should be)
                var renderingHeader = false;
                var renderingBody = false;
                for (var j=0; j < factDisplay.tables[i].rows.length; ++j) {  // for each row in the table
                    debugMsg("In createTablesFromJson, next row number = " + j);

                    if (typeof factDisplay.tables[i].rows[j].isHeading != "undefined" && factDisplay.tables[i].rows[j].isHeading) { // this is a table header row

                        debugMsg("In createTablesFromJson, renderingHeader = " + renderingHeader);
                        if (!renderingHeader) { // we were not already adding a header row 
                            var factsTheadObj = document.createElement('thead');
                            factsTableObj.appendChild(factsTheadObj);
                            nextFactsObj = factsTheadObj;
                            renderingHeader = true;  // now we have added a header row (don't add the the thead element again later)
                            renderingBody = false;
                            debugMsg("In createTablesFromJson, renderingHeader now = " + renderingHeader);
                        };
                    } else { // adding a table body row
                        debugMsg("In createTablesFromJson, renderingBody = " + renderingBody);
                        if (!renderingBody) {
                            var factsTbodyObj = document.createElement('tbody');
                            factsTableObj.appendChild(factsTbodyObj);
                            nextFactsObj = factsTbodyObj;
                            renderingBody = true;   // now we have added a header row (don't add the the tbody element again later)
                            renderingHeader = false;
                        };
                    };

                    var factsTrObj = document.createElement('tr');
                    factsTrObj.className = "envRow";
                        if (typeof factDisplay.tables[i].rows[j].isInitiallyHidden != "undefined" && factDisplay.tables[i].rows[j].isInitiallyHidden) { // the row is initially hidden
                        factsTrObj.style.display = "none";
                    } else {
                        factsTrObj.style.display = "table-row";
                    };
                    nextFactsObj.appendChild(factsTrObj);

                    var prevFactsCellObj = ""; // stores the previous cell added to the row (from the end), so we can add one before it - don't think we need it

                    if (typeof factDisplay.tables[i].rows[j].cells != "undefined") { // there are cells in the row in the json (there should be)
                        for (var k=0; k<factDisplay.tables[i].rows[j].cells.length; ++k) {  // for each cell in a row
                            debugMsg("In createTablesFromJson, processing cell " + k + ", factDisplay.tables[i].rows[j].cells.length = " + factDisplay.tables[i].rows[j].cells.length);

                            if (renderingHeader) {
                                var factsCellObj = document.createElement('th');
                                factsCellObj.className = "envRowHdr";
                            } else {    
                                var factsCellObj = document.createElement('td');
                            };

                            if (k == 0) {  // the left hand column is a made into a row heading
                                factsCellObj.className = "envRowHdr";
                            } else {
                                if (renderingBody)
                                    {factsCellObj.className = "envVersion";};
                            };
         
                            if (typeof factDisplay.tables[i].rows[j].cells[k].text != "undefined") { // there is a title (fixed content to display) in the cell
                                debugMsg("In createTablesFromJson, text = " + factDisplay.tables[i].rows[j].cells[k].text);

                                // specialFactAttrs["text"] = true; // this attribute is handled in a non-standard way // commented out on 11/24/2018

                                factsCellObj.textContent = factDisplay.tables[i].rows[j].cells[k].text;  // only seems to work for column and row headers
                                ///>>>factsCellObj.getElementsByTagName('a')[0].innerHTML = factDisplay.tables[i].rows[j].cells[k].text; // put the text in the cell 11/24/2018
                            };

                            debugMsg("In createTablesFromJson, checking for popupMenus....")

                            if (typeof factDisplay.tables[i].rows[j].cells[k].popupMenus != "undefined") { // there are popup menu items for the cell (optional)
                                debugMsg("In createTablesFromJson, populating menu items");

                                specialFactAttrs["popupMenus"] = true; // this attibute is handled in a non-standard way

                                for (var l=0; l < factDisplay.tables[i].rows[j].cells[k].popupMenus.length; ++l) { // add popup menu attributes
                                    debugMsg("In createTablesFromJson, menu item " + l + " of " + factDisplay.tables[i].rows[j].cells[k].popupMenus.length);

                                    if (typeof factDisplay.tables[i].rows[j].cells[k].popupMenus[l].text != "undefined" && typeof factDisplay.tables[i].rows[j].cells[k].popupMenus[l].url != "undefined") {  
                                        debugMsg("In createTablesFromJson, factDisplay.tables[i].rows[j].cells[k].popupMenus[l].text = " + factDisplay.tables[i].rows[j].cells[k].popupMenus[l].text + ", l = " + l);

                                        factsCellObj.setAttribute("data-menuitem" + (l+1), factDisplay.tables[i].rows[j].cells[k].popupMenus[l].text + ":" + factDisplay.tables[i].rows[j].cells[k].popupMenus[l].url);
                                    }
                                };
                            }; // end of adding popup menu attributes

                            debugMsg("In createTablesFromJson, check for standard attributes...");
                            // Now add all the "standard" fact attributes, which are placed as attributes of the same name within the HTML <td> element
                            var factAttrs = factDisplay.tables[i].rows[j].cells[k];
                            for (var factAttr in factAttrs) { // for each name/value pair in factAttrs in the json
                                debugMsg('Adding standard factAttrs: Name =' + factAttr + ', Value=' + factAttrs[factAttr] + ", keys length = " + Object.keys(factAttr).length);

                                if (!specialFactAttrs[factAttr]) { // if the attribute name found for the fact is not in the "specially handled" list:
                                    factsCellObj.setAttribute(factAttr, factAttrs[factAttr]); // create an HTML custom data attribute with that name and its value from the json
                                }
                            };


                            debugMsg("In createTablesFromJson, adding cell to row");

                            factsTrObj.appendChild(factsCellObj);


                        }; // end of for each cell in row
                    }; // end of there are cells in the row in the json (there should be)
                }; // end of for each row in table
            }; // end of there are rows defined in the json (there should be)
        };  // end of for each table
    }; // end of there are tables in the json (there should be)

    valueCellArr = document.getElementsByClassName("envVersion");

    selectDiv = document.getElementById("selectRows");

    debugMsg("In createTablesFromJson, calling loadMenusAndCheckboxes");
    loadMenusAndCheckboxes();

    prevLastCacheUpdate = "Never";

    updateCellValues(valueCellArr);

    var sIResult = setInterval(function () {updateCellValues(valueCellArr)}, 60000);  // refresh every n thousandths of secs

} // end of createTablesFromJson


var backgroundColors = ["Gray", "Red", "Orange", "Yellow", "Blue", "Black", "Green", "Pink", "White"]; // the order is most important to least

function afterGetUrl(outData, cellDocObj, errMsg, errColor, howAccessed) { // function to handle the returned data from the server (containing the value to display in the cell)

    debugMsg("In afterGetUrl, howAccessed = " + howAccessed + ", cellDocObj.id = " + cellDocObj.id);
    debugMsg("In afterGetUrl, errMsg = " + errMsg + ", errColor = " + errColor);

    //   debugMsg("outData: " + outData);

    var vDOAnchor = cellDocObj.getElementsByTagName('a'); // get the anchor element within the cell

    if (errMsg != "") {
        cellDocObj.style.backgroundColor=errColor;
        vDOAnchor[0].innerHTML = errMsg;
    } else {
        var rawCellValue = " "; // to avoid numbers getting converted to exponential form

        if (outData != "") { // if there was data returned (new code - testing it 11/24/2018
          rawCellValue = getAttrValue(outData, cellDocObj.getAttribute("data-versionAttrName"));  // get the value to display from the returned data
        };


        if (rawCellValue.trim() == "") {  // nothing to display
          const fixedText = cellDocObj.getAttribute("text");  // see if there is any fixed text to display
          debugMsg("In afterGetUrl, fixedText = " + fixedText);
          if (fixedText != null) {
            rawCellValue = fixedText;
          }
        }

        var cellValue = "";
 
        var envTransformValue = cellDocObj.getAttribute("data-transformValue"); // optional transformation required to the returned value
        // envTransformValue contains the name of the function to invoke to change the input value to the output value
        // e.g. if data-transformValue="epochToDate"
        // and the raw value returned was 1437617684000 
        // then the function epochToDate is invoked
        // and "07/22/2015 10:14" is returned

        debugMsg("In afterGetUrl, errMsg = '" + errMsg + "'" + ", cellValue = '" + cellValue + "'");

        if (envTransformValue != "" && envTransformValue != null) {
            debugMsg("In afterGetUrl, calling transformValue, rawCellValue = " + rawCellValue + ", envTransformValue = " + envTransformValue);
            // This invokes the function name that is the value of the HTML/DOM data-transformValue attribute (e.g. epochToDate, addCommasToNum)
            cellValue = transformValue(rawCellValue, envTransformValue);
        } else {
          cellValue = rawCellValue.trim();
        }

        debugMsg("In afterGetUrl, cellValue = '" + cellValue + "'");


        var vDOAnchor = cellDocObj.getElementsByTagName('a'); // get the anchor element within the cell

        if (cellValue != "") {  // found the value to display 
          
            debugMsg("In afterGetUrl, vDOAnchor[0].innerHTML = " + vDOAnchor[0].innerHTML);

            cellDocObj.style.backgroundColor = "green";
            vDOAnchor[0].style.backgroundColor = "green";
            var coloredIt = false;

            for (var backgroundColor in backgroundColors) {
                debugMsg("In afterGetUrl, backgroundColor = " + backgroundColors[backgroundColor]);
            
                var bgColorMethod = cellDocObj.getAttribute("data-" + (backgroundColors[backgroundColor] + "If").toLowerCase());
                
                if (bgColorMethod != "" && bgColorMethod != null && transformValue(cellValue, bgColorMethod)) { //
                    debugMsg("In afterGetUrl, found bgColorMethod = " + bgColorMethod + ", data-" + (backgroundColors[backgroundColor] + "If").toLowerCase());
                    debugMsg("In afterGetUrl, cellValue = " + cellValue);
                    // debugMsg("In afterGetUrl, transformValue(cellValue, bgColorMethod) = " + transformValue(cellValue, bgColorMethod));
                    cellDocObj.style.backgroundColor = backgroundColors[backgroundColor];
                    vDOAnchor[0].style.backgroundColor = backgroundColors[backgroundColor];
                    debugMsg("1. cellDocObj.style.backgroundColor = " + cellDocObj.style.backgroundColor);
                    coloredIt = true;
                    break;  // for efficiency and color prioritization, the first color seen from the array is the one displayed - we don't try other colors
                    debugMsg("In afterGetUrl, should not get here!!!!!");
                }
            }

        } else { // could not find the value to display in the returned data

        if (cellValue == "" && !coloredIt) {  // did not find the value to display and we did not color it in the case blank is OK
            //vDOAnchor[0].innerHTML = "(Error)";
            //vDOAnchor[0].style.backgroundColor = 'red';
            cellDocObj.style.backgroundColor = 'gray';
            //errMsg = "(Error)";
            //errColor = "red";
            debugMsg("3. cellDocObj.style.backgroundColor = " + cellDocObj.style.backgroundColor);
        }
      }

      vDOAnchor[0].textContent = cellValue; // place the value to display in the cell, with line breaks, removeing any HTML wich may corrupt the content
      vDOAnchor[0].innerHTML = vDOAnchor[0].innerHTML .replace(/\n|\\n|<br>/g, "<br>"); // add any line breaks that were present in the original text

    } // end of errMsg is not ""

    debugMsg("In afterGetUrl, cellDocObj.style.backgroundColor = " + cellDocObj.style.backgroundColor);

    debugMsg("In afterGetUrl, vDOAnchor[0].innerHTML = cellValue = " + vDOAnchor[0].innerHTML);

    if (cellDocObj.id == "lastUpdate") lastCacheUpdate = cellValue;  // store off the last date the file/cell cache was updated
    else if (cellDocObj.id == "lastBuild") lastBuild = cellValue; // store off the last date the web page was built from the json


    var cellUrl = cellDocObj.getAttribute("data-versionuri"); // uri that contains the value to display

    // if (cellUrl != "" && cellUrl !== null) {  // we are allowed to select the cell containing the value to display 
    if (outData != "" && outData !== null) {  // we are allowed to select the cell containing the value to display // 11/24/2018

        // There is no "conditional or" in JavaScript, so set variable to determine if to display the full response to the get value to display (on the right-hand side)
        // TODO: the above is not true - all ors are conditional (evaluated from left) so can change the below
        var ShowUrlResponse = false;

        if (howAccessed == "clickedLink") {
            ShowUrlResponse = true;
        } else {  // auto-refresh (not user clicking a cell):
            if (prevClickedCellId != "") { // the user had clicked a cell previously
                if (prevClickedCellId == cellDocObj.id) {  // same cell this is currently highlighted
                    ShowUrlResponse = true;
                }
            }
        }

        if (ShowUrlResponse == true) {
            // Only show the url response if the user clicked the cell (not if it refreshed), or the refreshed cell is the same as the one currently being displayed
            // Display the full response from the cached url response in the right-hand box
            var urlOutput = document.getElementById("urloutput");

            var textType = urlOutput.getAttribute("data-texttype"); // display as HTML, not text

            debugMsg("textType = " + textType);

            if (textType == "HTML") { // in the future, this could be an attribute available to the cell json and also be "json", "XML", etc.
                urlOutput.innerHTML = outData;
            } else {
                urlOutput.textContent = outData;  // don't use innerHTML here as the response may contain e.g. javascript
                urlOutput.innerHTML = urlOutput.innerHTML.replace(/\n|\\n|<br>/g, "<br>");  // add newlines back
                urlOutput.innerHTML = urlOutput.innerHTML.replace(/\t|\\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");  // replace tabs with spaces
                urlOutput.innerHTML = urlOutput.innerHTML.replace(/\\"/g, '"');  // 
                urlOutput.style.fontFamily = "font-family:monospace";
                //font-family:monospace";
                // 
            }
        }

        if (howAccessed == "clickedLink") {
            if (prevClickedCellId != "") {  // not the first time - user had previously clicked a cell
                var prevCell = document.getElementById(prevClickedCellId);
                // put the previously selected cell format back to how it was (remove highlighting,...):
                prevCell.style = getComputedStyle.prevClickedCell;
                prevCell.style.backgroundColor = prevClickedCell.style.backgroundColor;
                prevCell.style.border = prevClickedCell.style.border;
                prevCell.style.fontSize = prevClickedCell.style.fontSize;
                prevCell.style.fontWeight = prevClickedCell.style.fontWeight;
            }
            
            // Store off the old format of the currently selected cell so we can set it back when the user selects the next cell 
            prevClickedCell.style = getComputedStyle(cellDocObj);
            prevClickedCell.style.backgroundColor = cellDocObj.style.backgroundColor; // save off the current background color
            prevClickedCell.style.border = cellDocObj.style.border;
            prevClickedCell.style.fontSize = cellDocObj.style.fontSize;
            prevClickedCell.style.fontWeight = cellDocObj.style.fontWeight;


            if (! HasClassName(cellDocObj, "dontHighlight")) {   // don't highlight the cell if it is (e.g.) the EnvVersions version or timestamp
                // highlight the currently selected cell:
                // there is some bug that changes the font size of the previous "dontHighlight" cell when the next cell is clicked
                cellDocObj.style.fontSize="medium";   // put a white border around the selected cell
            }

            //cellDocObj.style.fontWeight="bold";   // put a white border around the selected cell
            cellDocObj.style.border="2px solid white";   // put a white border around the selected cell
            debugMsg("Setting prevClickedCellId " + prevClickedCellId + " to cellDocObj.id " + cellDocObj.id);
            
            prevClickedCellId = cellDocObj.id; // save off the current object's id, so we can reset its format the next time a cell is selected
        }
    }

}  // end of function afterGetUrl



function makeCacheFileName(cellDocObj) {
// returns a hash of the url and request body that is used in the cached filename of the response and the summary info file

    var cacheFileName = ""; // returned file name

    var cellUrl = cellDocObj.getAttribute("data-versionuri"); // uri that contains the value to display

    if (cellDocObj.getAttribute("id") == "lastUpdate" ) {
        // this is a special cell that contains the content of a file that has when the cache was last updated
        debugMsg("In makeCacheFileName, id = lastUpdate");
        cellUrl = pageNamePrefix + "_last_updated.txt";
    }

    if (cellDocObj.getAttribute("id") == "lastBuild" ) {
        // this is a special cell that contains the content of a file that has when the cache was last updated
        debugMsg("In makeCacheFileName, id = lastBuild");
        cellUrl = pageNamePrefix + "_last_build.txt";
    }


    var cellRestReqBody = cellDocObj.getAttribute("data-restReqBody"); // the request body for PUT/DELETE/POST (optional attribute)
    
    if (cellUrl != "" && cellUrl !== null) {  // need to check the environment for value to display from a url or file
        // determine the filename in which the server stores the cached url results
        cacheFileName = "fileCache/" + hashThem(cellUrl, cellRestReqBody, "") + ".cache";
    }
 
    debugMsg("In makeCacheFileName, " + cacheFileName);
 
    return cacheFileName;
} // end of makeCacheFileName



function makeInfoFileName(cellDocObj) {
// returns a hash of the url and request body that is used in the cached filename of the response and the summary info file

    var infoFileName = ""; // returned file name

    var envCheckType = cellDocObj.getAttribute("data-versionCheckType"); // get the value to display from a "uri" or a "cache"d file (created by a bash script under cron)

    if (envCheckType == "" || envCheckType == null) {envCheckType = "cache"}; // if not present, it is set to "cache" (which is the only option supported right now)

    var cellUrl = cellDocObj.getAttribute("data-versionuri"); // uri that contains the value to display
    var cellAttrName = cellDocObj.getAttribute("data-versionAttrName"); // the name of the value to display
    var cellRestReqBody = cellDocObj.getAttribute("data-restReqBody"); // the request body for PUT/DELETE/POST (optional attribute)
    
    if (cellUrl != "" && cellUrl !== null) {  // need to check the environment for value to display from a url or file
        if (envCheckType == "cache") {   // convert the url to the file name that the server creates (a hash code)
            infoFileName = "fileCache/" + hashThem(cellUrl, cellAttrName, cellRestReqBody) + ".info";
            // determine the filename in which the server stores the cached url results
        }
    }

    debugMsg("In makeInfoFileName, " + infoFileName);
    
    return infoFileName;
}



function getResponseUrl(resourceToGet, cellDocObj, howAccessed, beforeFunction, afterFunction, whereToPutResp) {
    // The function that uses AJAX to access the file (or url resource) containing the value to display

    debugMsg("In getResponseUrl, resourceToGet = " + resourceToGet);
    // debugMsg("In getResponseUrl, cellDocObj.id  = " + cellDocObj.id + ", howAccessed = " + howAccessed);

    beforeFunction(cellDocObj, howAccessed);  // stuff done before calling AJAX

    if (resourceToGet != "" && resourceToGet != null) {  // need to check the environment for value to display from a url or file

        debugMsg("Getting " + resourceToGet);

        var xmlHttp = new XMLHttpRequest();
    
        xmlHttp.onreadystatechange = function() {
            xmlHttpReadyState = xmlHttp.readyState;
            xmlHttpStatus = xmlHttp.status;
            // var xmldata=mygetrequest.responseXML //retrieve result as an XML object http://www.javascriptkit.com/dhtmltutors/ajaxgetpost3.shtml
            var xhrResponse = xmlHttp.responseText;
            var errMsg;
            var errColor;

            if (xmlHttpReadyState==4) { // the async process is complete
                switch (xmlHttpStatus) {
                    case 200:
                        debugMsg("In getResponseUrl, empty response. http response code =  " + xmlHttpStatus);
                        if (xhrResponse.length == 0) {errMsg = "Empty response"; errColor = "orange";} else {errMsg = "";};
                        break;
                     case 404:
                        debugMsg("In getResponseUrl, cannot access. http response code = " + xmlHttpStatus);
                        errMsg = "Cannot access"; errColor = "orange";
                        xhrResponse = "";
                        break;
                   default:
                        debugMsg("In getResponseUrl, HTTP response: " + xmlHttpStatus);
                        errMsg = "HTTP error: " + xmlHttpStatus; errColor = "orange";
                        xhrResponse = "";
                        break;
                }
                afterFunction(xhrResponse, cellDocObj, errMsg, errColor, howAccessed);
            }
        }

        // if (mygetrequest.overrideMimeType)
            // mygetrequest.overrideMimeType('text/xml')

        xmlHttp.open("GET", resourceToGet, true);

        // To attempt avoiding using the cache from the client browser - from http://www.webreference.com/programming/javascript/rg33/index.html
        // But it does not work with some browser versions - eg not FF 41.0.1, but OK with FF 43.0.1
        xmlHttp.setRequestHeader('Pragma', 'no-cache');
        xmlHttp.setRequestHeader('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, private'); 
        xmlHttp.setRequestHeader('Expires', 0); 
        xmlHttp.setRequestHeader('Last-Modified', new Date(0)); 
        xmlHttp.setRequestHeader('If-Modified-Since', new Date(0));
        xmlHttp.setRequestHeader('If-None-Match', 'R'+Math.random());
        xmlHttp.responseType = 'text';
        //xmlHttp.setRequestHeader('Content-Type', 'text/plain');
        //xmlHttp.responseType = "text";
        //xmlHttp.overrideMimeType("text/plain; charset=x-user-defined");
        //xmlHttp.withCredentials = true;

        try {
            xmlHttp.send();  // note: using Firefox when running the page from a file server, if the file does not exist, it fails here
        }
        catch(err) {
            afterFunction("Could not find resource " + resourceToGet, cellDocObj, "Not found", "orange", howAccessed);
        }
    }
    else {
        debugMsg("In getResponseUrl, A value had not been defined to display on this dashboard");
        //afterFunction("A value had not been defined to display on this dashboard", cellDocObj, "(None 1)", "gray", howAccessed);
        afterFunction("", cellDocObj, "", "", howAccessed);  // 11/24/2018
    }
}


function beforeGetUrlInfo(cellDocObj, howAccessed){
; // do nothing right now
}


function afterGetUrlInfo(outData, cellDocObj, errMsg, errColor, howAccessed) { // function to handle the returned data from the server

    debugMsg("In afterGetUrlInfo " + howAccessed);
    //   debugMsg("outData: " + outData);

    if (prevLastBuild != lastBuild) { // the file on the server containing the date/time of the last Build of the page json has been updated, so Build the page from the json
      createTablesFromJson("", cellDocObj, "", "", howAccessed); // Build the tables on the web page
    }


    var urlInfo = document.getElementById("urlinfo");
    // this is where the summary info from the cell click is displayed

    if (errMsg == "" || errMsg == null) {
        // Only show the url info if the user clicked the cell (not if it refreshed), or the refreshed cell is the same as the one currently being displayed
        // Display the full response from the cached url response in the right-hand box
        // debugMsg("In afterGetUrlInfo, outData: " + outData);
        debugMsg("In afterGetUrlInfo, populating textContent with outData " + outData);
        urlInfo.textContent = outData;  // don't use innerHTML here as the response may contain e.g. javascript
        urlInfo.innerHTML = urlInfo.innerHTML.replace(/\n|\\n|<br>/g, "<br>");  // add newlines back
    } else {
        debugMsg("errMsg not empty: " + errMsg);
        urlInfo.innerHTML = errMsg;
        }
} // of afterGetUrlInfo


function setStoredValue(localStorageName, localStorageValue) { // set the local storage attribute with the given name the given value
    localStorage.setItem(localStorageName, localStorageValue);
}

function getStoredValue(localStorageName) { // Get the local storage attribute with the given name
    var localStorageValue = localStorage.getItem(localStorageName);
    debugMsg("In getStoredValue, name = " + localStorageName + ", localStorageValue = " + localStorageValue);
    return localStorageValue;
}


function hideDispRow(tableRow, checkboxOn) { // hide or display the table row of values

    console.log("In hideDispRow, tableRow.id  = " + tableRow.id); // + " rowCheckbox.id = " + rowCheckbox.id);
    console.info("In hideDispRow, tableRow.id  = " + tableRow.id); // + " rowCheckbox.id = " + rowCheckbox.id);

    var rowCheckbox = document.getElementById("chk-" + tableRow.id); // the row ID to display or hide has an Id set to the same value as the equivalent checkbox Id without "chk-" at the beginning

    debugMsg("In hideDispRow, rowCheckbox.id  = " + rowCheckbox.id);

    var rowCheckboxChecked = rowCheckbox.checked;

    if (typeof checkboxOn != 'undefined') {
        if (undefined != checkboxOn) {
            rowCheckboxChecked = checkboxOn;
        }
    }
   
    if (rowCheckboxChecked) { // if the row will now be displayed
        debugMsg("In hideDispRow, rowCheckbox.checked == true");
        tableRow.style.display = "table-row"; // display it
        rowCheckbox.checked = true;

        // Refresh each of the cell values in the now-displayed row
        var rowEleArr = tableRow.childNodes;                            // find all the cell elements of the now-displayed row
        for (var i=0; i < rowEleArr.length; ++i) {                      // for each cell in the row
            if (HasClassName(rowEleArr[i], "envVersion")) {             // if the cell has a value displayed in it
                refreshUrl(rowEleArr[i], "refreshed");                  // refresh it from the server
            }
        }
    } else {
        tableRow.style.display = "none";
        rowCheckbox.checked = false;
    }

    setStoredValue(tableRow.id, tableRow.style.display);
    debugMsg("In hideDispRow, StoredValue '" + tableRow.id + "' set to " + tableRow.style.display);
    return rowCheckbox.checked;
}


function hideDispTable(tableHdrRow) { // hide or display all rows in a table.  Input is the header row element

    // tableHdrRow is the first row in a table

    debugMsg("In hideDispTable, tableHdrRow.id = " + tableHdrRow.id);

    var tableEle = tableHdrRow.parentElement;  // get the table element of the header row
    debugMsg("In hideDispTable, tableEle.id = " + tableEle.id + ", tableEle.nodeName = " + tableEle.nodeName);

    for (var j=0; j < tableEle.childNodes.length; ++j) { // gets the <th> and <th> elements
        debugMsg("In hideDispTable, tableEle.childNodes[j].nodeName = " + tableEle.childNodes[j].nodeName);
        debugMsg("In hideDispTable, tableEle.childNodes[j].className = " + tableEle.childNodes[j].className);
        debugMsg("In hideDispTable, j = " + j);
        if (j == 0) { // set whether the first row is hidden or not
            var checkBoxOn = hideDispRow(tableEle.childNodes[0]); // toggle the current hide or display setting and save final setting
            debugMsg("In hideDispTable, checkBoxOn = " + checkBoxOn);
        } else {
            hideDispRow(tableEle.childNodes[j], checkBoxOn); // hide or display each row depending on whether the first row was hidden or not
        }
    }
}


var selectDiv;  // Global variable. TODO: put this in a getter/setter.


function loadCheckbox(envRowObj) { // Add a check box for a row in the tables of values so a user may hide or display any row

    var checkboxDiv = document.createElement('div');
    checkboxDiv.className = "checkboxdiv";
    checkboxDiv.style.margin="0px 10px 0px 10px";

    selectDiv.appendChild(checkboxDiv);

    var checkboxEle = document.createElement("INPUT");

    checkboxEle.id = "chk-" + envRowObj.id;
    checkboxEle.setAttribute("type", "checkbox");

    var rowHideDisp = getStoredValue(envRowObj.id);

    debugMsg("In loadCheckbox, checkboxId = " + envRowObj.id + ", checkboxEle.id = " + checkboxEle.id, ", rowHideDisp = " + rowHideDisp);

    if (rowHideDisp != "" && rowHideDisp !== null) { // a StoredValue exists for the row/checkbox
        envRowObj.style.display = rowHideDisp; 
    } else { // no StoredValue - set to the current setting of the row hide / display
        setStoredValue(envRowObj.id, envRowObj.style.display);
        debugMsg("In loadCheckbox, setting stored value to  = " + envRowObj.style.display);
    }

    if (envRowObj.style.display == "none") {
        checkboxEle.checked = false;
    } else {
        checkboxEle.checked = true;
    }

    var checkTxtSpan = document.createElement("span");

    debugMsg("In loadCheckbox, envRowObj.nodeName = " + envRowObj.nodeName);
    debugMsg("In loadCheckbox, envRowObj.childNodes[0].nodeName = " + envRowObj.childNodes[0].nodeName);

    // if (envRowObj.childNodes[1].nodeName == 'TH') {
    if (envRowObj.previousElementSibling === null) { // this <tr> element is the first in the table 
        debugMsg("In loadCheckbox, this is the first row in the table");    
        checkboxEle.style.margin = "10px 15px 0px 0px"  // it is a header row - don't indent it
        checkboxEle.onchange=function(){hideDispTable(envRowObj)};
        checkTxtSpan.style.fontWeight = "700"  // but make the text bold
        checkTxtSpan.style.color = "rgb(240, 240, 240)";  // but make the text bold
    } else {
        checkboxEle.style.margin="0px 15px 0px 17px"; // indent non-header menu items
        checkboxEle.onchange=function(){hideDispRow(envRowObj)};
    }

    debugMsg("In loadCheckbox, envRowObj.childNodes[0].innerHTML = " + envRowObj.childNodes[0].innerHTML);
    checkTxtSpan.innerHTML = envRowObj.children[0].innerHTML  // Find the text for the row heading of the displayed values and put this next to the check box

    checkboxDiv.appendChild(checkboxEle);
    checkboxDiv.appendChild(checkTxtSpan);
}


var lastUpdateEleIdx = -1;
var lastBuildEleIdx = -1;

function updateCellValues(valueCellArr) {

    if (prevLastCacheUpdate != lastCacheUpdate) { // the file on the server containing the date/time of the cell cache update has been updated, so update all cells on the page

        for (var i=0; i < valueCellArr.length; ++i) {  // for each place a value is to be displayed:
            debugMsg("In updateCellValues, valueCellArr[i].id = " + valueCellArr[i].id);

            var cellDocObj = valueCellArr[i];
            if (cellDocObj.id == "" || cellDocObj.id == null) { // if the cell did not have an id (which most do not)
                cellDocObj.id = "envVersion" + i; // create a unique id for the cell, so we can identify it later
            }
            debugMsg("In updateCellValues, cellDocObj.id = " + cellDocObj.id);
            refreshUrl(cellDocObj, "refreshed");  // get the url for the environment which has the value text in it
            
            prevLastCacheUpdate = lastCacheUpdate; // set the previous update date to be the same as the last one

            if (valueCellArr[i].id == "lastUpdate") { 
                // store off the index to the "last update" element (cell) as we update this every time
                lastUpdateEleIdx = i;
            }
            if (valueCellArr[i].id == "lastBuild") { 
                // store off the index to the "last Build" element (cell) as we update this every time
                lastBuildEleIdx = i;
            }
        }
    } else { // the last cache update date file on the server has the same date as the last time we checked

        var lastUpdateDispObj = document.getElementById("lastUpdate");  // only update the last_update box

        debugMsg("In updateCellValues, calling refreshUrl for element index " + lastUpdateEleIdx);
        refreshUrl(valueCellArr[lastUpdateEleIdx], "refreshed");  // get the last cache update date and the lastCacheUpdate variable
    }


    if (prevLastBuild != lastBuild) { // the file on the server containing the date/time of the last Build of the page json has been updated, so Build the page from the json
      debugMsg("In updateCellValues, calling refreshUrl for element index " + lastBuildEleIdx);
      refreshUrl(valueCellArr[lastBuildEleIdx], "Built");  // get the last cache update date and the lastBuild variable
    }

}


// main logic

var factsObj = document.getElementById("facts");
    
debugMsg("Main, window.location.href = " + window.location.href);

var myUrl = window.location.href; // the url of this page

if (myUrl.charAt(myUrl.length - 1) == "/") {  // the url is the domain or directory, not a filename (Firefox allows access to files directly via file://....)
    myUrl = myUrl + "index.html";   // the actual filename is index.html in this directory
}

var pageNamePrefix = myUrl.substring(window.location.href.lastIndexOf("/")+1, myUrl.lastIndexOf("."));
var configFile = pageNamePrefix + ".json"; // create the name of the web page configuration file to find
    
debugMsg("In main logic, myUrl = " + myUrl);
debugMsg("In main logic, configFile = " + configFile);

getResponseUrl(configFile, factsObj, null, function (x, y, z) {return;}, createTablesFromJson, factsObj);
