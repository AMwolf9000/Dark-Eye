## Basic
  - [x] use "element.style.setProperty()" to set the importance of a property, this is so it can overide !important
  - [x] !detect and change new elements
  - [x] add more defaults to initial stylesheet
  - [x] darken images (and video)
  - [x] darken but don't invert vibrant colors
  - [x] add parsing of properties that are gradients
  - [ ] add options (e.g. how dark elements are, should images be darkened, and thresholds for changing color values)
  - [ ] add domain blacklist
  - [ ] test if a site is already dark enough


## Improvements
  - [x] check color brightness with luminance formula and adjust color brightness based on that
  - [ ] add styles to stylesheet instead of inline so :hover works as expected
  - [ ] increase efficiency with code revisions (most likely will include options to disable computationally
        intense tasks)


## Fixed problems
  - [x] rgbaRegexp var tests for both the defaults (rgb(0, 0, 0) and rgba(0, 0, 0, 0)). This means that properties
        that are not actaully default will be seen as default, e.g. background-color's default is rgba(0, 0, 0, 0)
        but when the alpha channel is ommited it wrongly assumes it is still default. 
        FIXED: added the property default along with colorProperties and changed the logic for deciding if default
  - [x] Initial stylesheet when injected can be can be buried under other stylesheets, this causes the specification
        order to get messed up.
        FIXED: set properties to important to get higher sepcification