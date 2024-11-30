"use strict";

// set what properties you want to change and options for how
// property should be set in kebab case, 
// colorGoal is set as sum of the most extreme rgb values that the property would get in a dark page
// e.g. the max rgb sum of text in a dark page would be 765
const colorProperties = [
    {property: "color", defaultRGB: "rgb(0, 0, 0)", changeDefault: true, colorGoal: 765}, 
    {property: "background-color", defaultRGB: "rgba(0, 0, 0, 0)", changeDefault: false, colorGoal: 0},
];

setUp();

// setup function
async function setUp() {
    // checks if the extension is active
    if (!await chrome.storage.local.get(["isActive"]).then(result => result.isActive ?? false)) return;
    
    // add intital stylesheet so that page loading appears dark and sets personal default values for properties
    const sheet = document.createElement("style");
    sheet.innerHTML = `
        html, body {
            color: rgb(235, 235, 235) !important;
            background-color: rgb(30, 30, 30) !important;
            scrollbar-color: rgb(100, 100, 100) rgb(50, 50, 50) !important
        }
    `;
    document.head.appendChild(sheet);

    // promise to check state of body
    const promise = new Promise(resolve => {
        // checks every n milliseconds
        const intervalID = setInterval(() => {
            if (document.body) {
                clearInterval(intervalID);
                resolve();
            }
        }, 100);
    });

    // set to store elements and isDone switch to tell observer to start processing elements directly
    const set = new Set();
    let isDone = false;
    
    // observer to get added elements and change them
    const bodyObserver = new MutationObserver(mutationList => {
       
        for (const mutation of mutationList) {
            
            // if no elements were added skip
            if (mutation.addedNodes.length === 0) continue;

            for (const node of mutation.addedNodes) {

                // if element is not prudent to change skip
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                
                // add to set until observer is fully set up and intial
                // elements are processed
                if (isDone) {
                    switchScheme(node);
                    // change children nodes as well
                    node.querySelectorAll('*').forEach(switchScheme);
                } else {
                    set.add(node);
                }
            } 
        }
    });
    
    // forces mutation observer to be added before getting all page elements
    await promise;
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    
    // get all the elements from the page after mutation observer is added
    // to catch elements added before mutation observer was set up
    Array.from(document.querySelectorAll("body *"))
    .filter(elem => elem.nodeName !== "SCRIPT")
    .forEach(elem => set.add(elem));
    isDone = true;

    // change the intital set of elements, further elements will be
    // processed directly in the observer callback
    set.forEach(switchScheme);
}

// extract rgb values and condense
// returns a sum of the rgb values
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
    for (const {property, defaultRGB, changeDefault, colorGoal} of colorProperties) {
        
        // save rgba value
        const rgbaValue = getComputedStyle(elem)[property];

        // change threshold depending on property
        switch (colorGoal) {
            case 0:
                // invert the property's color on the element if threshold is met
                if (extractRGB(rgbaValue) > 300 || rgbaValue === defaultRGB && changeDefault) {
                    elem.style.setProperty(property, invertColor(rgbaValue), "important");
                }
                break;
            case 765:
                // invert the property's color on the element if threshold is met
                if (extractRGB(rgbaValue) < 400 || rgbaValue === defaultRGB && changeDefault) {
                    elem.style.setProperty(property, invertColor(rgbaValue), "important");
                }
                break;
        }  
    }
}