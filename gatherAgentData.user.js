// ==UserScript==
// @name         gather Agent Data
// @namespace    https://github.com/noxorius/
// @version      0.8
// @description  get some metadata only for work
// @author       Noxorius
// @updateURL    https://github.com/noxorius/gatherAgentData/raw/master/gatherAgentData.user.js
// @downloadURL  https://github.com/noxorius/gatherAgentData/raw/master/gatherAgentData.user.js
// @match        http://rbeuruc01.rbdom.rbroot.net/wallboard/agent-cp.asp
// @grant        GM.listValues
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://cdn.jsdelivr.net/npm/chart.js@2.9.4/dist/Chart.bundle.min.js
// ==/UserScript==

// Update 0.7: fix bug reload on "internal server page"
// Update 0.5: all call to extern have now the "On a Call" Sign ... we have to switch the logic ...
// If the agent goes from "On a Call" to "Working" thats a real call

// Update 0.6 Show stat graph, reload webpage on a "internal server error", small fixes
//            added call in progess status == 3, switch to tickest status (no more status wariable)

// enable debugging in console ..
var enableDebug = 0;
var showStat = 0;
var deleteData = 0;

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
    if (enableDebug == 1){
        console.log("readAgentData: " + id + " Value: "+ agentCalls);
    }
    return agentCalls;
}

// set data to var to GM.setValue
// id = valName
async function setAgentData(id, value){
    await GM.setValue( id, value);
    if (enableDebug == 1){
        console.log("setAgentData: " + id + " Value: "+ value);
    }
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

// update data in varable (addition)
async function updateAgentData(id, value) {
    let oldValue = await readAgentData(id);
    if (enableDebug == 1){
        console.log("updateAgentData: " + oldValue );
    }
    await setAgentData(id, (value + oldValue));
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


//Update JSON data (array)
// update JSON --> for stat graph
// Array (UserId, StartCall, EndCall, Direction(0 == Outbound OR 1 == Inbound) OR Progess == 3)
async function updateJSONArray(arrayName, userId, startCall, endCall, direction) {
    if (enableDebug == 1){
        console.log("updateJSONArray: " + arrayName, userId, startCall, endCall, direction );
    }
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
    if ( startCall != "" ){
        // new array entry multi layer array
        let innerArray= [];
        innerArray.push(userId, startCall, "", direction);
        myArray.push(innerArray);
    }
    if ( endCall != "" ){
        // find last userid and add endCall date and direction
        for ( let i = myArray.length - 1; i >= 0; i--){
             if ( myArray[i][0] == userId ){
                 // find the last entry from this user and set stopdate and direction
                 myArray[i][2] = endCall;
                 myArray[i][3] = direction;
                 break;
             }
            // found no entry (call to short that it was reg) --> create a new one
            if ( i == 0 ){
                // crate a entry
                myArray[i][0] = userId;
                myArray[i][1] = startCall;
                myArray[i][2] = endCall;
                myArray[i][3] = direction;
            }
        }
    }
    await setAgentData("updateJSON", 1);
    await setAgentData(arrayName, JSON.stringify(myArray));
}


// print JSONArray(name)
async function printJSONArray(arrayName){
    let Value = await readAgentData(arrayName);
    let myArray = JSON.parse(Value);
    return myArray.toString();
}

// status "On a Call"
async function setOnACall(id){
    // check to update status once
    if ( await getTicketStatus("arrayDate", id) != 3) {
        // add a value to the statArray
        // Array (UserId, StartCall, EndCall, Direction(0 == Outbound OR 1 == Inbound) OR Progess == 3)
        await updateJSONArray("arrayDate", id, Date.now(), "", 3);
        // delete # of refeshed
        setAgentData(id + "count", 0);
    }
}

// status "Working"
// if the last Status was "On a Call" --> count as a call
async function setWorking(id){
    // check to update status once
    if ( await getTicketStatus("arrayDate", id) == 3) {
        if (enableDebug == 1){
            console.log("setOnACall Last access status == 1: " + id);
        }
        // create a new JSON
        await updateAgentData(id, 1);
        // add a value to the statArray
        // Array (UserId, StartCall, EndCall, Direction(0 == Outbound OR 1 == Inbound OR Progess == 3))
        await updateJSONArray("arrayDate", id, "", Date.now(), 1);
        // delete # of refeshed
        await setAgentData(id + "count", 0);
    }
    // Error Handling: if call to short no "On a Call" ((id+"status") == 1) status
    if (await readAgentData(id + "count") > 0){
        await updateJSONArray("arrayDate", id, "", Date.now(), 1);
        await updateAgentData(id, 1);
        setAgentData(id + "count", 0);
    }

}

// status "Ready"
// if the last Status was "On a Call" --> count as a callOUT
async function setReady(id){
    //count page reload
    await updateAgentData(id + "count", 1);
    if ( await getTicketStatus("arrayDate", id) == 3) {
        // set counter to 0
        setAgentData(id + "count", 0);
        // add a value to the statArray
        // Array (UserId, StartCall, EndCall, Direction(0 == Outbound OR 1 == Inbound OR Progess == 3))
        await updateJSONArray("arrayDate", id, "", Date.now(), 0);
    }
}

// status "Offline"
async function setOffline(id){
    if ( getTicketStatus("arrayDate", id) == 3) {
        // Array (UserId, StartCall, EndCall, Direction(0 == Outbound OR 1 == Inbound OR Progess == 3))
        updateJSONArray("arrayDate", id, "", Date.now(), 0);
        ;
    }
    // delete # of refeshed
    setAgentData(id + "count", 0);
}


// check last date program was running (eg 2019121)
async function checkDateProgram(){
    // checks if this is the first call this day
    //get date
    let d = new Date();
    let strDate = d.getFullYear().toString() + (d.getMonth()+1).toString() + d.getDate().toString();
    if (enableDebug == 1){
        console.log("checkDateProgram Date:  " + strDate );
    }
    if (await readAgentData("gatherAgentData") != strDate || deleteData == 1) {
       deleteAllData()
       setAgentData("gatherAgentData", strDate);
    }
}

function setLastIndex(id, index){
    if (enableDebug == 0){
        console.log("setLastIndex id:  " + id );
    }
    setAgentData("index"+index, id);
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

    //run this only if the new entries are set
    if ( await readAgentData("updateJSON") != 0 ){
        setAgentData("updateJSON", 0);
    } else {
        return;
    }

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
                if (myArray[j][3] == 1){
                    //count call IN
                    callIn++;
                } else if (myArray[j][3] == 0){
                    //count call Out
                    callout++;
                } else if (myArray[j][3] == 3){
                    // count running
                    progess++;
                } else {
                    //ignore
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
    dataY.yAxes = dataYAxes;
    dataOptions.scales = dataY;
    myJSON.options = dataOptions;
    //console.log("NEC"+JSON.stringify(myJSON));
    setAgentData("myJSON", JSON.stringify(myJSON));
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
    await createJSONData("arrayDate");
    // insert table
    let statTable = "<table align=\"CENTER\" border=\"1\" cellspacing=\"0\" cellpadding=\"1\" width=\"100%\"><tbody><tr><td><b><font color=\"Navy\">" +
        "<input type=\"checkbox\" id=\"showstat\" checked> Call Stat (approximated)</b></td></tr>" +
        "<tr><td> <div><canvas id=\"myChart\"></canvas></div>  </td></tr></tbody></table>";
    $(statTable).insertBefore($("p"));
    // var
    let myContext = document.getElementById("myChart");
    let myChartConfig = await readAgentData("myJSON");
    let myChart = new Chart(myContext, JSON.parse(myChartConfig));

    if (showStat == 1 || await readAgentData("showStat") == 1){
        $("#myChart").show();
        $("#showstat").prop('checked', true);
    } else {
        $("#myChart").hide();
        $("#showstat").prop('checked', false);
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
}


async function UpdateCallValue(id){
    let value = await readAgentData(id);
    let valueCalls = await readAgentData(id+"count");
    let ranking = this;
    if (enableDebug == 1){
            console.log("UpdateCallValue check: "+"#id"+id +" value: "+value);
       }
    //update HTML element "id"+id
    // new version $( ".id"+id ).text(value);
    // calc a # count
    let hashstring = "";
    let maxhashlenght = 60;
    let numhash = (valueCalls / 10) >> 0;
    if ( numhash > maxhashlenght ) numhash = maxhashlenght;
    if ( id == "erendl" || id == "sschuster" ) {
        $( ".id"+id+"anz" ).text("-");
    } else {
        $( ".id"+id+"anz" ).text("#".repeat(numhash));
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
    if (enableDebug == 1){
        console.log("DEBUG enabled");
    }
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
            if (value[1] == "On a Call"){
                setOnACall(value[2]);
            } else if (value[1] == "Work"){
                //check if last status was "On a Call"
                setWorking(value[2]);
            } else if (value[1] == "Ready"){
                setReady(value[2]);
            } else if (value[1] == "Reserved"){
                // ignore Reserved
            } else if (value[1] == "Break" || value[1] == "Logged Out"){
                setOffline(value[2]);
            } else {
            // die # werden immer glöscht wenn nicht im ready mode
                if ( getTicketStatus("arrayDate", value[2]) == 3) {
                    // Array (UserId, StartCall, EndCall, Direction(0 == Outbound OR 1 == Inbound OR Progess == 3))
                    updateJSONArray("arrayDate", value[2], "", Date.now(), 0);

                }
                //setAgentData(value[2] + "status", 0);
                // delete # of refeshed
                setAgentData(value[2] + "count", 0);
            }
            // update Calls var
            UpdateCallValue(value[2]);
            if (enableDebug == 1){
                console.log( index + ": Name:" + value[0] +
                    " Status:" + value[1] +
                    " id:" + value[2]
                    );
            }
        }
    });
    // show Statistic
            AddStat();
})
