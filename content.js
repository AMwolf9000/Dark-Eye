"use strict";

// regExp to test for default rgba/rgb values
const rgbaRegexp = /^(rgb\(0, 0, 0\)|rgba\(0, 0, 0, 0\))$/;
// set what properties you want to change and options for how
// property should be set in kebab case
const colorProperties = [
    {property: "color", changeDefault: false, colorGoal: 765}, 
    {property: "background-color", changeDefault: false, colorGoal: 0},
];

setUp();

// setup function
async function setUp() {
    // checks if the extension is active
    if (!await chrome.storage.local.get(["isActive"]).then(result => result.isActive ?? false)) return;
    
    const sheet = document.createElement("style");
    sheet.innerHTML = `
        html, body {
            color: rgb(235, 235, 235);
            background-color: rgb(30, 30, 30)
        }
    `;
    document.head.appendChild(sheet);



    const promise = new Promise(resolve => {
        const intervalID = setInterval(() => {
            if (document.readyState === "complete") {
                clearInterval(intervalID);
                resolve();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(intervalID);
            resolve();
        }, 3000);
    });
    await promise;
    let set = new Set();
    let isDone = false;
    
    const observer = new MutationObserver((mutationList) => {
       
        mutationList.forEach((mutation) => {
            
            if (mutation.addedNodes.length === 0) return;

            mutation.addedNodes.forEach(node => {

                if (node.nodeType !== Node.ELEMENT_NODE) return;
                
                if (isDone) {
                    switchScheme(node);
                    node.querySelectorAll('*').forEach(child => switchScheme(child));
                } else {
                    set.add(node);
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    Array.from(document.querySelectorAll("body *")).filter(elem => {
        if (elem.nodeName == "SCRIPT") return false;
        else return true;
    }).forEach(elem => {set.add(elem)});
    isDone = true;
    set.forEach(switchScheme);
}

// check if website is in a white or dark theme
function checkWebState(sumRGB) {
    let colorTable = {bright: 0, dark: 0};

    sumRGB.forEach((val) => {
        if (val > 250) colorTable.bright += 1;
        else colorTable.dark += 1;
    });

    if (colorTable.bright > colorTable.dark) return true;
    else return false;
}

// extract rgb values and condense;
function extractRGB(rgba) {
    const splitRGB = rgba.split(",").map(val => Number(val.replace(/[^0-9.]/g, "")));
    if (splitRGB[3]) splitRGB.pop();
    return splitRGB.reduce((sum, currentVal) => sum + currentVal);
}

// invert rgba color
function invertColor(rgba) {

    // seperate rgba values into an array where each part has one number (r, g, b, a)
    const seperatedValues = rgba.split(",").map(val => Number(val.replace(/[^0-9.]/g, "")));
    // if there is an alpha channel, remove it and save it to alpha
    const alpha = (seperatedValues[3]) ? seperatedValues.pop() : null;

    // invert the rgb values
    const newValues = seperatedValues.map(val => Math.min((255 - val) + 20, 255));

    // if there is an alhpa channel, return rgba format with orginal alpha channel. Else return rgb format
    if (alpha) {
        newValues.push(alpha);
        return `rgba(${newValues[0]}, ${newValues[1]}, ${newValues[2]}, ${newValues[3]})`
    } else {
        return `rgb(${newValues[0]}, ${newValues[1]}, ${newValues[2]})`
    }
    
}

// switch to dark
function switchScheme(elem) {

    // loop through each property and it's settings
    for (const {property, changeDefault, colorGoal} of colorProperties) {
        
        // save rgba value
        const rgbaValue = getComputedStyle(elem)[property];

        switch (colorGoal) {
            case 0:
                if (extractRGB(rgbaValue) > 300 || changeDefault && rgbaRegexp.test(rgbaValue)) {
                    // invert the property's color on the element
                    elem.style.setProperty(property, invertColor(rgbaValue), "important");
                }
                break;
            case 765:
                if (extractRGB(rgbaValue) < 400 || changeDefault && rgbaRegexp.test(rgbaValue)) {
                    // invert the property's color on the element
                    elem.style.setProperty(property, invertColor(rgbaValue), "important");
                }
                break;
        }  
    }
}