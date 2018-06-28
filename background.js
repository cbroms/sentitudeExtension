/**
*    Background script for nlp extention
*    
*    gets the text strings from page or selection and analyzes 
*    the sentiment of the words. 
*
*    NOTE: jsdoc tags aren't used exactly as they should be in 
*    this code. 
*
*/


// the page's overall sentiment 
let resOverall; 
// a user's selection sentiment
let resSelection;
// a user's selected text 
let selection;

// save default values to storage on first time setup
chrome.runtime.onInstalled.addListener((details) => {
    chrome.storage.sync.set({DEFAULT_AFINN_WEIGHT: 0.4}); 
    chrome.storage.sync.set({DEFAULT_SENTIC_WEIGHT: 0.6}); 
    chrome.storage.sync.set({AFINN_WEIGHT: 0.4}); 
    chrome.storage.sync.set({SENTIC_WEIGHT: 0.6});
    chrome.storage.sync.set({SHOW_SENTIMENT_FOR_PAGES: false});
    chrome.storage.sync.set({SHOW_SENTIMENT_FOR_SELECTION: true});
    chrome.storage.sync.set({COLOR_PAGES: false});
    chrome.storage.sync.set({COLOR_SELECTION: true}); 
});


// get user's saved options ?
/*
chrome.storage.sync.get(['AFINN_WEIGHT'], (result) => { usr_AFINN_WEIGHT = result.AFINN_WEIGHT; }); 
chrome.storage.sync.get(['SENTIC_WEIGHT'], (result) => { usr_SENTIC_WEIGHT = result.SENTIC_WEIGHT; }); 
chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_PAGES'], (result) => { usr_SHOW_SENTIMENT_FOR_PAGES = result.SHOW_SENTIMENT_FOR_PAGES; }); 
chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_SELECTION'], (result) => { usr_SHOW_SENTIMENT_FOR_SELECTION = result.SHOW_SENTIMENT_FOR_SELECTION; }); 
chrome.storage.sync.get(['COLOR_PAGES'], (result) => { usr_COLOR_PAGES = result.COLOR_PAGES;}); 
chrome.storage.sync.get(['COLOR_SELECTION'], (result) => { usr_COLOR_SELECTION = result.COLOR_SELECTION;}); 
*/
// Set up context menu (right click to run on highlighted text)
chrome.runtime.onInstalled.addListener(() => {
  let id = chrome.contextMenus.create({
    "title": "Get sentiment of selection", 
    "contexts": ["selection"],
    "id": "context" + "selection"
    });  
});

/**
*   get the average of AFINN and SenticNet computed sentiments 
*/
let getSentimentAverage = (data, type) => {
    let afinnData = analyzeTextSentimentAFINN111(data, type);
    let senticData = analyzeTextSentimentSenticNet5(data, type);
    let res = senticData;
    // map the afinn data to a new range
    afinnData.sentiment = mapValueToRange(afinnData.sentiment, -0.7, 0.7, -100, 100);
    
    let afinnWt, senticWt;
    // get weights from storage 
    chrome.storage.sync.get(['AFINN_WEIGHT'], (result) => { 
        afinnWt = result.AFINN_WEIGHT; 
        chrome.storage.sync.get(['SENTIC_WEIGHT'], (result) => { 
            senticWt = result.SENTIC_WEIGHT; 
            // calculate a weighted mean of the data from AFINN-111 and SenticNet 5
            let weightedMean = (afinnData.sentiment * afinnWt + senticData.sentimentMapped * senticWt) / (1);
            res.sentimentMapped = Math.round(weightedMean);
            // replace the old descriptor
            res.descriptorSentiment = getValueDescriptor(weightedMean, "sentiment"),
            // combine word lists from AFINN and SenticNet
            res.wordsPositive = res.wordsPositive.concat(afinnData.wordsPositive);
            res.wordsNegative = res.wordsNegative.concat(afinnData.wordsNegative);
            res.wordsMostPositive = res.wordsMostPositive.concat(afinnData.wordsMostPositive);
            res.wordsMostNegative = res.wordsMostNegative.concat(afinnData.wordsMostNegative);
            res.OGafinn = afinnData.sentiment;
            res.OGsentic = senticData.sentimentMapped;
        }); 
    }); 
    return res;
};

/** 
*    add click event to get selected text, clean it, analyze, 
*    and send JSON object result to popup menu, and to content script
*    to display on the page
*/
chrome.contextMenus.onClicked.addListener((info, tab) => {
    // set get selection text for use by popup
    selection = info.selectionText;
    // clean the text of specials, convert to lower, and split into words
    let cleaned = info.selectionText.toLowerCase().replace(/\n/g, ' ').replace(/[^\w\s-]/g, '').split(' ');
    // analyze 
    resSelection = getSentimentAverage(cleaned, "rightClick");
    // send result to popup 
    chrome.extension.onConnect.addListener((port) => {
        port.postMessage({data: resSelection, title: selection});
    })

    // check if the user wants the selection's individual sentiments 
    chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_SELECTION'], (result) => { 
        if (result.SHOW_SENTIMENT_FOR_SELECTION) {
            // send result to content script 
            chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {type: "COLOR-WD-PH", data: resSelection, content: selection}, null);  
            });
        }
    });
    // check if the user wants to color the selection 
    chrome.storage.sync.get(['COLOR_SELECTION'], (result) => { 
        if (result.COLOR_SELECTION) {
            // send result to content script 
            chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {type: "COLOR-PH", data: resSelection, content: selection}, null);  
            });
        }
    });
});

/**
*    get page text from content script (pre-cleaned), analyze, 
*    and send JSON object to popup menu
*/
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.type == "pageScan") {
        // message contains a page scan 
        resOverall = getSentimentAverage(request.pageContents, "pageScan");
        // send result to popup
        chrome.extension.onConnect.addListener((port) => {
            port.postMessage({data: resOverall, title: request.pageName});
        })
        // check if the user wants to color the page's individual sentiments 
        chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_PAGES'], (result) => { 
            if (result.SHOW_SENTIMENT_FOR_PAGES) {
                // send result to content script 
                chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "COLOR-WD-PG", data: resOverall}, null);  
                });
            }
        });
    }
    else if (request.type == "selectionClick") {
        // message contains a paragraph click
        resSelection = getSentimentAverage(request.clickContents, "rightClick");
        // send result to popup as a rightClick style object
        chrome.extension.onConnect.addListener((port) => {
            port.postMessage({data: resSelection, title: request.title});
        });
        // check if the user wants to color the selection 
        chrome.storage.sync.get(['COLOR_SELECTION'], (result) => { 
            if (result.COLOR_SELECTION) {
                // send result to content script 
                chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "COLOR-PH", data: resSelection, content: request.title}, null);  
                });
            }
        });
        // check if the user wants the selection's individual sentiments 
        chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_SELECTION'], (result) => { 
            if (result.SHOW_SENTIMENT_FOR_SELECTION) {
                // send result to content script 
                chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {type: "COLOR-WD-PH", data: resSelection, content: request.title}, null);  
                });
            }
        });
    } 
});

/**
*   listen for messages from popup from button presses
*/
chrome.extension.onConnect.addListener((port) => {
      port.onMessage.addListener((msg) => {
           if (msg == "SELECT-PH") {
            // send message to content script to make all paragraphs clickable
            chrome.tabs.query({active: true, currentWindow: true},(tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {type: "SELECT-PH"}, null);  
            });
            // force the popup window to close
            port.postMessage("CLOSE_POPUP");
           }
           else if (msg == "ANALYZE-PG") {
                // reload the current page to tigger sentiment analysis
                chrome.tabs.getSelected(null, (tab) => {
                    let code = 'window.location.reload();';
                    chrome.tabs.executeScript(tab.id, {code: code});
                });
                // force the popup window to close
                port.postMessage("CLOSE_POPUP");
           }
      });
 })

/** 
*    analyze an array of words and return a JSON object with data
*    dictionary of words and their sentiment values where -5 <= value <= 5, sourced from  
*    AFINN-111 (http://www2.imm.dtu.dk/pubdb/views/publication_details.php?id=6010)
*    and Sentiment of Emojis (http://journals.plos.org/plosone/article?id=10.1371/journal.pone.0144296)
*/
function analyzeTextSentimentAFINN111(text, type) {
    // variables for processing text
    let index = text.length,
    score = 0, positive = [], negative = [],
    mostPos = [], mostNeg = [];
    // loop through words in the text
    while (index--) {
        // get word and its sentiment value from the dictionary 
        let obj = text[index], objSentimentVal = afinnData[obj];
        // if there is a dictionary value, 
        // @TODO: if a word is not in the dictionary, assign it a value based
        // off of the context in which it is used. For example, "apple" would
        // get +1 if it is used like "good apple" and -1 if used like "bad apple" 
        if (objSentimentVal != null) {
            if (index > 0) {
                // need to negate?
                if (negs[text[index - 1]]) objSentimentVal = -objSentimentVal;
            }
            // add the word to either positive or negative array
            if (objSentimentVal > 0) positive.push(obj);
            else if (objSentimentVal < 0) negative.push(obj);
            // if word is extreme, add it to mostPos or mostNeg array
            if (objSentimentVal <= -4 ) mostNeg.push(obj);
            else if (objSentimentVal >= 4) mostPos.push(obj);
            // add the sentiment to the overall score
            score += objSentimentVal;
        }
    }
    // return JSON object with data 
    return {
        scanType: type,
        sentiment: text.length > 0 ? score / text.length : 0,
        wordsPositive: positive,
        wordsNegative: negative,
        wordsMostPostitive: mostPos,
        wordsMostNegative: mostNeg,
        words: text
    };
}

/** 
*    analyze an array of words and return a JSON object with data
*    dictionary of words and their sentiment values where -1 <= value <= 1, sourced from  
*    SenticNet5 (http://sentic.net/downloads/) SenticNet5 Compiled to JSON with script 
*    available here: (https://github.com/CBR0MS/senticnet-JSON)
*    @param {Array} text - an array of cleaned lowercase words
*    @param {string} type - scan type 
*    @return {Object} - object with sentiment data and organized arrays
*    @requires type == "rightClick" or "pageScan"
*    @requires sentic5Data from background-load-objects.js
*    @requires negs from background-load-objects.js
*/
 function analyzeTextSentimentSenticNet5(text, type) {
    // variables for processing text
    let polarityScore = 0, attentionScore = 0, pleasantnessScore = 0,
    positive = [''], negative = [''], mostPos = [''], mostNeg = [''],
    exciting = [], dry = [], pleasant = [], unpleasant = [],
    unknown = [], ordered = [];

    // loop through words in the text
    for (let index = 0; index < text.length; index++) {
        // get word and its sentiment value from the dictionary 
        let obj = text[index], objSentimentVal = null;

        // make all possible word combinations and look up in senticnet5 dictionary
        // if no combinations possible, singularize the word and try again
        (function () { 
            // make word combinations depending on current index (so we don't
            // have an out of bounds exception on the last indices)
            let chooseCombination = () => {
                if (index <= text.length - 4) objSentimentVal = makeWordCombinations(4, index, text);
                else if (index <= text.length - 3) objSentimentVal = makeWordCombinations(3, index, text);
                else if (index <= text.length - 2) objSentimentVal = makeWordCombinations(2, index, text);
                else objSentimentVal = makeWordCombinations(1, index, text);
            }
            chooseCombination();
           
            // if we have nothing, 
            if (objSentimentVal == undefined || objSentimentVal == null) {
                // try singlularizing the word 
                text[index] = singularize(obj);
                // retry making word combinations 
                chooseCombination();
                
                if (objSentimentVal != null && objSentimentVal != undefined) {
                    // we have a match with a singular version of the word!
                   // console.log("matched: " + text[index]);
                }
                else {
                    // if there are still no matches, then the word is either 
                    // not in the dict, or we need to change up the grammar 
                    // using Porter-Stemmer alg to lemmatize 
                    // (https://tartarus.org/martin/PorterStemmer/)
                    // (https://tartarus.org/martin/PorterStemmer/js.txt)
                    // this is much stricter than the singularize function, so we want
                    // to do it second
                    text[index] = stemmer(obj);
                    // retry making word combinations
                    chooseCombination();

                    if (objSentimentVal != null && objSentimentVal != undefined) {
                        // we have a match with a lemmatized version of the word
                       // console.log("lemmatized: " + text[index]);
                    }
                }
                // return the word to its previous state so we don't 
                // have to reparse the page
                text[index] = obj;
            }
        }());
        // now, if there is a dictionary value, we have it 
        //if (objSentimentVal !== null) console.log(objSentimentVal.word);
        // push the found word or combination to the ordered list (can be null too)
        ordered.push(objSentimentVal);
    
        // if there is a dictionary value, 
        if (objSentimentVal !== null && objSentimentVal !== undefined) {
            // senticNet5 array organized with [0: pleasantness_value, 1: attention_value, 2: polarity_value] 
            // get the sentiment values from the SenticNet array 
            let polarity_value = parseFloat(objSentimentVal.val[2]),
                attention_value = parseFloat(objSentimentVal.val[1]),
                pleasantness_value = parseFloat(objSentimentVal.val[0]);
            if (index > 0) {
                // if the previous word is in the list of negators, negate the current word
                if (negs[text[index - 1]]) {
                    polarity_value = -polarity_value;
                    attention_value = -attention_value;
                    pleasantness_value = -pleasantness_value;
                } 
            }
            // add the word to either positive or negative array
            if (polarity_value > 0) positive.push(obj);
            else if (polarity_value < 0) negative.push(obj);
            // if word is extreme, add it to mostPos or mostNeg array
            if (polarity_value <= -0.8 ) mostNeg.push(obj);
            else if (polarity_value >= 0.8) mostPos.push(obj);
            // add the word to either exciting or dry array
            if (attention_value > 0) exciting.push(obj);
            else if (attention_value < 0) dry.push(obj);
            // add the word to either pleasant or unpleasant array
            if (pleasantness_value > 0) pleasant.push(obj);
            else if (pleasantness_value < 0) unpleasant.push(obj);
            // add the sentiment to the overall score
            polarityScore += polarity_value;
            attentionScore += attention_value;
            pleasantnessScore += pleasantness_value;
        }
        else {
            // don't know the word
            unknown.push(obj);
        }
    }
    // calculate the sentiment values from the scores, scale them, and round to nearest integer
    let sentimentRes = Math.round(mapValueToRange(text.length > 0 ? polarityScore / text.length : 0, -0.65, 0.75, -100, 100));
    let attentionRes = Math.round(mapValueToRange(text.length > 0 ? attentionScore / text.length : 0, -0.65, 0.75, -100, 100));
    let pleasantnessRes = Math.round(mapValueToRange(text.length > 0 ? pleasantnessScore / text.length : 0, -0.65, 0.75, -100, 100));
    // return JSON object with data 
    return {
        scanType: type,
        sentiment: sentimentRes,
        sentimentMapped: sentimentRes,
        attentionMapped: attentionRes,
        pleasantnessMapped: pleasantnessRes,
        descriptorSentiment: getValueDescriptor(sentimentRes, "sentiment"),
        descriptorAttention: getValueDescriptor(attentionRes, "attention"),
        descriptorPleasantness: getValueDescriptor(pleasantnessRes, "pleasantness"),
        sentimentColor: mapValueToColor(text.length > 0 ? polarityScore / text.length : 0, -0.65, 0.75),
        attentionColor: mapValueToColor(text.length > 0 ? attentionScore / text.length : 0, -0.65, 0.75),
        pleasantnessColor: mapValueToColor(text.length > 0 ? pleasantnessScore / text.length : 0, -0.65, 0.75),
        wordsPositive: positive,
        wordsNegative: negative,
        wordsMostPositive: mostPos,
        wordsMostNegative: mostNeg,
        wordsPleasant: pleasant,
        wordsUnpleasant: unpleasant,
        wordsExciting: exciting,
        wordsDry: dry,
        wordsUnknown: unknown,
        wordsOrdered: ordered,
        words: text
    };
}

/** 
*    given an index, get the next numberOfWords in an array and see if the 
*    combination is in the senticnet dictionary. We need to do this because
*    the senticnet dict has comninations like "a_lot_of", so given "a", we 
*    need to check if the next words are "lot" and "of", for instance. 
*    @param {integer} numberOfWords - the number of words to combine
*    @param {integer} index - the current index in text
*    @param {Array} text - an array of cleaned lowercase words
*    @return {(object | null)} senticNet5 object or null if no such object exists
*    @requires numberOfWords <= 4 && numberOfWords > 0
*    @requires index >= 0 && index < text.length
*    @requires sentic5Data from background-load-objects.js
*/
 function makeWordCombinations(numberOfWords, index, text) {
    // loop through all possible combinations of words 
    for (let i = numberOfWords - 1; i >= 0; i--) {
        // return the largest possible combination of words 
        let res = null;
        let data = null;
        switch(i) {
            case 3:
            res = [text[index], text[index + 1], text[index + 2], text[index + 3]].join("_");
            data = sentic5Data[res];
            if (data != null) return {word: res, val: data, color: mapValueToColor(data[2], -1, 1)}; break;
            case 2:
            res = [text[index], text[index + 1], text[index + 2]].join("_");
            data = sentic5Data[res];
            if (data != null) return {word: res, val: data, color: mapValueToColor(data[2], -1, 1)}; break;
            case 1:
            res = [text[index], text[index + 1]].join("_");
            data = sentic5Data[res];
            if (data != null) return {word: res, val: data, color: mapValueToColor(data[2], -1, 1)}; break;
            case 0:
            res = text[index];
            data = sentic5Data[res];
            if (data != null) return {word: res, val: data, color: mapValueToColor(data[2], -1, 1)}; break;
        }
    }
    return null;
}

/**
*    returns the descriptor for a given value and score type 
*    @param {float} value
*    @param {string} scoreType
*    @return {string} descriptor of value
*    @requires scoreType == "sentiment" or "attention" or "pleasantness"
*    @requires value is scaled on [-100, 100]
*    @requires sentimentDescriptors from background-load-objects.js
*    @requires attentionDescriptors from background-load-objects.js
*    @requires pleasantnessDescriptors from background-load-objects.js
*/
 function getValueDescriptor(value, scoreType) {

    let outcomes = [];
    // select the correct array based off the provided scoreType
    if (scoreType == "sentiment") outcomes = sentimentDescriptors;
    else if (scoreType == "attention") outcomes = attentionDescriptors;
    else if (scoreType == "pleasantness") outcomes = pleasantnessDescriptors;
    else {} // scoreType was not valid
    // return string based on value
    if (value >= 70) return outcomes[6];
    else if (value >= 30) return outcomes[5];
    else if (value >= 10) return outcomes[4];
    else if (value <= -70) return outcomes[0];
    else if (value <= -30) return outcomes[1];
    else if (value <= -10) return outcomes[2];
    else return outcomes[3];
}

/** 
*    map a sentiment value to a specific color (HSL color space)
*    @param {float} value 
*    @param {float} rangeStart, rangeEnd - current range value is in
*    @return {float} - HSL hue value (between 0 and 120)
*    @requires rangeStart <= value <= rangeEnd
*/
 function mapValueToColor(value, rangeStart, rangeEnd) {
    // change value to map between 0 and 1 
    value = mapValueToRange(value, rangeStart, rangeEnd, 0, 1);
    // max red and green saturations from HSV
    let maxRed = 0, maxGreen = 120; 
    // interpolate between red and green with value
    return value * maxGreen + (1 - value) * maxRed; 
}

/** 
*    change the scale of a value based on a new range
*    @param {float} value
*    @param {float} startOld, endOld - current value range
*    @param {float} startNew, endNew - new value range
*    @return {float} - adjusted value to new range
*    @requires startOld <= value <= endOld
*/
 function mapValueToRange(value, startOld, endOld, startNew, endNew) {
    let res = startNew + ((endNew - startNew) / (endOld - startOld)) * (value - startOld);
    if (res > endNew) return endNew;
    else if (res < startNew) return startNew;
    return res;
}

/** 
*    returns a pluralized version of the inputWord
*    Definitely needs more work, there are many more irregulars
*    to be added - see (https://github.com/blakeembrey/pluralize/blob/master/pluralize.js)
*    @param {string} inputWord
*    @return {string} - inputWord pluralized
*    @requires plural from background-load-objects.js 
*    @requires irregular from background-load-objects.js 
*    @requires uncountable from background-load-objects.js 
*/
 function pluralize(inputWord) {
    // if singular and plural are the same, return 
    if (uncountable.indexOf(inputWord.toLowerCase()) >= 0) return inputWord;
    // check if word is irregular, if so, replace with regex and return 
    for (word in irregular){     
        let pattern = new RegExp(word+'$', 'i');
        if (pattern.test(inputWord)) return inputWord.replace(pattern, irregular[word]);
    }
    // check if word is regular, if so, replace with regex and return 
    for(reg in plural){
        var pattern = new RegExp(reg, 'i');
        if (pattern.test(inputWord)) return inputWord.replace(pattern, plural[reg]);
    }
    return inputWord;
}

/**
*    returns a singularized version of the inputWord
*    @param {string} inputWord
*    @return {string} - inputWord singularized
*    @requires singluar from background-load-objects.js 
*    @requires irregular from background-load-objects.js 
*    @requires uncountable from background-load-objects.js 
*/
 function singularize(inputWord) {
    // if singular and plural are the same, return 
    if (uncountable.indexOf(inputWord.toLowerCase()) >= 0)
      return inputWord;
    // check if word is irregular, if so, replace with regex and return 
    for (word in irregular) {  
        let pattern = new RegExp(irregular[word] + '$', 'i');
        if (pattern.test(inputWord)) return inputWord.replace(pattern, word);
    }
    // check if word is regular, if so, replace with regex and return 
    for(reg in singular){
        let pattern = new RegExp(reg, 'i');
        if (pattern.test(inputWord)) return inputWord.replace(pattern, singular[reg]);
    }
    return inputWord;
}

function isSingluar(inputWord) {
    if (singularize(inputWord) == inputWord) return true;
    else return false;
}

function isPlural(inputWord) {
    if (pluralize(inputWord) == inputWord) return true;
    else return false;
}
