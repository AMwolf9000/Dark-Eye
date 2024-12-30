"use strict";

// set what properties you want to change and options for how
// property should be set in kebab case, 
// colorGoal is set as sum of the most extreme rgb values that the property would get in a dark page
// e.g. the max rgb sum of text in a dark page would be 765
const colorProperties = [
    { property: "color", defaultRGB: "rgb(0, 0, 0)", changeDefault: true, colorGoal: 765 },
    { property: "background-color", defaultRGB: "rgba(0, 0, 0, 0)", changeDefault: false, colorGoal: 0 },
    { property: "background-image" }
];

// default style sheet
const defaultSheet = document.createElement("style");

// intialize variables to store data from storage
let isActive, colorThreshold, colorGoalThreshold, luminanceThreshold, imageBrightness, blacklist, stylesheetParser;

// function to check if script should run and set up global variables
(async () => {
    // get data from storage
    [
        isActive = false,
        colorThreshold = 50,
        colorGoalThreshold = 382,
        luminanceThreshold = 0.5,
        imageBrightness = 1,
        blacklist = "",
        stylesheetParser = 0
    ] = (await getFromStorage([
        "isActive",
        "colorThreshold",
        "colorGoalThreshold",
        "luminanceThreshold",
        "imageBrightness",
        "blacklist",
        "stylesheetParser"
    ]));
    // checks if the extension is active and if site is in blacklist
    if (!isActive || location.host && blacklist.includes(location.host)) return;

    // set up default style sheet
    defaultSheet.textContent = `
        html, body {
            color: rgb(235, 235, 235) !important;
            background-color: rgb(30, 30, 30) !important;
            scrollbar-color: rgb(100, 100, 100) rgb(50, 50, 50) !important
        }
        textarea, button, input {
            background-color: rgb(50, 50, 50) !important;
            color: rgb(235, 235, 235) !important
        }
        img, video {
            filter: brightness(${imageBrightness}) !important
        }
    `;
    defaultSheet.id = "IGNORE";
    await waitForElement(document.head);
    document.head.insertBefore(defaultSheet, document.head.firstChild);

    // check if stylesheet parser is active
    if (stylesheetParser == 1) {
        styleParserOrchestrator();
    } else {
        setUpInlineParser();
    }
})();

// setup function
async function setUpInlineParser() {
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

    // forces mutation observer to be added before getting all page elements and waits for body to load
    await waitForElement(document.body);
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
    // get rgba matches and invert their colors
    return gradientString.replace(/rgb(a)?\(\d+, \d+, \d+(, (0|1|0?\.\d+))?\)/g, (rgbaString) => handleColor(rgbaString, 0));
}

// switch to dark
function switchScheme(elem) {
    // get computer style of elem
    const computedStyle = getComputedStyle(elem);

    // loop through each property and it's settings
    for (const { property, defaultRGB, changeDefault, colorGoal } of colorProperties) {

        // save rgba value
        const rgbaValue = computedStyle[property];

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
function handleColor(colorString, colorGoal) {
    let r, g, b, a = 1;
    const colorTable = {
        white: [255, 255, 255],
        black: [0, 0, 0],
        red: [255, 0, 0],
        blue: [0, 0, 255],
        green: [0, 255, 0],
        yellow: [255, 255, 0],
        cyan: [0, 255, 255],
        magenta: [255, 0, 255],
        purple: [128, 0, 128],
        lime: [0, 255, 0]
    }

    // change other color types into rgb
    if (colorString.includes("#")) {
        // hex conversion

        // remove "#"
        colorString = colorString.slice(1);

        // check for alpha 
        if (colorString[3] && colorString.length < 6) {
            a = colorString.slice(3) + "%";
        } else if (colorString[6] && colorString.length > 6) {
            a = colorString.slice(6) + "%";
        }

        // extend hex into long form if needed
        if (colorString.length < 6) {
            colorString = Array.from(colorString).map(v => v.concat(v)).join("");
        }
        // convert hex to rgb
        r = parseInt(colorString.slice(0, 2), 16);
        g = parseInt(colorString.slice(2, 4), 16);
        b = parseInt(colorString.slice(4, 6), 16);
    } else if (colorString.includes("rgb")) {
        // regexp to match digits and optional var()
        const rgbaRegex = /0?\.?\d+%?|var\(--[^)]*\)/gi;
        const matches = colorString.match(rgbaRegex);

        // asign rgba values
        r = matches[0];
        g = matches[1];
        b = matches[2];
        a = matches[3] || 1;
    } else {
        // color keyword conversion
        // put in lowercase
        colorString = colorString.toLowerCase();

        // find rgb values associated with keyword
        const rgbValues = colorTable[colorString];

        // if keyword is not found return colorString
        if (rgbValues === undefined) return colorString;

        // put data into variables
        [r, g, b] = rgbValues;
    }

    // return if color would be invisible
    if (a == 0) {
        return colorString;
    }

    // check if function should do color checks or simply invert
    if (colorGoal === "invert") {
        [r, g, b] = [r, g, b].map(n => 255 - n);
        // check for alpha and return final values
        return (a == 1) ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
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

// wait for an element to load
function waitForElement(targetElem, interval = 100) {
    return new Promise(resolve => {
        // checks every n milliseconds
        const intervalID = setInterval(() => {
            if (targetElem) {
                clearInterval(intervalID);
                resolve();
            }
        }, interval);
    });
}

// orchestrator function
function styleParserOrchestrator() {

    // wait for stylesheets to load
    function runStyleParser() {
        let isDone = false;
        const set = new Set();
        const styleObserver = new MutationObserver(mutationList => {
            for (const mutation of mutationList) {
                if (mutation.addedNodes.length === 0) continue;

                for (const node of mutation.addedNodes) {
                    const name = node.nodeName.toLowerCase();

                    if (name === "style" || name === "link" && node.rel === "stylesheet") {
                        if (!isDone) {
                            set.add(node);
                        }

                        if (name === "style") {
                            handleStyle(node);
                        }
                        if (name === "link") {
                            handleStyle(node);
                        }
                    }
                }
            }
        });
        styleObserver.observe(document.documentElement, { childList: true, subtree: true });

        Array.from(document.querySelectorAll("style:not([id='IGNORE']), link[rel='stylesheet']"))
            .forEach(node => {
                set.add(node);
            });
        isDone = !isDone;
        set.forEach(handleStyle);
        defaultSheet.textContent = defaultSheet.textContent.replaceAll("!important", "");
    }

    // handles style
    function handleStyle(ownerNode) {
        // convert node name to lower case
        const name = ownerNode.nodeName.toLowerCase();

        // if class name is not a string or element has already been parsed / created via this script, return
        if (typeof ownerNode.className != "string" || ownerNode.className.includes("PARSED") || ownerNode.className.includes("FROM_LINK")) return;

        if (name === "style") {
            // style elements have their content replaced
            ownerNode.textContent = parseCss(ownerNode.textContent);
            ownerNode.className += " PARSED";
        }
        if (name === "link") {
            // new style element
            const elem = document.createElement("style");
            elem.className = "FROM_LINK";

            // use proxy to get the raw data and parse it
            chrome.runtime.sendMessage({ action: 'fetchCss', url: ownerNode.href }, (response) => {
                if (response.cssText) {
                    // new style will have the parsed css data gotten from the link's href
                    elem.textContent = parseCss(response.cssText);
                } else {
                    console.error('Error: ', response.error);
                    elem.textContent = "ERROR";
                }
            });
            // insert the new style right after the link element
            ownerNode.parentNode.insertBefore(elem, ownerNode.nextSibling);
        }
    }

    // without optimization this will simply make a new style element that has inverted colors, including all of the non-color properties
    function parseCss(cssData) {
        // regexp for getting color strings
        const keywordRegex = /(?<=:\s*|gradient\([^)]*)(?<!--)(white|black|red|blue|green|yellow|cyan|magenta|purple|lime)(?=\s*[;}]|[^)]*\))/;
        const colorRegex = /rgb(a)?\(\d+[,\s]*\d+[,\s]*\d+([,/\s]*(0|1|0?\.?\d+%?|var\(--.*\)))?\)|#[a-fA-F0-9]{3,8}/;
        const finalRegex = new RegExp(`${keywordRegex.source}|${colorRegex.source}`, "gi");

        // find color strings and handle them with function
        cssData = cssData.replace(finalRegex, (colorProp) => handleColor(colorProp, "invert"));

        return cssData;
    }

    // this can also merge with og observer later
    async function setUpAttributeObserver() {

        // helper function to invert an element's inline css
        function invertInlineCss(targetElem) {
            // return if element was already inverted or if class name is not a string
            if (typeof targetElem.className != "string" || targetElem.className.includes("INLINE_CHANGED")) return;

            // get inline css
            let inlineCss = targetElem.style.cssText;

            // invert colors in css
            inlineCss = parseCss(inlineCss);

            // replace inline css with new css and mark that the element has been changed
            // (so mutation observer does not go into an infinite loop)
            targetElem.style = inlineCss;
            targetElem.className += " INLINE_CHANGED";
        }

        const set = new Set();
        let isDone = false;

        const inlineStyleObserver = new MutationObserver(mutationList => {

            for (const mutation of mutationList) {
                // observe change to existing element's style attribute
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (!isDone) set.add(mutation.target);
                    invertInlineCss(mutation.target);
                }

                // observe added elements style attributes
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check all added nodes for inline styles
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const inlineCss = node.getAttribute('style');
                            if (inlineCss) {
                                if (!isDone) set.add(node);
                                invertInlineCss(node);
                            }

                            // Check all descendants of the added element
                            node.querySelectorAll('[style]').forEach(descendant => {
                                if (!isDone) set.add(descendant);
                                invertInlineCss(descendant);
                            });
                        }
                    });
                }
            }
        });

        await waitForElement(document.body);
        inlineStyleObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

        Array.from(document.querySelectorAll('[style]'))
        .forEach(elem => set.add(elem));

        isDone = true;
        set.forEach(invertInlineCss);
    }

    setUpAttributeObserver();
    runStyleParser();
}   