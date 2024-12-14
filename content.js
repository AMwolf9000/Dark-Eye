"use strict";

// set what properties you want to change and options for how
// property should be set in kebab case, 
// colorGoal is set as sum of the most extreme rgb values that the property would get in a dark page
// e.g. the max rgb sum of text in a dark page would be 765
const colorProperties = [
    {property: "color", defaultRGB: "rgb(0, 0, 0)", changeDefault: true, colorGoal: 765}, 
    {property: "background-color", defaultRGB: "rgba(0, 0, 0, 0)", changeDefault: false, colorGoal: 0},
    {property: "background-image"}
];

// intialize variables to store data from storage
let isActive, colorThreshold, colorGoalThreshold, luminanceThreshold, imageBrightness;

setUp();

// setup function
async function setUp() {
    // get data from storage
    [
        isActive = false,
        colorThreshold = 50,
        colorGoalThreshold = 382,
        luminanceThreshold = 0.5,
        imageBrightness = 1
    ] = (await getFromStorage([
        "isActive",
        "colorThreshold",
        "colorGoalThreshold",
        "luminanceThreshold",
        "imageBrightness"
    ]));
    // checks if the extension is active
    if (!isActive) return;
    
    // add intital stylesheet so that page loading appears dark and sets personal default values for properties
    const sheet = document.createElement("style");
    sheet.innerHTML = `
        html, body {
            color: rgb(235, 235, 235) !important;
            background-color: rgb(30, 30, 30) !important;
            scrollbar-color: rgb(100, 100, 100) rgb(50, 50, 50) !important
        }
        img, video {
            filter: brightness(${imageBrightness}) !important
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
    Array.from(document.querySelectorAll('body, body *:not(script)'))
    .forEach(elem => set.add(elem));
    isDone = true;

    // change the intital set of elements, further elements will be
    // processed directly in the observer callback
    set.forEach(switchScheme);
}

// handles gradients
function invertGradient(gradientString) {
    // seperate rgba strings from gradient string
    const regexpIterator = gradientString.matchAll(/rgb(a)?\(\d+, \d+, \d+(, (0|1|0?\.\d+))?\)/g);

    // loop through rgba values
    for (const regexpObject of regexpIterator) {
        // get rgba value
        const rgba = regexpObject[0];
        
        // replace original rgba values in gradient string with new ones
        gradientString = gradientString.replace(rgba, handleColor(rgba, 0));
    }

    // return new string
    return gradientString;
} 

// switch to dark
function switchScheme(elem) {

    // loop through each property and it's settings
    for (const {property, defaultRGB, changeDefault, colorGoal} of colorProperties) {
        
        // save rgba value
        const rgbaValue = getComputedStyle(elem)[property];

        // test for background property 
        if (property === "background-image") {
            // if property is a gradient value use gradient invert
            if (rgbaValue.includes("gradient")) {

                elem.style.setProperty(property, invertGradient(rgbaValue), "important");
                // skip the rest of code as property is already inverted after this
                continue;
            }
        }
        // check if rgbaValue is set / if default value should be changed
        if (rgbaValue != defaultRGB || changeDefault) {
            // if true then handleColor
            elem.style.setProperty(property, handleColor(rgbaValue, colorGoal), "important");
        }
    }
}

// will determine what to do with a rgb value
function handleColor(rgbaValue, colorGoal) {
    // seperate red, green, blue, and alpha
    let [r, g, b, a = 1] = rgbaValue.split(",").map(val => Number(val.replace(/[^0-9.]/g, "")));

    // return if color would be invisible
    if (a == 0) {
        return rgbaValue;
    }

    // determine if color is grayscale or fullColor
    if (Math.abs(r - g) < colorThreshold && Math.abs(r - b) < colorThreshold && Math.abs(g - b) < colorThreshold) {
        // if color is grayscale and goes over threshold for colorGoal invert
        if (Math.abs(colorGoal - (r + g + b)) > colorGoalThreshold) {
            [r, g, b] = [r, g, b].map(n => 255 - n);
        }

    } else {
        // normalize values
        const [R, G, B] = [r, g, b].map(n => n / 255);

        // use luminance formula to check brightness
        if (0.2126 * R + 0.7152 * G + 0.0722 * B > luminanceThreshold) {
            // if color is fullColor and bright halve the color's brightness
            [r, g, b] = [r, g, b].map(n => n * luminanceThreshold);
        }
    }

    // check for alpha and return final values
    return (a == 1) ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

// get data from storage
function getFromStorage(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            const values = keys.map(key => result[key]);
            resolve(values);
        });
    });
}