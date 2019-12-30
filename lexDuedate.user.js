// ==UserScript==
// @id             lexDuedate
// @name           lexDuedate
// @version        1.0.2
// @author         Christoph Neckel <ch.neckel@gmail.com>
// @description    Set empty DuDate automatic (+2d) and open DuDate dialog when DuDate is in the past
// @namespace      https://github.com/noxorius/
// @include        https://github.com/*
// @updateURL      https://github.com/noxorius/gatherAgentData/raw/master/lexDuedate.user.js
// @downloadURL    https://github.com/noxorius/gatherAgentData/raw/master/lexDuedate.user.js
// @include        https://rbit.service-now.com/sc_req_item.do*
// @include        https://rbit.service-now.com/nav_to.do?uri=%2Fsc_req_item.do*
// @run-at         document-end
// @grant          none
// ==/UserScript==

// This scrips check the dueDate ( NOT < NOW ) or sets a empty dueDate to + 2 days

function parseDate(input) {
	//format dd.MM.yyyy HH:mm:ss
	var parts = input.split(" ");
	var date = parts[0].split("-");
	var time = parts[1].split(":");
	// new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
	return new Date(date[0], date[1] - 1, date[2], time[0], time[1], time[2]);
}


// get Request doDate
var date = document.getElementById("sys_original.sc_req_item.due_date");
var status = document.getElementById("sys_original.sc_req_item.state").value;
var now = new Date();
now.setHours(24);

if (date.value != "") {
	// dueDate is set
	var dateValue = parseDate(date.value);
	// check if date + 24 > now && status == resolved
	if ( dateValue < now && status != 6 ) {
		// SET dueDat
		document.getElementById("sc_req_item.due_date.ui_policy_sensitive").click();
	} else {
		// dueDate ok
	}
} else {
	// NO dueDate set
	// NEW REquest Item
	var nextDue = new Date();
	// now + 48h
	nextDue.setTime( nextDue.getTime() + 48 * 1000 * 60 * 60);
	// set Duedate sc_req_item.due_date
	document.getElementById("sc_req_item.due_date").value = (nextDue.getFullYear()+"-"+("0"+(nextDue.getMonth() + 1)).slice(-2)+ "-" + ("0" + nextDue.getDate()).slice(-2)+
		" "+ ("0" + nextDue.getHours()).slice(-2) +":"+ ("0"+nextDue.getMinutes()).slice(-2) + ":" + ("0"+nextDue.getSeconds()).slice(-2));
}

