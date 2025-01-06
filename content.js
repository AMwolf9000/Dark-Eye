"use strict";

// set what properties you want to change and options for how
// property should be set in kebab case, 
// colorGoal is set as sum of the most extreme rgb values that the property would get in a dark page
// e.g. the max rgb sum of text in a dark page would be 765
const colorProperties = {
    "color": { defaultRGB: "rgb(0, 0, 0)", changeDefault: true, colorGoal: 765 },
    "background-color": { defaultRGB: "rgba(0, 0, 0, 0)", changeDefault: false, colorGoal: 0 },
    "background-image": { colorGoal: 0 },
    "background": { colorGoal: 0 }
};

// default style sheet
const defaultSheet = document.createElement("style");

// intialize variables to store data from storage
let isActive, colorThreshold, colorGoalThreshold, luminanceThreshold, imageBrightness, blacklist;

// function to check if script should run and set up global variables
(async () => {
    // keys to get from storage
    const keys = [
        "isActive",
        "colorThreshold",
        "colorGoalThreshold",
        "luminanceThreshold",
        "imageBrightness",
        "blacklist"
    ];

    // wait to get data from storage
    [
        isActive = false,
        colorThreshold = 50,
        colorGoalThreshold = 382,
        luminanceThreshold = 0.5,
        imageBrightness = 1,
        blacklist = ""
    ] = await new Promise((resolve) => {
        chrome.storage.local.get(keys, (result) => {
            const values = keys.map(key => result[key]);
            resolve(values);
        });
    });

    // checks if the extension is active and if site is in blacklist
    if (!isActive || location.host && blacklist.includes(location.host)) return;

    // set up default style sheet
    defaultSheet.textContent = `
        * {
            color: white !important;
            background-color: transparent !important
        }
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
    insertSheet();

    function insertSheet() {
        try {
            document.head.insertBefore(defaultSheet, document.head.firstChild);
        } catch {
            insertSheet();
        }
    }

    // start function calls
    styleParserOrchestrator();
})();

// orchestrator function
function styleParserOrchestrator() {
    // set up shadow element for color conversion to rgb
    const shadowElem = document.createElement("meta");
    document.head.insertBefore(shadowElem, document.head.firstChild);

    // set up observer for style sheets and get already loaded stylesheets
    function runStyleParser() {

        // set up variables
        let isDone = false;
        const styleSet = new Set();

        // observer to observe new stylesheets that are added (including linked ones)
        const styleObserver = new MutationObserver(mutationList => {
            for (const mutation of mutationList) {
                if (mutation.addedNodes.length === 0) continue;

                for (const node of mutation.addedNodes) {
                    const name = node.nodeName.toLowerCase();

                    if (name === "style" || name === "link" && node.rel === "stylesheet") {
                        if (!isDone) {
                            styleSet.add(node);
                        }

                        handleStyle(node);
                    }
                }
            }
        });
        styleObserver.observe(document.documentElement, { childList: true, subtree: true });

        // get stylesheets that were present before observer was set up
        Array.from(document.querySelectorAll("style:not([id='IGNORE']), link[rel='stylesheet']"))
            .forEach(node => {
                styleSet.add(node);
            });
        isDone = true;

        // parse css for each style in queue
        styleSet.forEach(handleStyle);

        // remove some initial styles from default sheet so that specification is back to normal
        // (inital styles prevent white flicker upon page load)
        setTimeout(() => {
            defaultSheet.textContent = defaultSheet.textContent.slice(defaultSheet.textContent.indexOf("}") + 1);
            defaultSheet.textContent = defaultSheet.textContent.replaceAll("!important", "");
        }, 500);
    }

    // handles setting stylesheets
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

    // parses css data to change color values
    function parseCss(cssData) {
        // regexp for getting property - value pairs
        const captureRegex = /([\w-]+)\s*:s*([^;}]+)/g;

        cssData = cssData.replace(captureRegex, (match, property, value) => {
            // resolve variables
            let newValue = value.replace(/var\((--[\w-]+)\)/gi, (match, varName) => {
                return getComputedStyle(document.documentElement).getPropertyValue(varName) || match;
            });
            // handle color values 
            newValue = newValue.replace(/#[a-fA-F0-9]{3,8}|(rgb|hsl)(a)?\([^)]+\)|(?<!--)\b(white|black|red|green|blue|yellow|cyan|magenta|purple|lime)\b/gi, (match) => {
                shadowElem.setAttribute("style", `background-color: ${match} !important`);
                return handleColor(getComputedStyle(shadowElem).backgroundColor, colorProperties[property.trim()]?.colorGoal || 0);
            });
            return match.replace(value, newValue);
        });
        return cssData;
    }

    runStyleParser();
}

// will determine what to do with a rgb value
function handleColor(colorString, colorGoal) {
    // set rgba values
    let [r, g, b, a = 1] = colorString.match(/0?\.?\d+/g).map(num => Number(num));

    // return if color would be invisible
    if (a == 0) {
        return colorString;
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

// // wait for an element to load
// function waitForElement(targetElem, interval = 100) {
//     return new Promise(resolve => {
//         // checks every n milliseconds
//         const intervalID = setInterval(() => {
//             if (targetElem) {
//                 clearInterval(intervalID);
//                 resolve();
//             }
//         }, interval);
//     });
// }

//     // helper function to invert an element's inline css
//     function invertInlineCss(targetElem) {
//         // return if element was already inverted or if class name is not a string
//         if (typeof targetElem.className != "string" || targetElem.className.includes("INLINE_CHANGED")) return;

//         // get inline css
//         let inlineCss = targetElem.style.cssText;

//         // invert colors in css
//         inlineCss = parseCss(inlineCss);

//         // replace inline css with new css and mark that the element has been changed
//         // (so mutation observer does not go into an infinite loop)
//         targetElem.style = inlineCss;
//         targetElem.className += " INLINE_CHANGED";
//     }

//     // set up variables
//     const inlineStyleNodesSet = new Set();
//     let isDone = false;

//     // observer to observe inline styles
//     const inlineStyleObserver = new MutationObserver(mutationList => {

//         for (const mutation of mutationList) {
//             // observe change to existing element's style attribute
//             if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
//                 if (!isDone) inlineStyleNodesSet.add(mutation.target);
//                 invertInlineCss(mutation.target);
//             }

//             // observe added elements style attributes
//             if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
//                 // Check all added nodes for inline styles
//                 mutation.addedNodes.forEach(node => {
//                     if (node.nodeType === Node.ELEMENT_NODE) {

//                         const inlineCss = node.getAttribute('style');

//                         if (inlineCss) {
//                             if (!isDone) inlineStyleNodesSet.add(node);
//                             invertInlineCss(node);
//                         }

//                         // Check all descendants of the added element
//                         node.querySelectorAll('[style]').forEach(descendant => {
//                             if (!isDone) inlineStyleNodesSet.add(descendant);
//                             invertInlineCss(descendant);
//                         });
//                     }
//                 });
//             }
//         }
//     });

//     await waitForElement(document.body);
//     inlineStyleObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

//     // get elements that already had inline style before observer was set up
//     Array.from(document.querySelectorAll('[style]'))
//     .forEach(elem => inlineStyleNodesSet.add(elem));
//     isDone = true;

//     // handle queue for inline styles
//     inlineStyleNodesSet.forEach(invertInlineCss);
// }
// setUpAttributeObserver();