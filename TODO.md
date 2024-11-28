## Basic
  - [x] use "element.style.setProperty()" to set the importance of a property, this is so it can overide !important
  - [x] !detect and change new elements
  - [ ] darken images
  - [ ] darken but don't invert vibrant colors
  - [ ] add more defaults to initial stylesheet
  - [ ] add more properties to change (borderColor, boxShadow, etc.)
  - [ ] add parsing of properties that are gradients and other irregulars
  - [ ] detect changes to colors in elements
  - [ ] add options (e.g. how dark elements are, should images be darkened)
  - [ ] add domain blacklist
  - [ ] test if a site is already dark enough


## Improvements
  - [ ] add styles to stylesheet instead of inline so :hover works as expected
  - [ ] increase efficiency with code revisions (most likely will include options to disable computationally
        intense tasks)


## Problems 
  - [ ] rgbaRegexp var tests for both the defaults (rgb(0, 0, 0) and rgba(0, 0, 0, 0)). This means that properties
        that are not actaully default will be seen as default, e.g. background-color's default is rgba(0, 0, 0, 0)
        but when the alpha channel is ommited it wrongly assumes it is still default. Fix: add the default along with colorProperties and change the logic for deciding if default.
  - [ ] Initial stylesheet when injected can be can be buried under other stylesheets, this causes the specification
        order to get messed up. Ensure stylesheet is always at the end of "head" so defaults are properly applied