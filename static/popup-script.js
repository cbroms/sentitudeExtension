/*
    Popup script for nlp extention
    
    gets JSON objects from background and prints to
    popup html document 

    */

// create a port to connect background and popup scripts 
var port = chrome.extension.connect({
      name: "background script <-> popup script"
 });

// listen for messages from the background script 
 port.onMessage.addListener((msg) => {
    if (msg.scanType === "pageScan") {
        // scan type was a page scan 
        document.getElementById("sentiment-text").innerHTML = "Page Sentiment: " + String(Math.round(msg.sentimentMapped));  
        document.getElementById("sentiment-text").style.color = "hsl(" + msg.color + ",100%,50%)";
        document.getElementById("page-range").value = msg.sentimentMapped;
        document.getElementById("matched-words-scanned-good").innerHTML = msg.positiveWords;
        document.getElementById("matched-words-scanned-bad").innerHTML = msg.negativeWords;
    } 
    else if (msg.scanType === "rightClick") {
        // scan type was a user selection
        document.getElementById("sentiment-selected-text").innerHTML = "Selection Sentiment: " + String(Math.round(msg.sentimentMapped));
        document.getElementById("sentiment-selected-text").style.color = "hsl(" + msg.color + ",100%,50%)";
        document.getElementById("selection-range").value = msg.sentimentMapped;
        document.getElementById("matched-words-selected-good").innerHTML = msg.positiveWords;
        document.getElementById("matched-words-selected-bad").innerHTML = msg.negativeWords;
        document.getElementById("selected-text").innerHTML = chrome.extension.getBackgroundPage().selection;
    }
 });

/*
var output = document.getElementById("demo");
output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
    output.innerHTML = this.value;
}
*/