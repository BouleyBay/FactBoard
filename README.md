# FactBoard
Creates a web page of tables of small facts, each from a configured source.

Factboard is a dashboard that displays small values (facts) in cells. Each fact that is displayed is easily configured to be extracted from a REST service, web page or other resource.

For example, you can display stock quotes and weather all on one dashboard. IT Departments can use it to display versions of software installed in different environments and the statuses of these, as well as counts of records or documents.

### Example

Below is a snippet from the json file samplefromjson.json, which is the configuration file for the sample dashboard samplefromjson.html. It is used to display the sunrise time in Phoenixville, PA in a cell:

```javascript
    "data-versionUri": "http://api.geonames.org/timezoneJSON?formatted=true&lat=40.0833342&lng=-75.3430275&username=bbay&style=full",
    "data-versionAttrName": "sunrise",
    "data-transformValue="lastNChars(5)"
```

The above configures a cell to display the output from the Geonames RESTful interface. The request (to the value of data-versionUri) returns something like:

```javascript
{
  "sunrise": "2018-12-02 07:05",
  "lng": -75.3430275,
  "countryCode": "US",
  "gmtOffset": -5,
  "rawOffset": -5,
  "sunset": "2018-12-02 16:36",
  "timezoneId": "America/New_York",
  "dstOffset": -4,
  "countryName": "United States",
  "time": "2018-12-02 08:28",
  "lat": 40.0833342
}
```
(Click [here](http://api.geonames.org/timezoneJSON?formatted=true&lat=40.0833342&lng=-75.3430275&username=bbay&style=full "Geonames API request") to see for yourself.)

Factboard gets the value of the attribute specified by the value of data-versionAttrName (sunrise, 2018-12-02 07:05), and the web page displays the last five characters (07:05).

The web page refreshes the value of each cell on the dashboard after a server process runs that accesses and stores the result of each configured resource (data-versionUri), for example, every half-hour. In addition, the content of the web page itself is rebuilt if the configuration file changes.

If you click in a cell, a box on the right shows the whole response from the resource accessed (data-versionUri), and a history of fact displayed. Mousing over a cell can give list of menu items from cell properties in the configuration file.

Cell colors can be configured to be set dynamically. 

### Full sample configuration file

```javascript
{
  "tables": [
    {
      "rows": [
        {
          "isHeading": true
          "cells": [
            {
              "text": "Locations"
            },
            {
              "text": "Weather",
              "isHeading": true,
              "popupMenus": [
                {
                  "text": "Weather Undergroud",
                  "url": https://www.wunderground.com/weather/us"
                },
                {
                  "text": "Blue if freezing or below\nPink if 90 F or above,\nRed if 100 F or over",
                  "url": " "
                }
              ]
            }
          ]
        },
        {
          "isHeading": true,
          "cells": [
            {
              "text": "Phonenixville",
              "isHeading": true,
              "popupMenus": [
                {
                  "text": "Wikipedia",
                  "url": "https://en.wikipedia.org/wiki/Phoenixville,_Pennsylvania"
                }
              ]
            },
            {
              "data-versionUri": "http://api.wunderground.com/api/17756cdcadcae445/conditions/q/10.776889,106.700806.json",
              "data-versionAttrName": "temp_f",
              "data-transformValue": "value() + ' F'",
              "data-blueIf": "substring(0, str.length - 2).isLessThan('32')",
              "data-pinkIf": "substring(0, str.length - 2).isNotLessThan('90')",
              "data-redIf": "substring(0, str.length - 2).isNotLessThan('100')",
              "popupMenus": [
                {
                  "text": "On Weather Underground",
                  "url": "https://www.wunderground.com/weather/us/pa/phoenixville"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

