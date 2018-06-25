/*
    Popup script for nlp extention
    
    gets JSON objects from background and prints to
    popup html document 

    */

// initial set up of page- hide dropdowns and color fields and text, show prompts
Array.from(document.getElementsByClassName("head-colored")).forEach((element) => element.classList.toggle("hidden"));
Array.from(document.getElementsByClassName("head-title")).forEach((element) => element.classList.toggle("hidden"));
Array.from(document.getElementsByClassName("top-text")).forEach((element) => element.classList.toggle("hidden"));
Array.from(document.getElementsByClassName("triangle")).forEach((element) => element.classList.toggle("hidden"));
Array.from(document.getElementsByClassName("head-inner")).forEach((element) => element.classList.toggle("hidden"));
document.getElementById("scanned-prompt").classList.toggle("hidden");
document.getElementById("selected-prompt").classList.toggle("hidden");

// create a port to connect background and popup scripts 
var port = chrome.extension.connect({
  name: "background script <-> popup script"
});

// on button press, post message to background
document.getElementById("select-ph").addEventListener('click', (event) => {
    port.postMessage("SELECT-PH");
});

document.getElementById("analyze-pg").addEventListener('click', (event) => {
    port.postMessage("ANALYZE-PG");
});

document.getElementById("help").addEventListener('click', (event) => {
    chrome.runtime.openOptionsPage();
    //window.open(chrome.runtime.getURL('data.html'));
});

// listen for messages from the background script 
port.onMessage.addListener((msg) => {
    console.log(msg);

    if (msg == "CLOSE_POPUP") {
        // command to close
        window.close();
    }
    else {
        // scan object recieved 
    

    let ogTitle = msg.title, title = msg.title;
    msg = msg.data;
    // if the title is too long, shorten it and add ellipsis
    if (title.length > 38) {
        title = title.substr(0, 32);
        title = title + " . . .";
    }

    if (msg.scanType === "pageScan") {
        // scan type was a page scan 
        // if the panel is closed, open it
        if (!document.getElementById("scanned-prompt").classList.contains("hidden")){
            document.getElementById("scanned-prompt").classList.toggle("hidden");
            document.getElementById("scanned-colored-sentiment").classList.toggle("hidden");
            document.getElementById("scanned-head-stripe").classList.toggle("hidden");
            document.getElementById("scanned-title").classList.toggle("hidden");
            document.getElementById("scanned-triangle").classList.toggle("hidden");
        }
        // auto open the scanned panel  
        document.getElementById("scanned-triangle").click();
        // add sentiment data and style with appropriate color 
        document.getElementById("scanned-sentiment").innerHTML =  (msg.sentimentMapped > 0 ? "+" : "") + String(msg.sentimentMapped);
        document.getElementById("scanned-sentiment").style.color = "hsl(" + msg.sentimentColor + ", 80%, 50%)";
        document.getElementById("scanned-colored-sentiment").style.background =  "linear-gradient(to right, " + "hsl(" + msg.sentimentColor + ", 100%, 90%)" + ", rgba(0, 0, 0, 0))";
        document.getElementById("scanned-sentiment-desc").innerHTML = msg.descriptorSentiment;
        // add pleasantness data and style with appropriate color 
        document.getElementById("scanned-pleasantness").innerHTML =  (msg.pleasantnessMapped > 0 ? "+" : "") + String(msg.pleasantnessMapped);
        document.getElementById("scanned-pleasantness").style.color = "hsl(" + msg.pleasantnessColor + ", 80%, 50%)";
        document.getElementById("scanned-colored-pleasantness").style.background =  "linear-gradient(to right, " + "hsl(" + msg.pleasantnessColor + ", 100%, 90%)" + ", rgba(0, 0, 0, 0))";
        document.getElementById("scanned-pleasantness-desc").innerHTML = msg.descriptorPleasantness;
        // add attention data and style with appropriate color 
        document.getElementById("scanned-attention").innerHTML =  (msg.attentionMapped > 0 ? "+" : "") + String(msg.attentionMapped);
        document.getElementById("scanned-attention").style.color = "hsl(" + msg.attentionColor + ", 80%, 50%)";
        document.getElementById("scanned-colored-attention").style.background =  "linear-gradient(to right, " + "hsl(" + msg.attentionColor + ", 100%, 90%)" + ", rgba(0, 0, 0, 0))";
        document.getElementById("scanned-attention-desc").innerHTML = msg.descriptorAttention;
        // add the title 
        document.getElementById("scanned-source").innerHTML = title;
        document.getElementById("scanned-source").title = ogTitle;
        
        /*
        document.getElementById("page-range").value = msg.sentimentMapped;
        document.getElementById("matched-words-scanned-good").innerHTML = msg.positiveWords;
        document.getElementById("matched-words-scanned-bad").innerHTML = msg.negativeWords;
        */
    } 
    else if (msg.scanType === "rightClick") {
        // scan type was a user selection
        // add quotes to title to make it more like selected text
        title = "\"" + title + "\"";
        // if the panel is closed, open it
        if (!document.getElementById("selected-prompt").classList.contains("hidden")){
            document.getElementById("selected-prompt").classList.toggle("hidden");
            document.getElementById("selected-colored-sentiment").classList.toggle("hidden");
            document.getElementById("selected-head-stripe").classList.toggle("hidden");
            document.getElementById("selected-title").classList.toggle("hidden");
            document.getElementById("selected-triangle").classList.toggle("hidden");
        }
        // auto open the selection panel  
        document.getElementById("selected-triangle").click();

        // add sentiment data and style with appropriate color 
        document.getElementById("selected-sentiment").innerHTML =  (msg.sentimentMapped > 0 ? "+" : "") + String(msg.sentimentMapped);
        document.getElementById("selected-sentiment").style.color = "hsl(" + msg.sentimentColor + ", 80%, 50%)";
        document.getElementById("selected-colored-sentiment").style.background =  "linear-gradient(to right, " + "hsl(" + msg.sentimentColor + ", 100%, 90%)" + ", rgba(0, 0, 0, 0))";
        document.getElementById("selected-sentiment-desc").innerHTML = msg.descriptorSentiment;
        // add pleasantness data and style with appropriate color 
        document.getElementById("selected-pleasantness").innerHTML =  (msg.pleasantnessMapped > 0 ? "+" : "") + String(msg.pleasantnessMapped);
        document.getElementById("selected-pleasantness").style.color = "hsl(" + msg.pleasantnessColor + ", 80%, 50%)";
        document.getElementById("selected-colored-pleasantness").style.background =  "linear-gradient(to right, " + "hsl(" + msg.pleasantnessColor + ", 100%, 90%)" + ", rgba(0, 0, 0, 0))";
        document.getElementById("selected-pleasantness-desc").innerHTML = msg.descriptorPleasantness;
        // add attention data and style with appropriate color 
        document.getElementById("selected-attention").innerHTML =  (msg.attentionMapped > 0 ? "+" : "") + String(msg.attentionMapped);
        document.getElementById("selected-attention").style.color = "hsl(" + msg.attentionColor + ", 80%, 50%)";
        document.getElementById("selected-colored-attention").style.background =  "linear-gradient(to right, " + "hsl(" + msg.attentionColor + ", 100%, 90%)" + ", rgba(0, 0, 0, 0))";
        document.getElementById("selected-attention-desc").innerHTML = msg.descriptorAttention;
        // add the title
        document.getElementById("selected-source").innerHTML = title;
        document.getElementById("selected-source").title = ogTitle;
        /*
        document.getElementById("selected-text").innerHTML = chrome.extension.getBackgroundPage().selection;
        */
    }
}
});

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
    if (el1.classList.contains("closed")) {
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