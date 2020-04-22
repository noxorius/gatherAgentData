// ==UserScript==
// @name         gather Agent Data
// @namespace    https://github.com/noxorius/
// @include      https://github.com/*
// @version      0.4
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
// ==/UserScript==

// enable debugging in console .. 
var enableDebug = 0;

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

// search the full Name and add the content
function AddToCellContent(find, add)
{
    let virtualTab = 42;
    let spacer = " ";

    $("*font:contains('" + find + "'):visible").each(function() {
        let ContenLenght = $(this).text().length;
        console.log("NEC"+find+": #"+ContenLenght);
        if (ContenLenght < virtualTab){
            spacer = "&nbsp;".repeat(Math.abs(virtualTab - ContenLenght));
            $(this).html(find+spacer+add);
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
    $( ".id"+id ).text(value);
    // calc a # count
    let hashstring = "";
    let maxhashlenght = 60;
    let numhash = (valueCalls / 10) >> 0;
    if ( numhash > maxhashlenght ) numhash = maxhashlenght;
    if ( id == "erendl" ) {
        $( ".id"+id+"anz" ).text("-");
    } else {
        $( ".id"+id+"anz" ).text("#".repeat(numhash));
    }
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
    // cange font to fixed
    setFixedFont();

    // first table all agents
    var agentData = getTableData($( "table" ).first());
    $.each(agentData, function( index, value ) {
        // first line is header
        if (index == 0 ){
 // disable TODO           AddToCellContent("Agentname", "");
        }
        if (index != 0) {
            // add to array
    //        ranking.push({"index":value[2], "id":index, "calls":0});
            // add Cell:
            AddToCellContent(value[0], ("Calls: <span class=\"id"+value[2]+"\">0</span>&emsp13;noCall: <span class=\"id"+value[2]+"anz\"></span>" ));
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
            if (value[1] == "Ready"){
                // update the # of refeshes
                updateAgentData(value[2] + "count", 1);
         //       setAgentData(id+"forward", 1);
         //       console.log("Nicht ACD Anruf: id:  " + id );
            }
            if (value[1] != "Ready"){
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
})
