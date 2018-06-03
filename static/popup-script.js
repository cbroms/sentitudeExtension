/*
    Popup script for nlp extention
    
    gets JSON objects from background and prints to
    popup html document 

    */

// create a port to connect background and popup scripts 
var port = chrome.extension.connect({
      name: "background script <-> popup script"
 });

console.log(data);

// send senticnet dictionary to background
port.postMessage({dict: data});

// listen for messages from the background script 
 port.onMessage.addListener((msg) => {
    if (msg.scanType === "pageScan") {
        // scan type was a page scan 
        document.getElementById("sentiment-text").innerHTML = "Page Sentiment: " + String(msg.sentiment);  
    } 
    else if (msg.scanType === "rightClick") {
        // scan type was a user selection
        document.getElementById("sentiment-selected-text").innerHTML = "Selection Sentiment: " + String(msg.sentiment);
        document.getElementById("selected-text").innerHTML = chrome.extension.getBackgroundPage().selection;
    }
 });