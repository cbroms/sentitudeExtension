/*
    Content script for nlp extention
    
    loads each page's contents into an array and sends 
    to background script
    */

// get the page's text content
var res = getPageContents();
// send text content to background script
chrome.runtime.sendMessage({pageContents: res, pageName: document.title}, null);

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

// get the sentiment value of a selected piece of text on the page 
// from the background script and style appropriately 
chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {
    // style parent paragraph with border and background color according
    // to sentiment value
    let elt = window.getSelection().anchorNode.parentElement;
    console.log(msg);
    elt.style.border = "1px solid " + "hsl(" + msg.resSelection.sentimentColor + ",100%,50%)";
    elt.style.borderRadius = "4px";
    elt.style.backgroundColor = "hsla(" + msg.resSelection.sentimentColor + ",100%,50%, 0.3)";
    elt.classList.add("sentitude-tooltip");
    let spanWithResults = document.createElement("SPAN");
    spanWithResults.classList.add("sentitude-tooltiptext");
    spanWithResults.innerHTML = "Sentiment: " + msg.resSelection.descriptorSentiment + "</br>" +
                                "Pleasantness: " + msg.resSelection.descriptorPleasantness + "</br>" +
                                "Attention Value: " + msg.resSelection.descriptorAttention;
    elt.appendChild(spanWithResults);
    // clear the selection
    if (window.getSelection) {window.getSelection().removeAllRanges();}
    else if (document.selection) {document.selection.empty();}
});