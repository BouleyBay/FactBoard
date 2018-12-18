// Functions that are called by the value of "data-transformValue" attribute in the HTML page
//
// These are methods added to String objects.
// Examples.  if the "raw" value returned was "1437617684000", then:
//      data-transformValue="substr(2, 3)" on the HTML line would transform it to "376" - no new prototype would be required as substr is a built-in String method
//      data-transformValue="addCommasToNum()"  on the HTML line would transform it to "1,437,617,684,000" using the addCommasToNum method added as a prototype below
//          Equivalent to doing "1437617684000".addCommasToNum() in the javascript code.
//
// Note that "this" in the function is the string Object used with the method.
//
// You can add more method using the same style as below.  That is all that is needed to use a new dataTransformValue.
// So if your webservice returned a temperature in Celsius and you wanted to display it in Fahrenheit
//   On your HTML line add:
//      data-transformValue="celsiusToFahrenheit()"
// In the javascript below, add (untested):
//
//  String.prototype.celsiusToFahrenheit = function() {
//     if (this.isNumeric) { // isNumeric is itself a String method added below
//         return Math.round(this * 9 / 5 + 32);
//     } else
//     {
//       return "Error: " + this + "is not a number";
//     }
//  }
//
//  You can also define a method that requires (a) parameters(s) - see lastNChars(n) below


"use strict";

String.prototype.value = function () {  // so we can easily write data-transformValue="value() + ' something'"
    return this;
}


String.prototype.makeConstant = function (constant) {  // if you want to diplay a constant instead of the value determined
    return constant;
}


String.prototype.ifBlank = function (constant) {  // if you want to diplay a constant when the value is blank (e.g. from an error)
    if (this == "") {
        return constant;
    } else {
        return this
    }
}


String.prototype.prefixWith = function (prefix) {
    debugMsg("In prefxWith, prefix = " + prefix);
    return prefix + this;
}

String.prototype.suffixWith = function (suffix) {
    return this + suffix;
}


String.prototype.upCaseFirstChar = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

String.prototype.lowerCaseAllButFirstChar = function () {
    return this.charAt(0) + this.slice(1).toLowerCase();
}


String.prototype.emptyIfNot = function (...constants) { // so we can display "Error" in red if the response is not the value of the constants
                                                    // e.g. data-transformValue="emptyIfNot('green', 'yellow')"
    var returnValue = this;
    
    for (let constant of constants) {

      if (this == constant) {
          returnValue = this;
          {break;}
      } else {
          returnValue = "";
      }
    }
    
    return returnValue;
}


String.prototype.emptyIf = function (...constants) { // so we can display "Error" in red if the response is not the value of the constant

    var returnValue = "";

    for (let constant of constants) {
      if (this == constant) {
          returnValue = "";
          {break;}
      }
    }
    return returnValue;
}



String.prototype.emptyIfStartsWith = function (...prefices) {

    var returnValue = this;

    for (let prefix of prefices) {
      if (this.startsWith(prefix)) {
          returnValue = "";
          {break;}
      }
    }
    return returnValue;
}

String.prototype.emptyIfDoesNotStartWith = function (...prefices) {

    debugMsg("In emptyIfDoesNotStartWith, this = " + this);
    debugMsg("In emptyIfDoesNotStartWith, prefices = " + prefices);

    var returnValue = "";

    for (let prefix of prefices) {
      debugMsg("In emptyIfDoesNotStartWith, prefix = " + prefix);
      if (this.startsWith(prefix)) {
          debugMsg("In emptyIfDoesNotStartWith, found prefix: " + prefix);

          returnValue = this;
          {break;}
      }
    }
    debugMsg("In emptyIfDoesNotStartWith, returnValue = " + returnValue);
    return returnValue;
}



String.prototype.setIfValueIs = function (constant, valueIfConstant) {
    var returnValue;
    
    if (this == constant) {
        returnValue = valueIfConstant;
    } else {
        returnValue = this;
    }
    
    return returnValue;
}


String.prototype.setIfValueNot = function (constant, valueIfNotConstant) {
    var returnValue;
    
    if (this == constant) {
        returnValue = this;
    } else {
        returnValue = valueIfNotConstant;
    }
    
    return returnValue  ;
}


String.prototype.setIfValueOrNot = function (constant, valueIfConstant, valueIfNotConstant) {
    var returnValue;
    
    if (this == constant) {
        returnValue = valueIfConstant;
    } else {
        returnValue = valueIfNotConstant;
    }
    
    return returnValue  ;
}

String.prototype.setIfCompareOrNot = function (constant1, constant2, valueIfConstant, valueIfNotConstant) {
// so can do setIfCompareOrNot(isNumeric(this), true, addCommasToNum(), 'Not numeric')  - not yet tested
    var returnValue;
    
    if (f(this) == constant) {
        returnValue = valueIfConstant;
    } else {
        returnValue = valueIfNotConstant;
    }
    
    return returnValue  ;
}



String.prototype.addCommasToNum = function () { // input e.g 12345678.90, output 12,345,678.90
    var input = this;
    debugMsg("In addCommasToNum, this = " + this);
    //if (this.isNumeric) {input = "9876543";}; // {input = +Number(this)};
    return input.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}


String.prototype.replaceChar = function (oldChar, newChar) { // input e.g 12345678.90, output 12,345,678.90
    var input = this;
    debugMsg("In replaceChar, this = " + this);
    //if (this.isNumeric) {input = "9876543";}; // {input = +Number(this)};
    return input.toString().replace(oldChar, newChar);
}



String.prototype.bytesToSize = function(decimals) {
    var bytes = Number(this);
    if (bytes == 0) return '0 Byte';
    var k = 1000; // or 1024 for binary
    var dm = decimals + 1 || 3;
    var sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

    
String.prototype.removeDecimals = function () {
    return Math.round(this);
}


var allowedLastChars = [".", "C", "F", "%"]; // the allowed last charactars in an input number for function convertoToNumber(kindaNumber)

String.prototype.cleanupNumber = function () {  // converts e.g. numbers and US currency with thousand delimeters, percents, Celcius temps to numbers.  
                                                // Returns empty string if not a number
    var numberString = this.trim();
    debugMsg("In convertToNumber, numberString = " + numberString);

    if (numberString.charAt(0) == "$") {
        numberString = numberString.substr(1, numberString.length-1).trim();  // remove any initial dollar sign
    }

    debugMsg("In convertToNumber, numberString.charAt(numberString.length-1) = " + numberString.charAt(numberString.length-1));

    for (var allowedLastChar in allowedLastChars) {
        debugMsg("In convertToNumber, checking for allowedLastChars[allowedLastChar] " + allowedLastChars[allowedLastChar]);

        if (numberString.charAt(numberString.length-1) == allowedLastChars[allowedLastChar]) {
            // if the last char is an allowed one for a number (e.g. % (percent), C (for Celcius), . (decimal point)
            numberString = numberString.substr(0, numberString.length-1).trim();  // remove the allowed last character and trim any whitespace before it
            debugMsg("In convertToNumber, removed last char, numberString = " + numberString);
            {break}
        }
    }

    numberString = numberString.replace(/(\d+),(?=\d{3}(\D|$))/g, "$1");   // remove thousand delimiters 
    // thanks Code Jockey at http://stackoverflow.com/questions/8188706/regular-expression-to-strip-thousand-separator-from-numeral-string
    debugMsg("In convertToNumber, removed thousand delimiters, numberString = " + numberString);


    if (!isNaN(numberString) && isFinite(numberString)) { // is a number (double negative - not is not a number)
        debugMsg("In convertToNumber, IS a number, returning " + numberString);
        return numberString.trim(); // return parsed number
    } else {
        debugMsg("In convertToNumber, not a number, returning empty string");
        return ""; // return blank if input was not a number
    }
}



String.prototype.lastNChars = function (n) {
    return (this.substr(this.length - n, n)).trim();
}


String.prototype.skipNChars = function (n) {
    return (this.substring(n, this.length)).trim();
}


String.prototype.upToDelim = function (delim) {
    debugMsg("In upToDelim, delim = " + delim);
    return (this.substring(0, this.indexOf(delim)).trim());
}


String.prototype.afterDelim = function (delim) {
    debugMsg("In afterDelim, delim = " + delim);
    return (this.substring(this.indexOf(delim)+1).trim());
}


String.prototype.betweenDelims = function (delim) {
    debugMsg("In betweenDelims, this = " + this);
    var tail = this.substring(this.indexOf(delim)+1).trim();
    debugMsg("In betweenDelims, tail = " + tail);
    debugMsg("In betweenDelims, tail.substring(0, tail.indexOf(delim)) = " + tail.substring(0, tail.indexOf(delim)));
    debugMsg("In betweenDelims, tail.substring(0, tail.indexOf(delim)).trim() = '" + tail.substring(0, tail.indexOf(delim)).trim() + "'")
    return (tail.substring(0, tail.indexOf(delim))).trim();
}


String.prototype.upToSpace = function () {
    debugMsg("In upToSpace, returning '" + this.substring(0, this.indexOf(" ")) + "'")
    return (this.substring(0, this.indexOf(" ")).trim());
}


String.prototype.fromLastSpace = function () {
    debugMsg("In fromLastSpace, returning '" + this.substring(this.lastIndexOf(" ")).trim() + "'")
    return (this.substring(this.lastIndexOf(" ")).trim());
}


String.prototype.epochToDisplay = function () { // input e.g. 1437617684000 or 1437617684, output 07/22/2015 10:14
    var epochDate = this;
    
    debugMsg("In epochToDisplay, this = '" + this + "', epochDate = '" + epochDate + "'");

    var epochSecs;
    
    debugMsg('In epochToDisplay, epochDate.isNumeric = ' + epochDate.isNumeric());


    if (epochDate != "" && epochDate !== null && epochDate != 'null' && epochDate.isNumeric() && epochDate >= 0) { 
        debugMsg('In epochToDisplay, length = ' + epochDate.length);
        if (epochDate.length == 10) {
            epochSecs = epochDate
            debugMsg("In epochToDisplay, length 10, epochSecs = " + epochSecs);
        } else {
            epochSecs = epochDate/1000
            debugMsg("In epochToDisplay, not length 10, epochSecs = " + epochSecs);        
        }

        var displayDateTime;

        var d = new Date(0);
        d.setUTCSeconds(epochSecs);
        displayDateTime = ('0' + (d.getMonth()+1)).slice(-2) + '/'
                        + ('0' + d.getDate()).slice(-2) + '/'
                        + d.getFullYear()
                        + " "
                        + ('0' + d.getHours()).slice(-2) + ':'
                        + ('0' + d.getMinutes()).slice(-2);

    } else { // the input epoch date is not numeric
        displayDateTime = epochDate; // return the input epoch date instead
        debugMsg("In epochToDisplay: error: epochDate ' + epochDate +' is not numeric");
    }

    debugMsg("In epochToDisplay, displayDateTime = " + displayDateTime);  
    return displayDateTime;
}


String.prototype.epochToDate = function () { // input e.g. 1437617684000 or 1437617684, output 07/22/2015
    debugMsg("In epochToDate, epochDate = " + epochDate);
    
    return epochToDisplay(this).substr(0, 10);
}


String.prototype.epochToTime = function () { // input e.g. 1437617684000 or 1437617684, output 10:14
    debugMsg("In epochToTime, epochDate = " + epochDate);
    
    return epochToDisplay(this).substr(11, 5);
}


String.prototype.iso8601toDisplay = function () {  // converts e.g. 2015-08-13T02:37:12Z to 08-12-2015 22:37
    var utcDate = this;

    debugMsg("In ISO8601toDisplay, utcDate = " + utcDate);
    var date = new Date(utcDate);

    debugMsg("In ISO8601toDisplay, Date: " + date.toString());

    var dateMonth = date.getMonth() + 1;  // dateMonth is zero relative!!!
    var dateDay = date.getDate();
    var dateHours = date.getHours();
    var dateMins = date.getMinutes();

    return  ((dateMonth < 10) ? '0' + dateMonth : dateMonth)
    + "/" + ((dateDay < 10) ? '0' + dateDay : dateDay )
    + "/" + date.getFullYear() 
    + " " + ((dateHours < 10) ? '0' + dateHours : dateHours)
    + ":" + ((dateMins < 10) ? '0' + dateMins : dateMins);
}



// Methods to test the content of the value - used for <colorIf> attributes, e.g. "data-redIf": "isNegative()" - or in HTML data-redif="isNegative()"

String.prototype.isNumeric = function () { // this does not seem to work: 1877M returns true (isNumeric)
    //return !isNaN(parseFloat(this)) && isFinite(this);
    return Number(parseFloat(this))==this;
}

String.prototype.isValue = function (constant) {
    var _this = this;
    debugMsg("In isValue, this = ", _this);
    debugMsg("In isValue, constant = " + constant);

    return (this == constant);
}


String.prototype.isIn = function (...constants) {
  debugMsg("In isValue, this.valueof() = ", this.valueOf());
  debugMsg("In isValue, constants = " + constants);
  return constants.includes(this.valueOf());
}


String.prototype.isNotValue = function (...constants) {
    debugMsg("In isNotValue, this = " + this);
    debugMsg("In isNotValue, constants = " + constants);

    var returnValue = true;
    
    for (let constant of constants) {

      if (this == constant) {
          debugMsg("In isNotValue, returning false: " + constant);
          returnValue = false;
          {break;}
      }
    }

    return returnValue;
}


String.prototype.isNotLessThan = function (limit) {
    if(parseFloat(this.replace(/,/g,"")) >= parseFloat(limit)) {
        return true;
    } else {
        return false;
    }
}



String.prototype.isGreaterThan = function (limit) {
    if(parseFloat(this.replace(/,/g,"")) > parseFloat(limit)) {
        return true;
    } else {
        return false;
    }
}


String.prototype.isLessThan = function (limit) {
    debugMsg("In isLessThan, this = " + this);
    debugMsg("In isLessThan, limit = " + limit);

    debugMsg('In isLessThan, parseFloat(this.replace(/,/g,"")) = ' + parseFloat(this.replace(/,/g,"")));

    if(parseFloat(this.replace(/,/g,"")) < parseFloat(limit)) {
        debugMsg('IsLessThan');
        return true;
    } else {
        debugMsg('not IsLessThan');
        return false;
    }
}


String.prototype.isNotGreaterThan = function (limit) {
    if(parseFloat(this.replace(/,/g,"")) <= parseFloat(limit)) {
        return true;
    } else {
        return false;
    }
}


String.prototype.moreWorkDaysThan = function (workDaysAllowed, dateFormat) {
    debugMsg("In moreWorkDaysThan, this = " + this);
    debugMsg("In moreWorkDaysThan, workDaysAllowed = " + workDaysAllowed);
    debugMsg("In moreWorkDaysThan, dateFormat = " + dateFormat);

    var inEpoch = moment(this, dateFormat);  // See http://momentjs.com/docs/#/parsing/ for date formats allowed
    debugMsg("In moreWorkDaysThan, this in MM-DD-YYYY format is " + moment(this, dateFormat).format("MM-DD-YYYY"));
    debugMsg("In moreWorkDaysThan, this hour is " + inEpoch.hour());
    debugMsg('In moreWorkDaysThan, inEpoch = ' + inEpoch);

    debugMsg('In moreWorkDaysThan, moment() = ' + moment());


    if (true) { //vintage.substr(4, 8).isNumeric) {

        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds


        var daysBetween = Math.floor((moment() - inEpoch)/oneDay); // Math.floor(Math.abs((todayMidnight.getTime() - vintageDate.getTime())/(oneDay)));
        debugMsg("In moreWorkDaysThan, daysBetween = " + daysBetween);

        var fullWeeksBetween = Math.floor(daysBetween / 7);
        debugMsg("In moreWorkDaysThan, fullWeeksBetween = " + fullWeeksBetween);

        var remDaysBetween = daysBetween - (fullWeeksBetween * 7);
        debugMsg("In moreWorkDaysThan, remDaysBetween = " + remDaysBetween);
    
        var workDaysBetween = fullWeeksBetween * 5;
        debugMsg("In moreWorkDaysThan, workDaysBetween = " + workDaysBetween);

        var inEpochDays = Math.floor(inEpoch/oneDay);
        debugMsg("In moreWorkDaysThan, inEpochDays = " + inEpochDays);
        
        for (var i=1; i<=remDaysBetween; i++) { // go through each day of the week in between the week day of the vintage date and today
            debugMsg("In moreWorkDaysThan, i = " + i);
            if (((inEpochDays + i) % 7) != 2 && ((inEpochDays + i) % 7) != 3) {  // next days is not a Saturday or Sunday
                workDaysBetween = workDaysBetween + 1; // add 1 if it is a work day (not a weekend day)
                debugMsg("In moreWorkDaysThan, it's a work day, workDaysBetween = " + workDaysBetween);    
            }
        }

        debugMsg("In moreWorkDaysThan, workDaysAllowed = " + workDaysAllowed);  
        debugMsg("In moreWorkDaysThan, daysBetween = " + daysBetween);
        debugMsg("In moreWorkDaysThan, fullWeeksBetween = " + fullWeeksBetween);
        debugMsg("In moreWorkDaysThan, remDaysBetween = " + remDaysBetween);
        debugMsg("In moreWorkDaysThan, workDaysBetween = " + workDaysBetween);   

        var curTime = new Date();
        debugMsg("In moreWorkDaysThan, curTime.getHours() = " + curTime.getHours());   


        if (workDaysBetween >= workDaysAllowed) {
            debugMsg("In moreWorkDaysThan, workDaysBetween >= workDaysAllowed");
            return true; // too old
        } else {
            if (workDaysBetween == workDaysAllowed) {
                if (inEpoch.hour() < curTime.getHours()) {
                    debugMsg("In moreWorkDaysThan, inEpoch.hour() < curTime.getHours()");
                    return true;  // too old
                } else {
                    debugMsg("In moreWorkDaysThan, inEpoch.hour() not < nowTime.getHours()");
                    return false;  // not too old
                }
            } else {
                debugMsg("In moreWorkDaysThan, workDaysBetween < workDaysAllowed");
                return false;
            }
        }
    } else {
        debugMsg("In moreWorkDaysThan, date is not numeric = " + this);   

        return true; // vintage date is not numeric
    }
}

