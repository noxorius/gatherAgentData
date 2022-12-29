// ==UserScript==
// @name         Refresh update
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://rbit.service-now.com/now/sow/home
// @icon         https://www.google.com/s2/favicons?sz=64&domain=service-now.com
// @grant        none
// ==/UserScript==


// find elemets in shadow-root
function querySelectorAllShadows(selector, el = document.body) {
  // recurse on childShadows
  const childShadows = Array.from(el.querySelectorAll('*')).
    map(el => el.shadowRoot).filter(Boolean);

 //console.log('[querySelectorAllShadows]', selector, el, `(${childShadows.length} shadowRoots)`);

  const childResults = childShadows.map(child => querySelectorAllShadows(selector, child));

  // fuse all results into singular, flat array
  const result = Array.from(el.querySelectorAll(selector));
  return result.concat(childResults).flat();
}


// async refresh
async function refreshTicketCount(element, refeshtimer){
    setInterval(function () {
        element.click();
    }, refeshtimer);
}


(function() {
    'use strict';
    // just wait 5 sec after load hoping the shadow root in loading in

    setTimeout(function() {

        let refeshtimer = 120000; //millisecunde

        // Search all buttons
        let elements = querySelectorAllShadows("button[aria-label=\"Refresh data\"]");
        //let elements = querySelectorAllShadows("button.now-button-iconic");
        // found elements
        // console.log("NEC: "+ elements.length);
        for (const element of elements) {
            refreshTicketCount(element, refeshtimer);
        }
    }, 10000);

})();