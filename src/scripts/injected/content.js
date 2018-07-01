/**   
*      _________  ____________________  _____  ____
*     / __/ __/ |/ /_  __/  _/_  __/ / / / _ \/ __/
*     \ \/ _//    / / / _/ /  / / / /_/ / // / _/  
*   /___/___/_/|_/ /_/ /___/ /_/  \____/____/___/  
*                                               
*
*   @file content.js - content script injected onto all pages
*   @author Christian Broms 
*   @license MIT license 
*   
*   Possible commands from the background script:
*   "SELECT-PH" - make all paragraphs clickable and scan for sentiment on click
*   "COLOR-PH" - style a selection or paragraph with a color based on sentiment value 
*   "COLOR-PG" - style each paragraph with color 
*   "COLOR-WD-PG" - style individual words on a page based off their polarity values
*   "COLOR-WD-PH" - style individual words in a selection based off their polarity vals 
*   "GET-SELECTION" - get the selected text on the page
*   
*/

// get the paragraph contents from a page
let getPageContents = () => {
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

// if a paragraph contains these words, ignore them (probably left over from an adblocker)
let bannedWords = ["Advertisement", "ADVERTISEMENT", "AD", "ad", "ADVERTISING", "Advertising", "Advert", "ADVERT"];
// get the page's text content
let res = getPageContents();
// send text content to background script
chrome.runtime.sendMessage({pageContents: res, type: "pageScan", pageName: document.title}, null);

let resData = [];
let elements = 0; 
let elementsScanned = 0;

/**
* handle commands from the background script 
*/
chrome.extension.onMessage.addListener((msg, sender, sendResponse) => {

    let elementsContent = [], words = [];
    
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
                        chrome.runtime.sendMessage({clickContents: res, type: "selectionClick", title: element.innerText}, null);
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
        // if the selection was a paragraph click, 
        if (elt.tagName == undefined) {
            // get all the scanned elements 
            Array.from(document.getElementsByClassName("sentitude-scanned")).forEach((element) => {
                // find the scanned element that matches the one we want to color 
                if (element.innerText == msg.content) {
                    elt = element;
                }
            });
        }
        // fix for bug where parentElement isn't the paragraph above
        if (elt.tagName.toLowerCase() != "p") {
            elt = elt.parentElement;
        }
        // add class to signify text has been scanned
        elt.classList.add("sentitude-scanned");
        // style with color 
        elt.style.border = "1px solid " + "hsl(" + msg.data.sentimentColor + ", 100%, 50%)";
        elt.style.borderRadius = "4px";
        elt.style.backgroundColor = "hsla(" + msg.data.sentimentColor + ", 100%, 50%, 0.3)";
        // add tooltip with sentiment values 
        elt.classList.add("sentitude-tooltip");
        let spanWithResults = document.createElement("SPAN");
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
    else if (msg.type == "COLOR-WD-PG") {
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
    else if (msg.type == "COLOR-WD-PH") {
        // color individual recognized words based off their polarity values 
        let element, content, oldContent;

        // selection was a paragraph click 
        if (window.getSelection().anchorNode == null) {
            // get all previously scanned paragraphs 
            Array.from(document.getElementsByClassName("sentitude-tooltiptext")).forEach((elt) => {
                oldContent = elt.innerHTML;
                // get the content of each element (minus its sentiment data)
                let words = elt.parentNode.innerText.replace(elt.innerText, "");
                // if the content matches the sanned data for that paragraph
                if (msg.content == words){
                    // assign the element 
                    element = elt.parentNode;
                    // get content of paragraph
                    content = words;
                } 
            });
        } else {
            // selection was a right click 
            // check if the selection is an entire paragraph, not just a sentence in it 
            Array.from(document.getElementsByTagName("p")).forEach((elt) => {
                // if the selection matches the paragraph, 
                if (window.getSelection() == elt.innerText){
                    element = elt;
                    content = elt.innerText;
                } 
            });
        }
        
        let position = 0;
        // if the selection is a whole paragraph, 
        if (element != null) {
         
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
                // join the words together with spaces 
                contentSplit = contentSplit.join(' ');
                // replace the paragraph with its OG content 
                element.innerHTML = contentSplit;
                let newSpan = document.createElement("SPAN");
                // add the sentiment data back to the paragraph 
                newSpan.innerHTML = oldContent;
                newSpan.classList.add("sentitude-tooltiptext");
                element.appendChild(newSpan);
            }
        }
    }
    else if (msg.type == "COLOR-PG") {
        // color all scanned paragraphs 
        // get all paragraphs 
        Array.from(document.getElementsByTagName("p")).forEach((element) => {
            // get element contents 
            let content = String(element.innerText)
            let style = window.getComputedStyle(element);
            // ensure the element is visible and not an advertisement
            if (!bannedWords.includes(content) && style.display !== 'none' && element.offsetHeight > 0) elementsContent.push(content);
        });
        // send a message to the background script with the number of requests to expect
        chrome.runtime.sendMessage({type: "autoParagraphScanData", requests: elementsContent.length});
        // loop through string content and separate into individual words 
        elementsContent.forEach((elt) => {
            // clean the text of specials, convert to lower, and split into words 
            let words = elt.toLowerCase().replace(/\n/g, ' ').replace(/[^\w\s]/g, '').split(' ');
            // send contents to background script for scan
            chrome.runtime.sendMessage({content: words, type: "autoParagraphScan", title: elt.innerText}, null);
        });
    }

    else if (msg.type == "COLOR-PG-DATA") {
        // we received the resulting data from the background script for scanned paragraphs 
        resData = msg.data;
        let i = 0;
        // loop through the paragraphs 
        Array.from(document.getElementsByTagName("p")).forEach((elt) => {
            // get content of element 
            let content = String(elt.innerText)
            let style = window.getComputedStyle(elt);
            // ensure the element is visible and not an advertisement
            if (!bannedWords.includes(content) && style.display !== 'none' && elt.offsetHeight > 0){
                // add class to signify text has been scanned
                elt.classList.add("sentitude-scanned");
                // style with color 
                elt.style.border = "1px solid " + "hsl(" + resData[i].sentimentColor + ", 100%, 50%)";
                elt.style.borderRadius = "4px";
                elt.style.backgroundColor = "hsla(" + resData[i].sentimentColor + ", 100%, 50%, 0.3)";
                // add tooltip with sentiment values 
                elt.classList.add("sentitude-tooltip");
                let spanWithResults = document.createElement("SPAN");
                spanWithResults.classList.add("sentitude-tooltiptext");
                spanWithResults.innerHTML = "Sentiment: " + resData[i].descriptorSentiment + "</br>" +
                "Pleasantness: " + resData[i].descriptorPleasantness + "</br>" +
                "Attention Value: " + resData[i].descriptorAttention;
                // add tooltip to selected paragraph
                elt.appendChild(spanWithResults);
                // only increment i if the element is valid to keep in sync with scans 
                i++;
            }
        });
    }
    else if (msg.type == "GET-SELECTION") {
        // get the selected text on the page
        sendResponse({selection: window.getSelection().toString()});
    }
});