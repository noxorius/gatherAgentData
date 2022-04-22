// ==UserScript==
// @name           lexDuedate
// @version        1.0.5
// @author         Noxorius
// @description    Set empty DuDate automatic (+2d) and open DuDate dialog when DuDate is in the past
// @namespace      https://github.com/noxorius/
// @updateURL      https://github.com/noxorius/gatherAgentData/raw/master/lexDuedate.user.js
// @downloadURL    https://github.com/noxorius/gatherAgentData/raw/master/lexDuedate.user.js
// @match          https://rbit.service-now.com/sc_req_item.do*
// @match        https://rbit.service-now.com/nav_to.do?uri=%2Fsc_req_item.do*
// @run-at         document-end
// @grant          none
// ==/UserScript==


// This scrips check the dueDate ( NOT < NOW ) or sets a empty dueDate to + 2 days

 function lexDuedateparseDate(input) {
	//format
   // eg 2022-04-22 11:51:20
	var parts = input.split(" ");
	var date = parts[0].split("-");
	var time = parts[1].split(":");
	// new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
	return new Date(date[0], date[1] - 1, date[2], time[0], time[1], time[2]);
}

function lexDuedategetNextWorkdays(){
    var timeAddinS = 48 * 1000 * 60 * 60;
    var nextDue = new Date();
    nextDue.setTime( nextDue.getTime() + timeAddinS );
    if ( nextDue.getDay() == 0 ){
        // sunday
        return nextDue.getTime() + 24 * 1000 * 60 * 60;
        }
    if ( nextDue.getDay() == 6 ){
        // saturday
        return nextDue.getTime() + 36 * 1000 * 60 * 60;
        }
    return nextDue.getTime();
}

function lexDuedate() {
    // get Request doDate eg 2022-04-22 11:51:20
    var date = document.getElementById("sys_original.sc_req_item.due_date");
    var status = document.getElementById("sys_original.sc_req_item.state").value;
    var assingedTo = document.getElementById("sys_display.original.sc_req_item.assigned_to").value;
    var NOWUser = window.NOW.user_display_name;
    var now = new Date();
    now.setHours(24);

    //DEBUG
/*     console.log("lexDuedate: Date: "+ date);
    console.log("lexDuedate: status: "+ status);
    console.log("lexDuedate: assingedTo: "+ assingedTo);
    console.log("lexDuedate: NOWUser: "+ NOWUser);
    console.log("lexDuedate: now: "+ now); */


    if ((assingedTo != NOWUser && assingedTo != "") || status == 6 || status ==7 ){
        console.log("lexDuedate: return");
        return;
    }

    if (date.value != "") {
        // dueDate is set
        console.log("lexDuedate: dueDate is set");
        var dateValue = lexDuedateparseDate(date.value);
        // check if date + 24 > now && status == resolved
        if ( dateValue < now && status != 6 ) {
            // SET dueDat
            console.log("lexDuedate: dueDate NOT ok");
            document.getElementById("sc_req_item.due_date.ui_policy_sensitive").click();
        } else {
            // dueDate ok
            console.log("lexDuedate: dueDate ok");
        }
    } else {
        // NO dueDate set
        console.log("lexDuedate: NO dueDate set");
        document.getElementById("sc_req_item.due_date.ui_policy_sensitive").click();
        // NEW REquest Item
        //var nextDue = new Date();
        // now + 48h
        // nextDue.setTime( lexDuedategetNextWorkdays() );
        // set Duedate sc_req_item.due_date
        // eg 2022-04-22 11:51:20
      //  document.getElementById("sys_original.sc_req_item.due_date").value = (nextDue.getFullYear()+"-"+("0"+(nextDue.getMonth() + 1)).slice(-2)+ "-" + ("0" + nextDue.getDate()).slice(-2)+
      //                                                           " "+ ("0" + nextDue.getHours()).slice(-2) +":"+ ("0"+nextDue.getMinutes()).slice(-2) + ":" + ("0"+nextDue.getSeconds()).slice(-2));
    }
}


lexDuedate();
