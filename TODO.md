## Problems
  - [ ] regexp for getting color declarations from property values needs to be more specific

## Improvements
  - [x] check color brightness with luminance formula and adjust color brightness based on that
  - [x] add styles to stylesheet instead of inline so :hover and other psuedo-classes and psudeo-elements work as expected
  - [ ] add optional sliders for filters that go over the entire site (via html element), like contrast and brightness filters
  - [ ] option to test if site is dark enough already (with override)
  - [ ] handle style elements with CSSOM API rather than replacing textContent
  - [ ] add attribute style parser

  #### Finished lists
    ## Basic
      - [x] use "element.style.setProperty()" to set the importance of a property, this is so it can override !important
      - [x] !detect and change new elements
      - [x] add more defaults to initial stylesheet
      - [x] darken images (and video)
      - [x] darken but don't invert vibrant colors
      - [x] add parsing of properties that are gradients
      - [x] add options (e.g. how dark elements are, should images be darkened, and thresholds for changing color values)
      - [x] add domain blacklist

      ## Style parser
        - [x] add another check upon finding a color value in css to get what property the color is for; to have
              dynamic color changing
        - [x] more comprehensive regexp for changing values with multiple values (e.g. var(--name, #fff) or gradient(red, blue))
        - [x] add hsl to the regexp