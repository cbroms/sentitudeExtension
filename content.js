/*
    Content script for nlp extention
    
    loads each page's contents into an array and sends 
    to background script
    */

// if a paragraph contains these words, ignore them (probably left over from an adblocker)
var bannedWords = ["Advertisement", "ADVERTISEMENT", "AD", "ad", "ADVERTISING", "Advertising", "Advert", "ADVERT"];
// get the page's text content
var res = getPageContents();
// send text content to background script
chrome.runtime.sendMessage({pageContents: res, type: "pageScan", pageName: document.title}, null);

function getPageContents() {
    let elementsContent = [], words = [];
    // loop through elements and separate string content from DOM object
    Array.from(document.getElementsByTagName("p")).forEach((element) => {
        let content = String(element.innerText)
        let style = window.getComputedStyle(element);
        // ensure the element is visible and not an advertisement
        if (!bannedWords.includes(content) && style.display !== 'none' && element.offsetHeight > 0) elementsContent.push(content);
    });
    // loop through string content and separate into individual words 
    elementsContent.forEach((element) => {
        // clean the text of specials, convert to lower, and split into words 
        words = words.concat(element.toLowerCase().replace(/\n/g, ' ').replace(/[^\w\s]/g, '').split(' '));
    });
    return words;
}

// commands from the background script
chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {
    
    if (msg.type == "SELECT-PH") {
        // function to make a page's paragraphs clickable to scan for sentiment
        let loadParagraphs = () => {
            // get paragraph elements 
            Array.from(document.getElementsByTagName("p")).forEach((element) => {
                // if element has already been selected and scanned
                if (element.classList.contains("sentitude-scanned")) {
                    // clone the element to get rid of the event listener
                    let newElement = element.cloneNode(true);
                    newElement.style.cursor = "default";
                    newElement.title = "";
                    element.parentNode.replaceChild(newElement, element);
                } else {
                    // otherwise, make the paragraph look clickable 
                    element.style.cursor = "pointer";
                    element.title = "Click to analyze sentiment";
                    // when the paragraph is clicked,
                    element.addEventListener('click', () => {
                        element.classList.add("sentitude-scanned");
                        // get clicked element's content and clean
                        let res = element.innerText.toLowerCase().replace(/\n/g, ' ').replace(/[^\w\s-]/g, '').split(' ');
                        // send contents to background script
                        chrome.runtime.sendMessage({clickContents: res, type: "selectionClick", title: element.innerHTML}, null);
                        // get rid of event listener in same manner as above 
                        let newElement = element.cloneNode(true);
                        newElement.style.cursor = "default";
                        newElement.title = "";
                        element.parentNode.replaceChild(newElement, element);
                    });
                }
            });
        }
        loadParagraphs();
        // infinitely reload the paragraphs to accomodate for dynamically-loaded content
        setInterval(() => {loadParagraphs()}, 5000);
    } 
    else if (msg.type == "COLOR-PH") {
        // style parent paragraph with border and background color according
        // to sentiment value
        let elt = window.getSelection().anchorNode.parentElement;
        // add class to signify text has been scanned
        elt.classList.add("sentitude-scanned");
        // style with color 
        elt.style.border = "1px solid " + "hsl(" + msg.data.sentimentColor + ", 100%, 50%)";
        elt.style.borderRadius = "4px";
        elt.style.backgroundColor = "hsla(" + msg.data.sentimentColor + ", 100%, 50%, 0.3)";
        // add tooltip with sentiment values 
        elt.classList.add("sentitude-tooltip");
        let spanWithResults = document.createElement("DIV");
        spanWithResults.classList.add("sentitude-tooltiptext");
        spanWithResults.innerHTML = "Sentiment: " + msg.data.descriptorSentiment + "</br>" +
        "Pleasantness: " + msg.data.descriptorPleasantness + "</br>" +
        "Attention Value: " + msg.data.descriptorAttention;
        // add tooltip to selected paragraph
        elt.appendChild(spanWithResults);
        // clear the selection
        if (window.getSelection) window.getSelection().removeAllRanges();
        else if (document.selection) document.selection.empty();
    }
    else if (msg.type == "COLOR-WD") {
        // color individual recognized words based off their polarity values 
        let position = 0;
        // get paragraph elements 
        Array.from(document.getElementsByTagName("p")).forEach((element) => {
            // get content of paragraph
            let content = String(element.innerText);
            let contentSplit = [], wordsInCombination = 0;
            // style of element 
            let style = window.getComputedStyle(element);

            // ensure the element is visible and not and advertisement 
            if (!bannedWords.includes(content) && style.display !== 'none' && element.offsetHeight > 0) {
                // split into individual words
                contentSplit = contentSplit.concat(content.replace(/\n/g, ' ').split(' '));

                // loop through split words 
                contentSplit.forEach((word, i) => {
                    // if we don't need to skip a word 
                    if (wordsInCombination <= 0){
                        // if the word was matched in the scanned data 
                        if (msg.data.wordsOrdered[position] !== null) {
                            // get number of words in combination- words have been joined with '_'
                            wordsInCombination = (msg.data.wordsOrdered[position].word.match(/_/g)||[]).length;
                            // if there are more than one words matched in a combination,
                            // don't do anything on the next few loops; decrement below
                            // otherwise, continue looping 
                            let fullString = word;
                            // join the next matched words together 
                            for (let j = i + 1; j <= i + wordsInCombination; j++) {
                                fullString += (" " + contentSplit[j]);
                                contentSplit[j] = "";
                            }
                            // add a span element with style and title 
                            contentSplit[i] = "<span style=\"background-color: " + 
                                                "hsla(" + msg.data.wordsOrdered[position].color + 
                                                ", 100%, 50%, 0.3); border-radius: 5px;\" title=\"Matched: \'" + 
                                                msg.data.wordsOrdered[position].word + 
                                                "\'&#13;Sentiment: " + Math.round(msg.data.wordsOrdered[position].val[2] * 100) + 
                                                "\">" + fullString + "</span>";
                        } 
                        // if the word wasn't matched, leave it alone
                    } else {
                        // we needed to skip a word, decrement
                        wordsInCombination--;
                    }
                    // move to next scanned word
                    position++;
                });
                contentSplit = contentSplit.join(' ');
                element.innerHTML = contentSplit;
            }
        });
    }
});