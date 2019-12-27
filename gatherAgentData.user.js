// ==UserScript==
// @name         gather Agent Data
// @namespace    https://github.com/noxorius/
// @include      https://github.com/*
// @version      0.2
// @description  get some metadata only for work
// @author       Christoph Neckel
// @updateURL    https://raw.githubusercontent.com/noxorius/gatherAgentData/master/gatherAgentData.user.js
// @downloadURL  https://raw.githubusercontent.com/noxorius/gatherAgentData/master/gatherAgentData.user.js
// @match        http://rbeurwbx01.rbdom.rbroot.net:8080/wallboard/agent-cp.asp
// @grant        GM.listValues
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// ==/UserScript==

var enableDebug = 0;
//var ranking = [];

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


// read data from Var name=id
async function readAgentData(id) {
    let agentCalls = await GM.getValue(id, 0);
    if (enableDebug == 1){
        console.log("readAgentData: " + id + " Value: "+ agentCalls);
    }
    return agentCalls;
}

// set data to Name
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
}

// update data in varable (addition)
async function updateAgentData(id, value) {
    let oldValue = await readAgentData(id);
    if (enableDebug == 1){
        console.log("updateAgentData: " + oldValue );
    }
    await setAgentData(id, (value + oldValue));
}

// set call status 1= "On a Call"
async function setOnACall(id){
    if ( await readAgentData(id+"status") == 0){
        if (enableDebug == 1){
            console.log("setOnACall Last access status == 0: " + id);
        }
        await updateAgentData(id, 1);
    }
    if (await readAgentData(id+"forward") == 1){
        let forwardingAgend = await readAgentData("index"+index);
        if (forwardingAgend != 0){
            console.log("forwardingAgend != 0: " + id + "fAgend:"+forwardingAgend);
            updateAgentData(forwardingAgend, -1);
            setAgentData("index"+index, 0);
        }
        setAgentData(id+"forward", 0);
    }
    setAgentData(id + "status", 1);
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
    if (await readAgentData("gatherAgentData") != strDate) {
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

function AddToCellContent(find, add)
{
    $("font:contains('" + find + "')").html(find+add);
}

async function UpdateCallValue(id){
    let value = await readAgentData(id);
    let ranking = this;
    if (enableDebug == 1){
            console.log("UpdateCallValue check: "+"#id"+id +" value: "+value);
       }
    //update HTML element "id"+id
    $( ".id"+id ).text(value);
    // update Array
//    ranking.find(item =>  item.id === id).calls = value;
}

//last row <p align="RIGHT"><em><font size="-1">This page will update every 10 seconds<br>(Last updated on: 12/17/2019 12:44:45 PM)</font></em></p>

function injectRaceTable(htmlData){
    let originHtml = $( "p" ).first().html();
    let changedHtml = htmlData+originHtml;
    $( "p" ).first().html(changedHtml);
}


$(document).ready(function() {
    'use strict';
    if (enableDebug == 1){
        console.log("DEBUG enabled");
//        console.log( GM.listValues());
    }

    // first start a new day delete all data
    checkDateProgram();
    // first table all agents
    var agentData = getTableData($( "table" ).first());
    $.each(agentData, function( index, value ) {
        // first line is header
        if (index != 0) {
            // add to array
    //        ranking.push({"index":value[2], "id":index, "calls":0});
            // add Cell:
            AddToCellContent(value[0], ("   Calls: <span class=\"id"+value[2]+"\">0</span>"));
            // change from "On a Call" to "Work"
            if (value[1] == "On a Call"){
                setOnACall(value[2]);
                setLastIndex(value[2], index);
            }
            if (value[1] == "Work"){
                //check if last status was ""On a Call"
                setAgentData(value[2] + "status", 0);
                // delete setOnACall(value[2], 0);
            }
            // set forward "nicht ACD Anruf"
            if (value[1] == "nicht ACD Anruf"){
                setAgentData(id+"forward", 1);
                console.log("Nicht ACD Anruf: id:  " + id );
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
})
