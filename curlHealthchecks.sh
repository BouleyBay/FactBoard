#!/bin/bash


## Set the current directory to the directory of this script name:
basharg=$0
workdir=`dirname $basharg`
cd $workdir

Dashboards=($1)  ## put the the list of HTML pages to cache the cell values (arg 1, in quotes, separated by spaces) into an array

diagnostics=${2:-"none"}  ## currently "debug", blank/not present or "none"

logLevelNone=0
logLevelForce=1
logLevelDebug=2

case "$diagnostics" in 
    none)
        logLevel=$logLevelNone
        ;;
    force)
        logLevel=$logLevelForce
        echo "logLevel =" $logLevel
        ;;
    debug)
        logLevel=$logLevelDebug
        echo "logLevel =" $logLevel
        ;;
    *)  
        echo 'Arg2 (diagnostics) can only be <blank>, "none", "force" or "debug", got' $2
        exit 1
        ;;
esac

if [ "$logLevel" -ge "$logLevelDebug" ]; then
    date
    echo 'Dashboards='$Dashboards
fi


function getAdHocAttrValue {
    local attrFile=${1}  ## name of the file containing the attribute name/value pair
    local attrName=${2}  ## Name of the  attribute in the cached file containing the attribute name, e.g. "Service Version:"
    ## Find the attribute value (often a version number) in the file $attrFile.  The attribute name/value pair in the file will be of the form e.g. "Service Version: 0.14.7" 
    ## Outputs the attribute value, e.g. 0.14.7

    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo "In getAdHocAttrValue" 1>&2
        echo attrFile=${attrFile} 1>&2
        echo attrName=${attrName} 1>&2
    fi

    ## get the attribute value - the characters after attrName, but removing delimiters and terminating at a space.

    # if [ "$logLevel" -ge "$logLevelDebug" ]; then
    #    cat ./getAttributeValue.pl 1>&2 
    # fi

    perl ./getAttributeValue.pl "return" "${attrFile}" "${attrName}" "" "{$logLevel}" ## this perl script has a regex that returns the attribute value (after attribute name) in the file storing the output of the curl

    ## So:
    ## if attrName is 'Service Version:' and the attrFile contains 'Service Version: 1.2.3' somewhere in it, '1.2.3' is returned
    ## if attrName is '"' (a single quote, which it is for EM environments), and the attrFile contains '"1.2.3"' somewhere in it, '1.2.3' is returned
    
    ## This is "echo'd" out hence returned by this function to the calling statement
} ## end of getAdHocAttrValue


function getAttrValue {

    ## get the attribute value in the HTML line for the attribute name data-versionUrl, e.g. "http://talem01.hmsonline.com:9090/common/get-version" from
    ##   data-versionUrl="http://talem01.hmsonline.com:9090/common/get-version" (HTML) or
    ##  "data-versionUrl": "http://talem01.hmsonline.com:9090/common/get-version" (JSON)

    local dataToParse="$1"      ## data that contains the way to find the value to display in the cell in the file (the value of data-versionAttrName)
                                ## e.g. <td class="envVersion" data-versionUrl="http://tslmatchingws01.hmsonline.com:9087/healthcheck" data-versionAttrName="Service Version:" data-versionCheckType="cache">
    local attrName="$2"         ## the attribute name within the HTML line to find the value of (e.g. data-versionAttrName)

    local encodingType="$3"     ## "JSON" or "HTML"

    if [ "$logLevel" -ge "$logLevelDebug" ]; then
      echo "dataToParse = $dataToParse" 1>&2 ## need to log to stderr, as the stdlog output is used as the output of this function
      echo "attrName = $attrName, encodingType = $encodingType" 1>&2
    fi
      

    if [ "$encodingType" = "JSON" ]; then
        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            ## have to output diagnostics to stderr, as stdout is the output of this function captured by the caller
            ## echo in $FUNCNAME 1>&2
            echo "dataToParse=$dataToParse" 1>&2
            ##echo attrName="$attrName" 1>&2
            ##echo encodingType="$encodingType" 1>&2
        fi

        echo "$dataToParse" | jq -r .\"$attrName\" | sed 's/^null$//' ## need the backslashes as the attribute name contains hyphens

    else ## encodingType is "HTML"
        uniqueIsh=$RANDOM
        echo $dataToParse | sed 's/&/%26/g' > fileCache/dataToParse$uniqueIsh.tmp  ## Need replace before xmllint as xmllint does not like seeing "&" signs in HTML without being e.g. "&lt;" etc.

        ## Find the attribute value for the data-versionAttrName, e.g. Service Version:
        ## xmllint is a utility that finds attributes within HMTL (or XML) lines.
        ## Be careful: there are two versions of xmllint around (xmllint --version): 20626 is older but the below works with it:
        ## For the grepping and cutting after xmllint, thanks mklement0 @ https://stackoverflow.com/questions/11611385/how-can-i-get-the-value-from-an-attribute-using-xmllint-and-xpath

        ## echo "cat //td/@${attrName}" | xmllint --shell fileCache/dataToParse$uniqueIsh.tmp | grep -v ">" | cut -f 2 -d "=" | tr -d \" | sed -n "s+.*${attrName}=\"\(.*\)\"+\1+p" | sed -e 's/&quot;/"/g' -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/%26/\&/g'
        echo "cat //td/@${attrName}" | xmllint --shell fileCache/dataToParse$uniqueIsh.tmp | grep -v ">" | cut -f 2 -d "=" | tr -d \" | sed -e 's/&quot;/"/g' -e 's/&lt;/</g' -e 's/&gt;/>/g' -e 's/%26/\&/g'

        ## The output of the above is received by the statement that is calling this function

        if [ $? -eq 0 ]; then ## if the xmllint command was successful:
            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                ## have to output diagnostics to stderr, as stdout is the output of this function captured by the caller
                echo "dataToParse=$dataToParse, attrName=$attrName, xmllint output:" 1>&2
                echo "cat //td/@${attrName}" | xmllint --shell fileCache/dataToParse$uniqueIsh.tmp | grep -v ">" | cut -f 2 -d "="   | tr -d \" 1>&2
                echo "dataToParse$uniqueIsh.tmp contains:" 1>&2
                cat fileCache/dataToParse$uniqueIsh.tmp 1>&2
            else
                rm fileCache/dataToParse$uniqueIsh.tmp &> /dev/null
            fi
        fi
    fi ## end of encodingType is HTML
} ## end of getAttrValue


function updateCellCache {
## Update the cell cache based on the content of the line

    local cellLine="$1"     ## this is the line from the html file or the json file that contains the cell to display in the dashboard cell
    local lineType="$2"     ## whether we are processing an "HTML" line or a "JSON" line


    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo -e "\n\n\n--------------------In updateCellCache: found a cell line that has an attribute value that needs displaying-------------------\n\n"
        echo "$cellLine" 
        echo "lineType = $lineType"
    fi

    valueUrl=`getAttrValue "$cellLine" "data-versionUri" "$lineType"` ## this gets the url to curl (from the html line)
    ## valueUrl contains the url to call (which contains the value to display in the cell)
    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo "valueUrl = $valueUrl"
    fi


    cellId=`getAttrValue "$cellLine" "id" "$lineType"`  ## this gets the id for the cell - to see if it is the "lastUpdated"
    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo "Got the id for the cell: $cellId"
    fi

    if [ "$cellId" = "lastUpdate" ]; then
        valueUrl="$lastUpdatedFileName"  ## force the url to be <webpge_name>_last_updated.txt
        echo 'Last updated:' `date +"%m/%d/%Y %H:%M:%S"` > $lastUpdatedFileName ## store off the last updated date
        ## this is the file the javascript uses to determine if it has updated the cache recently
        ## TODO: it should really be the last file updated for a dashboard, otherwise the dashboard may refresh before all the cache files have been updated
    fi

    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo '$valueUrl='"$valueUrl"
    fi

    if [ -n "$valueUrl" ]; then  ## the url is present in the line and is not blank (if it is blank then we don't curl it to create a cached file
            restReqBody=`getAttrValue "$cellLine" "data-restReqBody" "$lineType"`  ## this the data required for POST, DELETE, PUT (or even GET, although not nice)

        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            echo '$restReqBody = '"$restReqBody"
        fi

        restMaxTime=`getAttrValue "$cellLine" "data-restMaxTime" "$lineType"` ### the time limit for the curl call (if present)

        if [ -z "$restMaxTime" ]; then  ## the data-restMaxTime attribute is not present on the html line
            restMaxTime=30  ## default is to wait 30 seconds for a response to the curl command
        fi

        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            echo '$restMaxTime = '"$restMaxTime"
        fi
      
        valuePrefix=`getAttrValue "$cellLine" "data-versionAttrName" "$lineType"`  ## this gets the prefix to the value to display in the cell from the page returned  e.g. "Service version:"

        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            echo Got prefix to the value: "$valuePrefix"
        fi

       
        ## We need a unique file name to store (and for the dashboard javascript to retrieve) the output of the curl command.  
        ## We MD5 encode a concatenation of the url and the rest request body.
        ## Each cached file will be named something like 5ec0d09f335cf82cdaf13dbf1d543f97.cache
        ## The info file contains persistent information, such as when the refresh ran, the previous value of the attribute
        ##  and is named something like ./fileCache/3dbf1d543f977caf87da6812ee4090a3.info

        cacheFilePrefix=`echo -n "${valueUrl}${restReqBody}" | md5sum | cut -f1 -d" "`
        infoFilePrefix=`echo -n "${valueUrl}${valuePrefix}${restReqBody}" | md5sum | cut -f1 -d" "`

        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            echo "cacheFilePrefix=$cacheFilePrefix"
            echo "infoFilePrefix=$infoFilePrefix"
        fi

        
        refreshValue="true"
        refreshInterval=`getAttrValue "$cellLine" "data-refreshInterval" "$lineType"`  ## this gets how often to refresh (if present which is not often)

        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            echo 'cacheFilePrefix = '"$cacheFilePrefix"
            echo 'infoFilePrefix = '"$infoFilePrefix"
            echo 'refreshInterval =' "$refreshInterval"
        fi

        if [ ! -f fileCache/$cacheFilePrefix.cache ]; then  ## if the cache file of the curled web service does not exist
            refreshInterval=""      ## force the curl to occur
            refreshValue="true"     ## for safety
        fi

        if [ "$refreshInterval" != "" ]; then
            lastRefreshDate=`getAdHocAttrValue fileCache/$infoFilePrefix.info "Last updated:"`

            lastRefreshEpoch=$(date -d "$lastRefreshDate" +%s 2>/dev/null) 
            if [ $? -ne 0 ] || [ "$lastRefreshEpoch" = "" ]; then  ## if the date conversion fails, if means there is no known date for the current value
                lastRefreshEpoch=0  ## so force storage of the current item in the history
            fi

            oldRefreshEpoch=`date --date="$refreshInterval ago" +%s`  ## this gives the time at which would we need to refresh the value

            if [ $? -ne 0 ] || [ "$oldRefreshEpoch" = "" ]; then
                lastRefreshEpoch=0  ## so force storage of the current item in the history
            fi

            if [ "$lastRefreshEpoch" -gt "$oldRefreshEpoch" ]; then ## need to refresh the value
                refreshValue="false" 
            fi
        fi

        if [ "$logLevel" -ge "$logLevelDebug" ]; then
            echo '$valueUrl = ' "$valueUrl"
            echo "refreshInterval = $refreshInterval"
            echo "lastRefreshDate = $lastRefreshDate"
            echo "lastRefreshEpoch = $lastRefreshEpoch"
            echo "oldRefreshEpoch = $oldRefreshEpoch"
            echo "refreshValue = $refreshValue"
        fi

        if [ "$refreshValue" = "true" ]; then  ## need to refresh the value
            valueCheckType=`getAttrValue "$cellLine" "data-versionCheckType" "$lineType"` ## the type of check to make {currently only "cache" is supported)

            if [ -z "$valueCheckType" ]; then  ## if the "check type" is not present or blank, then assume "cache" (which is the only type supported anyway)
                valueCheckType="cache"
            fi

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo '$valueCheckType =' $valueCheckType
            fi
     
            ## valueCheckType is always "cache" or null right now. "direct" and "proxy" are not implemented.
            ## ("cache" means that the jasvascript for the dashboard will get result of the REST command from a file n the fileCache directory.)

            restVerb=`getAttrValue "$cellLine" "data-restVerb" "$lineType"`  ## this returns GET/PUT/DELETE/POST (if present)

            if [ -z "$restVerb" ]; then
                restVerb="GET"
            fi


            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo restVerb = $restVerb
            fi


            ## TODO: put credentials in a config file
            ##      <url pattern to match><credentials>, e.g.
            ##      */yyy.com* myuser:mypassword

            if [[ "$valueUrl" == */yyy.com* ]]; then  ## add credentials for access to yyy.com
                curlAddArgs='-u username:password'
            fi


            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo `date` "Checking whether to curl $restVerb ${valueUrl// /%20}"
            fi

            
            if test `find "fileCache/$cacheFilePrefix.cache" -mmin -5 2> /dev/null`; then
                ## some urls are rate limited, others expensive/time consuming to access, so use the previous result of the curl if modified (created) and cached less than five minutes ago
                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                    echo `date` "Using cache file as it exists and is not too old: " `ls -l fileCache/$cacheFilePrefix.cache`
                fi
            else
                ## the cache file was not modified (or created) within the last five minutes, so re-cache it
                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                   echo `date` "Recreating the cache file as it does not exist or it is too old: " `ls -l fileCache/$cacheFilePrefix.cache`
                   ## echo `date` "Got response to curl, fileCache/$cacheFilePrefix.cache = `cat "fileCache/$cacheFilePrefix.cache"`"
                fi
                lowerValueUrl=${valueUrl,,}
                if [[ ${lowerValueUrl} == http://* ]] || [[ ${lowerValueUrl} == https://* ]]; then  ## if lowercased starts is a url, curl it
                  if [ "$logLevel" -ge "$logLevelDebug" ]; then
                     echo curl -sS --connect-timeout $restMaxTime --max-time $restMaxTime $curlAddArgs -X $restVerb "${valueUrl// /%20}" -d "$restReqBody"
                     ## echo `date` "Got response to curl, fileCache/$cacheFilePrefix.cache = `cat "fileCache/$cacheFilePrefix.cache"`"
                  fi
                  curl -sS --connect-timeout $restMaxTime --max-time $restMaxTime $curlAddArgs -X $restVerb "${valueUrl// /%20}" -d "$restReqBody" &> "fileCache/$cacheFilePrefix.cache"
                else
                  ## Assume the resource is a file and only look in the current directory for security reasons (only use characters after the last "/")
                  if [ "$logLevel" -ge "$logLevelDebug" ]; then
                     echo cat ${valueUrl##*/} &> fileCache/$cacheFilePrefix.cache
                     ## echo `date` "Got response to curl, fileCache/$cacheFilePrefix.cache = `cat "fileCache/$cacheFilePrefix.cache"`"
                  fi
                  cat ${valueUrl##*/} &> "fileCache/$cacheFilePrefix.cache"
                fi
            fi


            maskAttrValue1=`getAttrValue "$cellLine" "data-maskAttrValue1" "$lineType"`  ## if we are to mask anything in the display of the curled output, e.g. passwords

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo '$maskAttrValue1 =' $maskAttrValue1
            fi

            if [ "$maskAttrValue1" != "" ]; then
                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                    echo 'Masking' $maskAttrValue1
                fi                
                perl ./getAttributeValue.pl "replace" "fileCache/$cacheFilePrefix.cache" "${maskAttrValue1}" "<masked>" "{$logLevel}" ## this perl script has a regex that replaces the attribute value (after attribute name) in the file storing the output of the curl
            fi

            maskAttrValue2=`getAttrValue "$cellLine" "data-maskAttrValue2" "$lineType"`  ## if we are to mask anything else in the display of the curled output, e.g. passwords

            
            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo '$maskAttrValue2 =' $maskAttrValue2
            fi

            if [ "$maskAttrValue2" != "" ]; then
                perl ./getAttributeValue.pl "replace" "fileCache/$cacheFilePrefix.cache" "${maskAttrValue2}" "<masked>" "{$logLevel}" ## this perl script has a regex that replaces the attribute value (after attribute name) in the file storing the output of the curl
            fi

            
            curValue=`getAdHocAttrValue "fileCache/$cacheFilePrefix.cache" "$valuePrefix"`  ## gets the value to save off

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "Got value from url response file: $curValue"
            fi

            if [ -e "fileCache/$infoFilePrefix.info" ]; then  ## the info file exists, so the previous version information is available from there
                prevCurValue=`getAdHocAttrValue fileCache/$infoFilePrefix.info "Current value:"`
                prevValue=`getAdHocAttrValue "fileCache/$infoFilePrefix.info" "Previous value:"`
                curValueTime=`getAdHocAttrValue "fileCache/$infoFilePrefix.info" "Current value updated before:"`
            else ## the cache file does not exist
                touch fileCache/$infoFilePrefix.info  ## create it as an empty file

                curValueTime="Unknown"
                prevCurValue=''
                prevValue=''
                curValueTime=''
            fi

            if [ "$curValue" = "" ]; then
                curValue="(Error)"
            fi


            if test "$curValue" != "$prevCurValue"; then ## the value has changed since the last time we ran
                prevValue="$prevCurValue"
                prevCurValue="$curValue"
                curValueTime=`date -r fileCache/$cacheFilePrefix.cache +"%m/%d/%Y %H:%M:%S"`
            fi


            prevCurValue=${prevCurValue:-"Unknown"}
            curValueTime=${curValueTime:-"Unknown"}
            prevValue=${prevValue:-"Unknown"}


            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "curValue=$curValue"
                echo "prevCurValue=$prevCurValue"
                echo "prevValue=$prevValue"
                echo "curValueTime=$curValueTime"
            fi


            histStart=`perl ./getAttributeValue.pl "lineNumber" "fileCache/$infoFilePrefix.info" "At about" "" "{$logLevel}"`

            if [ "$histStart" != "" ]; then ## we found the first history line
                ## store just the history lines in a temporary file
                tail -n +$histStart fileCache/$infoFilePrefix.info | tac | sed '/^$/d' | tail -n 1000 > fileCache/$infoFilePrefix.hist
                lastHistValue=`getAdHocAttrValue "fileCache/$infoFilePrefix.info" "value changed to"`
                lastHistTime=`getAdHocAttrValue fileCache/$infoFilePrefix.info "At about"`
            else
                touch fileCache/$infoFilePrefix.hist
                lastHistValue=""
                lastHistTime="?"
            fi

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "histStart=$histStart"
                echo "lastHistValue=$lastHistValue"
                echo "lastHistTime=$lastHistTime"
            fi

            ## Add a history line if the value has changed compared with the last history value

            histInterval=`getAttrValue "$cellLine" "data-histInterval" "$lineType"`  ## e.g. 1 day, 2 days, 1 week, 1 hour, 30 minutes

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "fileCache/$infoFilePrefix.info histInterval=$histInterval"
            fi

            if [ "$histInterval" != "Never" ]; then
                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                    echo "Checking if history needs updating"
                fi

                checkHist="false"

                if [ "$histInterval" = "" ]; then
                    if [ "$logLevel" -ge "$logLevelDebug" ]; then
                        echo "Hist interval attribute not present for the cell - so check the history"
                    fi
                    histInterval="0 days"  ## if the histInterval attribute is not configured, always update history of the value has changed
                    checkHist="true"  ## if the attribute data-histInterval is not present on the html line then check history every time
                fi

                if [ "$lastHistTime" = "" ] || [ "$lastHistTime" = "Unknown" ]; then  ## have not checked the history before or don't know when we did
                    checkHist="true"
                fi

                if [ "$checkHist" != "true" ];then
                    lastHistEpoch=$(date -d "`echo $lastHistTime | sed 's/@ //'`" +%s 2>/dev/null)
                    if [ "$logLevel" -ge "$logLevelDebug" ]; then
                        echo "lastHistEpoch=$lastHistEpoch"
                    fi             
                    if [ $? -eq 0 ]; then  ## the conversion of the last date the history was stored was successful
                        oldEpoch=`date --date="$histInterval ago" +%s`  ## this gives the date/time at which we need to update the history (e.g. one day ago)
                        if [ $? -eq 0 ]; then
                            if [ "$lastHistEpoch" -le "$oldEpoch" ]; then ## the last time we checked was prior to histInterval ago (e.g. more than 1 day ago)
                                checkHist="true"
                            fi
                        else ## we have a bad interval in data-histInterval
                            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                                echo "Could not convert $histInterval ago to epoch"
                            fi
                            checkHist="true"
                        fi
                    else ## if the historical date conversion fails, it means there is no known date for the historical value
                        if [ "$logLevel" -ge "$logLevelDebug" ]; then
                            echo "Could not convert $lastHistTime to epoch"
                        fi
                        checkHist="true"  ## so force checking the historical value
                    fi
                fi

                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                    echo "oldEpoch=$oldEpoch"
                    echo "checkHist=$checkHist"
                fi

                if [ "$checkHist" = "true" ]; then
                     if [ "$logLevel" -ge "$logLevelDebug" ]; then
                        echo "Checking if the current value is different from the last historical value stored..."
                        echo "curValue=$curValue"
                        echo "lastHistValue=$lastHistValue"
                        echo "histStart=$histStart"
                     fi
                    if [ "$curValue" != "$lastHistValue" ] || [ "$histStart" = "" ]; then ## the current value is different from the previously stored historical value
                        if [ "$logLevel" -ge "$logLevelDebug" ]; then
                            echo "The last historical value is different from the current value - storing the current value in the history..."
                        fi
                        echo "At about: $curValueTime, value changed to $curValue" >> fileCache/$infoFilePrefix.hist
                    fi
                fi


            fi  ## end of need to check if history needs to be updated (not "never")


            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "After calculating everything:"
                echo 'Cache of curl output file ='$cacheFilePrefix.cache
                echo 'Info data file='$infoFilePrefix.info
                echo 'valueUrl='$valueUrl
                echo 'curValue='$curValue
                echo "curValueTime="$curValueTime
                echo 'prevCurValue='$prevCurValue
                echo 'prevValue='$prevValue
                echo "histInterval="$histInterval
                echo 'histStart='$histStart
                echo 'lastHistValue='$lastHistValue
                echo 'lastHistTime='$lastHistTime
                echo "lastHistEpoch="$lastHistEpoch
                echo "oldEpoch="$oldEpoch
                echo 'checkHist='$checkHist
            fi


            echo -e "Current value: $curValue \n" \
                    "Current value updated before: $curValueTime \n" \
                    "Previous value: $prevValue \n\n" \
                    "Cache file: fileCache/$cacheFilePrefix.cache \n" \
                    "Info file: fileCache/$infoFilePrefix.info \n" \
                    "Last updated: `date -r fileCache/$cacheFilePrefix.cache +"%m/%d/%Y %H:%M:%S"`\n" > fileCache/$infoFilePrefix.info


            tac fileCache/$infoFilePrefix.hist >> fileCache/$infoFilePrefix.info
            rm fileCache/$infoFilePrefix.hist   

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "At last tac :"
                echo '$valueUrl =' "$valueUrl"
                echo '$curValue =' "$curValue"
                echo 'Cache of curl output file =' "$cacheFilePrefix.cache"
                echo 'Info data file =' "$infoFilePrefix.info"
                echo '$prevCurValue = ' "${prevCurValue}"
                echo '$prevValue = ' "${prevValue}"
                echo '$curValue =' "${curValue}"
                echo '$histStart =' "$histStart"
                echo -e "\n\n--------------------End of handling an url/attribute line in the html file-------------------\n\n\n"
            fi
        fi ## need to refresh the value
    fi  ## end of found a uri to curl to a file
}  ## end of updateCellCache



###### Main logic


for dashboardHTML in ${Dashboards[@]}; do  ## for each dashboard html page in the list

    dashboardHTMLName=$(basename "$dashboardHTML")
    dashboardPrefix="${dashboardHTMLName%.*}"
    lastUpdatedFileName=${dashboardPrefix}_last_updated.txt ## dir/index.html -> index_last_updated.txt

    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo "Reading ${dashboardHTML}: " `ls -l $dashboardHTML`
        echo "dashboardPrefix=$dashboardPrefix"
        echo "lastUpdatedFileName=$lastUpdatedFileName"
    fi

    ## Put the sub-json for the cells into another temp json file that has one line per cell:

    if [ -f "$dashboardPrefix.json" ]; then ## the json file for the dashboard exists

        jq -c '.tables[].rows[].cells[]' < $dashboardPrefix.json > $dashboardPrefix.temp

        while read -r jsonLine; do

        ## Read the json lines for the cells to find the uri to access, etc. to get the value to display in the cell

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "jsonLine being processed:"
                echo "$jsonLine" "JSON"
            fi

            updateCellCache "$jsonLine" "JSON" ## update the cache (.cache and .info) files for the cell based on the content of the json line

        done < $dashboardPrefix.temp

        if [ ! -f "$dashboardHTML" ]; then  ## the HTML file for the dashboard does not exist
                                            ## which it may not if this is the first time after the json was created
            sed "s/templatefromjson/$dashboardPrefix/g" templatefromjson.html > $dashboardHTML
            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo "In main logic: $dashboardHTML did not exist - created it, changing prefix to $dashboardPrefix"
            fi
        fi    
    fi ## end of the json file for the dashboard exists

    if [ "$logLevel" -ge "$logLevelDebug" ]; then
        echo "ending processing $dashboardHTML... `date`"
    fi


    if [ -f "$dashboardHTML" ]; then ## the HTML file for the dashboard exists (which it should - it was created above it it did not)

        while read -r htmlLine; do

            ## Read the html page to find the html line which has the uri to access to get the value to display in the cell
            ## So we are searching for the line with the attribute named "data-envCheckType=" e.g.:
            ## <td class="envVersion" data-versionUrl="talreactorws01.hmsonline.com:9081/healthcheck"></td>
            ## and store the attribute value in $valueCheckType

            ## Find the attribute value in the HTML line for the attribute name data-versionCheckType, e.g. "cache" from data-versionCheckType=Cache

            htmlClass=`echo "$htmlLine" | sed -n -e "s|^.*class=\s*[\"']\([^\"']*\)[\"'].*$|\1|p"`  ## see if the line has "class=envVersion" in it

            if [ "$logLevel" -ge "$logLevelDebug" ]; then
                echo '$htmlLine =' "$htmlLine"
                echo '$htmlClass =' "$htmlClass"
            fi

            if [[ "$htmlClass" == *"envVersion"* ]]; then ## one of the class attributes is "envVersion", which means this line needs a value displayed in the html element
         
                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                    echo -e "\n\n\n--------------------Found an HTML line that has an attribute value that needs displaying-------------------\n\n"
                    echo "$htmlLine" 
                fi

                ## get the attribute value in the HTML line for the attribute name data-versionUrl, e.g. "http://talem01.hmsonline.com:9090/common/get-version" from
                ##   data-versionUrl="http://talem01.hmsonline.com:9090/common/get-version"

                if [ "$logLevel" -ge "$logLevelDebug" ]; then
                    echo "htmlLine being processed:"
                    echo "$htmlLine" "HTML"
                fi

                updateCellCache "$htmlLine" "HTML" ## update the cache (.cache and .info) files for the cell based on the content of the json line
            fi

        done < "$dashboardHTML"

    fi ## end of the dashboard exists

done ## end of looping through the dashboard HTML file names
