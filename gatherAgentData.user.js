// ==UserScript==
// @name         gather Agent Data
// @namespace    https://github.com/noxorius/
// @version      1.0
// @description  get some metadata only for work
// @author       Noxorius
// @updateURL    https://github.com/noxorius/gatherAgentData/raw/master/gatherAgentData.user.js
// @downloadURL  https://github.com/noxorius/gatherAgentData/raw/master/gatherAgentData.user.js
// @match        http://rbeuruc01.rbdom.rbroot.net/wallboard/agent-cp.asp
// @grant        GM.listValues
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @require      https://code.jquery.com/jquery-3.6.1.min.js
// @require      https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js

// ==/UserScript==

// Userdata: Array structure: userId, time, direction
// time: unix timestamp
// add new Model ( Status/direction:
// 0 --> Break
// 1 --> Not Ready / In Office
// 2 --> Not ACD Call
// 3 --> Ready
// 4 --> Working
// 5 --> Call
// 6 --> Incomming Call ( will be set if last Status is Call and Status now is Working

// Update 1: new logFile format
// Update 0.9 upgrade chart.js to 3.9.1 and jquery 3.6.1
// Update 0.7: fix bug reload on "internal server page"
// Update 0.5: all call to extern have now the "On a Call" Sign ... we have to switch the logic ...
// If the agent goes from "On a Call" to "Working" thats a real call

// Update 0.6 Show stat graph, reload webpage on a "internal server error", small fixes
//            added call in progess status == 3, switch to tickest status (no more status wariable)

// enable debugging in console ..
var showStat = 0;
var deleteData = 0;
var slidingTimeWindow = 90;

// change font to a fixed fixed-width
function setFixedFont() {
    $("body").css("font-family", "Courier");
}

// get agent data from table
function getTableData(table) {
    var data = [];
    table.find('tr').each(function (rowIndex, r) {
        var cols = [];
        $(this).find('th,td').each(function (colIndex, c) {
            cols.push(c.textContent);
        });
        data.push(cols);
    });
    return data;
}


// read data from GM.getValue
//if no val return==0
async function readAgentData(id) {
    let agentCalls = await GM.getValue(id, 0);
    return agentCalls;
}

// set data to var to GM.setValue
// id = valName
async function setAgentData(id, value){
    await GM.setValue( id, value);
}

// delete all set Variables
async function deleteAllData(){
    let keys = await GM.listValues();
    for (let key of keys) {
        await GM.deleteValue(key);
    }
    // test delete JSON
    await GM.setValue( "arrayDate", 0);
    await GM.setValue( "myJSON", 0);
}

// Get Last Tickes status
// find last Ticket from the user and retun the status flag
// or return -1 when no ticket found
async function getTicketStatus(arrayName, userId){
    // has to be set
    if (userId == "") {
        return(-1);
    }
    // load array
    let oldValue = await readAgentData(arrayName);
    // no array initialied
    if (oldValue == 0){
        let tempoldValue = [];
        oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);

    for ( let i = myArray.length - 1; i >= 0; i--){
             if ( myArray[i][0] == userId ){
                 return(myArray[i][3]);
             }
    }
    return(-1);
}

// Get Last Tickes status
// find last Ticket from the user and retun the status flag
// or return -1 when no ticket found
async function getLastTime(arrayName, userId){
    // load array
    let oldValue = await readAgentData(arrayName);
    // no array initialied
    if (oldValue == 0){
        let tempoldValue = [];
        oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);
    for ( let i = myArray.length - 1; i >= 0; i--){
        // if username net and entry exist
        if ( userId != "" && myArray[i][0] == userId ){
            return(myArray[i][1]);
        } else {
            // return the time last entry of the Array
            return(myArray[i][1]);
        }
    }
    return(-1);
}

// update JSON the last call (direction 5 -> 6) (normal call to inbound call)
 async function updateTimeJSONExternCall(arrayName, userId){
     if (userId == "") {
         return;
     }
     let oldValue = await readAgentData(arrayName);
     // no array initialied
     if (oldValue == 0){
         return;
     }
     let myArray = JSON.parse(oldValue);

     var oldDirection = -1;
     for ( let i = myArray.length - 1; i >= 0; i--){
         if ( myArray[i][0] == userId && myArray[i][2] != 4){
             // find the last entry from this user and get the direction
             oldDirection = myArray[i][2];
             if (oldDirection == 5){
                 myArray[i][2] = 6;
                 await setAgentData(arrayName, JSON.stringify(myArray));
             }
             break;
         }
     }
     return;
 }


async function updateTimeJSONArray(arrayName, userId, time, direction) {
    // has to be set
    if (userId == "") {
        return;
    }
    let oldValue = await readAgentData(arrayName);
    // no array initialied
    if (oldValue == 0){
        let tempoldValue = [];
        oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);
    if ( time != "" ){
        var oldDirection = -1;
        for ( let i = myArray.length - 1; i >= 0; i--){
             if ( myArray[i][0] == userId ){
                 // find the last entry from this user and get the direction
                 oldDirection = myArray[i][2];
                 break;
             }
        }
        // if oldDirection != new entry ( remove duplicates)
        if ( oldDirection != direction ){
           // new array entry multi layer array
           let innerArray= [];
           innerArray.push(userId, time, direction);
           myArray.push(innerArray);
   //         console.log("NEC: push "+ userId + " - " + oldDirection + " - " + direction );
            await setAgentData(arrayName, JSON.stringify(myArray));
       } // or do nothing
    }
}

async function getTimeJSONArray(arrayName, userId, direction) {
    // has to be set
    if (userId == "") {
        return;
    }
    let oldValue = await readAgentData(arrayName);
    // no array initialied
    if (oldValue == 0){
        let tempoldValue = [];
        oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);
    if (direction == "") {direction = 3};

       for ( let i = myArray.length - 1; i >= 0; i--){
            if ( myArray[i][0] == userId ){
                // find the last entry from this user and get the time
                if (direction == myArray[i][2]) {
                    return myArray[i][1];
                }
             }
        }
    return -1;
}

async function getStatJSONArray(arrayName, userId) {
    // has to be set
    if (userId == "") {
        return;
    }
    let oldValue = await readAgentData(arrayName);
    // no array initialied
    if (oldValue == 0){
        let tempoldValue = [];
        oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);

    for ( let i = myArray.length - 1; i >= 0; i--){
        if ( myArray[i][0] == userId) {
            // find the last entry from this user and get the direction
            return myArray[i][2];
            }
        }

    return -1;
}

// status "On a Call"
async function setOnACall(id){

    // new array
    await updateTimeJSONArray("arrayTime", id, Date.now(), 5);
}

// status "Working"
// if the last Status was "On a Call" --> count as a call
async function setWorking(id){

    // set status 6 == last was a inbound call ( 5 is a call )
    await updateTimeJSONExternCall("arrayTime", id);

    // new array
    await updateTimeJSONArray("arrayTime", id, Date.now(), 4);
}

// status "Ready"
// if the last Status was "On a Call" --> count as a callOUT
async function setReady(id){
    //count page reload

    await updateTimeJSONArray("arrayTime", id, Date.now(), 3);
}

// status "Offline"
async function setOffline(id){


    await updateTimeJSONArray("arrayTime", id, Date.now(), 0);
}


// status "Break"
async function setBreak(id){

    await updateTimeJSONArray("arrayTime", id, Date.now(), 0);
}

// status "nicht ACD Anruf"
async function setNoACD(id){

    await updateTimeJSONArray("arrayTime", id, Date.now(), 2);
}

// check last date program was running (eg 2019121)
async function checkDateProgram(){
    // checks if this is the first call this day
    //get date
    let d = new Date();
    let strDate = d.getFullYear().toString() + (d.getMonth()+1).toString() + d.getDate().toString();
    if (await readAgentData("gatherAgentData") != strDate || deleteData == 1) {
       deleteAllData()
       setAgentData("gatherAgentData", strDate);
    }
}

// Status Not Ready / In Office

async function setNotReady(id){

    await updateTimeJSONArray("arrayTime", id, Date.now(), 1);
    // delete # of refeshed
}


function setLastIndex(id, index){
    setAgentData("index"+index, id);
}


// test Color change

function hashCode(str) { // java String#hashCode
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
       hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 285 * hash;
}

function intToRGB(i){
    var c = (i & 0x00FFFFFF)
        .toString(16)
        .toUpperCase();

    return "#" + "00000".substring(0, 6 - c.length) + c;
}



// create a JSON Data --> for diagram
async function createJSONData(arrayName){
     let oldValue = await readAgentData(arrayName);
//   no array initialied
   if (oldValue == 0){
       let tempoldValue = [];
       oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);

    // labels --> Namen
    let labels =["Call received", "Call made", "Call in progess"];

    let myJSON = {type: 'bar'};

    // TODO: see https://www.chartjs.org/samples/latest/charts/bar/vertical.html

    let arrayId = [];
    // get all ids / names --> arrayId
    for (let i = 0; i < myArray.length; i++){
        // check name
        if (! arrayId.find(arrayId => arrayId == myArray[i][0] ) ){
            arrayId.push(myArray[i][0]);
        }
    }

    // sort all names
    arrayId.sort();

    let JSONData = {labels: arrayId};

    let JSONAgendData = [];
    let arrayIn = [];
    let arrayOut = [];
    let arrayProgess = [];
    // scan alle entries and add call IN/OUT
    for (let i = 0; i < arrayId.length; i++){
        let callIn = 0;
        let callout = 0;
        let progess = 0;
        for (let j = 0; j < myArray.length; j++){

            if (myArray[j][0] == arrayId[i]){
                // found user entry
                if (myArray[j][2] == 6){
                    //count call IN
                    callIn++;
                } else if (await getStatJSONArray(arrayName, arrayId[i]) == 5 && myArray[j][2] == 5 && progess == 0){ //TODO
                    // Check if last entry in array is Call out --> ongoing
                    progess++;
                } else if (myArray[j][2] == 5){
                    //count call Out
                    callout++;
                }
            }
        }
        // build JSON
        arrayIn.push(callIn);
        arrayOut.push(callout);
        arrayProgess.push(progess);
   }
    //        let arrayInOut = [callIn, callout];
    let dataSetIN = {};
    dataSetIN.label = labels[0];
    dataSetIN.data = arrayIn;
    dataSetIN.stack = "Stack 0";
    dataSetIN.backgroundColor = "rgba(54, 162, 235, 0.5)";
    JSONAgendData.push(dataSetIN);
    let dataSet = {};
    dataSet.label = labels[1];
    dataSet.data = arrayOut;
    dataSet.stack = "Stack 0";
    dataSet.backgroundColor = "rgba(153, 102, 255, 0.5)";
    JSONAgendData.push(dataSet);
    let dataSetProg = {};
    dataSetProg.label = labels[2];
    dataSetProg.data = arrayProgess;
    dataSetProg.stack = "Stack 0";
    dataSetProg.backgroundColor = "rgba(255, 255, 0, 0.5)";
    JSONAgendData.push(dataSetProg);

    JSONData.labels = arrayId;
    JSONData.datasets = JSONAgendData;
    myJSON.data = JSONData;
    let dataOptions = {};
    let dataYAxes = [];
    let dataTicks = {};
    let dataZero ={};
    let dataY ={}
    let dataYAexesStacked = {stacked: true};
    dataTicks.ticks = dataZero;
    dataZero.beginAtZero = true;
    //dataYAxes.push(dataTicks);
    dataYAxes.push(dataYAexesStacked);
    //dataY.y = dataYAxes;
    dataOptions.scales = dataY;
    myJSON.options = dataOptions;
    return(myJSON);
}


// new Chart test
// create a JSON Data --> for diagram
async function createTimeJSONData(arrayName){
     let oldValue = await readAgentData(arrayName);

//   no array initialied
   if (oldValue == 0){
       let tempoldValue = [];
       oldValue = JSON.stringify(tempoldValue);
    }
    let myArray = JSON.parse(oldValue);

    // labels --> Namen
    let labels =["Call inbound", "Call outbound"];

    let myJSON = {
        type: 'line',
        data: {},
        options: {
            responsive: true,
            plugins: {
                title: {
                    text: 'Call Time Scale',
                    display: true
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        displayFormats: {
                        'minute': 'HH:mm'
                        },
                    },
                    display: true,
                    title: {
                        display: true,
                        text: 'Time',
                    },
                    min: Date.now() - slidingTimeWindow * (1 * 60 * 1000 ),
                },
                 y: {
                       ticks: {
                           callback: function(value, index, ticks) {
                               switch (value) {
                                   case 0:
                                       return("Break");
                                   case 1:
                                       return("Not Ready");
                                   case 2:
                                       return("Not ACD Call");
                                   case 3:
                                       return("Ready");
                                   case 4:
                                       return("Working");
                                   case 5:
                                       return("Call");
                                   case 6:
                                       return("Incomming Call");
                                   default:
                                       return("");
                               }
                           },
                       },
                     display: true,
                     type: "linear",

                     min: 0,
                     max: 7,
                  },
            },
        },
    };

    let agendAddData = {datasets:[]};
    let agentData = [];
    let agentDataDataset = [];

    let arrayId = [];
    // get all ids / names --> arrayId
    for (let i = 0; i < myArray.length; i++){
        // check name
        if (! arrayId.find(arrayId => arrayId == myArray[i][0] ) ){
            // myArray[i][0] is the name
            arrayId.push(myArray[i][0]);
            // create userdata array
            agentData[myArray[i][0]] = {
                label: 'My First dataset',
                backgroundColor: intToRGB(hashCode(myArray[i][0])),
                borderColor: intToRGB(hashCode(myArray[i][0])),
                fill: false,
                stepped: "bevor",
                data: []
            };
            agentDataDataset[myArray[i][0]] = [];
            agentData[myArray[i][0]].label = myArray[i][0];
        }
    }


    let JSONAgendData = [];
    // scan alle entries
    for (let j = 0; j < myArray.length; j++){
        let date = {x: 0,y: 0};
        date.x = myArray[j][1];
        date.y = myArray[j][2];

        agentDataDataset[myArray[j][0]].push(date);
    }

//     // add last point now()
     for (let j = 0; j < arrayId.length; j++){
         let date = {x: 0,y: 0};
         let now = Date.now();
         date.x = now;
         date.y = await getStatJSONArray("arrayTime", arrayId[j]);
         agentDataDataset[arrayId[j]].push(date);
     }

// add Dataset to array
    for (let j = 0; j < arrayId.length; j++){
        // added data -->

        agentData[arrayId[j]].data = agentDataDataset[arrayId[j]];
        agendAddData.datasets.push(agentData[arrayId[j]]);
    }
    myJSON.data = agendAddData;

    return(myJSON);
}


// search the full Name and add the content
function AddToCellContent(find, add)
{
    let virtualTab = 42;
    let spacer = " ";

    $("*font:contains('" + find + "'):visible").each(function() {
        let ContenLenght = $(this).text().length;
        if (ContenLenght < virtualTab){
            spacer = "&nbsp;".repeat(Math.abs(virtualTab - ContenLenght));
            $(this).html(find+spacer+add);
        }
    });
}


async function AddStat()
{
    // create JSON (only new entry
    //await createJSONData("arrayTime");
    // insert table
    let statTable = "<table align=\"CENTER\" border=\"1\" cellspacing=\"0\" cellpadding=\"1\" width=\"100%\"><tbody>"+
        "<tr>"+
        "<th style=\"width:50%\"><b><font color=\"Navy\"><input type=\"checkbox\" id=\"showstat\" checked> Call Stat (approximated)</b></th>" +
        "<th style=\"width:50%\"><b><font color=\"Navy\"><input type=\"checkbox\" id=\"showTime\" checked> Time Stat (also approximated)</b></th>" +
        "</tr>" +
        "<tr><td> <div><canvas id=\"myChart\"></canvas></div>  </td>"+
        "<td><div><canvas id=\"myTimeChart\"></canvas></div>  </td>"+
        "</tr></tbody></table>";
    $(statTable).insertBefore($("p"));
    // var
    let myContext = document.getElementById("myChart");
    let myChartConfig = await createJSONData("arrayTime");
    let myChart = new Chart(myContext, myChartConfig);
    // Time Chart
    let myTimeContext = document.getElementById("myTimeChart");
    let myTimeChartConfig = await createTimeJSONData("arrayTime");
    let myTimeChart = new Chart(myTimeContext, myTimeChartConfig);
    // let myTimeChart = new Chart(myTimeContext, myTimeChartConfig);

    if (showStat == 1 || await readAgentData("showStat") == 1){
        $("#myChart").show();
        $("#showstat").prop('checked', true);
    } else {
        $("#myChart").hide();
        $("#showstat").prop('checked', false);
    }
    if (showTime == 1 || await readAgentData("showTime") == 1){
        $("#myTimeChart").show();
        $("#showTime").prop('checked', true);
    } else {
        $("#myTimeChart").hide();
        $("#showTime").prop('checked', false);
    }
    // check set Show stat
    $("#showstat").on("click", function(){
            if($("#showstat").is(':checked')) {
                setAgentData("showStat", 1);
                $("#myChart").show();
            } else {
                setAgentData("showStat", 0);
                $("#myChart").hide();
            }
    });
    $("#showTime").on("click", function(){
            if($("#showTime").is(':checked')) {
                setAgentData("showTime", 1);
                $("#myTimeChart").show();
            } else {
                setAgentData("showTime", 0);
                $("#myTimeChart").hide();
            }
    });
}



async function UpdateCallTimeValue(id){
    let value = await readAgentData(id);
    let valueStat = await getStatJSONArray("arrayTime", id);
    // not ready no waiting time
    if (valueStat != 3){
        return;
    }
    let valueTime = await getTimeJSONArray("arrayTime", id, 3);
    let now = Date.now();

    //let sec = (Math.abs(now - valueTime) / 1000) | 0;
    //let waittime = Date.now() - valueTime;
    let sec = (Math.abs(now - valueTime) / 1000) | 0;
    // calc hash --- log
    // let hash = Math.log(sec) | 0;
    let hash = (sec / 60) / 5 | 0;
    if ( hash > 50 ) { hash = 50; }
    if ( id == "erendl" || id == "sschuster" ) {
        $( ".id"+id+"anz" ).text("-");
    } else {
        //$( ".id"+id+"anz" ).text(waittime.getMinutes() + ":" + waittime.getSeconds());
        $( ".id"+id+"anz" ).text("#".repeat(hash));
    }
}


// reload page when internal error all 10 seconds
function reloadWhenError(){
    // <title>500 - Internal server error.</title>
    if (document.title == "500 - Internal server error."){
        setTimeout(function(){
            location.reload()
       },10000);
    }
}

//last row <p align="RIGHT"><em><font size="-1">This page will update every 10 seconds<br>(Last updated on: 12/17/2019 12:44:45 PM)</font></em></p>


$(document).ready(function() {
    'use strict';
    // check if error --> reload
    reloadWhenError();
    // first start a new day delete all data
    checkDateProgram();
    // cange font to fixed
    setFixedFont();

    // first table all agents
    var agentData = getTableData($( "table" ).first());
    $.each(agentData, function( index, value ) {
        // first line is header
        if (index != 0) {
            // add our injected HTML:
            //*font:contains('" + find + "'):visible"
            AddToCellContent(value[0], ("waiting: <span class=\"id"+value[2]+"anz\"></span>" ));
            // Check status
            switch (value[1]) {
                case "On a Call":
                    setOnACall(value[2]);
                    break;
                case "Work":
                    setWorking(value[2]);
                    break;
                case "Ready":
                    setReady(value[2]);
                    break;
                case "Logged Out":
                    setOffline(value[2]);
                    break;
                case "Break":
                    setBreak(value[2]);
                    break;
                case "Not Ready":
                case "In Office":
                    setNotReady(value[2]);
                    break;
                case "nicht ACD Anruf":
                    setNoACD(value[2]);
                    break;
                default:
                    // Do nothing
            }
            // update Calls var
            UpdateCallTimeValue(value[2]);
        }
    });
    // show Statistic
            AddStat();
})
