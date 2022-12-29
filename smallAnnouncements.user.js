// ==UserScript==
// @name         smallAnnouncements
// @namespace    smallAnnouncements
// @version      0.1
// @description  shrink Announcements
// @author       Noxorius
// @updateURL    https://github.com/noxorius/gatherAgentData/raw/master/smallAnnouncements.user.js
// @downloadURL  https://github.com/noxorius/gatherAgentData/raw/master/smallAnnouncements.user.js
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



(function() {
    'use strict';

    // Your code here...
    // <div id="container-clc94qs4100093b71sz4imwvk-body_main" parent-tag="now-uxf-page-simple-container"
    //parent-component-id="clc94qs4100093b71sz4imwvk-body_main"
    // --> style="display: grid; grid-template-columns: 3.5fr 1fr; grid-template-rows: max-content; gap: var(--now-static-space--xl);">
   
    // update style to 5fr 1fr
    setTimeout(function() {
        // Search the main window style
        let elements = querySelectorAllShadows("div[style=\"display: grid; grid-template-columns: 3.5fr 1fr; grid-template-rows: max-content; gap: var(--now-static-space--xl);\"]");
        for (const element of elements) {
            element.style="display: grid; grid-template-columns: 5fr 1fr; grid-template-rows: max-content; gap: var(--now-static-space--xl);"
            console.log("NEC: "+ element);
        }
    }, 5000);

})();
