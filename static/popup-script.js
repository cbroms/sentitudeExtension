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


if (document.getElementById("scanned-panel").classList.contains("closed")) {
    Array.from(document.getElementsByClassName("head-inner")).forEach((element) => {
        element.classList.toggle("hidden");
    });
}

// add click listener to triangles for opening and closing 
Array.from(document.getElementsByClassName("triangle")).forEach((element) => {
  element.addEventListener('click', (event) => {
        // get the class name for first or second panel
        let className = event.target.classList[2];
       // if the opposite panel is open, close it
       if (className == "scanned" && !document.getElementById("selected-panel").classList.contains("closed")) {
        togglePanel("selected", true, event);
    } else if (className == "selected" && !document.getElementById("scanned-panel").classList.contains("closed")) {
        togglePanel("scanned", true, event);
    }
       // toggle the current panel
       togglePanel(className, false, event);
   });
});

// turn an HTML entity into a sting
function decodeHTMLEntity(entity) {
    return entity.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(dec);
    });
}

// toggle a panel open or closed
function togglePanel(className, auto, event) {
    // get the parent panel 
    let el1 = document.getElementsByClassName(className)[0];
    // change the triangle to go up or down
    if ( el1.classList.contains("closed")) {
        event.target.innerHTML = "";
        event.target.appendChild(document.createTextNode(decodeHTMLEntity("&#9650;")));
    } else {
        event.target.innerHTML = "";
        event.target.appendChild(document.createTextNode(decodeHTMLEntity("&#9660;")));
    }
    if (auto){
        // if we're auto closing, make the triangle go down
        document.getElementsByClassName(className)[1].innerHTML = "";
        document.getElementsByClassName(className)[1].appendChild(document.createTextNode(decodeHTMLEntity("&#9660;")));
    }
       // open or close the parent panel
       el1.classList.toggle("closed");
       // display the panel's children 
       Array.from(el1.getElementsByClassName("head-inner")).forEach((element) => {
        element.classList.toggle("hidden");
    });
}