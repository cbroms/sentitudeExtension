// update the extension version number
document.getElementById("version").innerHTML = chrome.runtime.getManifest().version;

// set the weights to their stored values
chrome.storage.sync.get(['AFINN_WEIGHT'], (result) => {
    document.getElementById("weight-afinn").value = result.AFINN_WEIGHT;
}); 

chrome.storage.sync.get(['SENTIC_WEIGHT'], (result) => {
    document.getElementById("weight-sentic").value = result.SENTIC_WEIGHT;
}); 

// set checkboxes based off of stored values 
chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_PAGES'], (result) => {
    document.getElementById("sent-all").checked = result.SHOW_SENTIMENT_FOR_PAGES;
}); 

chrome.storage.sync.get(['SHOW_SENTIMENT_FOR_SELECTION'], (result) => {
    document.getElementById("sent-selection").checked = result.SHOW_SENTIMENT_FOR_SELECTION;
}); 

chrome.storage.sync.get(['COLOR_PAGES'], (result) => {
    document.getElementById("color-all").checked = result.COLOR_PAGES;
}); 

chrome.storage.sync.get(['COLOR_SELECTION'], (result) => {
    document.getElementById("color-selection").checked = result.COLOR_SELECTION;
}); 

// change stored values based off of changes to checkboxes 
document.getElementById("sent-all").addEventListener('change', () => {
    if (document.getElementById("sent-all").checked) chrome.storage.sync.set({SHOW_SENTIMENT_FOR_PAGES: true});
    else chrome.storage.sync.set({SHOW_SENTIMENT_FOR_PAGES: false});
});

document.getElementById("sent-selection").addEventListener('change', () => {
    if (document.getElementById("sent-selection").checked) chrome.storage.sync.set({SHOW_SENTIMENT_FOR_SELECTION: true});
    else chrome.storage.sync.set({SHOW_SENTIMENT_FOR_SELECTION: false}); 
});

document.getElementById("color-all").addEventListener('change', () => {
    if (document.getElementById("color-all").checked) chrome.storage.sync.set({COLOR_PAGES: true});
    else chrome.storage.sync.set({COLOR_PAGES: false});
});

document.getElementById("color-selection").addEventListener('change', () => {
    if (document.getElementById("color-selection").checked) chrome.storage.sync.set({COLOR_SELECTION: true});
    else chrome.storage.sync.set({COLOR_SELECTION: false}); 
});

// enable senticNet weight input box
let enableSentic = () => {
    document.getElementById("weight-sentic").disabled = false;
    document.getElementById("weight-sentic-label").classList.remove("deactivated");
};

// enable afinn weight input box
let enableAfinn = () => {
    document.getElementById("weight-afinn").disabled = false;
    document.getElementById("weight-afinn-label").classList.remove("deactivated");
};

// save the weight inputs 
let saveInput = () => {
    chrome.storage.sync.set({AFINN_WEIGHT: document.getElementById("weight-afinn").value});
    chrome.storage.sync.set({SENTIC_WEIGHT: document.getElementById("weight-sentic").value});
};

// change weight inputs when options are disabled and enabled 
let fixWeightInput = (firstInput, secondInput) => {
    if (firstInput.disabled) {
        secondInput.value = 1;
        firstInput.value = 0;
        saveInput();
    }
    else if (secondInput.disabled) {
        firstInput.value = 1; 
        secondInput.value = 0;
        saveInput();
    }
    else {
        chrome.storage.sync.get(['DEFAULT_AFINN_WEIGHT'], (result) => {
            secondInput.value = result.DEFAULT_AFINN_WEIGHT;
            saveInput();
        }); 
        chrome.storage.sync.get(['DEFAULT_SENTIC_WEIGHT'], (result) => {
            firstInput.value = result.DEFAULT_SENTIC_WEIGHT;
            saveInput();
        });
    }
};

document.getElementById("sent-sentic").addEventListener('change', () => {
    // if the box was checked...
    if (document.getElementById("sent-sentic").checked) {
        // enable its weight input 
        enableSentic();
        // change the contents of the weight input 
        fixWeightInput(document.getElementById("weight-sentic"), document.getElementById("weight-afinn"));
    }
    else {
        // disable its weight input 
        document.getElementById("weight-sentic").disabled = true;
        document.getElementById("weight-sentic-label").classList.add("deactivated");
        // if the other input is unchecked
        if (!document.getElementById("sent-afinn").checked) {
            // turn it on and enable its weight input 
            document.getElementById("sent-afinn").checked = true;
            enableAfinn();
        }
        fixWeightInput(document.getElementById("weight-sentic"), document.getElementById("weight-afinn"));
    }
});

document.getElementById("sent-afinn").addEventListener('change', () => {
    if (document.getElementById("sent-afinn").checked) {
        enableAfinn();
        fixWeightInput(document.getElementById("weight-sentic"), document.getElementById("weight-afinn"));
    }
    else {
        document.getElementById("weight-afinn").disabled = true;
        document.getElementById("weight-afinn-label").classList.add("deactivated");
        if (!document.getElementById("sent-sentic").checked) {
            document.getElementById("sent-sentic").checked = true;
            enableSentic();
        }
        fixWeightInput(document.getElementById("weight-sentic"), document.getElementById("weight-afinn"));
    }
});

// check a weight input and ensure that the weights add to one
let verifyInput = (firstInput, secondInput) => {
    // ensure that there are two open inputs (so we don't set a value in a disabled input)
    if (!secondInput.disabled) {
        // check to ensure a number was input 
        if (!isNaN(parseFloat(firstInput.value)) && isFinite(firstInput.value)) {
            // can't have negative weights, make everything positive
            if (firstInput.value < 0) firstInput.value = Math.abs(firstInput.value);

            if (firstInput.value > 1) {
                // we need to reduce input to a decimal
                let digits = firstInput.value.toString().length;
                // keep two decimal places
                firstInput.value = (firstInput.value / Math.pow(10, digits)).toFixed(2);
            } else {
                // a decimal was entered, make sure it has two decimal places at most
                firstInput.value = Math.round(firstInput.value * 100).toFixed(2) / 100;
            }
            // set the other input so both weights add to one
            secondInput.value = Math.round((1 - firstInput.value) * 100) / 100;
        } else {
            // something besides a number was input, reset to default
            chrome.storage.sync.get(['DEFAULT_AFINN_WEIGHT'], (result) => {
                secondInput.value = result.DEFAULT_AFINN_WEIGHT;
            }); 
            chrome.storage.sync.get(['DEFAULT_SENTIC_WEIGHT'], (result) => {
                firstInput.value = result.DEFAULT_SENTIC_WEIGHT;
            });
        }
    } else {
        firstInput.value = 1;
    }
    // save the inputs 
    saveInput();
};

let timeout = null;
// wait for typing to finish before checking weight input
document.getElementById("weight-afinn").onkeyup = () => {
    clearTimeout(timeout);
    // wait for 800ms then check input
    timeout = setTimeout(() => {
        verifyInput(document.getElementById("weight-afinn"), document.getElementById("weight-sentic"))
    }, 800);
};

document.getElementById("weight-sentic").onkeyup = () => {
    clearTimeout(timeout);
    // wait for 800ms then check input
    timeout = setTimeout( () => {
        verifyInput(document.getElementById("weight-sentic"), document.getElementById("weight-afinn"))
    }, 800);
};

// on change, notify the user 
chrome.storage.onChanged.addListener((changes, namespace) => {
        document.getElementById("saved").classList.remove("hidden");
        setTimeout(() => {
            document.getElementById("saved").classList.add("hidden");
        }, 2500);
});