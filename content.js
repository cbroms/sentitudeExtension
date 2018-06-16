/*
    Content script for nlp extention
    
    loads each page's contents into an array and sends 
    to background script
    */

// get the page's text content
var res = getPageContents();
// send text content to background script
chrome.runtime.sendMessage({pageContents: res, type: "pageScan", pageName: document.title}, null);

function getPageContents() {
    let elementsContent = [], words = [];
    // loop through elements and separate string content from DOM object
    Array.from(document.getElementsByTagName("p")).forEach((element) => {
        elementsContent.push(String(element.innerText));
    });
    // loop through string content and separate into individual words 
    elementsContent.forEach((element) => {
        // clean the text of specials, convert to lower, and split into words 
        words = words.concat(element.toLowerCase().replace(/\n/g, ' ').replace(/[^\w\s]/g, '').split(' '));
    });
    return words;
}


chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {
    // command from background script to make paragraphs clickable
    if (msg.type == "SELECT-PH") {
        let loadParagraphs = () => {
            Array.from(document.getElementsByTagName("p")).forEach((element) => {
            // @TODO: add a visual indication that the paragraph is clickable 
            //var new_element = element.cloneNode(true);
            //old_element.parentNode.replaceChild(new_element, element);
            element.style.cursor = "pointer";
            element.title = "Click to analyze sentiment";

            // when the paragraph is clicked,
            element.addEventListener('click', (event) => {
                // get clicked element's content and clean
                let res = element.innerHTML.toLowerCase().replace(/\n/g, ' ').replace(/[^\w\s]/g, '').split(' ');
                // send contents to background script
                chrome.runtime.sendMessage({clickContents: res, type: "selectionClick", title: element.innerHTML}, null);
            });
        });
        }
        loadParagraphs();

        // infinitely reload the paragraphs to accomodate for dynamically-loaded content
        setInterval(() => {loadParagraphs()}, 2500);
        
    } 
    else if (msg.type == "COLOR-PH") {
    // style parent paragraph with border and background color according
    // to sentiment value
    let elt = window.getSelection().anchorNode.parentElement;
    elt.style.border = "1px solid " + "hsl(" + msg.data.sentimentColor + ",100%,50%)";
    elt.style.borderRadius = "4px";
    elt.style.backgroundColor = "hsla(" + msg.data.sentimentColor + ",100%,50%, 0.3)";
    elt.classList.add("sentitude-tooltip");
    let spanWithResults = document.createElement("SPAN");
    spanWithResults.classList.add("sentitude-tooltiptext");
    spanWithResults.innerHTML = "Sentiment: " + msg.data.descriptorSentiment + "</br>" +
    "Pleasantness: " + msg.data.descriptorPleasantness + "</br>" +
    "Attention Value: " + msg.data.descriptorAttention;
    elt.appendChild(spanWithResults);
    // clear the selection
    if (window.getSelection) window.getSelection().removeAllRanges();
    else if (document.selection) document.selection.empty();
}
});