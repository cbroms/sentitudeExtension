/*
    Content script for nlp extention
    
    loads each page's contents into an array and sends 
    to background script
    */

// get the page's text content
var res = getPageContents();
// send text content to background script
chrome.runtime.sendMessage({pageContents: res}, null);

function getPageContents() {
    var elementsContent = [], words = [];
    // loop through elements and separate string content from DOM object
    Array.from(document.getElementsByTagName("p")).forEach((element) => {
        elementsContent.push(String(element.innerText));
    });
    // loop through string content and separate into individual words 
    elementsContent.forEach((element) => {
        // clean the text of specials, convert to lower, and split into words 
        words = words.concat(element
            .toLowerCase()
            .replace(/\n/g, ' ')
            .replace(/[.,\/#!$%\^&\*;:{}=_`\"~()]/g, '')
            .split(' '));
    });
    return words;
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
    console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension");
    if (request.greeting == "hello")
        sendResponse({farewell: "goodbye"});
});