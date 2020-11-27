# Welcome!

This repository is an accompaniment to the **Introduction to Developing Power BI Visuals** course, available from RADACAD.

The visual project is open source, so you are welcome to fork, clone or play with the code however you like, but there are no further plans to develop this visual from my end beyond the scope of the course it’s intended for.

# About the Visual

To understand the visual, it’s best to take the course 😊, but here's a short overview. The visual is a [dumbbell plot](https://datavizproject.com/data-type/dumbbell-plot/), which is designed to visualize several data points over the same category, in order to see their differences, e.g.:

&nbsp;&nbsp;&nbsp;&nbsp;![Dumbbell Chart](https://i.imgur.com/J563lAh.png "Dumbbell Chart")

The visual's code contains the following features, which you will learn to implement throughout the course:

* Data roles for Category, Series and Measure, plus sorting
* Cross-filter other visuals and cross-highlighting from other visuals
* Properties for a number of elements, including:
    * Switchable orientation (horizontal <> vertical)
    * Series colour (bound to unique values)
    * Data point radius
    * Line color and thickness
    * Tick label font, size and color
    * Display unit (Auto, None, Thousands...) for value (measure) axis
* Drill-down on either Category or Series
* Context menu, with drillthrough
* Tooltip support (both standard and report page)
* Animated transitions for data points
* Formatting of measure values to match data model format strings
* Responsive sizing of axes
* Landing page with URL Launching
* Localization support
* Rendering event support

Each branch contains the step-by-step changes we work through to build the visual, so you can see it develop and grow over time.
