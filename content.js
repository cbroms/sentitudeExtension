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
    let elementsContent = [], words = [];
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

// get the sentiment value of a selected piece of text on the page 
// from the background script and style appropriately 
chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {

  console.log(msg.sentiment);
  let elt = window.getSelection().anchorNode.parentElement;
  elt.style.border = "1px solid black";
});